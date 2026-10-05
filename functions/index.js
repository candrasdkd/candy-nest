const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();
const db = admin.firestore();

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const TARGET_NUMBERS = process.env.TARGET_NUMBERS;

// --- JADWAL: JAM 12:00 dan 19:00 WIB ---
exports.dailyReminderWA = functions.pubsub
    .schedule("0 12,19 * * *")
    .timeZone("Asia/Jakarta")
    .onRun(async (context) => {
      const today = new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});

      const txSnapshot = await db.collection("transactions")
          .where("date", "==", today)
          .get();

      const activeCoupleIds = new Set();
      txSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.coupleId) activeCoupleIds.add(data.coupleId);
        if (data.userId) activeCoupleIds.add(data.userId); // Fallback
      });

      const jakartaHour = parseInt(new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
        hour: "numeric",
        hour12: false,
      }));

      let message = "";
      let pushTitle = "";

      if (jakartaHour <= 15) {
        message = "Halo! 👋 Jajan apa hari ini? Jangan lupa catat pengeluaranmu di Candy Financial ya, biar tabungan kamu tetap manis! 🍬";
        pushTitle = "Waktunya Jajan? 🍬";
      } else {
        message = "Sudah mau istirahat? Yuk, luangkan waktu 1 menit buat rekap keuangan hari ini di Candy Financial. Biar besok bangun dengan tenang! 🍭";
        pushTitle = "Rekap Hari Ini 🍭";
      }

      if (txSnapshot.empty && TARGET_NUMBERS) {
        try {
          await axios.post(
              "https://api.fonnte.com/send",
              {
                target: TARGET_NUMBERS,
                message: message,
                countryCode: "62",
              },
              {
                headers: {
                  Authorization: FONNTE_TOKEN,
                },
              },
          );
        } catch (error) {
          console.error("[GAGAL] Tidak bisa mengirim WA via Fonnte:", error.message);
        }
      }

      try {
        const usersSnapshot = await db.collection("users").get();
        const allTokens = [];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const hasTransaction = activeCoupleIds.has(userData.coupleId) || activeCoupleIds.has(doc.id);
          if (!hasTransaction && userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
            allTokens.push(...userData.fcmTokens);
          }
        });

        if (allTokens.length > 0) {
          const uniqueTokens = [...new Set(allTokens)];

          const batchResult = await admin.messaging().sendEachForMulticast({
            tokens: uniqueTokens,
            notification: {
              title: pushTitle,
              body: message,
            },
            android: {
              notification: {
                sound: "default",
                priority: "high",
              },
            },
            apns: {
              payload: {
                aps: {sound: "default"},
              },
            },
          });

          // Cleanup stale tokens
          const invalidTokens = [];
          batchResult.responses.forEach((resp, idx) => {
            if (!resp.success &&
            (resp.error?.code === "messaging/registration-token-not-registered" ||
              resp.error?.code === "messaging/invalid-registration-token")) {
              invalidTokens.push(uniqueTokens[idx]);
            }
          });

          // Reuse usersSnapshot — tidak perlu fetch ulang
          if (invalidTokens.length > 0) {
            const batch = db.batch();
            usersSnapshot.forEach((doc) => {
              const tokens = doc.data().fcmTokens || [];
              const cleaned = tokens.filter((t) => !invalidTokens.includes(t));
              if (cleaned.length !== tokens.length) {
                batch.update(doc.ref, {fcmTokens: cleaned});
              }
            });
            await batch.commit();
            console.log(`[INFO] Cleaned ${invalidTokens.length} stale FCM token(s).`);
          }
        }
      } catch (error) {
        console.error("[GAGAL] Tidak bisa mengirim FCM:", error.message);
      }

      return null;
    });

// --- TELEGRAM BOT INTEGRATION ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8915111525:AAEl0sxFvf7HcQbtChjdWyiVr6642Y2F1-8";

