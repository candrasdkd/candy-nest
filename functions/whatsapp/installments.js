const {findLinkedUser, formatRupiah, formatMonth, parseAmount} = require("./utils");

function createWhatsappInstallmentHandlers({db, sendWhatsApp}) {
  function getProgress(paid, total) {
    if (total <= 0) return 0;
    return Math.min(100, Math.round(paid / total * 100));
  }

  function bar(percent) {
    const filled = Math.round(percent / 10);
    return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${percent}%`;
  }

  async function getCouple(phone) {
    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc) return {error: "unlinked"};
    const coupleId = userDoc.data().coupleId;
    if (!coupleId) return {error: "uncoupled"};
    const snapshot = await db.collection("installments")
        .where("coupleId", "==", coupleId)
        .get();
    const items = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))
        .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "id"));
    return {userDoc, coupleId, items};
  }

  async function handleList(phone, page = 0) {
    const result = await getCouple(phone);
    if (result.error === "unlinked") {
      await sendWhatsApp(phone, "Hubungkan akun dulu dengan HUBUNGKAN KODE_UNDANGAN.");
      return;
    }
    if (result.error === "uncoupled") {
      await sendWhatsApp(phone, "Akunmu belum terhubung dengan pasangan di CandyNest.");
      return;
    }
    if (result.items.length === 0) {
      await sendWhatsApp(phone, "Belum ada cicilan. Tambahkan dulu dari menu Cicilan di CandyNest.");
      return;
    }

    const pageSize = 6;
    const pageCount = Math.ceil(result.items.length / pageSize);
    const currentPage = Math.max(0, Math.min(page, pageCount - 1));
    const visible = result.items.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const lines = visible.map((item, index) => {
      const offset = currentPage * pageSize + index + 1;
      const payments = Array.isArray(item.payments) ? item.payments : [];
      const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const total = Number(item.totalDebt) || 0;
      const percent = getProgress(paid, total);
      return `${offset}. ${item.title || "Cicilan"}\n` +
        `   Total: ${formatRupiah(total)}\n` +
        `   Dibayar: ${formatRupiah(paid)}\n` +
        `   Sisa: ${formatRupiah(Math.max(0, total - paid))}\n` +
        `   ${bar(percent)}`;
    });
    const pageHints = [];
    if (currentPage > 0) pageHints.push(`sebelumnya: CICILAN ${currentPage}`);
    if (currentPage < pageCount - 1) pageHints.push(`lanjut: CICILAN ${currentPage + 2}`);
    await sendWhatsApp(
        phone,
        `💳 CICILAN KELUARGA · ${currentPage + 1}/${pageCount}\n\n` +
        `${lines.join("\n\n")}\n\n` +
        "Catat bayar: BAYAR nomor nominal MM/YYYY\n" +
        "Contoh: BAYAR 1 1.000.000 08/2026\n" +
        pageHints.length ? `Halaman lain — ${pageHints.join(" · ")}` : "",
    );
  }

  async function handleHistory(phone, page = 0) {
    const result = await getCouple(phone);
    if (result.error === "unlinked") {
      await sendWhatsApp(phone, "Hubungkan akun dulu dengan HUBUNGKAN KODE_UNDANGAN.");
      return;
    }
    if (result.error === "uncoupled") {
      await sendWhatsApp(phone, "Akunmu belum terhubung dengan pasangan di CandyNest.");
      return;
    }

    const payments = [];
    result.items.forEach((item) => {
      (Array.isArray(item.payments) ? item.payments : []).forEach((payment) => {
        payments.push({
          title: item.title || "Cicilan",
          month: payment.month || "",
          amount: Number(payment.amount) || 0,
          createdAt: payment.createdAt || "",
        });
      });
    });
    payments.sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
    if (payments.length === 0) {
      await sendWhatsApp(phone, "Belum ada riwayat pembayaran cicilan.");
      return;
    }

    const pageSize = 8;
    const pageCount = Math.ceil(payments.length / pageSize);
    const currentPage = Math.max(0, Math.min(page, pageCount - 1));
    const visible = payments.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const lines = visible.map((payment) =>
      `• ${payment.title}\n  ${formatMonth(payment.month)} · ${formatRupiah(payment.amount)}`,
    );
    const pageHints = [];
    if (currentPage > 0) pageHints.push(`sebelumnya: RIWAYAT CICILAN ${currentPage}`);
    if (currentPage < pageCount - 1) pageHints.push(`lanjut: RIWAYAT CICILAN ${currentPage + 2}`);
    await sendWhatsApp(
        phone,
        `🧾 RIWAYAT PEMBAYARAN · ${currentPage + 1}/${pageCount}\n` +
        `${payments.length} pembayaran\n\n${lines.join("\n\n")}\n\n` +
        pageHints.length ? `Halaman lain — ${pageHints.join(" · ")}` : "",
    );
  }

  async function handlePayment(phone, input) {
    const match = String(input || "").trim().match(/^(\d+)\s+(.+)\s+(\d{1,2})[/-](\d{4})$/);
    if (!match) {
      await sendWhatsApp(phone, "Format pembayaran belum sesuai. Contoh: BAYAR 1 1.000.000 08/2026");
      return;
    }
    const itemNumber = Number(match[1]);
    const amount = parseAmount(match[2]);
    const monthNumber = Number(match[3]);
    const year = Number(match[4]);
    if (!Number.isSafeInteger(itemNumber) || itemNumber < 1 || !amount || monthNumber < 1 || monthNumber > 12 || year < 1900 || year > 9999) {
      await sendWhatsApp(phone, "Nomor cicilan, nominal, atau bulan/tahun belum valid. Contoh: BAYAR 1 1.000.000 08/2026");
      return;
    }

    const result = await getCouple(phone);
    if (result.error === "unlinked") {
      await sendWhatsApp(phone, "Hubungkan akun dulu dengan HUBUNGKAN KODE_UNDANGAN.");
      return;
    }
    if (result.error === "uncoupled") {
      await sendWhatsApp(phone, "Akunmu belum terhubung dengan pasangan di CandyNest.");
      return;
    }
    const installment = result.items[itemNumber - 1];
    if (!installment) {
      await sendWhatsApp(phone, `Cicilan nomor ${itemNumber} tidak ditemukan. Ketik CICILAN untuk melihat daftarnya.`);
      return;
    }

    const installmentRef = db.collection("installments").doc(installment.id);
    const paymentId = db.collection("installments").doc().id;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;
    const saved = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(installmentRef);
      if (!snapshot.exists || snapshot.data().coupleId !== result.coupleId) return {error: "missing"};
      const data = snapshot.data();
      const payments = Array.isArray(data.payments) ? data.payments : [];
      const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const total = Number(data.totalDebt) || 0;
      if (paid + amount > total) return {error: "exceeds"};
      const updatedPaid = paid + amount;
      transaction.update(installmentRef, {
        payments: [...payments, {id: paymentId, month, amount, createdAt: new Date().toISOString()}],
      });
      return {title: data.title || "Cicilan", remaining: total - updatedPaid, progress: getProgress(updatedPaid, total)};
    });

    if (saved.error === "missing") {
      await sendWhatsApp(phone, "Cicilan tidak ditemukan. Coba kirim CICILAN lagi.");
      return;
    }
    if (saved.error === "exceeds") {
      await sendWhatsApp(phone, "Nominal pembayaran melebihi sisa utang. Cek sisa dengan perintah CICILAN.");
      return;
    }
    await sendWhatsApp(
        phone,
        `Pembayaran cicilan tersimpan ✅\n${saved.title}\n${formatMonth(month)} · ${formatRupiah(amount)}\n` +
        `Sisa utang: ${formatRupiah(saved.remaining)}\nProgres: ${bar(saved.progress)}`,
    );
  }

  return {handleList, handleHistory, handlePayment};
}

module.exports = {createWhatsappInstallmentHandlers};
