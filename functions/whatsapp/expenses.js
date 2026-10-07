const {findLinkedUser, formatRupiah} = require("./utils");

function createWhatsappExpenseHandlers({db, sendWhatsApp, parseExpenseText}) {
  async function getPartnerUid(userId, coupleId, currentPartnerUid) {
    if (currentPartnerUid) return currentPartnerUid;
    const coupleSnap = await db.collection("couples").doc(coupleId).get();
    if (!coupleSnap.exists) return null;
    return (coupleSnap.data().members || []).find((member) => member !== userId) || null;
  }

  async function handleExpense(phone, text) {
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

    const parsed = parseExpenseText(text);
    if (!parsed) {
      await sendWhatsApp(phone, "Format belum dikenali. Contoh: makan 35k soto ayam atau belanja 120k indomaret bersama.");
      return;
    }
    if (parsed.dateError) {
      await sendWhatsApp(phone, `${parsed.dateError}\nContoh tanggal: kemarin, 2 hari lalu, atau 3/10/2026.`);
      return;
    }

    const partnerUid = await getPartnerUid(userDoc.id, userData.coupleId, userData.partnerUid);
    let targetUserId = userDoc.id;
    let scopeLabel = "Pribadi";
    if (parsed.target === "shared") {
      targetUserId = null;
      scopeLabel = "Bersama";
    } else if (parsed.target === "partner") {
      targetUserId = partnerUid || userDoc.id;
      scopeLabel = `Pasangan (${userData.partnerName || "Pasangan"})`;
    }

    const txData = {
      userId: userDoc.id,
      coupleId: userData.coupleId,
      type: "expense",
      category: parsed.category,
      amount: parsed.amount,
      description: parsed.note,
      date: parsed.date.toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      addedBy: userData.displayName || "Saya",
      expenseScope: parsed.scope,
      source: "whatsapp_bot",
    };
    if (parsed.scope === "personal") txData.expenseForUserId = targetUserId;
    await db.collection("transactions").add(txData);

    const date = parsed.date.toLocaleDateString("id-ID", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    await sendWhatsApp(
        phone,
        `Pengeluaran tersimpan ✅\n${formatRupiah(parsed.amount)} · ${parsed.categoryEmoji} ${parsed.categoryLabel}\n` +
        `${parsed.note}\n${date} · ${scopeLabel}` +
        (parsed.isBackdated ? "\nDicatat mundur." : "") +
        "\n\nKetik UNDO jika ingin membatalkan transaksi terakhir dari WA.",
    );
  }

  return {handleExpense};
}

module.exports = {createWhatsappExpenseHandlers};
