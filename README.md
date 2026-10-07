# 🍬 CandyNest — Premium Family Hub

Aplikasi manajemen keluarga modern dan *premium* yang dirancang untuk membantu pasangan mengelola **keuangan, catatan penting, dokumen (OCR), dan masa depan finansial** dalam satu ekosistem yang aman dan sinkron secara *real-time*.

![CandyNest Banner](/public/screenshot1.png)

## ✨ Fitur Unggulan (Premium Experience)

### 💰 Dashboard Keuangan Visioner
Tampilan kartu saldo dengan gaya *Glassmorphism* yang elegan. Dilengkapi dengan grafik tren 7-hari yang interaktif dan kalkulasi akumulasi tabungan seluruh waktu secara otomatis.

### ✨ Perencanaan Bulanan (Monthly Allocation) — *New!*
Pindahkan perencanaan keuangan dari spreadsheet ke aplikasi:
- **Jatah Pasangan**: Bagi tanggung jawab pembayaran item tertentu (seperti cicilan, belanja, atau listrik) secara transparan.
- **User-Aware Mapping**: Sistem cerdas yang menjamin data tidak akan tertukar; kolom "Saya" akan selalu menampilkan jatah Anda, dan kolom "Pasangan" menampilkan jatah pasangan Anda, siapa pun yang sedang login.
- **Bento Box Stats**: Ringkasan total jatah masing-masing dan *Grand Total* dalam tampilan kartu yang modern.
- **Native Share**: Bagikan rincian perencanaan bulanan ke pasangan via teks rapi yang bisa dikirim ke aplikasi pesan apa pun.

### 📝 Catatan Pintar (Smart Notes) — *New!*
Bukan sekadar catatan biasa. Sistem cerdas kami mengenali apa yang Anda tulis:
- 🔒 **Auto-Sensor**: Otomatis menyensor kata sandi/PIN jika Anda menggunakan format `Label: Nilai`.
- ✅ **Checklist Interaktif**: Buat daftar belanja atau tugas dengan tanda `> ` yang bisa langsung dicentang.
- 📸 **Multi-Image Attachment**: Lampirkan hingga 4 foto per catatan dengan teknologi kompresi cerdas (Hemat, Standar, Tajam).
- 📲 **Export to WhatsApp**: Kirim isi catatan langsung ke WhatsApp pasangan dengan satu klik.

### 🏺 Pos Tabungan (Envelope Budgeting)
Kelola target masa depan dengan sistem pos (envelopes):
- **Alokasi Gaji**: Wizard cerdas untuk membagi pendapatan ke berbagai pos sekaligus.
- **Target Progress**: Pantau persentase pencapaian target tabungan dengan indikator visual yang cantik.
- **Riwayat Mutasi**: Setiap uang masuk dan keluar dicatat dengan detail siapa yang melakukan perubahan.

### 📂 Brankas Dokumen (Smart OCR)
Simpan KTP, KK, Akta, dan dokumen penting lainnya di satu tempat aman

### 💑 Sinkronisasi Pasangan (Couple Sync)
Hubungkan akun dengan pasangan menggunakan *kode undangan unik*. Semua data (transaksi, catatan, & dokumen) akan tersinkronisasi secara otomatis di kedua perangkat tanpa jeda.

### 📊 Smart Budgeting
Atur batas pengeluaran bulanan per kategori. Indikator visual dinamis akan memberikan peringatan jika pengeluaran Anda sudah mendekati atau melewati batas anggaran yang ditentukan.

### 📢 Laporan Kolaboratif
Bagikan ringkasan keuangan bulanan langsung ke WhatsApp pasangan atau simpan sebagai laporan dengan fitur *Native Share* yang rapi dan informatif.

### 🤖 Telegram Bot
Catat pengeluaran dan pembayaran cicilan tanpa membuka aplikasi:
- Hubungkan bot **@CandyNest_bot** dari menu **Pengaturan**.
- Ketik pengeluaran seperti `makan 35k soto ayam`, atau gunakan `/rekap`, `/rekapmingguan`, dan `/rekapbulanan`.
- Gunakan `/cicilan` untuk melihat sisa utang. Pilih **Bayar**, lalu balas dengan format `nominal bulan/tahun`, misalnya `1.000.000 08/2026`.
- Gunakan `/riwayatcicilan` untuk melihat semua pembayaran cicilan dengan paginasi.

### 🔔 Reminder Ganda (WA & Web Push)
Pengingat otomatis yang cerdas:
- **Harian (12:00 & 19:00)**: Pengingat via WA & Push jika belum ada transaksi hari ini.

---

