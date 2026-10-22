import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  ShieldCheck,
  Zap,
  Clock,
  Heart,
  QrCode,
  TrendingUp,
  Building2,
  Mail,
} from 'lucide-react';


export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white mt-24 border-t border-slate-800">
      {/* Top Value Banner */}
      <div className="border-b border-slate-800 bg-slate-950/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-2xl bg-coral/10 text-coral flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">100% Tiket Resmi</p>
                <p className="text-[11px] text-slate-400">Kerja sama langsung dengan promotor</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-2xl bg-sunshine/10 text-sunshine flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Hold Quota 30 Menit</p>
                <p className="text-[11px] text-slate-400">Kuota aman anti-rebutan calo</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-2xl bg-iris/10 text-iris flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">E-Tiket QR Instan</p>
                <p className="text-[11px] text-slate-400">Langsung aktif tanpa cetak fisik</p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="w-10 h-10 rounded-2xl bg-mint/10 text-mint flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Gate Scanner Terpadu</p>
                <p className="text-[11px] text-slate-400">Verifikasi cepat di pintu masuk</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-coral to-sunshine flex items-center justify-center text-white shadow-cheerful">
                <Ticket className="w-4 h-4 -rotate-12" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Tiketix
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mb-6">
              Platform ekosistem pemesanan tiket konser musik dan manajemen acara terintegrasi di Indonesia. Solusi lengkap dari penjualan tiket online hingga validasi gate scanner fisik.
            </p>
            <div className="text-xs text-slate-400 space-y-1.5">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-coral" />
                <span>support@tiketix.com</span>
              </p>
              <p className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-coral" />
                <span>Jakarta Selatan, DKI Jakarta 12950</span>
              </p>
            </div>
          </div>

          {/* Kategori Acara */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Kategori Acara
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/" className="hover:text-coral transition-colors">
                  Konser Musik Nasional
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-coral transition-colors">
                  Festival Musik Tahunan
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-coral transition-colors">
                  Indie & Pop Showcase
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-coral transition-colors">
                  Stand-Up Comedy
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-coral transition-colors">
                  Jazz, Rock & Metal
                </Link>
              </li>
            </ul>
          </div>

          {/* Untuk Penyelenggara (EO) */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Penyelenggara (EO)
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/organizer" className="hover:text-coral transition-colors flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-coral" />
                  Dashboard Analitik EO
                </Link>
              </li>
              <li>
                <Link to="/organizer" className="hover:text-coral transition-colors">
                  Publikasikan Acara Baru
                </Link>
              </li>
              <li>
                <Link to="/scanner" className="hover:text-coral transition-colors flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-iris" />
                  Staff Gate Scanner
                </Link>
              </li>
              <li>
                <Link to="/organizer" className="hover:text-coral transition-colors">
                  Ekspor Laporan Penjualan (CSV)
                </Link>
              </li>
            </ul>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Metode Pembayaran
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Mendukung berbagai saluran pembayaran instan & aman:
            </p>
            <div className="flex flex-wrap gap-2">
              {['QRIS', 'BCA VA', 'Mandiri', 'BNI', 'BRI', 'Credit Card'].map((method, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© 2026 Tiketix — All-in-One Booking & Ticketing Event System.</p>
          <p className="flex items-center gap-1 mt-3 sm:mt-0">
            Dibuat dengan <Heart className="w-3.5 h-3.5 text-coral fill-coral" /> untuk industri kreatif & hiburan Indonesia.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
