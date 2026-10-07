const {findLinkedUser} = require("./utils");

function createWhatsappAccountHandlers({db, admin, sendWhatsApp}) {
  async function handleStart(phone) {
    const userDoc = await findLinkedUser(db, phone);
    if (userDoc) {
      await sendWhatsApp(phone, `Halo ${userDoc.data().displayName || "Kak"}! 👋\n\nAkun CandyNest kamu sudah terhubung.\n\nKetik MENU untuk melihat fitur keuangan.`);
      return;
    }
    await sendWhatsApp(phone, "Selamat datang di CandyNest 🍬\n\nHubungkan akun dulu dengan:\nHUBUNGKAN KODE_UNDANGAN\n\nKode bisa dilihat di menu Pengaturan CandyNest.");
  }

  async function handleConnect(phone, code, displayName = "") {
    const normalizedCode = String(code || "").replace(/\s+/g, "").toUpperCase();
    if (!normalizedCode) {
      await sendWhatsApp(phone, "Format belum sesuai. Kirim: HUBUNGKAN KODE_UNDANGAN");
      return;
    }

    const matchingUsers = await db.collection("users")
        .where("inviteCode", "==", normalizedCode)
        .limit(1)
        .get();
    if (matchingUsers.empty) {
      await sendWhatsApp(phone, "Kode undangan tidak ditemukan. Cek lagi kode dari menu Pengaturan CandyNest.");
      return;
    }

    const userDoc = matchingUsers.docs[0];
    const existingLink = await findLinkedUser(db, phone);
    if (existingLink && existingLink.id !== userDoc.id) {
      await sendWhatsApp(phone, "Nomor WhatsApp ini sudah terhubung ke akun CandyNest lain. Putuskan koneksi lama dulu dengan PUTUSKAN.");
      return;
    }

    await userDoc.ref.update({
      whatsappNumber: phone,
      whatsappName: String(displayName || "").slice(0, 80),
      whatsappUpdatedAt: new Date().toISOString(),
    });
    const data = userDoc.data();
    await sendWhatsApp(
        phone,
        `Berhasil terhubung, ${data.displayName || "Kak"}! ✅\n` +
        `Pasangan: ${data.partnerName || "Belum terhubung"}\n\n` +
        "Ketik MENU untuk melihat fitur. Contoh catat pengeluaran: makan 35k soto ayam.",
    );
  }

  async function handleDisconnect(phone) {
    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc) {
      await sendWhatsApp(phone, "Nomor ini belum terhubung ke CandyNest.");
      return;
    }
    await userDoc.ref.update({
      whatsappNumber: admin.firestore.FieldValue.delete(),
      whatsappName: admin.firestore.FieldValue.delete(),
      whatsappUpdatedAt: new Date().toISOString(),
    });
    await sendWhatsApp(phone, "Koneksi WhatsApp sudah diputus. Untuk menyambungkan lagi, kirim HUBUNGKAN KODE_UNDANGAN.");
  }

  async function handleHelp(phone) {
    const userDoc = await findLinkedUser(db, phone);
    if (!userDoc) {
      await handleStart(phone);
      return;
    }
    await sendWhatsApp(
        phone,
        "🍬 CANDYNEST · MENU KEUANGAN\n\n" +
        "PENGELUARAN\n" +
        "• makan 35k soto ayam\n" +
        "• belanja 120rb indomaret bersama\n" +
        "• tambah tanggal: bensin 50k kemarin\n\n" +
        "CICILAN\n" +
        "• CICILAN — lihat cicilan dan progres\n" +
        "• BAYAR 1 1.000.000 08/2026\n" +
        "• RIWAYAT CICILAN [halaman]\n\n" +
        "REKAP\n" +
        "• REKAP — hari ini\n" +
        "• REKAP MINGGUAN\n" +
        "• REKAP BULANAN\n" +
        "• UNDO — batalkan transaksi terakhir\n\n" +
        "PERENCANAAN\n" +
        "• ALOKASI — lihat rencana bulanan\n" +
        "• RIWAYAT TRANSAKSI [halaman]\n\n" +
        "Ketik PUTUSKAN untuk melepas akun WhatsApp ini.",
    );
  }

  return {handleStart, handleConnect, handleDisconnect, handleHelp};
}

module.exports = {createWhatsappAccountHandlers};