const EXPENSE_CATEGORIES_CONFIG = [
  {
    category: "makan",
    label: "Makan & Minum",
    emoji: "🍽️",
    keywords: [
      "makan", "minum", "kopi", "coffee", "cafe", "kafe", "resto",
      "restoran", "soto", "bakso", "mie", "nasi", "ayam", "gofood",
      "grabfood", "shopeefood", "kfc", "mcd", "starbucks", "jajan",
      "snack", "roti", "sarapan", "lunch", "dinner", "warteg", "esteh",
      "boba", "mixue", "burger", "pizza", "chatime", "kuliner",
    ],
  },
  {
    category: "bensin",
    label: "Bensin",
    emoji: "⛽",
    keywords: [
      "bensin", "pertalite", "pertamax", "solar", "dex", "spbu", "shell",
      "bbm", "pom", "bp-akr", "turbo",
    ],
  },
  {
    category: "transport",
    label: "Transportasi",
    emoji: "🚗",
    keywords: [
      "transport", "transportasi", "gojek", "grab", "ojol", "goride",
      "gocar", "grabcar", "maxim", "krl", "mrt", "lrt", "tj",
      "transjakarta", "taksi", "taxi", "parkir", "tol", "kereta",
      "pesawat", "tiket",
    ],
  },
  {
    category: "belanja",
    label: "Belanja",
    emoji: "🛍️",
    keywords: [
      "belanja", "indomaret", "alfamart", "alfamidi", "superindo",
      "hypermart", "supermarket", "pasar", "shopee", "tokopedia",
      "tokped", "tiktok", "lazada", "mall", "baju", "kaos", "celana",
      "sepatu", "skincare", "sabun", "sampo", "odol", "deterjen",
      "pakaian",
    ],
  },
  {
    category: "tagihan",
    label: "Tagihan",
    emoji: "📄",
    keywords: [
      "tagihan", "listrik", "pln", "token", "pdam", "air", "wifi",
      "indihome", "biznet", "myrepublic", "firstmedia", "pulsa", "kuota",
      "telkomsel", "xl", "indosat", "tri", "smartfren", "bpjs", "pajak",
      "asuransi", "ipl", "kontrakan", "kost", "kos", "cicilan", "sewa",
    ],
  },
  {
    category: "servis",
    label: "Servis",
    emoji: "🔧",
    keywords: [
      "servis", "service", "bengkel", "oli", "ban", "cuci motor",
      "cuci mobil", "sparepart", "reparasi", "tambal",
    ],
  },
  {
    category: "kesehatan",
    label: "Kesehatan",
    emoji: "💊",
    keywords: [
      "obat", "apotek", "apotik", "dokter", "rs", "rumah sakit", "klinik",
      "vitamin", "lab", "paramita", "kimia farma", "k24", "medis",
    ],
  },
  {
    category: "hiburan",
    label: "Hiburan",
    emoji: "🎬",
    keywords: [
      "hiburan", "nonton", "bioskop", "cinema", "xxi", "cgv", "game",
      "steam", "playstation", "netflix", "spotify", "disney", "youtube",
      "wisata", "liburan", "karaoke",
    ],
  },
  {
    category: "pendidikan",
    label: "Pendidikan",
    emoji: "📚",
    keywords: [
      "pendidikan", "buku", "kursus", "seminar", "webinar", "les", "spp",
      "kuliah", "sekolah", "ujian",
    ],
  },
  {
    category: "tabungan",
    label: "Tabungan",
    emoji: "🏺",
    keywords: [
      "nabung", "tabungan", "investasi", "reksadana", "saham", "emas",
      "bibit", "bareksa", "crypto",
    ],
  },
];

/**
 * Escape teks ke format HTML yang aman untuk Telegram
 * @param {string} str
 * @return {string}
 */
function escapeHtml(str) {
  return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
}

/**
 * Mendapatkan emoji kategori
 * @param {string} category
 * @return {string}
 */
