const {findLinkedUser, formatRupiah, parseAmount} = require("./utils");

const PAGE_SIZE = 8;

function createWhatsappFinanceHandlers({db, admin, sendWhatsApp}) {
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

  async function handlePots(phone) {
    const context = await getLinkedContext(phone);
    if (!context) return;
    const snapshot = await db.collection("savingsPots")
        .where("coupleId", "==", context.coupleId).get();
    const pots = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    if (!pots.length) {
      await sendWhatsApp(phone, "Belum ada pos tabungan. Buat posnya dulu di aplikasi CandyNest.");
      return;
    }
    const total = pots.reduce((sum, pot) => sum + (Number(pot.currentBalance) || 0), 0);
    const lines = pots.map((pot, index) =>
      `${index + 1}. ${pot.emoji || "💰"} ${pot.name}\n   Saldo: ${formatRupiah(pot.currentBalance)}${pot.targetAmount ? ` / ${formatRupiah(pot.targetAmount)}` : ""}`,
    );
    await sendWhatsApp(phone, `🏺 POS TABUNGAN\n\n${lines.join("\n\n")}\n\nTotal saldo: ${formatRupiah(total)}\n\nSETOR <nomor> <nominal> [catatan]\nAMBIL <nomor> <nominal> [catatan]`);
  }

  async function handlePotMutation(phone, action, rawArgs) {
    const context = await getLinkedContext(phone);
    if (!context) return;
    const match = String(rawArgs || "").trim().match(/^(\d+)\s+(.+?)(?:\s+(.+))?$/);
    if (!match) {
      await sendWhatsApp(phone, `Format: ${action === "deposit" ? "SETOR" : "AMBIL"} <nomor pos> <nominal> [catatan]\nContoh: ${action === "deposit" ? "SETOR" : "AMBIL"} 1 250rb tabungan bulanan\nKetik POS untuk melihat nomor pos.`);
      return;
    }
    const index = Number(match[1]) - 1;
    const amount = parseAmount(match[2]);
    const note = String(match[3] || (action === "deposit" ? "Setor dari WhatsApp" : "Penarikan dari WhatsApp")).trim().slice(0, 120);
    if (!Number.isInteger(index) || index < 0 || amount <= 0 || amount > 100000000) {
      await sendWhatsApp(phone, "Nomor pos atau nominal tidak valid. Nominal maksimal Rp100.000.000.");
      return;
    }
    const potsSnapshot = await db.collection("savingsPots").where("coupleId", "==", context.coupleId).get();
    const pots = potsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}))
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    const pot = pots[index];
    if (!pot) {
      await sendWhatsApp(phone, "Nomor pos tidak ditemukan. Ketik POS untuk melihat daftar pos.");
      return;
    }

    const potRef = db.collection("savingsPots").doc(pot.id);
    const potTxRef = db.collection("potTransactions").doc();
    const mainTxRef = db.collection("transactions").doc();
    const now = new Date().toISOString();
    let newBalance = 0;
    await db.runTransaction(async (transaction) => {
      const latestPot = await transaction.get(potRef);
      if (!latestPot.exists || latestPot.data().coupleId !== context.coupleId) throw new Error("POS_NOT_FOUND");
      const balance = Number(latestPot.data().currentBalance) || 0;
      if (action === "withdraw" && amount > balance) throw new Error("INSUFFICIENT_POT_BALANCE");
      newBalance = balance + (action === "deposit" ? amount : -amount);
      transaction.update(potRef, {currentBalance: newBalance});
      transaction.set(potTxRef, {
        potId: pot.id,
        coupleId: context.coupleId,
        type: action,
        amount,
        note,
        date: new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"}),
        addedBy: context.user.displayName || "WhatsApp",
        createdAt: now,
      });
      const mainTx = {
        userId: context.userDoc.id,
        coupleId: context.coupleId,
        type: action === "deposit" ? "income" : "expense",
        category: action === "deposit" ? "lainnya_pemasukan" : "lainnya_pengeluaran",
        amount,
        description: `[Pos ${pot.name}] ${note}`,
        date: new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"}),
        addedBy: context.user.displayName || "WhatsApp",
        createdAt: now,
        relatedPotId: pot.id,
        source: "whatsapp_bot",
      };
      if (action === "withdraw") {
        mainTx.expenseForUserId = context.userDoc.id;
        mainTx.expenseScope = "personal";
      }
      transaction.set(mainTxRef, mainTx);
    });
    await sendWhatsApp(phone, `${action === "deposit" ? "Setoran" : "Penarikan"} pos tersimpan ✅\n${pot.emoji || "💰"} ${pot.name}\n${formatRupiah(amount)} · ${note}\nSaldo sekarang: ${formatRupiah(newBalance)}`);
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

  return {handlePots, handlePotMutation, handleAllocations, handleTransactionHistory};
}

module.exports = {createWhatsappFinanceHandlers};
