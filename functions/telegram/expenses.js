/** Telegram expense parsing, entry, and corrections. */
function createExpenseHandlers({db, admin, sendTelegram, editTelegramMessage, answerCallback, escapeHtml, formatRupiah}) {
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

  return {handleExpenseRecord, handlePendingNoteEdit, handleExpenseCallback: handleCallbackQuery, getCategoryLabel};
}

module.exports = {createExpenseHandlers};
