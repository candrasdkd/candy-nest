const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const db = admin.firestore();
const {createInstallmentHandlers} = require("./installments");
const {createAccountHandlers} = require("./accounts");
const {createExpenseHandlers} = require("./expenses");
const {createReportHandlers} = require("./reports");

// --- TELEGRAM BOT INTEGRATION ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function escapeHtml(str) {
  return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}

/**
 * Mengirim pesan ke Telegram
 * @param {number|string} chatId
 * @param {string} htmlText
 * @param {number} [replyToMessageId]
 * @param {Object} [replyMarkup]
 */
async function sendTelegram(chatId, htmlText, replyToMessageId = null, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: htmlText,
      parse_mode: "HTML",
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const resp = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        payload,
    );
    return resp.data;
  } catch (error) {
    console.error("[GAGAL] Tidak bisa kirim pesan Telegram:", error.response ? error.response.data : error.message);
    return null;
  }
}

/**
 * Mengedit teks dan tombol pesan Telegram
 * @param {number|string} chatId
 * @param {number} messageId
 * @param {string} htmlText
 * @param {Object} [replyMarkup]
 */
async function editTelegramMessage(chatId, messageId, htmlText, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: htmlText,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`,
        payload,
    );
  } catch (error) {
    console.error("[GAGAL] editTelegramMessage:", error.response ? error.response.data : error.message);
  }
}

/**
 * Memberikan toast notifikasi singkat atas klik tombol callback
 * @param {string} queryId
 * @param {string} text
 */
async function answerCallback(queryId, text) {
  try {
    await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
          callback_query_id: queryId,
          text: text,
        },
    );
  } catch (error) {
    console.error("[GAGAL] answerCallbackQuery:", error.message);
  }
}

const TELEGRAM_COMMANDS = [
  {command: "cicilan", description: "Lihat cicilan dan catat pembayaran"},
  {command: "riwayatcicilan", description: "Lihat riwayat pembayaran cicilan"},
  {command: "rekap", description: "Pengeluaran hari ini"},
  {command: "rekapmingguan", description: "Rekap pengeluaran minggu ini"},
  {command: "rekapbulanan", description: "Rekap pengeluaran bulan ini"},
  {command: "undo", description: "Batalkan pengeluaran terakhir"},
  {command: "connect", description: "Hubungkan akun CandyNest"},
  {command: "disconnect", description: "Putuskan koneksi akun"},
  {command: "help", description: "Bantuan format dan perintah"},
];

/** Register the command menu shown in Telegram chats with this bot. */
async function setTelegramCommands(token = TELEGRAM_BOT_TOKEN) {
  const response = await axios.post(
      `https://api.telegram.org/bot${token}/setMyCommands`,
      {commands: TELEGRAM_COMMANDS},
  );
  if (!response.data?.ok) throw new Error("Telegram menolak pengaturan daftar command.");
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const {
  handleInstallmentList,
  handleInstallmentHistory,
  handleInstallmentHistoryCallback,
  handlePendingInstallmentPayment,
  handleInstallmentPaymentCallback,
} = createInstallmentHandlers({db, sendTelegram, editTelegramMessage, answerCallback, formatRupiah, escapeHtml});
const {handleConnect, handleStart, handleDisconnect, handleHelp} =
  createAccountHandlers({db, admin, sendTelegram, escapeHtml});
const {handleExpenseRecord, handlePendingNoteEdit, handleExpenseCallback, getCategoryLabel} =
  createExpenseHandlers({db, admin, sendTelegram, editTelegramMessage, answerCallback, escapeHtml, formatRupiah});
const {handleRekap, handlePeriodRekap, handleUndo} =
  createReportHandlers({db, sendTelegram, formatRupiah, escapeHtml, getCategoryLabel});

async function handleCallbackQuery(callbackQuery) {
  const data = callbackQuery.data || "";
  if (data.startsWith("installment:history:")) {
    await handleInstallmentHistoryCallback(
        callbackQuery.id,
        callbackQuery.message?.chat?.id,
        callbackQuery.message?.message_id,
        data.slice("installment:history:".length),
    );
    return;
  }
  if (data.startsWith("installment:pay:")) {
    await handleInstallmentPaymentCallback(
        callbackQuery.id,
        callbackQuery.message?.chat?.id,
        callbackQuery.message?.message_id,
        data.slice("installment:pay:".length),
    );
    return;
  }
  await handleExpenseCallback(callbackQuery);
}

/**
 * Get today's calendar date in the Jakarta time zone.
 * @return {string}
 */
