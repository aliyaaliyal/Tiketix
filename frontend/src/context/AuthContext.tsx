import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, DEMO_MODE } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  // Jujur: login demo SELALU coba ke backend dulu; akun palsu lokal hanya
  // dipakai bila DEMO_MODE=true (presentasi tanpa backend).
  loginAsDemo: (role: 'ATTENDEE' | 'ORGANIZER') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PASSWORD = 'Password123!';
const DEMO_ACCOUNTS: Record<'ATTENDEE' | 'ORGANIZER', User> = {
  ATTENDEE: {
    id: 'u0000000-0000-0000-0000-000000000001',
    name: 'Budi Santoso (Demo)',
    email: 'attendee@tiketix.com',
    role: 'ATTENDEE',
    phoneNumber: '+6281234567890',
  },
  ORGANIZER: {
    id: 'u0000000-0000-0000-0000-000000000002',
    name: 'Soundwave Promoter (Demo)',
    email: 'organizer@tiketix.com',
    role: 'ORGANIZER',
    phoneNumber: '+628111222333',
  },
};

function readStoredUser(): User | null {
  try {
    const saved = localStorage.getItem('tiketix_user');
    return saved ? (JSON.parse(saved) as User) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TIDAK ada lagi user/token palsu default. Mulai kosong (belum login).
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tiketix_token'));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (token) localStorage.setItem('tiketix_token', token);
    else localStorage.removeItem('tiketix_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('tiketix_user', JSON.stringify(user));
    else localStorage.removeItem('tiketix_user');
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.data) {
        setUser(res.data.data.user);
        setToken(res.data.data.token);
        return;
      }
      throw new Error('Respon login tidak valid dari server.');
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message || 'Gagal masuk. Periksa email/password atau koneksi server.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const loginAsDemo = useCallback(async (role: 'ATTENDEE' | 'ORGANIZER') => {
    setAuthError(null);
    const email = role === 'ORGANIZER' ? 'organizer@tiketix.com' : 'attendee@tiketix.com';
    try {
      // Selalu coba akun demo ASLI dari backend (hasil `npm run demo:reset` / seed).
      const res = await api.post('/auth/login', { email, password: DEMO_PASSWORD });
      if (res.data?.data) {
        setUser(res.data.data.user);
        setToken(res.data.data.token);
        return;
      }
      throw new Error('Respon login tidak valid dari server.');
    } catch (err: any) {
      // Backend mati: hanya boleh pakai akun lokal bila DEMO_MODE=true.
      if (DEMO_MODE) {
        setUser(DEMO_ACCOUNTS[role]);
        setToken(`demo-${role.toLowerCase()}-token-offline`);
        return;
      }
      const msg: string =
        err?.response?.data?.message ||
        'Server tidak terhubung. Jalankan backend dulu, atau aktifkan VITE_DEMO_MODE=true untuk presentasi offline.';
      setAuthError(msg);
      throw new Error(msg);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setAuthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        loginAsDemo,
        logout,
        isAuthenticated: !!user && !!token && !token.startsWith('demo-'),
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