function getCategoryEmoji(category) {
  const cfg = EXPENSE_CATEGORIES_CONFIG.find((c) => c.category === category);
  return cfg ? cfg.emoji : "💸";
}

/**
 * Mendapatkan nama label kategori
 * @param {string} category
 * @return {string}
 */
function getCategoryLabel(category) {
  const cfg = EXPENSE_CATEGORIES_CONFIG.find((c) => c.category === category);
  return cfg ? cfg.label : "Lainnya";
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

/**
 * Membuat inline keyboard tombol pilihan scope pengeluaran
 * @param {string} txId
 * @param {string} activeTarget
 * @return {Object}
 */
function getScopeInlineKeyboard(txId, activeTarget) {
  return {
    inline_keyboard: [
      [
        {
          text: activeTarget === "self" ? "👤 Saya (Aktif)" : "👤 Saya",
          callback_data: `scope:self:${txId}`,
        },
        {
          text: activeTarget === "shared" ? "👥 Bersama (Aktif)" : "👥 Bersama",
          callback_data: `scope:shared:${txId}`,
        },
        {
          text: activeTarget === "partner" ? "💑 Pasangan (Aktif)" : "💑 Pasangan",
          callback_data: `scope:partner:${txId}`,
        },
      ],
    ],
  };
}


/**
 * Parser teks pengeluaran (format kasual maupun notifikasi Bank Jago)
 * @param {string} text
 * @return {Object|null}
 */
function parseExpenseText(text) {
  const cleaned = text.trim();
  let matchedStr = "";
  let amount = 0;

  // 1. Cek satuan juta: e.g. 1.5jt, 2.5juta, 1jt, 5m
  const jutaMatch = cleaned.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(jt|juta|m|mio)\b/i);
  if (jutaMatch) {
    matchedStr = jutaMatch[0];
    amount = Math.round(parseFloat(jutaMatch[1].replace(",", ".")) * 1000000);
  } else {
    // 2. Cek satuan ribu: e.g. 35k, 35.5k, 50rb, 50ribu
    const ribuMatch = cleaned.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)\b/i);
    if (ribuMatch) {
      matchedStr = ribuMatch[0];
      amount = Math.round(parseFloat(ribuMatch[1].replace(",", ".")) * 1000);
    } else {
      // 3. Cek nominal biasa: e.g. Rp 50.000, 50.000, 50000, Rp25000
      const plainMatch = cleaned.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,9})\b/i);
      if (plainMatch) {
        matchedStr = plainMatch[0];
        amount = parseInt(plainMatch[1].replace(/\./g, ""), 10);
      }
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  const lowerText = cleaned.toLowerCase();

  // Deteksi kepemilikan/scope (Saya / Bersama / Pasangan)
  let target = "self"; // 'self' | 'partner' | 'shared'
  let scope = "personal"; // 'personal' | 'shared'

  const sharedKeywords = ["bersama", "bareng", "patungan", "shared", "berdua", "keluarga"];
  const partnerKeywords = ["pasangan", "istri", "suami", "doi", "ayang", "partner"];

  if (sharedKeywords.some((kw) => lowerText.includes(kw))) {
    target = "shared";
    scope = "shared";
  } else if (partnerKeywords.some((kw) => lowerText.includes(kw))) {
    target = "partner";
    scope = "personal";
  }

  // Khusus format notifikasi Bank Jago
  let note = "";
  const jagoMatch = cleaned.match(/(?:transfer\s+sebesar.*?ke|pembayaran\s+qris\s+sebesar.*?di)\s+([^.\n]+?)(?:\s+berhasil|\s*$)/i);
  if (jagoMatch && jagoMatch[1]) {
    note = jagoMatch[1].trim();
  } else {
    // Ambil sisa teks sebagai deskripsi/catatan
    note = cleaned.replace(matchedStr, "").trim();
    // Hilangkan kata awalan 'tf', 'beli', 'bayar' jika ada
    note = note.replace(/^(?:tf|transfer|beli|bayar)\s+/i, "");
    // Bersihkan keyword scope dari catatan agar rapi
    note = note.replace(/\b(bersama|bareng|patungan|shared|berdua|keluarga|buat istri|buat suami|istri|suami|doi|ayang|partner|pasangan)\b/gi, "");
    note = note.replace(/\s+/g, " ").trim();
    // Bersihkan tanda baca di awal/akhir
    note = note.replace(/^[-:;,./]+|[-:;,./]+$/g, "").trim();
  }

  // Deteksi kategori berdasarkan keyword pada teks asli
  let detected = {
    category: "lainnya_pengeluaran",
    label: "Lainnya",
    emoji: "💸",
  };

  for (const config of EXPENSE_CATEGORIES_CONFIG) {
    const found = config.keywords.some((kw) => lowerText.includes(kw));
    if (found) {
      detected = config;
      break;
    }
  }

  if (!note) {
    note = detected.label;
  }

  return {
    amount,
    note,
    category: detected.category,
    categoryLabel: detected.label,
    categoryEmoji: detected.emoji,
    target,
    scope,
  };
}

