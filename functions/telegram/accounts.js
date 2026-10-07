/** Telegram account linking and help commands. */
function createAccountHandlers({db, admin, sendTelegram, escapeHtml}) {
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
      "• /cicilan - Lihat cicilan dan catat pembayaran\n" +
      "• /riwayatcicilan - Riwayat pembayaran cicilan\n" +
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

  return {handleConnect, handleStart, handleDisconnect, handleHelp};
}

module.exports = {createAccountHandlers};
