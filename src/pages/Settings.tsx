import {
  Copy,
  Check,
  Heart,
  LogOut,
  Shield,
  Smartphone,
  Info,
  ChevronRight,
  Camera,
  HeartHandshake,
  Mail,
  Link2,
  Send
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

import { useSettingsPage } from '../hooks/useSettingsPage';

export default function Settings() {
  const {
    userProfile,
    isEditing,
    setIsEditing,
    editName,
    setEditName,
    editGender,
    setEditGender,
    saving,
    updateError,
    telegramToken,
    setTelegramToken,
    configuringTelegram,
    telegramSetupError,
    telegramSetupSuccess,
    handleTelegramWebhookRestore,
    inviteCode,
    setInviteCode,
    linking,
    linkError,
    linkSuccess,
    copied,
    copyCode,
    handleLink,
    handleUpdateProfile,
    handleLogout,
    handleInstallApp,
    isInstalled,
    canInstall
  } = useSettingsPage();



  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 lg:p-12 max-w-4xl mx-auto space-y-10 pb-24"
    >
      {/* Header Profile Section */}
      <motion.div variants={itemVariants} className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sage-600/10 to-rose-400/10 blur-3xl -z-10 rounded-[3rem]" />

        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 md:p-8 shadow-2xl shadow-sage-900/5 overflow-hidden relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-sage-50 to-cream-100 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl group-hover:scale-[1.02] transition-transform duration-500">
                <img
                  src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${(isEditing ? editName : userProfile?.displayName) || 'user'}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 md:w-10 md:h-10 bg-sage-800 rounded-xl md:rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                  <Camera className="w-3 h-3 md:w-4 md:h-4" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-4 pt-2">
              {isEditing ? (
                <div className="space-y-4 max-w-sm mx-auto md:mx-0">
                  <div>
                    <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1.5 block px-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-5 py-3 bg-white/80 border border-sage-100 rounded-2xl text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-200 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1.5 block px-1">Jenis Kelamin</label>
                    <div className="flex gap-2 p-1 bg-white/80 border border-sage-100 rounded-2xl">
                      {[
                        { value: 'male', label: 'Laki-laki' },
                        { value: 'female', label: 'Perempuan' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setEditGender(opt.value as any)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${editGender === opt.value
                              ? 'bg-sage-800 text-white shadow-md'
                              : 'text-sage-400 hover:text-sage-600'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors px-1">Batalkan Perubahan</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-3xl font-display text-sage-900">{userProfile?.displayName}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 text-sage-500">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">{userProfile?.email}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                    <span className="px-3 md:px-4 py-1.5 bg-sage-100 text-sage-700 text-[9px] md:text-[10px] font-bold rounded-full uppercase tracking-widest">
                      {userProfile?.gender === 'female' ? '👩 Perempuan' : '👨 Laki-laki'}
                    </span>
                    <span className="px-3 md:px-4 py-1.5 bg-rose-50 text-rose-600 text-[9px] md:text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3 h-3" /> Terverifikasi
                    </span>
                  </div>

                  <div className="pt-4 md:pt-2">
                    <button
                      onClick={() => {
                        if (isEditing) handleUpdateProfile();
                        else setIsEditing(true);
                      }}
                      disabled={saving}
                      className={`text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm w-full md:w-auto ${isEditing
                        ? 'bg-sage-800 text-white hover:bg-sage-900'
                        : 'bg-sage-50 text-sage-600 hover:bg-sage-100 border border-sage-100'
                      }`}
                    >
                      {saving ? '...' : isEditing ? 'Simpan' : 'Ubah Profil'}
                    </button>
                  </div>
                  <div className="mt-4 max-w-sm rounded-2xl border border-sage-100 bg-sage-50/80 p-4 text-left">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-sage-400">Kode Undangan Kita</div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xl font-bold tracking-[0.2em] text-sage-800">
                        {userProfile?.inviteCode || 'Belum tersedia'}
                      </span>
                      <button
                        type="button"
                        onClick={copyCode}
                        disabled={!userProfile?.inviteCode}
                        aria-label={copied ? 'Kode undangan tersalin' : 'Salin kode undangan'}
                        className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${copied ? 'bg-emerald-500 text-white' : 'bg-white text-sage-600 shadow-sm hover:bg-sage-100'}`}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {updateError && <p className="text-xs text-rose-500 font-bold mt-2 text-center md:text-left">{updateError}</p>}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Couple Connection Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-xs font-bold text-sage-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4" /> Hubungan
          </h3>

          <div className="bg-white rounded-[2rem] border border-sage-100 p-8 shadow-xl shadow-sage-900/[0.03] relative overflow-hidden group min-h-[260px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Heart className="w-24 h-24 text-rose-400 fill-rose-400" />
            </div>

            {userProfile?.coupleId ? (
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
                    <Heart className="w-7 h-7 text-rose-400 fill-rose-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-0.5">Terhubung Dengan</div>
                    <div className="text-lg font-display text-sage-900">{userProfile.partnerName}</div>
                    <div className="text-xs text-sage-400">{userProfile.partnerEmail}</div>
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div className="text-xs font-bold text-emerald-700">Sistem keuangan bersama aktif</div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <h4 className="font-display text-xl text-sage-900">Mulai Bersama Pasangan</h4>
                  <p className="text-sm text-sage-500 leading-relaxed">Hubungkan akunmu untuk mengelola budget dan transaksi secara harmonis.</p>
                </div>

                <div className="space-y-4">
                  <form onSubmit={handleLink} className="space-y-3 pt-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase().trim())}
                      placeholder="KODE PASANGAN"
                      maxLength={6}
                      className="w-full px-5 py-4 bg-white border border-sage-100 rounded-2xl text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-4 focus:ring-sage-500/10 focus:border-sage-300 transition-all uppercase"
                    />
                    <button
                      type="submit"
                      disabled={linking || inviteCode.length < 6}
                      className="w-full py-4 bg-sage-800 text-white rounded-2xl font-bold hover:bg-sage-900 disabled:opacity-50 transition-all shadow-xl shadow-sage-900/10 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {linking ? 'Menghubungkan...' : (
                        <>
                          <Link2 className="w-4 h-4" />
                          Hubungkan
                        </>
                      )}
                    </button>
                    {linkError && <p className="text-center text-xs font-bold text-rose-500">{linkError}</p>}
                    {linkSuccess && <p className="text-center text-xs font-bold text-emerald-600">{linkSuccess}</p>}
                  </form>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Other Settings */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-xs font-bold text-sage-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Preferensi & Info
          </h3>

          <div className="bg-white rounded-[2rem] border border-sage-100 divide-y divide-sage-50 shadow-xl shadow-sage-900/[0.03] overflow-hidden">
            {[
              { icon: Shield, label: 'Keamanan Data', value: 'Enkripsi Aktif', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: Info, label: 'Versi Aplikasi', value: '1.0.0 (Gold)', color: 'text-amber-500', bg: 'bg-amber-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-5 hover:bg-sage-50 transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-sage-800">{item.label}</div>
                    <div className="text-[10px] text-sage-400 font-medium uppercase tracking-wider">{item.value}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sage-300 group-hover:translate-x-1 transition-transform" />
              </div>
            ))}

            <a
              href={`https://t.me/CandyNest_bot?start=${userProfile?.inviteCode || ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-5 hover:bg-sky-50 transition-colors group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-sky-900 flex items-center gap-2">
                    Telegram Bot
                    <span className="text-[8px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Baru</span>
                  </div>
                  <div className="text-[10px] text-sky-600 font-medium tracking-wide">Catat pengeluaran & tf Jago via chat Telegram</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-sky-600 hidden sm:inline">Hubungkan</span>
                <ChevronRight className="w-4 h-4 text-sky-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {userProfile?.telegramChatId && (
              <form onSubmit={handleTelegramWebhookRestore} className="p-5 space-y-3 bg-sky-50/60">
                <div>
                  <div className="text-sm font-bold text-sky-900">Pulihkan koneksi Telegram</div>
                  <p className="text-xs text-sky-700 mt-1">
                    Tempel token bot yang sama dari BotFather untuk memasang ulang webhook. Token hanya dipakai saat ini dan tidak disimpan.
                  </p>
                </div>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={e => setTelegramToken(e.target.value)}
                  placeholder="Token CandyNest Bot"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 bg-white border border-sky-100 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <button
                  type="submit"
                  disabled={configuringTelegram || !telegramToken.trim()}
                  className="w-full py-3 bg-sky-700 text-white rounded-xl text-sm font-bold hover:bg-sky-800 disabled:opacity-50 transition-colors"
                >
                  {configuringTelegram ? 'Memulihkan...' : 'Pulihkan koneksi'}
                </button>
                {telegramSetupError && <p role="alert" className="text-xs font-semibold text-rose-600">{telegramSetupError}</p>}
                {telegramSetupSuccess && <p role="status" className="text-xs font-semibold text-emerald-700">{telegramSetupSuccess}</p>}
              </form>
            )}

            {canInstall && (
              <button
                onClick={handleInstallApp}
                className="w-full flex items-center justify-between p-5 hover:bg-emerald-50 transition-colors group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-700">Install Aplikasi</div>
                    <div className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Simpan di layar utama HP</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-1 rounded-lg uppercase tracking-widest">Premium</span>
                  <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-5 hover:bg-rose-50 transition-colors group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LogOut className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-600">Keluar Sesi</div>
                  <div className="text-[10px] text-rose-300 font-medium uppercase tracking-wider">Log out dari akun ini</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-200 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="text-center pt-4">
            <p className="text-[10px] font-bold text-sage-300 uppercase tracking-[0.3em]">CandyNest • Made with ❤️</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
