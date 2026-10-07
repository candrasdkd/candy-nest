const {findLinkedUser, formatRupiah} = require("./utils");

function createWhatsappReportHandlers({db, sendWhatsApp, getCategoryLabel}) {
  function jakartaToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  async function handleSummary(phone, period = "day") {
    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc) {
      await sendWhatsApp(phone, "Hubungkan akun dulu dengan HUBUNGKAN KODE_UNDANGAN.");
      return;
    }
    const userData = userDoc.data();
    if (!userData.coupleId) {
      await sendWhatsApp(phone, "Akunmu belum terhubung dengan pasangan di CandyNest.");
      return;
    }

    const today = jakartaToday();
    let startDate = today;
    let title = "Pengeluaran Hari Ini";
    if (period === "week") {
      const weekStart = new Date(`${today}T00:00:00.000Z`);
      const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
      weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
      startDate = weekStart.toISOString().slice(0, 10);
      title = "Rekap Minggu Ini";
    } else if (period === "month") {
      startDate = `${today.slice(0, 7)}-01`;
      title = "Rekap Bulan Ini";
    }

    const snapshot = await db.collection("transactions")
        .where("coupleId", "==", userData.coupleId)
        .get();
    let total = 0;
    let count = 0;
    const categories = new Map();
    snapshot.forEach((doc) => {
      const tx = doc.data();
      if (tx.type !== "expense" || typeof tx.date !== "string" || tx.date < startDate || tx.date > today) return;
      const amount = Number(tx.amount) || 0;
      total += amount;
      count += 1;
      const label = getCategoryLabel(tx.category);
      categories.set(label, (categories.get(label) || 0) + amount);
    });

    const topCategories = [...categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, amount]) => `• ${label}: ${formatRupiah(amount)}`)
        .join("\n");
    const periodText = period === "day" ? today : `${startDate} s.d. ${today}`;
    await sendWhatsApp(
        phone,
        `📊 ${title}\n${periodText}\n\n${formatRupiah(total)} · ${count} transaksi` +
        (topCategories ? `\n\nKategori terbesar\n${topCategories}` : "\n\nBelum ada pengeluaran pada periode ini."),
    );
  }

  async function handleUndo(phone) {
    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc) {
      await sendWhatsApp(phone, "Hubungkan akun dulu dengan HUBUNGKAN KODE_UNDANGAN.");
      return;
    }
    const coupleId = userDoc.data().coupleId;
    if (!coupleId) {
      await sendWhatsApp(phone, "Akunmu belum terhubung dengan pasangan di CandyNest.");
      return;
    }

    const snapshot = await db.collection("transactions")
        .where("coupleId", "==", coupleId)
        .get();
    const latest = snapshot.docs
        .filter((doc) => {
          const tx = doc.data();
          return tx.userId === userDoc.id && tx.source === "whatsapp_bot" && tx.type === "expense";
        })
        .sort((a, b) => String(b.data().createdAt || "").localeCompare(String(a.data().createdAt || "")))[0];
    if (!latest) {
      await sendWhatsApp(phone, "Belum ada pengeluaran dari WA yang bisa dibatalkan.");
      return;
    }

    const tx = latest.data();
    const createdAt = new Date(tx.createdAt || 0).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      await sendWhatsApp(phone, "Transaksi WA terakhir sudah lewat 24 jam, jadi tidak bisa dibatalkan.");
      return;
    }

    await db.collection("whatsappBotSessions").doc(phone).set({
      action: "undo",
      transactionId: latest.id,
      userId: userDoc.id,
      coupleId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    await sendWhatsApp(
        phone,
        `Batalkan transaksi ini?\n${formatRupiah(Number(tx.amount) || 0)} · ${tx.description || getCategoryLabel(tx.category)}\n${tx.date}\n\n` +
        "Balas YA untuk membatalkan atau BATAL untuk menyimpan transaksi.",
    );
  }

  async function handlePendingUndo(phone, text) {
    const sessionRef = db.collection("whatsappBotSessions").doc(phone);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists || sessionSnap.data().action !== "undo") return false;
    const session = sessionSnap.data();
    const answer = String(text || "").trim().toLowerCase();
    if (!Number.isFinite(session.expiresAt) || Date.now() > session.expiresAt) {
      await sessionRef.delete();
      await sendWhatsApp(phone, "Waktu konfirmasi undo sudah habis. Kirim UNDO lagi untuk mencoba.");
      return true;
    }
    if (["batal", "tidak", "nggak", "ga", "gak"].includes(answer)) {
      await sessionRef.delete();
      await sendWhatsApp(phone, "Oke, transaksi tetap tersimpan.");
      return true;
    }
    if (!["ya", "iya", "y", "konfirmasi"].includes(answer)) return false;

    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc || userDoc.id !== session.userId || userDoc.data().coupleId !== session.coupleId) {
      await sessionRef.delete();
      await sendWhatsApp(phone, "Koneksi akun berubah. Transaksi tidak dibatalkan.");
      return true;
    }
    const txRef = db.collection("transactions").doc(session.transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
      await sessionRef.delete();
      await sendWhatsApp(phone, "Transaksi sudah tidak tersedia.");
      return true;
    }
    const tx = txSnap.data();
    const createdAt = new Date(tx.createdAt || 0).getTime();
    const valid = tx.userId === userDoc.id && tx.coupleId === session.coupleId &&
      tx.source === "whatsapp_bot" && tx.type === "expense" &&
      Number.isFinite(createdAt) && Date.now() - createdAt <= 24 * 60 * 60 * 1000;
    await sessionRef.delete();
    if (!valid) {
      await sendWhatsApp(phone, "Transaksi tidak bisa dibatalkan. Cek kembali lewat aplikasi CandyNest.");
      return true;
    }
    await txRef.delete();
    await sendWhatsApp(phone, `Transaksi ${formatRupiah(Number(tx.amount) || 0)} sudah dibatalkan. 🗑️`);
    return true;
  }

  return {handleSummary, handleUndo, handlePendingUndo};
}

module.exports = {createWhatsappReportHandlers};
