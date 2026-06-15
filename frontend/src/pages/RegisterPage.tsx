import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const TERMINAL_LINES = [
  'root@system:~# useradd new_admin',
  'ALLOCATING_MEMORY',
  'GENERATING_KEYS',
  'hex 0x4f3a9e',
  'ESTABLISHING_SECURE_LINK',
  'rate map: system... [OK]',
  'ENCRYPTING_PAYLOAD',
  'root@system:~# chmod 777 /sys',
  '0101101010010110',
  'PASSWORD: 38*80808',
  'EX3ED00P6ACDEETEC...system-eetor',
  'INITIALIZING_LEGACYLENS_CORE',
  'LEGACYLENS_SYS_READY... [OK]',
];

function TerminalBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden select-none z-0 bg-[#020008]">
      
      {/* Glitch Bars */}
      <motion.div 
        className="absolute top-[40%] left-0 w-[100%] h-[3px] bg-cyan-400/80 shadow-[0_0_10px_#22d3ee] pointer-events-none"
        animate={{ opacity: [0, 1, 0], y: [-50, 50, -50] }}
        transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 2 }}
      />
      <motion.div 
        className="absolute top-[55%] right-0 w-[100%] h-[2px] bg-fuchsia-500/80 shadow-[0_0_10px_#d946ef] pointer-events-none"
        animate={{ opacity: [0, 0.8, 0], y: [50, -50, 50] }}
        transition={{ duration: 0.25, repeat: Infinity, repeatDelay: 3.5 }}
      />

      {/* Scattered completely random horizontal blocks of varying sizes, but CRISP */}
      {Array.from({ length: 50 }).map((_, i) => {
        const isCyan = i % 3 === 0;
        const isPurple = i % 5 === 0;
        
        // Very low blur radiuses (1px/2px) to ensure extreme clarity
        const colorClass = isCyan 
          ? 'text-cyan-400 drop-shadow-[0_0_2px_#06b6d4]' 
          : isPurple 
            ? 'text-fuchsia-400 drop-shadow-[0_0_2px_#d946ef]' 
            : 'text-white';
        
        // Randomly sized fonts
        let sizeClass = 'text-[10px] font-medium';
        if (i % 7 === 0) sizeClass = 'text-[16px] font-black tracking-widest';
        else if (i % 4 === 0) sizeClass = 'text-[13px] font-bold';
        else if (i % 3 === 0) sizeClass = 'text-[8px] opacity-90';

        // Completely random scatter positioning (the previous effect the user liked)
        const left = (i * 137) % 100;
        const top = (i * 251) % 100;

        return (
          <motion.div
            key={i}
            className={`absolute whitespace-nowrap leading-tight ${colorClass} ${sizeClass} cursor-crosshair transition-colors duration-200 hover:text-white`}
            style={{ 
              left: `${left}%`, 
              top: `${top}%`,
            }}
            initial={{ opacity: Math.random() * 0.2 + 0.1 }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            whileHover={{ opacity: 1, scale: 1.15, textShadow: '0 0 15px currentColor', zIndex: 50 }}
            transition={{ duration: 1.5 + (i % 4), repeat: Infinity, delay: (i % 3) }}
          >
            {TERMINAL_LINES[i % TERMINAL_LINES.length]}
            <br />
            {Math.random() > 0.5 && TERMINAL_LINES[(i + 1) % TERMINAL_LINES.length]}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirm) {
      setError('ERROR: ALL FIELDS REQUIRED');
      return;
    }
    if (password.length < 8) {
      setError('ERROR: PASSWORD TOO WEAK');
      return;
    }
    if (password !== confirm) {
      setError('ERROR: PASSWORDS MISMATCH');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(email, password);
      toast.success('NODE REGISTERED', { style: { background: '#1a0b2e', color: '#e879f9', border: '1px solid #d946ef', borderRadius: '0', fontFamily: 'monospace' }});
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'REGISTRATION_FAILED';
      setError(msg.toUpperCase());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020008] flex items-center justify-center relative overflow-hidden font-mono text-slate-200">
      
      <TerminalBackground />

      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-fuchsia-600/10 blur-[100px]" />
      </div>

      {/* Subtle Left Branding Watermark */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[80px] font-black tracking-[0.2em] text-cyan-500/[0.03] select-none pointer-events-none whitespace-nowrap z-0">
        LEGACYLENS_SYS_01
      </div>

      <div className="relative flex items-center justify-center z-10 w-[600px] h-[600px]">
        {/* Intricate Outer Ring System replicating the image */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-[2px] border-dashed border-fuchsia-500/50"
        />
        
        {/* Chunky dashed ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[15px] rounded-full border-[8px] border-dotted border-fuchsia-600/60 shadow-[0_0_20px_#d946ef]"
        />

        {/* Thick glowing ring */}
        <div className="absolute inset-[30px] rounded-full border-[6px] border-fuchsia-500 shadow-[0_0_40px_#d946ef,inset_0_0_40px_#d946ef]" />

        {/* Inner broken / tech ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[40px] rounded-full border-[3px] border-cyan-400/80"
          style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 40%, 0% 40%, 0% 60%, 100% 60%, 100% 100%, 0% 100%)' }}
        />

        {/* Inner Solid Core */}
        <div className="absolute inset-[48px] rounded-full bg-[#0a0014]/90 backdrop-blur-xl border border-fuchsia-500/30 shadow-[inset_0_0_80px_rgba(217,70,239,0.2)] flex flex-col items-center justify-center p-8">
          
          <div className="text-center mb-6 z-10 flex flex-col items-center mt-4">
            <div className="flex items-center justify-center gap-3 mb-1">
              <h1 className="text-[32px] font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                LEGACYLENS
              </h1>
            </div>
            <h2 className="text-[14px] font-bold tracking-[0.4em] text-white drop-shadow-[0_0_8px_#fff] mt-1">
              NODE REGISTRATION
            </h2>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-fuchsia-500">»</span>
              <p className="text-[10px] tracking-[0.2em] text-slate-300">ESTABLISH IDENTITY</p>
              <span className="text-fuchsia-500">«</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-[260px] space-y-4 z-10">
            
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full text-red-500 text-xs text-center font-bold tracking-widest animate-pulse"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-[11px] tracking-widest text-slate-300 block">[ EMAIL ]</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-transparent border border-cyan-400/50 text-white text-sm py-1.5 px-3 focus:outline-none focus:border-cyan-300 focus:bg-cyan-900/20 transition-colors placeholder:text-slate-600"
                placeholder="root@system.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] tracking-widest text-slate-300 block">[ PASSWORD ]</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-transparent border border-cyan-400/50 text-white text-sm py-1.5 px-3 focus:outline-none focus:border-cyan-300 focus:bg-cyan-900/20 transition-colors placeholder:text-slate-600 tracking-widest"
                  placeholder="********"
                  disabled={isLoading}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] tracking-widest text-slate-300 block">[ CONFIRM ]</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full bg-transparent border border-cyan-400/50 text-white text-sm py-1.5 px-3 focus:outline-none focus:border-cyan-300 focus:bg-cyan-900/20 transition-colors placeholder:text-slate-600 tracking-widest"
                  placeholder="********"
                  disabled={isLoading}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-500" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-[180px] mx-auto block py-2 border border-white text-white text-sm tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                {isLoading ? 'WORKING...' : '[ REGISTER ]'}
              </button>
            </div>
          </form>

          <div className="mt-6 z-10 text-[11px] text-slate-400 tracking-wider text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors drop-shadow-[0_0_5px_#d946ef]">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
