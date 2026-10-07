const {findLinkedUser, formatRupiah} = require("./utils");

const PAGE_SIZE = 8;

function createWhatsappFinanceHandlers({db, sendWhatsApp}) {
  async function getLinkedContext(phone) {
    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc) {
      await sendWhatsApp(phone, "Hubungkan akun dulu dengan HUBUNGKAN KODE_UNDANGAN.");
      return null;
    }
    const user = userDoc.data();
    if (!user.coupleId) {
      await sendWhatsApp(phone, "Akunmu belum terhubung dengan pasangan di CandyNest.");
      return null;
    }
    return {userDoc, user, coupleId: user.coupleId};
  }

  async function handleAllocations(phone) {
    const context = await getLinkedContext(phone);
    if (!context) return;
    const snapshot = await db.collection("allocations").where("coupleId", "==", context.coupleId).get();
    const allocations = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    if (!allocations.length) {
      await sendWhatsApp(phone, "Belum ada rencana alokasi bulanan. Tambahkan dulu di menu Perencanaan aplikasi.");
      return;
    }
    let mine = 0;
    let partner = 0;
    const lines = allocations.map((item) => {
      const isA = item.userIdA === context.userDoc.id;
      const myAmount = Number(isA ? item.amountA : item.amountB) || 0;
      const partnerAmount = Number(isA ? item.amountB : item.amountA) || 0;
      mine += myAmount;
      partner += partnerAmount;
      return `• ${item.name}\n  Kamu: ${formatRupiah(myAmount)} · Pasangan: ${formatRupiah(partnerAmount)}`;
    });
    await sendWhatsApp(phone, `📋 ALOKASI BULANAN\n\n${lines.join("\n\n")}\n\nTotal kamu: ${formatRupiah(mine)}\nTotal pasangan: ${formatRupiah(partner)}\nTotal bersama: ${formatRupiah(mine + partner)}`);
  }

  async function handleTransactionHistory(phone, page = 0) {
    const context = await getLinkedContext(phone);
    if (!context) return;
    const snapshot = await db.collection("transactions").where("coupleId", "==", context.coupleId).get();
    const transactions = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const pageCount = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
    const safePage = Math.min(Math.max(0, page), pageCount - 1);
    const rows = transactions.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
    if (!rows.length) {
      await sendWhatsApp(phone, "Belum ada transaksi tercatat.");
      return;
    }
    const lines = rows.map((tx) => {
      const sign = tx.type === "income" ? "+" : "−";
      const label = String(tx.description || tx.category || "Transaksi").replace(/[\r\n]+/g, " ").slice(0, 72);
      return `${tx.type === "income" ? "🟢" : "🔴"} ${tx.date || "Tanggal tidak diketahui"}\n${label}\n${sign}${formatRupiah(tx.amount)}`;
    });
    await sendWhatsApp(phone, `🧾 RIWAYAT TRANSAKSI · ${safePage + 1}/${pageCount}\n\n${lines.join("\n\n")}${safePage + 1 < pageCount ? `\n\nHalaman berikutnya: RIWAYAT TRANSAKSI ${safePage + 2}` : ""}`);
  }

  return {handleAllocations, handleTransactionHistory};
}

module.exports = {createWhatsappFinanceHandlers};
