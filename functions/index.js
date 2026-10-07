const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// --- PUSH REMINDER: JAM 12:00 dan 19:00 WIB ---
exports.dailyReminderPush = functions.pubsub
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

Object.assign(exports, require("./telegram"));
Object.assign(exports, require("./whatsapp"));