exports.telegramWebhook = functions.runWith({secrets: ["TELEGRAM_BOT_TOKEN"]}).https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(200).send("CandyNest Telegram Webhook is active.");
    return;
  }

  const update = req.body;
  if (!update) {
    res.status(200).send("OK");
    return;
  }

  // Handle klik tombol inline keyboard
  if (update.callback_query) {
    try {
      await handleCallbackQuery(update.callback_query);
    } catch (err) {
      console.error("[ERROR Callback Query]:", err);
    }
    res.status(200).send("OK");
    return;
  }

  if (!update.message) {
    res.status(200).send("OK");
    return;
  }

  const message = update.message;
  const chatId = message.chat?.id;
  const text = (message.text || message.caption || "").trim();
  const fromUser = message.from || {};

  if (!chatId || !text) {
    res.status(200).send("OK");
    return;
  }

  try {
    if (await handlePendingInstallmentPayment(chatId, message, text)) {
      res.status(200).send("OK");
      return;
    }

    if (await handlePendingNoteEdit(chatId, message, text)) {
      res.status(200).send("OK");
      return;
    }

    const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
    if (command === "/start") {
      const parts = text.split(/\s+/);
      const code = parts[1]?.trim();

      if (code) {
        await handleConnect(chatId, code, fromUser, message.message_id);
      } else {
        await handleStart(chatId, fromUser, message.message_id);
      }
      res.status(200).send("OK");
      return;
    }

    if (["/connect", "/link"].includes(command)) {
      const parts = text.split(/\s+/);
      const code = parts[1]?.trim();
      if (!code) {
        await sendTelegram(
            chatId,
            "⚠️ <b>Format salah.</b>\nContoh: <code>/connect KODE_UNDANGAN</code>\n\nKode undangan bisa kamu lihat di menu <b>Pengaturan</b> CandyNest.",
            message.message_id,
        );
      } else {
        await handleConnect(chatId, code, fromUser, message.message_id);
      }
      res.status(200).send("OK");
      return;
    }

    if (command === "/disconnect") {
      await handleDisconnect(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    if (["/cicilan", "/installments"].includes(command)) {
      await handleInstallmentList(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    if (["/riwayatcicilan", "/historycicilan"].includes(command)) {
      const page = Number(text.split(/\s+/)[1]) - 1;
      await handleInstallmentHistory(chatId, message.message_id, Number.isFinite(page) && page >= 0 ? page : 0);
      res.status(200).send("OK");
      return;
    }

    if (["/rekap", "/hariini"].includes(command)) {
      await handleRekap(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    if (["/rekapmingguan", "/rekapminggu"].includes(command)) {
      await handlePeriodRekap(chatId, message.message_id, "week");
      res.status(200).send("OK");
      return;
    }

    if (command === "/rekapbulanan") {
      await handlePeriodRekap(chatId, message.message_id, "month");
      res.status(200).send("OK");
      return;
    }

    if (command === "/undo") {
      await handleUndo(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    if (["/help", "/bantuan"].includes(command)) {
      await handleHelp(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    await handleExpenseRecord(chatId, text, message.message_id);
  } catch (err) {
    console.error("[ERROR Telegram Webhook]:", err);
    await sendTelegram(
        chatId,
        "⚠️ Maaf, terjadi kesalahan saat memproses pesan kamu. Coba lagi nanti ya.",
        message.message_id,
    );
  }

  res.status(200).send("OK");
});

// --- HELPER UNTUK SET WEBHOOK TELEGRAM OTOMATIS ---
exports.setTelegramWebhook = functions.runWith({secrets: ["TELEGRAM_BOT_TOKEN"]}).https.onRequest(async (req, res) => {
  try {
    const webhookUrl = "https://us-central1-candyfinancial-16cde.cloudfunctions.net/telegramWebhook";
    const resp = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
        {url: webhookUrl},
    );
    await setTelegramCommands();
    res.status(200).json({
      success: true,
      webhookUrl: webhookUrl,
      telegramResponse: resp.data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      data: err.response?.data,
    });
  }
});

// --- RESTORE TELEGRAM WEBHOOK FROM THE APP SETTINGS PAGE ---
exports.configureTelegramWebhook = functions.runWith({secrets: ["TELEGRAM_BOT_TOKEN"]}).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Masuk ke CandyNest dulu.");
  }

  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  if (!userSnap.exists || !userSnap.data().telegramChatId) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "Hubungkan akun CandyNest ke bot Telegram terlebih dahulu.",
    );
  }

  const submittedToken = String(data?.botToken || "").trim();
  if (!submittedToken || submittedToken !== TELEGRAM_BOT_TOKEN) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Token tidak cocok dengan bot CandyNest yang dipakai backend.",
    );
  }

  const webhookUrl = "https://us-central1-candyfinancial-16cde.cloudfunctions.net/telegramWebhook";
  try {
    const identity = await axios.get(`https://api.telegram.org/bot${submittedToken}/getMe`);
    const botUsername = identity.data?.result?.username;
    if (!identity.data?.ok || String(botUsername).toLowerCase() !== "candynest_bot") {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Token ini bukan milik CandyNest Bot.",
      );
    }

    const setup = await axios.post(
        `https://api.telegram.org/bot${submittedToken}/setWebhook`,
        {url: webhookUrl},
    );
    if (!setup.data?.ok) {
      throw new Error("Telegram menolak pemasangan webhook.");
    }
    await setTelegramCommands(submittedToken);

    const status = await axios.get(
        `https://api.telegram.org/bot${submittedToken}/getWebhookInfo`,
    );
    return {
      botUsername,
      webhookUrl: status.data?.result?.url || "",
      pendingUpdateCount: status.data?.result?.pending_update_count || 0,
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) throw error;
    console.error("[Telegram Setup] Gagal memasang webhook:", error.response?.data?.description || error.message);
    throw new functions.https.HttpsError(
        "unavailable",
        "Telegram gagal memasang webhook. Periksa token lalu coba lagi.",
    );
  }
});
