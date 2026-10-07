/** Telegram expense summaries and undo command. */
function createReportHandlers({db, sendTelegram, formatRupiah, escapeHtml, getCategoryLabel}) {
  async function handleRekap(chatId, messageId) {
    const userSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();

    if (userSnap.empty) {
      await sendTelegram(chatId, "⚠️ Hubungkan akunmu dulu dengan <code>/connect KODE_UNDANGAN</code>.", messageId);
      return;
    }

    const userData = userSnap.docs[0].data();
    const coupleId = userData.coupleId;

    if (!coupleId) {
      await sendTelegram(chatId, "⚠️ Akunmu belum terhubung ke pasangan di CandyNest.", messageId);
      return;
    }

    const today = new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
    const txSnap = await db.collection("transactions")
        .where("coupleId", "==", coupleId)
        .where("date", "==", today)
        .where("type", "==", "expense")
        .get();

    if (txSnap.empty) {
      await sendTelegram(chatId, `📅 <b>Rekap Hari Ini (${today}):</b>\n\nBelum ada pengeluaran yang dicatat hari ini. Santuy! 🍭`, messageId);
      return;
    }

    let total = 0;
    const transactions = [];
    txSnap.forEach((doc) => {
      const data = doc.data();
      const amt = Number(data.amount) || 0;
      total += amt;
      transactions.push(data);
    });

    const visibleTransactions = transactions.slice(0, 8);
    const items = visibleTransactions.map((data) => {
      const note = String(data.description || "").trim();
      const shortNote = note.length > 55 ? `${note.slice(0, 52)}…` : note;
      const detail = shortNote ? ` — ${escapeHtml(shortNote)}` : "";
      return `• ${formatRupiah(Number(data.amount) || 0)} · ${escapeHtml(getCategoryLabel(data.category))}${detail}`;
    }).join("\n");
    const remainingCount = transactions.length - visibleTransactions.length;

    await sendTelegram(
        chatId,
        `📊 <b>Pengeluaran hari ini</b> · <code>${today}</code>\n\n` +
      `${items}${remainingCount > 0 ? `\n<i>+${remainingCount} transaksi lainnya</i>` : ""}\n\n` +
      `<b>${formatRupiah(total)}</b> · ${transactions.length} transaksi`,
        messageId,
    );
  }

  /**
 * Format a number as Indonesian Rupiah.
 * @param {number} amount
 * @return {string}
 */

  function getJakartaToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  /**
 * Send an expense summary for the current week or month.
 * @param {number|string} chatId
 * @param {number} messageId
 * @param {"week"|"month"} period
 */
  async function handlePeriodRekap(chatId, messageId, period) {
    const userSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();

    if (userSnap.empty) {
      await sendTelegram(chatId, "⚠️ Hubungkan akunmu dulu dengan <code>/connect KODE_UNDANGAN</code>.", messageId);
      return;
    }

    const userData = userSnap.docs[0].data();
    if (!userData.coupleId) {
      await sendTelegram(chatId, "⚠️ Akunmu belum terhubung ke pasangan di CandyNest.", messageId);
      return;
    }

    const today = getJakartaToday();
    const todayDate = new Date(`${today}T00:00:00.000Z`);
    let startDate;
    let title;
    if (period === "week") {
      const daysSinceMonday = (todayDate.getUTCDay() + 6) % 7;
      todayDate.setUTCDate(todayDate.getUTCDate() - daysSinceMonday);
      startDate = todayDate.toISOString().slice(0, 10);
      title = "Rekap Minggu Ini";
    } else {
      startDate = `${today.slice(0, 7)}-01`;
      title = "Rekap Bulan Ini";
    }

    // Query only by coupleId to avoid requiring a composite Firestore index
    // for the date range; filter the small family transaction set in memory.
    const txSnap = await db.collection("transactions")
        .where("coupleId", "==", userData.coupleId)
        .get();

    let expenses = 0;
    let expenseCount = 0;
    const categories = new Map();
    txSnap.forEach((doc) => {
      const tx = doc.data();
      if (typeof tx.date !== "string" || tx.date < startDate || tx.date > today) return;
      const amount = Number(tx.amount) || 0;
      if (tx.type === "expense") {
        expenses += amount;
        expenseCount += 1;
        const category = getCategoryLabel(tx.category);
        categories.set(category, (categories.get(category) || 0) + amount);
      }
    });

    const categoryLines = [...categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, amount]) => `• ${escapeHtml(category)}: ${formatRupiah(amount)}`)
        .join("\n");

    const rangeLabel = period === "week" ? `${startDate} s.d. ${today}` : today.slice(0, 7);
    const message =
      `📊 <b>${title}</b>\n<code>${rangeLabel}</code>\n\n` +
      `<b>${formatRupiah(expenses)}</b> · ${expenseCount} transaksi` +
      (categoryLines ? `\n\n<b>Top kategori</b>\n${categoryLines}` : "\n\nBelum ada pengeluaran pada periode ini.");

    await sendTelegram(chatId, message, messageId);
  }

  /**
 * Offer to undo the latest expense recorded by this Telegram account.
 * @param {number|string} chatId
 * @param {number} messageId
 */
  async function handleUndo(chatId, messageId) {
    const userSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();

    if (userSnap.empty) {
      await sendTelegram(chatId, "⚠️ Hubungkan akunmu dulu dengan <code>/connect KODE_UNDANGAN</code>.", messageId);
      return;
    }

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();
    if (!userData.coupleId) {
      await sendTelegram(chatId, "⚠️ Akunmu belum terhubung ke pasangan di CandyNest.", messageId);
      return;
    }
    const txSnap = await db.collection("transactions")
        .where("coupleId", "==", userData.coupleId)
        .get();
    const latest = txSnap.docs
        .filter((doc) => {
          const tx = doc.data();
          return tx.userId === userDoc.id && tx.source === "telegram_bot" && tx.type === "expense";
        })
        .sort((a, b) => (b.data().createdAt || "").localeCompare(a.data().createdAt || ""))[0];

    if (!latest) {
      await sendTelegram(chatId, "Belum ada pengeluaran dari bot yang bisa dibatalkan.", messageId);
      return;
    }

    const tx = latest.data();
    const createdAt = new Date(tx.createdAt || 0).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      await sendTelegram(chatId, "Transaksi bot terakhirmu sudah lewat 24 jam, jadi tidak bisa dibatalkan lewat <code>/undo</code>.", messageId);
      return;
    }

    await sendTelegram(
        chatId,
        `Batalkan transaksi ini?\n\n💸 <b>${formatRupiah(Number(tx.amount) || 0)}</b> — ${escapeHtml(tx.description || getCategoryLabel(tx.category))}\n📅 ${escapeHtml(tx.date)}`,
        messageId,
        {inline_keyboard: [[
          {text: "🗑 Ya, batalkan", callback_data: `undo:confirm:${latest.id}`},
          {text: "Jangan", callback_data: `undo:cancel:${latest.id}`},
        ]]},
    );
  }

  /**
 * Handle bantuan format
 */

  return {handleRekap, handlePeriodRekap, handleUndo};
}

module.exports = {createReportHandlers};