/**
 * Handle menghubungkan akun Telegram dengan CandyNest
 */
async function handleConnect(chatId, code, fromUser, messageId) {
  const upperCode = code.toUpperCase();
  const userSnap = await db.collection("users")
      .where("inviteCode", "==", upperCode)
      .limit(1)
      .get();

  let userDoc = null;
  if (!userSnap.empty) {
    userDoc = userSnap.docs[0];
  } else {
    const directDoc = await db.collection("users").doc(code).get();
    if (directDoc.exists) {
      userDoc = directDoc;
    }
  }

  if (!userDoc) {
    await sendTelegram(
        chatId,
        `❌ <b>Kode undangan tidak ditemukan:</b> <code>${escapeHtml(code)}</code>\n\nPastikan kamu menyalin kode dari menu <b>Pengaturan</b> di aplikasi CandyNest.`,
        messageId,
    );
    return;
  }

  const userData = userDoc.data();
  await userDoc.ref.update({
    telegramChatId: chatId,
    telegramUsername: fromUser.username || "",
    telegramUpdatedAt: new Date().toISOString(),
  });

  const displayName = userData.displayName || "Kak";
  const partnerName = userData.partnerName || "Pasangan";

  await sendTelegram(
      chatId,
      "🎉 <b>Berhasil Terhubung ke CandyNest!</b>\n\n" +
      `Halo <b>${escapeHtml(displayName)}</b>! Akunmu sudah tersambung.\n` +
      `Pasangan: <b>${escapeHtml(partnerName)}</b>\n\n` +
      "🍬 <b>Sekarang kamu bisa langsung catat pengeluaran di sini!</b>\n" +
      "Contoh chat:\n" +
      "• <code>makan 35k soto ayam</code>\n" +
      "• <code>bensin 50rb</code>\n" +
      "• <code>belanja 120.000 indomaret</code>\n" +
      "• <code>kopi 28k</code>\n\n" +
      "Bisa juga langsung <i>forward</i> teks notifikasi Bank Jago ke sini! ✨",
      messageId,
  );
}

/**
 * Handle pesan awal /start
 */