## 🎨 Estetika & User Experience
CandyNest dirancang dengan standar desain tinggi:
- **High-End Animations**: Menggunakan *spring-based animations* dari Framer Motion untuk transisi yang halus dan organik.
- **SaaS-Style UI**: Background dinamis, grid berpola modern, dan elemen transparan yang memberikan kesan eksklusif.
- **Mobile First & PWA**: Navigasi *Bottom Bar* yang ergonomis untuk mobile dan *Dark Sidebar* profesional untuk desktop.

## 🚀 Pembaruan Terbaru (Changelog)
- **✨ Fitur Perencanaan Bulanan**: Implementasi sistem alokasi biaya antar pasangan dengan dukungan *real-time sync* dan mapping User ID yang presisi.
- **🔗 Integrasi Web Share API**: Berbagi rincian perencanaan kini lebih mudah dengan format teks otomatis yang kompatibel dengan semua aplikasi *messaging*.
- **⚡ PWA Auto-Update (Android Fix)**: Service Worker kini dilengkapi dengan `self.skipWaiting()` yang memaksa aplikasi untuk langsung memuat versi terbaru.
- **⏱️ Pengurutan Transaksi Kronologis**: Transaksi diurutkan menggunakan `createdAt` untuk menjamin akurasi urutan mutasi dalam satu hari yang sama.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Design Tokens)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore Real-time, Auth, Storage, Cloud Functions)
- **WhatsApp Gateway**: [Fonnte API](https://fonnte.com/)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Memulai (Local Development)

### 1. Konfigurasi Environment
Salin `.env.example` menjadi `.env` dan isi dengan kredensial Firebase Anda:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

### 2. Instalasi
```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

### 3. Backend (Functions)
```bash
cd functions
npm install
# Konfigurasi FONNTE_TOKEN di environment Firebase
firebase functions:config:set fonnte.token="YOUR_TOKEN"

# Simpan token dari @BotFather sebagai Firebase Secret, lalu deploy Functions
cd ..
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase deploy --only functions

# Pasang webhook dan menu command Telegram satu kali setelah deploy
curl https://us-central1-candyfinancial-16cde.cloudfunctions.net/setTelegramWebhook
```

Bot yang dipakai harus memiliki username **@CandyNest_bot**. Setelah webhook aktif, buka **Pengaturan → Telegram Bot** di CandyNest untuk menghubungkan akun.

---

## 📁 Struktur Folder

```text
├── src/
│   ├── components/     # UI Components (Modals, Cards, Layouts)
│   ├── store/          # Zustand State (Auth, Trans, Savings, Notes)
│   ├── hooks/          # Business Logic & Data Fetching
│   ├── pages/          # Full Page Views (Dashboard, Notes, Pots, etc.)
│   ├── types/          # TypeScript Interfaces & Constants
│   ├── utils/          # Helpers (OCR, Formatting, Image Comp)
│   └── sw.ts           # PWA & Push Notification Logic
├── functions/
│   ├── index.js        # Scheduled Tasks & WhatsApp Reminder
│   └── telegram/
│       ├── index.js         # Telegram webhook, routing, and shared helpers
│       ├── accounts.js      # Connect, disconnect, and help commands
│       ├── expenses.js      # Expense entry and corrections
│       ├── reports.js       # Daily/weekly/monthly reports and undo
│       └── installments.js  # Installment listing and payment records
└── public/             # Static Assets & PWA Icons
```

---

## 🔒 Keamanan Data & Privasi
Keamanan data keluarga Anda adalah prioritas utama kami:
- **Firestore Security Rules**: Data hanya dapat diakses oleh user yang terverifikasi dan memiliki `coupleId` yang sama.
- **Private Storage**: Dokumen diunggah ke Firebase Storage dengan path folder unik dan terproteksi per pasangan.
- **Client-Side Processing**: Teknologi OCR dan kompresi gambar berjalan sepenuhnya di perangkat Anda untuk menjaga privasi sebelum data disimpan.

---

## 📱 Alur Menghubungkan Pasangan
1. **Daftar**: Suami dan Istri membuat akun masing-masing.
2. **Kirim Kode**: Salah satu pihak membuka menu **Pengaturan** dan menyalin **Kode Undangan**.
3. **Hubungkan**: Pihak lain memasukkan kode tersebut di menu Pengaturan akunnya, lalu klik **Hubungkan**.
4. **Selesai**: Data finansial, catatan, dan brankas dokumen akan langsung tersinkronisasi secara ajaib. ✨

---

Dibuat dengan ❤️ untuk membantu keluarga Indonesia lebih melek finansial.
**CandyNest — Sweetening Your Family's Financial Future.**
