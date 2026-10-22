import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Ticket, QrCode, LogOut, LogIn, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-coral to-sunshine flex items-center justify-center text-white shadow-cheerful group-hover:scale-105 transition-transform">
            <Ticket className="w-5 h-5 -rotate-12" />
          </div>
          <div>
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-coral to-iris bg-clip-text text-transparent">
              Tiketix
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-coral-light text-coral rounded-full">
              Live Concert
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-full border border-slate-200/60">
          <Link
            to="/"
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isActive('/')
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-coral'
            }`}
          >
            Jelajahi Konser
          </Link>
          <Link
            to="/my-tickets"
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isActive('/my-tickets')
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-coral'
            }`}
          >
            <Ticket className="w-4 h-4 text-coral" />
            Tiket Saya
          </Link>
          <Link
            to="/scanner"
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isActive('/scanner')
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-iris'
            }`}
          >
            <QrCode className="w-4 h-4 text-iris" />
            Gate Scanner
          </Link>
          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <Link
              to="/organizer"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/organizer')
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-coral'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-coral" />
              Dashboard EO
            </Link>
          )}
        </nav>


        {/* Right Section: user jujur */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              {/* Profile Chip */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 pl-2 pr-3 py-1.5 rounded-full shadow-card-soft">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-coral to-sunshine text-white flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <p className="font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {user.name}
                  </p>
                  <p className="text-[10px] font-semibold text-coral uppercase">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  title="Logout"
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-coral hover:bg-coral-hover text-white text-sm font-bold rounded-full shadow-cheerful transition-all flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Masuk
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
