import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ATTENDEE' | 'ORGANIZER'>('ATTENDEE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !email.trim() || password.length < 6) {
      setError('Nama min. 2 huruf, email valid, password min. 6 karakter.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      if (res.data?.data) {
        // Register sukses -> langsung login agar dapat token asli.
        await login(email.trim(), password);
        navigate('/');
        return;
      }
      setError('Respon server tidak valid. Coba lagi.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Gagal mendaftar. Server tidak terhubung?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-card-soft p-8">
        <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1">Daftar Akun Baru</h1>
        <p className="text-xs text-slate-500 mb-6">Satu akun untuk beli tiket & kelola konser.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
            />
          </div>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Password (min. 6 karakter)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Daftar sebagai</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ATTENDEE', 'ORGANIZER'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    role === r ? 'border-coral bg-coral-light/30 text-coral' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {r === 'ATTENDEE' ? 'Penonton' : 'Penyelenggara (EO)'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-coral hover:bg-coral-hover disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {busy ? 'Mendaftar...' : 'Daftar & Masuk'}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 mt-5 text-center">
          <CheckCircle2 className="w-3.5 h-3.5 inline text-mint" /> Sudah punya akun?{' '}
          <Link to="/login" className="text-coral font-bold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
};
