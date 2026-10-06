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
      [
        {text: "✏️ Kategori", callback_data: `editcat:open:${txId}`},
        {text: "📝 Catatan", callback_data: `editnote:${txId}`},
      ],
      [
        {text: "↩ Batalkan transaksi", callback_data: `undo:ask:${txId}`},
      ],
    ],
  };
}

const TELEGRAM_COMMANDS = [
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

/** Create category selection buttons for correcting a bot expense. */
function getExpenseCategoryKeyboard(txId) {
  const categories = [
    ...EXPENSE_CATEGORIES_CONFIG,
    {category: "lainnya_pengeluaran", label: "Lainnya", emoji: "💸"},
  ];
  const rows = [];
  for (let index = 0; index < categories.length; index += 2) {
    rows.push(categories.slice(index, index + 2).map((category) => ({
      text: `${category.emoji} ${category.label}`,
      callback_data: `editcat:set:${txId}:${category.category}`,
    })));
  }
  rows.push([{text: "Batal", callback_data: `editcat:cancel:${txId}`}]);
  return {inline_keyboard: rows};
}

/** Return a bot-created expense only when it belongs to the linked Telegram user. */
async function getOwnedTelegramExpense(chatId, txId) {
  if (!txId) return null;
  const linkedUserSnap = await db.collection("users")
      .where("telegramChatId", "==", chatId)
      .limit(1)
      .get();
  if (linkedUserSnap.empty) return null;

  const linkedUser = linkedUserSnap.docs[0];
  const txRef = db.collection("transactions").doc(txId);
  const txSnap = await txRef.get();
  if (!txSnap.exists) return null;

  const tx = txSnap.data();
  if (tx.userId !== linkedUser.id ||
      tx.coupleId !== linkedUser.data().coupleId ||
      tx.source !== "telegram_bot" || tx.type !== "expense") return null;
  return {txRef, tx, linkedUser};
}

/** Get the allocation button state and label for an existing expense. */
function getExpenseScopeState(tx, userId) {
  if (tx.expenseScope === "shared") return {activeTarget: "shared", scopeLabel: "👥 Bersama"};
  if (tx.expenseForUserId && tx.expenseForUserId !== userId) {
    return {activeTarget: "partner", scopeLabel: "💑 Pasangan"};
  }
  return {activeTarget: "self", scopeLabel: "👤 Saya"};
}

/** Apply a Telegram reply to an active note-correction prompt. */
async function handlePendingNoteEdit(chatId, message, text) {
  const sessionRef = db.collection("telegramEditSessions").doc(String(chatId));
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return false;

  const session = sessionSnap.data();
  if (message.reply_to_message?.message_id !== session.promptMessageId) return false;

  if (!Number.isFinite(session.expiresAt) || Date.now() > session.expiresAt) {
    await sessionRef.delete();
    await sendTelegram(chatId, "Waktu untuk mengubah catatan sudah habis. Tekan <b>📝 Catatan</b> lagi untuk mencoba.", message.message_id);
    return true;
  }

  if (text.trim().toLowerCase() === "/cancel") {
    await sessionRef.delete();
    await sendTelegram(chatId, "Koreksi catatan dibatalkan.", message.message_id);
    return true;
  }

  const description = text.trim();
  if (!description || description.length > 200) {
    await sendTelegram(chatId, "Catatan harus berisi 1–200 karakter. Balas prompt tadi lagi, atau ketik <code>/cancel</code>.", message.message_id);
    return true;
  }

  const owned = await getOwnedTelegramExpense(chatId, session.txId);
  if (!owned || owned.tx.userId !== session.userId) {
    await sessionRef.delete();
    await sendTelegram(chatId, "Transaksi sudah tidak tersedia untuk dikoreksi.", message.message_id);
    return true;
  }

  await owned.txRef.update({
    description,
    updatedAt: new Date().toISOString(),
  });
  await sessionRef.delete();

  const updatedTx = {...owned.tx, description};
  await editTelegramMessage(
      chatId,
      session.transactionMessageId,
      getExpenseReceiptText(updatedTx, session.scopeLabel),
      getScopeInlineKeyboard(session.txId, session.activeTarget),
  );
  await sendTelegram(chatId, "✅ Catatan transaksi sudah diperbarui.", message.message_id);
  return true;
}

/** Format the compact confirmation shown for a bot-recorded expense. */
function getExpenseReceiptText(tx, scopeLabel, displayDate = tx.date, extraLine = "") {
  const note = String(tx.description || "").trim();
  const shortNote = note.length > 80 ? `${note.slice(0, 77)}…` : note;
  return `✅ <b>${formatRupiah(Number(tx.amount) || 0)}</b> · ${getCategoryEmoji(tx.category)} ${escapeHtml(getCategoryLabel(tx.category))}\n` +
      `${shortNote ? `${escapeHtml(shortNote)}\n` : ""}` +
      `📅 ${escapeHtml(displayDate)} · ${escapeHtml(scopeLabel)}${extraLine}\n\n` +
      "<i>Koreksi kategori/catatan atau alokasi:</i>";
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

  // ─── Deteksi Tanggal ──────────────────────────────────────────────────────
  const MONTH_MAP = {
    januari: 0, jan: 0,
    februari: 1, feb: 1,
    maret: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    agustus: 7, agu: 7, agus: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, okt: 9,
    november: 10, nov: 10,
    desember: 11, des: 11,
  };

  let parsedDate = null;
  let dateMatchStr = "";
  const now = new Date();
  const jakartaTodayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now).reduce((parts, part) => {
    if (part.type !== "literal") parts[part.type] = parseInt(part.value, 10);
    return parts;
  }, {});
  const todayDate = Date.UTC(jakartaTodayParts.year, jakartaTodayParts.month - 1, jakartaTodayParts.day);
  let dateError = "";

  // Simpan tanggal sebagai tengah malam UTC agar hasilnya konsisten di Cloud Functions.
  const makeDate = (year, month, day) => {
    const candidate = new Date(Date.UTC(year, month, day));
    if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month || candidate.getUTCDate() !== day) {
      return {date: null, error: "Tanggalnya tidak valid. Cek kembali tanggal yang kamu kirim."};
    }
    if (candidate.getTime() > todayDate) {
      return {date: null, error: "Pengeluaran belum bisa dicatat untuk tanggal yang akan datang."};
    }
    return {date: candidate, error: ""};
  };
  const makeRelativeDate = (daysAgo) => {
    if (!Number.isSafeInteger(daysAgo) || daysAgo < 0) {
      return {date: null, error: "Jarak tanggalnya tidak valid. Gunakan tanggal kalender, misalnya 3/10/2026."};
    }
    const candidate = new Date(todayDate);
    candidate.setUTCDate(candidate.getUTCDate() - daysAgo);
    const year = candidate.getUTCFullYear();
    if (Number.isNaN(candidate.getTime()) || year < 1000 || year > 9999) {
      return {date: null, error: "Tanggalnya terlalu jauh. Gunakan tanggal kalender, misalnya 3/10/2026."};
    }
    return {date: candidate, error: ""};
  };

  // "kemarin" / "kemaren"
  const kemarinMatch = lowerText.match(/\b(kemarin|kemaren)\b/);
  if (kemarinMatch) {
    dateMatchStr = kemarinMatch[0];
    const result = makeRelativeDate(1);
    parsedDate = result.date;
    dateError = result.error;
  }

  // "N hari lalu" / "N hari yang lalu"
  if (!parsedDate && !dateError) {
    const hariLaluMatch = lowerText.match(/(\d+)\s*hari\s*(?:yang\s*)?lalu/);
    const mingguLaluMatch = lowerText.match(/(?:(\d+)\s*minggu|seminggu|sepekan)\s*(?:yang\s*)?lalu/);
    const relativeMatch = hariLaluMatch || mingguLaluMatch;
    if (relativeMatch) {
      dateMatchStr = relativeMatch[0];
      const daysAgo = hariLaluMatch ? Number(hariLaluMatch[1]) : (mingguLaluMatch[1] ? Number(mingguLaluMatch[1]) * 7 : 7);
      const result = makeRelativeDate(daysAgo);
      parsedDate = result.date;
      dateError = result.error;
    }
  }

  // "DD/MM" atau "DD-MM" atau "DD/MM/YYYY"
  if (!parsedDate && !dateError) {
    const dmMatch = lowerText.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?!\d)/);
    if (dmMatch) {
      const d = parseInt(dmMatch[1], 10);
      const m = parseInt(dmMatch[2], 10);
      const y = dmMatch[3] ?
        (dmMatch[3].length === 2 ? 2000 + parseInt(dmMatch[3], 10) : parseInt(dmMatch[3], 10)) :
        jakartaTodayParts.year;
      dateMatchStr = dmMatch[0];
      const result = makeDate(y, m - 1, d);
      parsedDate = result.date;
      dateError = result.error;
    }
  }

  // "DD MonthName" atau "DD MonthName YYYY" → e.g. "3 oktober", "3 okt 2025"
  if (!parsedDate && !dateError) {
    const monthNames = Object.keys(MONTH_MAP).join("|");
    const textMonthRe = new RegExp(`(\\d{1,2})\\s+(${monthNames})(?:\\s+(\\d{2,4}))?`, "i");
    const textMonthMatch = lowerText.match(textMonthRe);
    if (textMonthMatch) {
      const d = parseInt(textMonthMatch[1], 10);
      const m = MONTH_MAP[textMonthMatch[2].toLowerCase()];
      const y = textMonthMatch[3] ?
        (textMonthMatch[3].length === 2 ? 2000 + parseInt(textMonthMatch[3], 10) : parseInt(textMonthMatch[3], 10)) :
        jakartaTodayParts.year;
      dateMatchStr = textMonthMatch[0];
      const result = makeDate(y, m, d);
      parsedDate = result.date;
      dateError = result.error;
    }
  }

  // These phrases do not identify a specific day; ask for an exact date instead of silently using today.
  if (!parsedDate && !dateError && /\b(minggu|bulan|tahun)\s*(?:yang\s*)?lalu\b/.test(lowerText)) {
    dateError = "Frasa itu belum menentukan tanggal yang tepat. Tulis tanggal kalender, misalnya 3/10/2026.";
  }
  if (!parsedDate && !dateError && /\b(besok|lusa|minggu\s+depan|bulan\s+depan|tahun\s+depan)\b/.test(lowerText)) {
    dateError = "Tanggal masa depan belum bisa dicatat. Gunakan tanggal pengeluaran yang sudah terjadi.";
  }

  // Default ke hari ini
  if (!parsedDate && !dateError) {
    parsedDate = new Date(todayDate);
  }
  // ─────────────────────────────────────────────────────────────────────────

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
    // Bersihkan keyword tanggal dari catatan
    if (dateMatchStr) {
      note = note.replace(new RegExp(dateMatchStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "");
    }
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
    date: parsedDate,
    dateError,
    isBackdated: parsedDate && parsedDate.getTime() < todayDate,
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
        "Kalau baru sempat mencatat, tambahkan tanggalnya, misalnya <code>kemarin</code>, <code>2 hari lalu</code>, atau <code>1 minggu lalu</code>.\n\n" +
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
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get today's calendar date in the Jakarta time zone.
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
      "<b>Catat tanggal yang terlewat:</b> tambahkan <code>kemarin</code>, <code>2 hari lalu</code>, <code>1 minggu lalu</code>, atau tanggal <code>3/10/2026</code> / <code>3 Okt 2026</code> pada pesan.\n" +
      "Untuk frasa seperti <code>minggu lalu</code> atau <code>bulan lalu</code>, tulis tanggal pastinya agar tidak salah dicatat.\n\n" +
      "Setelah dicatat, tombol transaksi bisa dipakai untuk mengoreksi kategori/catatan, mengubah alokasi, atau membatalkan transaksi.\n\n" +
      "<b>Perintah Tersedia:</b>\n" +
      "• /rekap - Lihat pengeluaran hari ini\n" +
      "• /rekapmingguan - Rekap dari Senin sampai hari ini\n" +
      "• /rekapbulanan - Rekap pengeluaran bulan ini\n" +
      "• /undo - Batalkan pengeluaran bot terakhir (maks. 24 jam)\n" +
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

  if (parsed.dateError) {
    await sendTelegram(
        chatId,
        `⚠️ ${parsed.dateError}\n\nContoh tanggal: <code>kemarin</code>, <code>2 hari lalu</code>, <code>1 minggu lalu</code>, atau <code>3/10/2026</code>.`,
        messageId,
    );
    return;
  }

  const txDateStr = parsed.date.toISOString().slice(0, 10);
  const txDateDisplay = parsed.date.toLocaleDateString("id-ID", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
    date: txDateStr,
    createdAt: new Date().toISOString(),
    addedBy: displayName,
    expenseScope: parsed.scope,
    source: "telegram_bot",
  };

  if (parsed.scope === "personal") {
    txData.expenseForUserId = targetUserId;
  }

  const docRef = await db.collection("transactions").add(txData);

  const receiptText = getExpenseReceiptText(
      txData,
      scopeLabel,
      txDateDisplay,
      parsed.isBackdated ? "\n⏮️ Dicatat mundur" : "",
  );

  const buttons = getScopeInlineKeyboard(docRef.id, parsed.target);
  await sendTelegram(chatId, receiptText, messageId, buttons);
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

  if (data.startsWith("undo:")) {
    const [, action, txId] = data.split(":");
    const linkedUserSnap = await db.collection("users")
        .where("telegramChatId", "==", chatId)
        .limit(1)
        .get();
    if (!linkedUserSnap.empty && txId) {
      const linkedUser = linkedUserSnap.docs[0];
      const txRef = db.collection("transactions").doc(txId);
      const txSnap = await txRef.get();
      if (txSnap.exists) {
        const tx = txSnap.data();
        const ownedBySender = tx.userId === linkedUser.id &&
            tx.coupleId === linkedUser.data().coupleId &&
            tx.source === "telegram_bot" && tx.type === "expense";
        const createdAt = new Date(tx.createdAt || 0).getTime();
        const canUndo = Number.isFinite(createdAt) && Date.now() - createdAt <= 24 * 60 * 60 * 1000;
        if (ownedBySender && action === "ask") {
          if (!canUndo) {
            await answerCallback(queryId, "Sudah lewat 24 jam, transaksi ini tidak bisa dibatalkan.");
            return;
          }
          await answerCallback(queryId, "Konfirmasi pembatalan di pesan baru.");
          await sendTelegram(
              chatId,
              `Batalkan ${formatRupiah(Number(tx.amount) || 0)} · ${escapeHtml(tx.description || getCategoryLabel(tx.category))}?`,
              messageId,
              {inline_keyboard: [[
                {text: "🗑 Ya, batalkan", callback_data: `undo:confirm:${txId}`},
                {text: "Jangan", callback_data: `undo:cancel:${txId}`},
              ]]},
          );
          return;
        }
        if (ownedBySender && action === "confirm" && canUndo) {
          await txRef.delete();
          await answerCallback(queryId, "Transaksi dibatalkan.");
          await editTelegramMessage(chatId, messageId, "🗑 <b>Transaksi dibatalkan.</b>");
          return;
        }
        if (ownedBySender && action === "confirm" && !canUndo) {
          await answerCallback(queryId, "Sudah lewat 24 jam, transaksi ini tidak bisa dibatalkan.");
          return;
        }
        if (ownedBySender && action === "cancel") {
          await answerCallback(queryId, "Tidak jadi dibatalkan.");
          await editTelegramMessage(chatId, messageId, "Transaksi tetap tersimpan.");
          return;
        }
      }
    }
    await answerCallback(queryId, "Transaksi tidak ditemukan atau bukan milik akunmu.");
    return;
  }

  if (data.startsWith("editcat:")) {
    const [, action, txId, category] = data.split(":");
    const owned = await getOwnedTelegramExpense(chatId, txId);
    if (!owned) {
      await answerCallback(queryId, "Transaksi tidak ditemukan atau bukan milik akunmu.");
      return;
    }
    const {txRef, tx, linkedUser} = owned;
    const {activeTarget, scopeLabel} = getExpenseScopeState(tx, linkedUser.id);

    if (action === "open") {
      await answerCallback(queryId, "Pilih kategori baru.");
      await editTelegramMessage(
          chatId,
          messageId,
          `Pilih kategori untuk <b>${formatRupiah(Number(tx.amount) || 0)}</b> · ${escapeHtml(tx.description || getCategoryLabel(tx.category))}:`,
          getExpenseCategoryKeyboard(txId),
      );
      return;
    }
    if (action === "cancel") {
      await answerCallback(queryId, "Koreksi dibatalkan.");
      await editTelegramMessage(chatId, messageId, getExpenseReceiptText(tx, scopeLabel), getScopeInlineKeyboard(txId, activeTarget));
      return;
    }
    if (action === "set") {
      const selected = EXPENSE_CATEGORIES_CONFIG.find((item) => item.category === category) ||
          (category === "lainnya_pengeluaran" ? {category, label: "Lainnya"} : null);
      if (!selected) {
        await answerCallback(queryId, "Kategori tidak valid.");
        return;
      }
      await txRef.update({category: selected.category, updatedAt: new Date().toISOString()});
      const updatedTx = {...tx, category: selected.category};
      await answerCallback(queryId, `Kategori diubah ke ${selected.label}.`);
      await editTelegramMessage(chatId, messageId, getExpenseReceiptText(updatedTx, scopeLabel), getScopeInlineKeyboard(txId, activeTarget));
      return;
    }
  }

  if (data.startsWith("editnote:")) {
    const txId = data.slice("editnote:".length);
    const owned = await getOwnedTelegramExpense(chatId, txId);
    if (!owned) {
      await answerCallback(queryId, "Transaksi tidak ditemukan atau bukan milik akunmu.");
      return;
    }
    const {tx, linkedUser} = owned;
    const {activeTarget, scopeLabel} = getExpenseScopeState(tx, linkedUser.id);
    const prompt = await sendTelegram(
        chatId,
        "Balas pesan ini dengan <b>catatan baru</b> (maks. 200 karakter). Ketik <code>/cancel</code> untuk batal.",
        messageId,
        {force_reply: true, selective: true, input_field_placeholder: "Tulis catatan baru"},
    );
    const promptMessageId = prompt?.result?.message_id;
    if (!promptMessageId) {
      await answerCallback(queryId, "Gagal membuka koreksi catatan. Coba lagi.");
      return;
    }
    await db.collection("telegramEditSessions").doc(String(chatId)).set({
      txId,
      userId: linkedUser.id,
      promptMessageId,
      transactionMessageId: messageId,
      activeTarget,
      scopeLabel,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    await answerCallback(queryId, "Balas pesan bot untuk menyimpan catatan baru.");
    return;
  }

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

  const categoryEmoji = getCategoryEmoji(txData.category);
  const categoryLabel = getCategoryLabel(txData.category);

  const note = String(txData.description || "").trim();
  const shortNote = note.length > 80 ? `${note.slice(0, 77)}…` : note;
  const updatedText =
      `✅ <b>${formatRupiah(Number(txData.amount) || 0)}</b> · ${categoryEmoji} ${escapeHtml(categoryLabel)}\n` +
      `${shortNote ? `${escapeHtml(shortNote)}\n` : ""}` +
      `📅 ${escapeHtml(txData.date)} · ${escapeHtml(scopeLabel)}\n\n` +
      "<i>Ubah alokasi atau batalkan:</i>";

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
exports.setTelegramWebhook = functions.https.onRequest(async (req, res) => {
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
exports.configureTelegramWebhook = functions.https.onCall(async (data, context) => {
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
