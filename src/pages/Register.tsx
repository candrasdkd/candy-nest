import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, User, Mail, Lock, ArrowRight, Sparkles, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useRegister } from '../hooks/useRegister';
import { motion, AnimatePresence } from 'framer-motion';
import PuzzleCaptcha from '../components/PuzzleCaptcha';

export default function Register() {
  const {
    step,
    setStep,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    gender,
    setGender,
    loading,
    error,
    showCaptcha,
    setShowCaptcha,
    handleSubmit,
    handleVerified
  } = useRegister();

  return (
    <div className="min-h-screen bg-sage-950 flex relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-sage-700/20 rounded-full blur-[150px]" />
        
        {/* Floating Hearts */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0.2, 0.5, 0.2],
                y: [0, -30, 0],
                rotate: [0, 15, 0]
              }}
              transition={{ 
                duration: 6 + (i % 4), 
                repeat: Infinity, 
                delay: i * 0.4 
              }}
              className="absolute text-rose-300"
              style={{
                left: `${(i * 27) % 100}%`,
                top: `${(i * 19) % 100}%`,
              }}
            >
              <Heart size={15 + (i % 12)} fill={i % 2 === 0 ? "currentColor" : "none"} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Left Panel: Desktop Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
            </div>
            <span className="font-display text-2xl text-cream-50 tracking-tight">CandyNest</span>
          </div>
          
          <h1 className="font-display text-7xl text-cream-50 leading-[1.1] mb-8">
            Satu Tempat<br />
            Untuk Semua<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-sage-400 italic">Keluarga.</span>
          </h1>
          
          <p className="text-sage-300 text-xl leading-relaxed max-w-lg font-light">
            Kelola keuangan, dokumen, dan kebutuhan keluarga dalam satu aplikasi. Karena keluarga yang teratur adalah keluarga yang bahagia.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center gap-6 max-w-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-rose-300" />
          </div>
          <div>
            <p className="text-cream-50 text-sm font-medium">Bergabunglah dan mulai kelola keluargamu dengan lebih teratur dan harmonis.</p>
          </div>
        </motion.div>
      </div>

      {/* Right Panel: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[480px]"
        >
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[3rem] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative overflow-hidden">
            
            {/* Step Indicator */}
            <div className="flex gap-2 mb-10">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-rose-400' : 'bg-white/10'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-rose-400' : 'bg-white/10'}`} />
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="font-display text-4xl text-cream-50 mb-3">
                {step === 1 ? 'Buat Akun' : 'Lengkapi Profil'}
              </h2>
              <p className="text-sage-400 font-body text-sm">
                {step === 1 ? 'Mulai kelola keluargamu hari ini' : 'Beri tahu kami sedikit tentang dirimu'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] px-1">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-500 group-focus-within:text-cream-100 transition-colors" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="nama@email.com"
                          required
                          disabled={loading}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-cream-50 placeholder:text-sage-600 focus:outline-none focus:ring-2 focus:ring-sage-500/50 focus:border-sage-500/50 transition-all text-base md:text-sm font-medium disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] px-1">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-500 group-focus-within:text-cream-100 transition-colors" />
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          required
                          minLength={6}
                          disabled={loading}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-cream-50 placeholder:text-sage-600 focus:outline-none focus:ring-2 focus:ring-sage-500/50 focus:border-sage-500/50 transition-all text-base md:text-sm font-medium disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] px-1">Nama Lengkap</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-500 group-focus-within:text-cream-100 transition-colors" />
                        <input
                          type="text"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="Nama Panggilan"
                          required
                          autoFocus
                          disabled={loading}
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-cream-50 placeholder:text-sage-600 focus:outline-none focus:ring-2 focus:ring-sage-500/50 focus:border-sage-500/50 transition-all text-base md:text-sm font-medium disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] px-1 block mb-2">Jenis Kelamin</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { value: 'male', label: 'Laki-laki', icon: '👨' },
                          { value: 'female', label: 'Perempuan', icon: '👩' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setGender(opt.value as any)}
                            disabled={loading}
                            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group disabled:opacity-50 ${
                              gender === opt.value
                                ? 'bg-rose-500/20 border-rose-500/50 text-cream-50 shadow-lg shadow-rose-500/10'
                                : 'bg-white/5 border-white/10 text-sage-400 hover:bg-white/10'
                            }`}
                          >
                            <span className="text-2xl">{opt.icon}</span>
                            <span className="text-xs font-bold uppercase tracking-widest">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-rose-500" />
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="p-4 bg-white/5 border border-white/10 text-cream-50 rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-6 h-6 text-cream-50" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-cream-50 rounded-2xl font-bold transition-all shadow-xl shadow-rose-950/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mendaftarkan...
                    </>
                  ) : (
                    <>
                      {step === 1 ? 'Lanjutkan' : 'Daftar Sekarang'}
                      {step === 1 ? <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> : <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-sage-500 text-sm">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-sage-300 font-bold hover:text-white transition-colors inline-flex items-center gap-1">
                  Masuk Saja
                </Link>
              </p>
            </div>
          </div>
          
          <p className="text-center mt-10 text-[10px] font-bold text-sage-600 uppercase tracking-[0.4em]">CandyNest • Built for Family</p>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {showCaptcha && (
          <PuzzleCaptcha 
            onSuccess={handleVerified} 
            onClose={() => setShowCaptcha(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
