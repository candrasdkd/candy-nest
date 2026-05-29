import { Link } from 'react-router-dom';
import { Heart, Users, Mail, Lock, ArrowRight, Shield, Smartphone, Loader2, Eye, EyeOff } from 'lucide-react';
import { useLogin } from '../hooks/useLogin';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    handleSubmit,
    showPassword,
    setShowPassword,
    greeting,
    handleForgotPassword
  } = useLogin();

  return (
    <div className="min-h-screen bg-sage-950 flex relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sage-700/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-500/10 rounded-full blur-[150px]" />

        {/* Floating Icons */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.2, 0.5, 0.2],
                y: [0, -20, 0],
                rotate: [0, 10, 0]
              }}
              transition={{
                duration: 5 + (i % 5),
                repeat: Infinity,
                delay: i * 0.5
              }}
              className="absolute text-cream-100"
              style={{
                left: `${(i * 23) % 100}%`,
                top: `${(i * 17) % 100}%`,
              }}
            >
              <Heart size={20 + (i % 10)} fill={i % 3 === 0 ? "currentColor" : "none"} />
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
            Kelola Keluarga<br />
            Dengan Cara<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sage-400 to-rose-300 italic">Harmonis.</span>
          </h1>

          <p className="text-sage-300 text-xl leading-relaxed max-w-lg font-light">
            Satu tempat untuk keuangan, dokumen, dan semua kebutuhan keluargamu.
            Dikelola bersama, hidup lebih teratur.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex gap-12"
        >
          {[
            { label: 'Aman', icon: Shield },
            { label: 'Keluarga', icon: Users },
            { label: 'PWA Ready', icon: Smartphone },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <item.icon className="w-5 h-5 text-cream-200" />
              </div>
              <span className="text-cream-100/60 text-sm font-medium uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-[440px]"
        >
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[3rem] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Mobile Branding */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
              <span className="font-display text-xl text-cream-50">CandyNest</span>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="font-display text-4xl text-cream-50 mb-3">{greeting}</h2>
              <p className="text-sage-400 font-body">Silakan masuk untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em]">Password</label>
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] font-bold text-sage-300 hover:text-rose-400 transition-colors">Lupa Password?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-500 group-focus-within:text-cream-100 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-cream-50 placeholder:text-sage-600 focus:outline-none focus:ring-2 focus:ring-sage-500/50 focus:border-sage-500/50 transition-all text-base md:text-sm font-medium disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-sage-500 hover:text-cream-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl flex items-center gap-2"
                  >
                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-sage-600 to-sage-800 hover:from-sage-500 hover:to-sage-700 text-cream-50 rounded-2xl font-bold transition-all shadow-xl shadow-sage-950/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk Akun
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-sage-500 text-sm">
                Belum punya akun?{' '}
                <Link to="/register" className="text-rose-400 font-bold hover:text-rose-300 transition-colors inline-flex items-center gap-1">
                  Daftar Sekarang
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center mt-10 text-[10px] font-bold text-sage-600 uppercase tracking-[0.4em]">CandyNest • Built for Family</p>
        </motion.div>
      </div>
    </div>
  );
}
