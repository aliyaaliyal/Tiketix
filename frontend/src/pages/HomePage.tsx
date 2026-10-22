import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Sparkles,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  Zap,
  Ticket,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Flame,
  Music,
} from 'lucide-react';

import { ALL_DEMO_EVENTS, DEMO_MODE, api } from '../services/api';

export const HomePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liveEvents, setLiveEvents] = useState<any[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Backend dulu, contoh hanya bila DEMO_MODE. Selain itu tampilkan error jujur.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/events?limit=50');
        const rows = res.data?.data ?? res.data?.data?.data ?? [];
        const list = Array.isArray(rows) ? rows : [];
        if (!cancelled && list.length > 0) {
          setLiveEvents(
            list.map((ev: any) => ({
              ...ev,
              minPrice:
                ev.ticketTiers?.length > 0
                  ? Math.min(...ev.ticketTiers.map((t: any) => Number(t.price)))
                  : 0,
              city: ev.city || ev.venueAddress?.split(',').pop()?.trim() || 'Indonesia',
              category: ev.category || 'Konser Musik',
            }))
          );
          return;
        }
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.response?.data?.message || 'Server tidak terhubung.');
      }
      if (!cancelled && DEMO_MODE) setLiveEvents(ALL_DEMO_EVENTS as any[]);
      if (!cancelled) setCurrentSlide(0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = liveEvents ?? (DEMO_MODE ? (ALL_DEMO_EVENTS as any[]) : []);
  const isShowingDemo = liveEvents === null && DEMO_MODE && loadError !== null;
  const featuredEvents = (catalog.length > 0 ? catalog : (ALL_DEMO_EVENTS as any[])).slice(0, 3);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length);
  };

  // Filter events
  const filteredEvents = catalog.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.venueName.toLowerCase().includes(search.toLowerCase()) ||
      ev.city.toLowerCase().includes(search.toLowerCase()) ||
      ev.category.toLowerCase().includes(search.toLowerCase());

    const matchesCity = selectedCity === 'ALL' || ev.city === selectedCity;
    const matchesCategory =
      selectedCategory === 'ALL' ||
      ev.category.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCity && matchesCategory;
  });

  const activeFeatured = featuredEvents[currentSlide % Math.max(1, featuredEvents.length)] ?? {
    title: 'Belum ada konser tersedia',
    bannerUrl: '',
    posterUrl: '',
    eventDate: new Date().toISOString(),
    venueName: '-',
    slug: '',
    minPrice: 0,
  };

  return (
    <div className="min-h-screen pb-20">
      {isShowingDemo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <b>Data contoh untuk presentasi</b> — backend tidak terhubung ({loadError}). Aktif karena{' '}
            <span className="font-mono">VITE_DEMO_MODE=true</span>.
          </div>
        </div>
      )}
      {/* ================= 1. YESPLIS HERO CAROUSEL BANNER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-slate-900 text-white min-h-[380px] sm:min-h-[440px] flex items-end">
          {/* Background Poster Image */}
          <img
            src={activeFeatured.bannerUrl || activeFeatured.posterUrl}
            alt={activeFeatured.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60 transition-all duration-700 scale-105"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Banner Content */}
          <div className="relative z-10 p-6 sm:p-12 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral text-white text-[11px] font-extrabold uppercase tracking-wider mb-4 shadow-cheerful">
              <Flame className="w-3.5 h-3.5" />
              SEDANG TRENDING MINGGU INI
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3">
              {activeFeatured.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 font-medium mb-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-coral" />
                {new Date(activeFeatured.eventDate).toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sunshine" />
                {activeFeatured.venueName}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to={`/events/${activeFeatured.slug}`}
                className="px-6 py-3.5 bg-coral hover:bg-coral-hover text-white text-xs sm:text-sm font-bold rounded-2xl shadow-cheerful transition-all flex items-center gap-2 cursor-pointer"
              >
                Beli Tiket Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-medium uppercase">Mulai Dari</p>
                <p className="text-sm sm:text-base font-black text-white">
                  Rp {Number(activeFeatured.minPrice || 150000).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          {/* Carousel Navigation Arrows */}
          <div className="absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-2">
            <button
              onClick={prevSlide}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= 2. YESPLIS SEARCH & FILTER BAR ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-card-soft border border-slate-100 flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="flex items-center gap-3 w-full flex-1 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-200/70">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari konser, artis (Tulus, Hindia, Danilla...), atau lokasi..."
              className="w-full text-xs sm:text-sm font-medium bg-transparent focus:outline-none text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* City Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full md:w-44 px-4 py-3 bg-slate-50 border border-slate-200/70 text-xs sm:text-sm font-bold rounded-2xl text-slate-700 focus:outline-none focus:border-coral cursor-pointer"
            >
              <option value="ALL">📍 Semua Kota</option>
              <option value="Jakarta">Jakarta</option>
              <option value="Bandung">Bandung</option>
              <option value="Surabaya">Surabaya</option>
              <option value="Yogyakarta">Yogyakarta</option>
              <option value="Bali">Bali</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'ALL', label: 'Semua Acara', icon: Sparkles },
            { id: 'Konser Musik', label: 'Konser & Festival', icon: Music },
            { id: 'Indie', label: 'Indie & Pop', icon: Flame },
            { id: 'Rock', label: 'Rock & Metal', icon: Flame },
            { id: 'Stand-Up', label: 'Stand-Up Comedy', icon: Sparkles },
            { id: 'Jazz', label: 'Jazz & Soul', icon: Music },
            { id: 'EDM', label: 'EDM & DJ', icon: Zap },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-coral text-white shadow-cheerful scale-105'
                    : 'bg-white text-slate-600 hover:text-coral border border-slate-200/80 shadow-sm'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= 3. YESPLIS EVENT CARDS CATALOG ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-coral animate-ping" />
              <span className="text-xs font-extrabold text-coral uppercase tracking-wider">
                TIKET RESMI DIJUAL
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Eksplorasi Konser & Acara Terpopuler
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-bold hidden sm:block">
            Menampilkan {filteredEvents.length} Acara Aktif
          </p>
        </div>

        {liveEvents === null && !DEMO_MODE ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-red-100 shadow-card-soft">
            <Ticket className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Server tidak terhubung</h3>
            <p className="text-xs text-slate-400 mt-1">
              {loadError || 'Backend tidak merespons.'} Jalankan backend lalu muat ulang halaman.
            </p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-card-soft">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Tidak ada acara yang ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1">
              Coba ganti kata kunci pencarian atau pilih kota/kategori yang lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.slug}`}
                className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-card-soft hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Poster Aspect Ratio with Date Badge */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={ev.posterUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-white/90 backdrop-blur-md text-[11px] font-black text-slate-900 shadow-sm flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-coral" />
                      {new Date(ev.eventDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-[10px] font-bold text-white uppercase">
                      {ev.city}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    <span className="text-[10px] font-extrabold uppercase text-coral tracking-wider">
                      {ev.category}
                    </span>

                    <h3 className="text-base font-black text-slate-900 line-clamp-2 mt-1 mb-3 group-hover:text-coral transition-colors">
                      {ev.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate mb-2">
                      <MapPin className="w-3.5 h-3.5 text-coral flex-shrink-0" />
                      <span className="truncate">{ev.venueName}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer with Price & Button */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Mulai Dari</p>
                    <p className="text-sm font-black text-coral">
                      Rp {Number(ev.minPrice || 150000).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <span className="px-4 py-2 bg-coral group-hover:bg-coral-hover text-white text-xs font-bold rounded-xl shadow-cheerful transition-all flex items-center gap-1">
                    Beli
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ================= 4. YESPLIS VALUE PROPOSITIONS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="px-3 py-1 bg-coral-light text-coral text-xs font-extrabold rounded-full uppercase tracking-wider mb-3 inline-block">
            KEAMANAN & KECEPATAN
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Mengapa Penggemar Musik Memilih Tiketix?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Dirancang dengan teknologi sistem tiket modern untuk menjamin kenyamanan dari saat memesan hingga masuk gate venue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
            <div className="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center font-bold mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">100% Anti-Calo & Transparan</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Tiket terhubung langsung dengan kemitraan resmi promotor konser. Tidak ada biaya tersembunyi atau mark-up tidak wajar.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
            <div className="w-12 h-12 rounded-2xl bg-sunshine/10 text-amber-700 flex items-center justify-center font-bold mb-5">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Hold Quota Timer 30 Menit</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              Saat kamu memilih tiket, kuota otomatis dikunci secara atomik selama 30 menit sehingga kamu bisa menyelesaikan pembayaran tanpa takut direbut orang lain.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
            <div className="w-12 h-12 rounded-2xl bg-iris/10 text-iris flex items-center justify-center font-bold mb-5">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">QR Digital Contactless Entry</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              E-tiket terbit otomatis dengan kode QR terenkripsi yang langsung siap discan oleh petugas gerbang hanya dalam hitungan detik.
            </p>
          </div>
        </div>
      </section>

      {/* ================= 5. ORGANIZER CTA BANNER (YESPLIS STYLE) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="relative z-10 max-w-xl">
            <span className="px-3 py-1 bg-iris text-white text-[11px] font-extrabold uppercase rounded-full mb-4 inline-block">
              UNTUK EVENT ORGANIZER (EO) & PROMOTOR
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
              Punya Konser atau Acara? Jual Tiketmu di Tiketix
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dapatkan dashboard analitik penjualan tiket live, manajemen tier tiket yang fleksibel, dan aplikasi scanner gerbang masuk terintegrasi.
            </p>
          </div>

          <div className="relative z-10 flex-shrink-0">
            <Link
              to="/organizer"
              className="px-6 py-4 bg-coral hover:bg-coral-hover text-white text-sm font-extrabold rounded-2xl shadow-cheerful transition-all flex items-center gap-2 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              Buka Organizer Studio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
