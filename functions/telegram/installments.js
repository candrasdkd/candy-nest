/** Create the Telegram handlers that read and update installment records. */
function createInstallmentHandlers({db, sendTelegram, editTelegramMessage, answerCallback, formatRupiah, escapeHtml}) {
  function parseInstallmentPaymentInput(text) {
    const cleaned = String(text || "").trim();
    const monthYearMatch = cleaned.match(/^(.*?)\s+(\d{1,2})[/-](\d{4})$/);
    const yearMonthMatch = cleaned.match(/^(.*?)\s+(\d{4})-(\d{2})$/);
    const match = monthYearMatch || yearMonthMatch;
    if (!match) return null;

    const amountText = match[1].trim();
    const moneyMatch = amountText.match(/^(?:rp\.?\s*)?([\d.,]+)\s*(jt|juta|m|mio|k|rb|ribu)?$/i);
    if (!moneyMatch) return null;

    const amountValue = moneyMatch[1];
    const unit = (moneyMatch[2] || "").toLowerCase();
    let amount;
    if (unit) {
      const multiplier = ["jt", "juta", "m", "mio"].includes(unit) ? 1000000 : 1000;
      amount = Math.round(parseFloat(amountValue.replace(",", ".")) * multiplier);
    } else {
      amount = Number(amountValue.replace(/\D/g, ""));
    }

    const month = Number(monthYearMatch ? match[2] : match[3]);
    const year = Number(monthYearMatch ? match[3] : match[2]);
    if (!Number.isSafeInteger(amount) || amount <= 0 || month < 1 || month > 12 || year < 1900 || year > 9999) {
      return null;
    }

    return {amount, month: `${year}-${String(month).padStart(2, "0")}`};
  }

  function formatMonth(monthValue) {
    const [year, month] = String(monthValue || "").split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) return String(monthValue || "");
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("id-ID", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
  }

  function progressPercent(paid, totalDebt) {
    if (!Number.isFinite(totalDebt) || totalDebt <= 0) return 0;
    return Math.min(100, Math.round((paid / totalDebt) * 100));
  }

  function progressBar(percent) {
    const filled = Math.round(percent / 10);
    return `<code>${"■".repeat(filled)}${"□".repeat(10 - filled)}</code> ${percent}%`;
  }

  async function loadPaymentHistory(chatId) {
    const userSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();
    if (userSnap.empty) return {error: "unlinked"};

    const coupleId = userSnap.docs[0].data().coupleId;
    if (!coupleId) return {error: "uncoupled"};

    const installmentSnap = await db.collection("installments")
        .where("coupleId", "==", coupleId)
        .get();
    const payments = [];
    installmentSnap.forEach((doc) => {
      const installment = doc.data();
      (Array.isArray(installment.payments) ? installment.payments : []).forEach((payment) => {
        payments.push({
          title: installment.title || "Cicilan",
          month: payment.month || "",
          amount: Number(payment.amount) || 0,
          createdAt: payment.createdAt || "",
        });
      });
    });
    payments.sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
    return {payments};
  }

  function paymentHistoryPageMarkup(page, pageCount) {
    if (pageCount <= 1) return null;
    const buttons = [];
    if (page > 0) buttons.push({text: "⬅️ Sebelumnya", callback_data: `installment:history:${page - 1}`});
    buttons.push({text: `${page + 1}/${pageCount}`, callback_data: "installment:history:noop"});
    if (page < pageCount - 1) buttons.push({text: "Selanjutnya ➡️", callback_data: `installment:history:${page + 1}`});
    return {inline_keyboard: [buttons]};
  }

  async function showPaymentHistory(chatId, messageId, page = 0, edit = false) {
    const result = await loadPaymentHistory(chatId);
    if (result.error === "unlinked") {
      await sendTelegram(chatId, "Hubungkan akun dulu dengan <code>/connect KODE_UNDANGAN</code>.", messageId);
      return;
    }
    if (result.error === "uncoupled") {
      await sendTelegram(chatId, "Akunmu belum terhubung dengan pasangan di CandyNest.", messageId);
      return;
    }
    if (result.payments.length === 0) {
      const text = "Belum ada riwayat pembayaran cicilan.";
      if (edit) await editTelegramMessage(chatId, messageId, text);
      else await sendTelegram(chatId, text, messageId);
      return;
    }

    const pageSize = 8;
    const pageCount = Math.ceil(result.payments.length / pageSize);
    const currentPage = Math.max(0, Math.min(Number(page) || 0, pageCount - 1));
    const visiblePayments = result.payments.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
    const lines = visiblePayments.map((payment) =>
      `• <b>${escapeHtml(payment.title)}</b>\n` +
      `  ${escapeHtml(formatMonth(payment.month))} · ${formatRupiah(payment.amount)}`,
    );
    const text = "🧾 <b>Riwayat Pembayaran Cicilan</b>\n" +
      `<i>${result.payments.length} pembayaran · halaman ${currentPage + 1}/${pageCount}</i>\n\n` +
      lines.join("\n\n");
    const markup = paymentHistoryPageMarkup(currentPage, pageCount);
    if (edit) await editTelegramMessage(chatId, messageId, text, markup);
    else await sendTelegram(chatId, text, messageId, markup);
  }

  async function handleInstallmentHistory(chatId, messageId, page = 0) {
    await showPaymentHistory(chatId, messageId, page);
  }

  async function handleInstallmentHistoryCallback(queryId, chatId, messageId, page) {
    if (page === "noop") {
      await answerCallback(queryId, "Halaman riwayat cicilan");
      return;
    }
    const pageNumber = Number(page);
    if (!Number.isInteger(pageNumber) || pageNumber < 0) {
      await answerCallback(queryId, "Halaman tidak valid.");
      return;
    }
    await showPaymentHistory(chatId, messageId, pageNumber, true);
    await answerCallback(queryId, "Riwayat diperbarui.");
  }

  async function handleInstallmentList(chatId, messageId) {
    const linkedUserSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();
    if (linkedUserSnap.empty) {
      await sendTelegram(chatId, "Hubungkan akun dulu dengan <code>/connect KODE_UNDANGAN</code>.", messageId);
      return;
    }

    const userDoc = linkedUserSnap.docs[0];
    const userData = userDoc.data();
    if (!userData.coupleId) {
      await sendTelegram(chatId, "Akunmu belum terhubung dengan pasangan di CandyNest.", messageId);
      return;
    }

    const installmentSnap = await db.collection("installments")
        .where("coupleId", "==", userData.coupleId)
        .get();
    if (installmentSnap.empty) {
      await sendTelegram(chatId, "Belum ada cicilan di akun CandyNest-mu. Tambahkan dulu lewat aplikasi.", messageId);
      return;
    }

    const installments = installmentSnap.docs.map((doc) => ({id: doc.id, ...doc.data()}))
        .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "id"));
    const rows = installments.slice(0, 20).map((item) => {
      const paid = (Array.isArray(item.payments) ? item.payments : [])
          .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const totalDebt = Number(item.totalDebt) || 0;
      const remaining = Math.max(0, totalDebt - paid);
      const progress = progressPercent(paid, totalDebt);
      const title = String(item.title || "Cicilan");
      return {
        item,
        paid,
        totalDebt,
        remaining,
        progress,
        button: {text: `💳 Bayar · ${title}`.slice(0, 60), callback_data: `installment:pay:${item.id}`},
      };
    });

    const lines = rows.map(({item, paid, totalDebt, remaining, progress}) =>
      `• <b>${escapeHtml(item.title || "Cicilan")}</b>\n` +
      `  Total ${formatRupiah(totalDebt)}\n` +
      `  Dibayar ${formatRupiah(paid)} · Sisa ${formatRupiah(remaining)}\n` +
      `  ${progressBar(progress)}`,
    );
    if (installments.length > rows.length) lines.push(`<i>+${installments.length - rows.length} cicilan lainnya tidak ditampilkan.</i>`);

    await sendTelegram(
        chatId,
        `🏠 <b>Cicilan Keluarga</b>\n\n${lines.join("\n\n")}\n\nPilih cicilan untuk mencatat pembayaran.`,
        messageId,
        {inline_keyboard: rows.map(({button}) => [button])},
    );
  }

  async function handlePendingInstallmentPayment(chatId, message, text) {
    const sessionRef = db.collection("telegramInstallmentSessions").doc(String(chatId));
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return false;

    const session = sessionSnap.data();
    if (message.reply_to_message?.message_id !== session.promptMessageId) return false;

    if (!Number.isFinite(session.expiresAt) || Date.now() > session.expiresAt) {
      await sessionRef.delete();
      await sendTelegram(chatId, "Waktu mencatat pembayaran sudah habis. Ketik <code>/cicilan</code> untuk mencoba lagi.", message.message_id);
      return true;
    }
    if (text.trim().toLowerCase() === "/cancel") {
      await sessionRef.delete();
      await sendTelegram(chatId, "Pencatatan pembayaran dibatalkan.", message.message_id);
      return true;
    }

    const parsed = parseInstallmentPaymentInput(text);
    if (!parsed) {
      await sendTelegram(
          chatId,
          "Format belum sesuai. Balas prompt dengan <code>nominal bulan/tahun</code>, misalnya <code>6.000.000 08/2026</code>. Ketik <code>/cancel</code> untuk batal.",
          message.message_id,
      );
      return true;
    }

    const userRef = db.collection("users").doc(session.userId);
    const userSnap = await userRef.get();
    const installmentRef = db.collection("installments").doc(session.installmentId);
    if (!userSnap.exists || userSnap.data().telegramChatId !== chatId || userSnap.data().coupleId !== session.coupleId) {
      await sessionRef.delete();
      await sendTelegram(chatId, "Koneksi akun berubah. Hubungkan kembali akun Telegram-mu untuk mencatat pembayaran.", message.message_id);
      return true;
    }

    const paymentId = db.collection("installments").doc().id;
    const result = await db.runTransaction(async (transaction) => {
      const installmentSnap = await transaction.get(installmentRef);
      if (!installmentSnap.exists || installmentSnap.data().coupleId !== session.coupleId) return {error: "missing"};
      const data = installmentSnap.data();
      const payments = Array.isArray(data.payments) ? data.payments : [];
      const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
      const totalDebt = Number(data.totalDebt) || 0;
      if (paid + parsed.amount > totalDebt) return {error: "exceeds"};

      const payment = {id: paymentId, month: parsed.month, amount: parsed.amount, createdAt: new Date().toISOString()};
      transaction.update(installmentRef, {payments: [...payments, payment]});
      const updatedPaid = paid + parsed.amount;
      return {
        title: data.title || "Cicilan",
        remaining: totalDebt - updatedPaid,
        progress: progressPercent(updatedPaid, totalDebt),
      };
    });

    if (result.error === "missing") {
      await sessionRef.delete();
      await sendTelegram(chatId, "Cicilan tidak ditemukan atau bukan milik akunmu.", message.message_id);
      return true;
    }
    if (result.error === "exceeds") {
      await sendTelegram(chatId, "Nominal pembayaran melebihi sisa utang. Kirim nominal yang lebih kecil atau ketik <code>/cancel</code>.", message.message_id);
      return true;
    }

    await sessionRef.delete();
    await sendTelegram(
        chatId,
        `✅ <b>Pembayaran cicilan tercatat</b>\n${escapeHtml(result.title)}\n${escapeHtml(formatMonth(parsed.month))} · ${formatRupiah(parsed.amount)}\nSisa utang ${formatRupiah(result.remaining)}\nProgres ${progressBar(result.progress)}`,
        message.message_id,
    );
    return true;
  }

  async function handleInstallmentPaymentCallback(queryId, chatId, messageId, installmentId) {
    const linkedUserSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();
    if (linkedUserSnap.empty) {
      await answerCallback(queryId, "Hubungkan akun CandyNest terlebih dahulu.");
      return;
    }

    const linkedUser = linkedUserSnap.docs[0];
    const userData = linkedUser.data();
    const installmentRef = db.collection("installments").doc(installmentId);
    const installmentSnap = await installmentRef.get();
    if (!installmentSnap.exists || !userData.coupleId || installmentSnap.data().coupleId !== userData.coupleId) {
      await answerCallback(queryId, "Cicilan tidak ditemukan atau bukan milik akunmu.");
      return;
    }

    const installment = installmentSnap.data();
    const payments = Array.isArray(installment.payments) ? installment.payments : [];
    const paid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const remaining = Math.max(0, (Number(installment.totalDebt) || 0) - paid);
    if (remaining <= 0) {
      await answerCallback(queryId, "Cicilan ini sudah lunas.");
      return;
    }

    const prompt = await sendTelegram(
        chatId,
        `💳 <b>${escapeHtml(installment.title || "Cicilan")}</b>\nSisa utang: ${formatRupiah(remaining)}\n\nBalas pesan ini dengan <code>nominal bulan/tahun</code>, misalnya <code>6.000.000 08/2026</code>. Ketik <code>/cancel</code> untuk batal.`,
        messageId,
        {force_reply: true, selective: true, input_field_placeholder: "Contoh: 6.000.000 08/2026"},
    );
    const promptMessageId = prompt?.result?.message_id;
    if (!promptMessageId) {
      await answerCallback(queryId, "Gagal membuka form pembayaran. Coba lagi.");
      return;
    }

    await db.collection("telegramInstallmentSessions").doc(String(chatId)).set({
      installmentId,
      userId: linkedUser.id,
      coupleId: userData.coupleId,
      promptMessageId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    await answerCallback(queryId, "Balas pesan bot untuk menyimpan pembayaran.");
  }

  return {
    handleInstallmentList,
    handleInstallmentHistory,
    handleInstallmentHistoryCallback,
    handlePendingInstallmentPayment,
    handleInstallmentPaymentCallback,
  };
}

module.exports = {createInstallmentHandlers};
