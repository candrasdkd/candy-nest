const crypto = require("crypto");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const {createExpenseHandlers} = require("../telegram/expenses");
const {createWhatsappAccountHandlers} = require("./accounts");
const {createWhatsappInstallmentHandlers} = require("./installments");
const {createWhatsappExpenseHandlers} = require("./expenses");
const {createWhatsappReportHandlers} = require("./reports");
const {createWhatsappFinanceHandlers} = require("./finance");
const {normalizePhone, formatRupiah} = require("./utils");

const db = admin.firestore();
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const FONNTE_WEBHOOK_SECRET = process.env.FONNTE_WEBHOOK_SECRET;

async function sendWhatsApp(target, message, inboxId) {
  if (!FONNTE_TOKEN) throw new Error("FONNTE_TOKEN belum dipasang sebagai secret Firebase.");
  const payload = {target, message, countryCode: "0"};
  if (inboxId !== undefined && inboxId !== null && inboxId !== "") payload.inboxid = inboxId;
  const response = await axios.post("https://api.fonnte.com/send", payload, {
    headers: {Authorization: FONNTE_TOKEN},
    timeout: 15000,
  });
  if (response.data?.status === false) {
    throw new Error(response.data.reason || "Fonnte menolak pesan.");
  }
  return response.data;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Reuse the exact keyword/date parser shared by the Telegram expense flow.
const expenseParser = createExpenseHandlers({
  db,
  admin,
  sendTelegram: async () => null,
  editTelegramMessage: async () => null,
  answerCallback: async () => null,
  escapeHtml: (value) => String(value || ""),
  formatRupiah,
});
const accountHandlers = createWhatsappAccountHandlers({db, admin, sendWhatsApp});
const installmentHandlers = createWhatsappInstallmentHandlers({db, sendWhatsApp});
const expenseHandlers = createWhatsappExpenseHandlers({db, sendWhatsApp, parseExpenseText: expenseParser.parseExpenseText});
const reportHandlers = createWhatsappReportHandlers({
  db,
  sendWhatsApp,
  getCategoryLabel: expenseParser.getCategoryLabel,
});
const financeHandlers = createWhatsappFinanceHandlers({db, admin, sendWhatsApp});

async function routeMessage(phone, rawText, name) {
  const text = String(rawText || "").trim();
  if (!text) return;
  const normalized = text.replace(/^\/+/, "").trim();
  const lower = normalized.toLowerCase();

  if (await reportHandlers.handlePendingUndo(phone, lower)) return;

  const connectMatch = normalized.match(/^(?:hubungkan|connect|start)\s+(.+)$/i);
  if (connectMatch) {
    await accountHandlers.handleConnect(phone, connectMatch[1], name);
    return;
  }
  if (["start"].includes(lower)) {
    await accountHandlers.handleStart(phone);
    return;
  }
  if (["hubungkan", "connect"].includes(lower)) {
    await accountHandlers.handleConnect(phone, "", name);
    return;
  }
  if (["menu", "help", "bantuan"].includes(lower)) {
    await accountHandlers.handleHelp(phone);
    return;
  }
  if (["putuskan", "disconnect", "unlink"].includes(lower)) {
    await accountHandlers.handleDisconnect(phone);
    return;
  }

  const installmentPageMatch = lower.match(/^(?:cicilan|installments)(?:\s+(\d+))?$/);
  if (installmentPageMatch) {
    await installmentHandlers.handleList(phone, Math.max(0, Number(installmentPageMatch[1] || 1) - 1));
    return;
  }

  const historyMatch = lower.match(/^(?:riwayat\s+cicilan|riwayatcicilan|history\s+cicilan|historycicilan)(?:\s+(\d+))?$/);
  if (historyMatch) {
    await installmentHandlers.handleHistory(phone, Math.max(0, Number(historyMatch[1] || 1) - 1));
    return;
  }

  const paymentMatch = normalized.match(/^(?:bayar|bayarcicilan)(?:\s+(.+))?$/i);
  if (paymentMatch) {
    await installmentHandlers.handlePayment(phone, paymentMatch[1] || "");
    return;
  }

  if (["rekap", "hari ini", "rekap hari ini"].includes(lower)) {
    await reportHandlers.handleSummary(phone, "day");
    return;
  }
  if (["pos", "tabungan", "pos tabungan"].includes(lower)) {
    await financeHandlers.handlePots(phone);
    return;
  }
  if (["alokasi", "alokasi bulanan", "perencanaan"].includes(lower)) {
    await financeHandlers.handleAllocations(phone);
    return;
  }
  const depositMatch = normalized.match(/^(?:setor|deposit)(?:\s+(.+))?$/i);
  if (depositMatch) {
    await financeHandlers.handlePotMutation(phone, "deposit", depositMatch[1] || "");
    return;
  }
  const withdrawMatch = normalized.match(/^(?:ambil|tarik)(?:\s+(.+))?$/i);
  if (withdrawMatch) {
    await financeHandlers.handlePotMutation(phone, "withdraw", withdrawMatch[1] || "");
    return;
  }
  const transactionHistoryMatch = lower.match(/^(?:riwayat transaksi|transaksi)(?:\s+(\d+))?$/);
  if (transactionHistoryMatch) {
    await financeHandlers.handleTransactionHistory(phone, Math.max(0, Number(transactionHistoryMatch[1] || 1) - 1));
    return;
  }
  if (["rekap mingguan", "rekap minggu", "mingguan"].includes(lower)) {
    await reportHandlers.handleSummary(phone, "week");
    return;
  }
  if (["rekap bulanan", "rekap bulan", "bulanan"].includes(lower)) {
    await reportHandlers.handleSummary(phone, "month");
    return;
  }
  if (["undo", "batal transaksi"].includes(lower)) {
    await reportHandlers.handleUndo(phone);
    return;
  }

  // Ignore greetings, chatter, and unknown commands. Only recognized expense
  // entries should start the expense flow and cause an automatic reply.
  if (normalized.startsWith("/")) return;
  const parsedExpense = expenseParser.parseExpenseText(text);
  if (!parsedExpense) return;
  await expenseHandlers.handleExpense(phone, text);
}

exports.whatsappWebhook = functions.runWith({secrets: ["FONNTE_TOKEN", "FONNTE_WEBHOOK_SECRET"]}).https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(200).send("CandyNest WhatsApp webhook is active.");
    return;
  }
  if (!FONNTE_WEBHOOK_SECRET) {
    console.error("[WhatsApp] FONNTE_WEBHOOK_SECRET belum dikonfigurasi.");
    res.status(503).send("WhatsApp webhook secret is not configured.");
    return;
  }

  const payload = req.body || {};
  const suppliedSecret = payload.key || payload.secret || payload.webhook_key || req.query.key;
  if (!safeEqual(suppliedSecret, FONNTE_WEBHOOK_SECRET)) {
    res.status(401).send("Unauthorized");
    return;
  }

  // Do not process group messages; financial records must stay in the sender's private chat.
  if (payload.member || String(payload.sender || "").includes("@g.us")) {
    res.status(200).send("OK");
    return;
  }
  const phone = normalizePhone(payload.sender);
  // Fonnte's `message` is free text; `text` is the text of an interactive button.
  const message = String(payload.message || payload.text || "").trim();
  if (!phone || !message) {
    res.status(200).send("OK");
    return;
  }

  try {
    await routeMessage(phone, message, payload.name || "");
  } catch (error) {
    console.error("[WhatsApp Webhook] Gagal memproses pesan:", error.response?.data || error.message);
    try {
      await sendWhatsApp(phone, "Maaf, pesan belum bisa diproses. Coba lagi sebentar ya.", payload.inboxid);
    } catch (sendError) {
      console.error("[WhatsApp] Gagal mengirim balasan error:", sendError.response?.data || sendError.message);
    }
  }
  res.status(200).send("OK");
});