async function handleStart(chatId, fromUser, messageId) {
  const userSnap = await db.collection("users")
      .where("telegramChatId", "==", chatId)
      .limit(1)
      .get();

  if (!userSnap.empty) {
    const userData = userSnap.docs[0].data();
    await sendTelegram(
        chatId,
        `👋 <b>Halo ${escapeHtml(userData.displayName || "Kak")}!</b>\n\n` +
        "Akun CandyNest kamu sudah terhubung dan siap digunakan. 🍬\n\n" +
        "Tinggal ketik pengeluaranmu, contoh:\n" +
        "• <code>makan 25rb mie ayam</code>\n" +
        "• <code>bensin 50k</code>\n" +
        "• <code>belanja 150k alfamart</code>\n\n" +
        "💡 <i>Ketik /rekap untuk melihat total pengeluaran hari ini.</i>",
        messageId,
    );
    return;
  }

  await sendTelegram(
      chatId,
      "👋 <b>Selamat datang di CandyNest Bot!</b> 🍬\n\n" +
      "Bot ini membantu kamu mencatat pengeluaran secepat kilat tanpa perlu buka aplikasi.\n\n" +
      "🔗 <b>Langkah Menghubungkan:</b>\n" +
      "1. Buka aplikasi CandyNest di web / HP kamu.\n" +
      "2. Masuk ke menu <b>Pengaturan</b>.\n" +
      "3. Salin <b>Kode Undangan</b> kamu.\n" +
      "4. Kirim ke sini dengan format:\n" +
      "<code>/connect KODE_UNDANGAN</code>\n\n" +
      "<i>Contoh: /connect A1B2C3D4</i>",
      messageId,
  );
}

/**
 * Handle memutuskan akun
 */
async function handleDisconnect(chatId, messageId) {
  const userSnap = await db.collection("users")
      .where("telegramChatId", "==", chatId)
      .get();

  if (userSnap.empty) {
    await sendTelegram(chatId, "Akun kamu memang belum terhubung ke CandyNest.", messageId);
    return;
  }

  const batch = db.batch();
  userSnap.forEach((doc) => {
    batch.update(doc.ref, {
      telegramChatId: admin.firestore.FieldValue.delete(),
    });
  });
  await batch.commit();

  await sendTelegram(
      chatId,
      "👋 <b>Koneksi Diputus.</b>\nAkun CandyNest kamu telah dilepas dari bot ini. Untuk menghubungkan kembali, gunakan <code>/connect KODE</code>.",
      messageId,
  );
}

/**
 * Handle rekap pengeluaran hari ini
 */
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
  let items = "";
  let idx = 1;

  txSnap.forEach((doc) => {
    const data = doc.data();
    const amt = Number(data.amount) || 0;
    total += amt;
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amt);
    items += `${idx++}. <b>${escapeHtml(data.description || data.category)}</b>: ${formatted} (<i>${escapeHtml(data.addedBy || "User")}</i>)\n`;
  });

  const totalFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(total);

  await sendTelegram(
      chatId,
      `📊 <b>Rekap Pengeluaran Hari Ini</b>\n📅 <code>${today}</code>\n\n` +
      `${items}\n` +
      `💰 <b>Total Pengeluaran:</b> <b>${totalFormatted}</b>`,
      messageId,
  );
}

/**
 * Handle bantuan format
 */
async function handleHelp(chatId, messageId) {
  await sendTelegram(
      chatId,
      "🍬 <b>Bantuan CandyNest Bot</b>\n\n" +
      "<b>Cara Catat Pengeluaran:</b>\n" +
      "Cukup ketik nominal dan keperluannya, bot akan otomatis mengenali kategori!\n\n" +
      "<b>Contoh Chat:</b>\n" +
      "• <code>makan 35k nasi padang</code>\n" +
      "• <code>bensin 50rb</code>\n" +
      "• <code>kopi 28.000</code>\n" +
      "• <code>belanja 150k superindo</code>\n" +
      "• <code>tagihan pln 200rb</code>\n" +
      "• <code>servis motor 75k</code>\n" +
      "• <code>obat 30k apotek k24</code>\n\n" +
      "<b>Perintah Tersedia:</b>\n" +
      "• /rekap - Lihat pengeluaran hari ini\n" +
      "• /connect KODE - Hubungkan akun CandyNest\n" +
      "• /disconnect - Putuskan koneksi akun\n" +
      "• /help - Bantuan format",
      messageId,
  );
}

