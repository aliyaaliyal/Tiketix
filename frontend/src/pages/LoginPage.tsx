import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, LogIn, UserRound, Megaphone, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_MODE } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<'ATTENDEE' | 'ORGANIZER' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Isi email dan password dulu ya.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (role: 'ATTENDEE' | 'ORGANIZER') => {
    setDemoBusy(role);
    setError(null);
    try {
      await loginAsDemo(role);
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk demo.');
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-card-soft p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-coral to-sunshine flex items-center justify-center text-white">
            <Ticket className="w-5 h-5 -rotate-12" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Masuk ke Tiketix</h1>
            <p className="text-xs text-slate-500">
              {DEMO_MODE ? 'Mode presentasi: data contoh bila backend mati.' : 'Gunakan akun terdaftar kamu.'}
            </p>
          </div>
        </div>

        {(error || authError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error || authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-coral hover:bg-coral-hover disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {busy ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[11px] font-bold text-slate-400 uppercase">atau demo cepat</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDemo('ATTENDEE')}
            disabled={demoBusy !== null}
            className="py-3 px-3 rounded-2xl border border-slate-200 hover:border-coral text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <UserRound className="w-4 h-4 text-coral" />
            {demoBusy === 'ATTENDEE' ? 'Masuk...' : 'Penonton (Demo)'}
          </button>
          <button
            onClick={() => handleDemo('ORGANIZER')}
            disabled={demoBusy !== null}
            className="py-3 px-3 rounded-2xl border border-slate-200 hover:border-iris text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Megaphone className="w-4 h-4 text-iris" />
            {demoBusy === 'ORGANIZER' ? 'Masuk...' : 'EO (Demo)'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-5 text-center leading-relaxed">
          Akun demo: <span className="font-mono">attendee@tiketix.com</span> /{' '}
          <span className="font-mono">organizer@tiketix.com</span> — password{' '}
          <span className="font-mono">Password123!</span>
          <br />
          (disiapkan via <span className="font-mono">npm run demo:reset</span>). Belum punya akun?{' '}
          <Link to="/register" className="text-coral font-bold hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
};