/**
 * Mendapatkan partnerUid dari profil user atau relasi couple
 * @param {string} userId
 * @param {string} coupleId
 * @param {string|null} currentPartnerUid
 * @return {Promise<string|null>}
 */
async function getPartnerUid(userId, coupleId, currentPartnerUid) {
  if (currentPartnerUid) return currentPartnerUid;
  if (!coupleId) return null;
  const coupleSnap = await db.collection("couples").doc(coupleId).get();
  if (coupleSnap.exists) {
    const members = coupleSnap.data().members || [];
    return members.find((m) => m !== userId) || null;
  }
  return null;
}

/**
 * Handle pencatatan transaksi dari teks
 */
async function handleExpenseRecord(chatId, text, messageId) {
  const userSnap = await db.collection("users")
      .where("telegramChatId", "==", chatId)
      .limit(1)
      .get();

  if (userSnap.empty) {
    await sendTelegram(
        chatId,
        "⚠️ <b>Akun kamu belum terhubung!</b>\n\nSilakan ketik:\n<code>/connect KODE_UNDANGAN</code>\n\nKode undangan ada di menu <b>Pengaturan</b> CandyNest.",
        messageId,
    );
    return;
  }

  const userDoc = userSnap.docs[0];
  const userData = userDoc.data();

  if (!userData.coupleId) {
    await sendTelegram(
        chatId,
        "⚠️ Akun kamu belum terhubung dengan pasangan di CandyNest. Silakan hubungkan pasangan di web terlebih dahulu.",
        messageId,
    );
    return;
  }

  const parsed = parseExpenseText(text);
  if (!parsed) {
    await sendTelegram(
        chatId,
        "🤖 <b>Format belum dikenali.</b>\n\n" +
        "Contoh cara catat cepat:\n" +
        "• <code>makan 35k soto ayam</code> (Saya)\n" +
        "• <code>belanja 120k indomaret bersama</code> (Bersama)\n" +
        "• <code>bensin 50rb</code>\n\n" +
        "💡 <i>Ketik /rekap untuk melihat ringkasan hari ini.</i>",
        messageId,
    );
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
  const displayName = userData.displayName || "Saya";
  const partnerUid = await getPartnerUid(userDoc.id, userData.coupleId, userData.partnerUid);

  let targetUserId = userDoc.id;
  let scopeLabel = "👤 Saya";

  if (parsed.target === "shared") {
    scopeLabel = "👥 Bersama";
    targetUserId = null;
  } else if (parsed.target === "partner") {
    scopeLabel = `💑 Pasangan (${userData.partnerName || "Pasangan"})`;
    targetUserId = partnerUid || userDoc.id;
  }

  const txData = {
    userId: userDoc.id,
    coupleId: userData.coupleId,
    type: "expense",
    category: parsed.category,
    amount: parsed.amount,
    description: parsed.note,
    date: today,
    createdAt: new Date().toISOString(),
    addedBy: displayName,
    expenseScope: parsed.scope,
    source: "telegram_bot",
  };

  if (parsed.scope === "personal") {
    txData.expenseForUserId = targetUserId;
  }

  const docRef = await db.collection("transactions").add(txData);

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(parsed.amount);

  const replyText =
      "🍬 <b>Pengeluaran Berhasil Dicatat!</b>\n\n" +
      `💸 <b>Nominal:</b> ${formattedAmount}\n` +
      `${parsed.categoryEmoji} <b>Kategori:</b> ${parsed.categoryLabel}\n` +
      `📝 <b>Catatan:</b> ${escapeHtml(parsed.note)}\n` +
      `🎯 <b>Untuk:</b> <b>${scopeLabel}</b>\n` +
      `📅 <b>Tanggal:</b> ${today}\n` +
      `👤 <b>Pencatat:</b> ${escapeHtml(displayName)}\n\n` +
      "<i>Ketuk tombol di bawah jika ingin mengubah kepemilikan:</i>";

  const buttons = getScopeInlineKeyboard(docRef.id, parsed.target);
  await sendTelegram(chatId, replyText, messageId, buttons);
}

/**
 * Handle klik tombol interaktif callback query Telegram
 */
async function handleCallbackQuery(callbackQuery) {
  const queryId = callbackQuery.id;
  const data = callbackQuery.data || "";
  const message = callbackQuery.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (!data.startsWith("scope:")) {
    await answerCallback(queryId, "Aksi tidak dikenali.");
    return;
  }

  const parts = data.split(":");
  const newTarget = parts[1];
  const txId = parts[2];

  if (!txId || !newTarget) {
    await answerCallback(queryId, "Data tidak valid.");
    return;
  }

  const txRef = db.collection("transactions").doc(txId);
  const txSnap = await txRef.get();
  if (!txSnap.exists) {
    await answerCallback(queryId, "Transaksi tidak ditemukan.");
    return;
  }

  const txData = txSnap.data();

  // Dapatkan partnerUid
  let partnerUid = null;
  const userSnap = await db.collection("users").doc(txData.userId).get();
  if (userSnap.exists) {
    const uData = userSnap.data();
    partnerUid = uData.partnerUid;
  }
  if (!partnerUid && txData.coupleId) {
    partnerUid = await getPartnerUid(txData.userId, txData.coupleId, null);
  }

  let scopeLabel = "👤 Saya";
  const updates = {
    updatedAt: new Date().toISOString(),
  };

  if (newTarget === "shared") {
    scopeLabel = "👥 Bersama";
    updates.expenseScope = "shared";
    updates.expenseForUserId = admin.firestore.FieldValue.delete();
  } else if (newTarget === "partner") {
    scopeLabel = "💑 Pasangan";
    updates.expenseScope = "personal";
    updates.expenseForUserId = partnerUid || txData.userId;
  } else {
    scopeLabel = "👤 Saya";
    updates.expenseScope = "personal";
    updates.expenseForUserId = txData.userId;
  }

  await txRef.update(updates);
  await answerCallback(queryId, `Diubah ke: ${scopeLabel}`);

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(txData.amount);

  const categoryEmoji = getCategoryEmoji(txData.category);
  const categoryLabel = getCategoryLabel(txData.category);

  const updatedText =
      "🍬 <b>Pengeluaran Berhasil Dicatat!</b>\n\n" +
      `💸 <b>Nominal:</b> ${formattedAmount}\n` +
      `${categoryEmoji} <b>Kategori:</b> ${categoryLabel}\n` +
      `📝 <b>Catatan:</b> ${escapeHtml(txData.description)}\n` +
      `🎯 <b>Untuk:</b> <b>${scopeLabel}</b>\n` +
      `📅 <b>Tanggal:</b> ${txData.date}\n` +
      `👤 <b>Pencatat:</b> ${escapeHtml(txData.addedBy || "Saya")}\n\n` +
      "<i>Ketuk tombol di bawah jika ingin mengubah kepemilikan:</i>";

  const buttons = getScopeInlineKeyboard(txId, newTarget);
  await editTelegramMessage(chatId, messageId, updatedText, buttons);
}

// --- HTTP ENDPOINT WEBHOOK TELEGRAM ---
exports.telegramWebhook = functions.https.onRequest(async (req, res) => {
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
    if (text.startsWith("/start")) {
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

    if (text.startsWith("/connect") || text.startsWith("/link")) {
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

    if (text.startsWith("/disconnect")) {
      await handleDisconnect(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    if (text.startsWith("/rekap") || text.startsWith("/hariini")) {
      await handleRekap(chatId, message.message_id);
      res.status(200).send("OK");
      return;
    }

    if (text.startsWith("/help") || text.startsWith("/bantuan")) {
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
exports.setTelegramWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const webhookUrl = "https://us-central1-candyfinancial-16cde.cloudfunctions.net/telegramWebhook";
    const resp = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
        {url: webhookUrl},
    );
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
