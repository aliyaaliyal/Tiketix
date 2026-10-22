import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Ticket,
  QrCode,
  Calendar,
  MapPin,
  Plus,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  DollarSign,
  X,
  ArrowRight,
  ExternalLink,
  Upload,
} from 'lucide-react';

import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import {
  getOrganizerDashboard,
  getOrganizerAttendees,
  createOrganizerEvent,
  uploadEventPoster,
  resolveAssetUrl,
} from '../services/api';

export const OrganizerDashboardPage: React.FC = () => {
  useAuth(); // guard peran ada di ProtectedRoute; halaman ini murni data.

  // Active Tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EVENTS' | 'ATTENDEES'>('OVERVIEW');

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoData, setIsDemoData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modal Create Event State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventSlug, setNewEventSlug] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventAddress, setNewEventAddress] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-12-20T19:00');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState<string | null>(null);

  // Ticket Tiers Builder State in Modal
  const [tierInputs, setTierInputs] = useState<
    Array<{ name: string; price: number; totalQuota: number; description: string }>
  >([
    { name: 'Early Bird', price: 150000, totalQuota: 100, description: 'Akses festival umum' },
    { name: 'VIP Pass', price: 400000, totalQuota: 30, description: 'Barisan depan & lounge' },
  ]);

  // Load Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [dash, atts] = await Promise.all([
        getOrganizerDashboard(),
        getOrganizerAttendees(),
      ]);
      const { normalizeAttendees } = await import('../services/api');
      setDashboardData(dash.data);
      setAttendees(normalizeAttendees(atts.data ?? atts));
      setIsDemoData(!!dash.isDemo);
    } catch (e: any) {
      setLoadError(e?.message || 'Gagal memuat dashboard.');
      setDashboardData(null);
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug when title changes
  const handleTitleChange = (val: string) => {
    setNewEventTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setNewEventSlug(generatedSlug);
  };

  // Tier builder helpers
  const addTierRow = () => {
    setTierInputs((prev) => [
      ...prev,
      { name: '', price: 200000, totalQuota: 50, description: '' },
    ]);
  };

  const removeTierRow = (index: number) => {
    setTierInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTierRow = (index: number, field: string, val: any) => {
    setTierInputs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Handle Poster Selection & Local Preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB. Silakan pilih gambar yang lebih kecil.');
        return;
      }
      setPosterFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPosterPreview(previewUrl);
    }
  };

  // Submit Create Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventSlug || !newEventVenue) {
      alert('Mohon isi Judul, Slug, dan Nama Venue');
      return;
    }

    setCreating(true);
    try {
      // 1. Upload poster first if selected
      let uploadedPosterUrl: string | undefined = undefined;
      if (posterFile) {
        try {
          const uploadRes = await uploadEventPoster(posterFile);
          if (uploadRes?.fileUrl) {
            uploadedPosterUrl = uploadRes.fileUrl;
          }
        } catch (uploadErr: any) {
          console.warn('Gagal mengunggah poster:', uploadErr);
        }
      }

      const payload = {
        title: newEventTitle,
        slug: newEventSlug,
        venueName: newEventVenue,
        venueAddress: newEventAddress,
        eventDate: new Date(newEventDate).toISOString(),
        description: newEventDescription,
        posterUrl: uploadedPosterUrl,
        bannerUrl: uploadedPosterUrl,
        status: 'PUBLISHED',
        ticketTiers: tierInputs.filter((t) => t.name.trim().length > 0),
      };

      const created = await createOrganizerEvent(payload);

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF5B37', '#FFB800', '#7C5DFA', '#10B981'],
      });

      // Update local state smoothly
      if (dashboardData) {
        const updatedEvents = [
          {
            id: created.id,
            title: created.title,
            slug: created.slug,
            venueName: created.venueName,
            eventDate: created.eventDate,
            status: created.status,
            totalQuota: tierInputs.reduce((sum, t) => sum + Number(t.totalQuota), 0),
            soldQuota: 0,
            revenue: 0,
            ticketTiers: created.ticketTiers,
          },
          ...dashboardData.events,
        ];
        setDashboardData({
          ...dashboardData,
          events: updatedEvents,
          stats: {
            ...dashboardData.stats,
            totalEvents: dashboardData.stats.totalEvents + 1,
            totalQuota:
              dashboardData.stats.totalQuota +
              tierInputs.reduce((sum, t) => sum + Number(t.totalQuota), 0),
          },
        });
      }

      setCreateSuccessMsg(`Event "${newEventTitle}" berhasil dipublikasikan!`);
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateSuccessMsg(null);
        // Reset form
        setNewEventTitle('');
        setNewEventSlug('');
        setNewEventVenue('');
        setNewEventAddress('');
        setNewEventDescription('');
        setPosterFile(null);
        setPosterPreview(null);
      }, 1200);
    } catch (err: any) {
      alert('Gagal membuat event: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Filter attendees
  const filteredAttendees = attendees.filter((a) => {
    const matchesSearch =
      a.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.bookingCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEvent =
      selectedEventFilter === 'ALL' || a.eventTitle === selectedEventFilter;

    const matchesStatus =
      selectedStatusFilter === 'ALL' || a.status === selectedStatusFilter;

    return matchesSearch && matchesEvent && matchesStatus;
  });

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredAttendees.length === 0) {
      alert('Tidak ada data peserta untuk diekspor.');
      return;
    }

    const headers = [
      'Kode Tiket',
      'Nama Peserta',
      'Email',
      'Tier Tiket',
      'Harga (IDR)',
      'Status Check-In',
      'Waktu Check-In',
      'Kode Booking',
      'Nama Acara',
      'Tanggal Pembelian',
    ];

    const rows = filteredAttendees.map((a) => [
      `"${a.ticketCode}"`,
      `"${a.attendeeName}"`,
      `"${a.attendeeEmail}"`,
      `"${a.tierName}"`,
      a.price,
      `"${a.status}"`,
      `"${a.checkedInAt ? new Date(a.checkedInAt).toLocaleString('id-ID') : '-'}"`,
      `"${a.bookingCode}"`,
      `"${a.eventTitle}"`,
      `"${new Date(a.purchasedAt).toLocaleDateString('id-ID')}"`,
    ]);

    const csvString =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Tiketix_Laporan_Peserta_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Jujur: tanpa data server tampilkan NOL, bukan omzet palsu Rp 13,5 jt.
  const stats = dashboardData?.stats || {
    totalEvents: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalQuota: 0,
    totalAvailable: 0,
    checkedInCount: 0,
    checkInRate: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Banner / Organizer Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-iris-light/60 text-iris text-xs font-bold shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  PORTAL RESMI EVENT ORGANIZER (EO)
                </div>
                {loading && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-coral-light text-coral text-[10px] font-bold animate-pulse">
                    <Clock className="w-3 h-3 animate-spin" />
                    Menyinkronkan data...
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">

                Organizer Studio & Analitik
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Kelola penjualan tiket konser, pantau kedatangan penonton di gate, dan publikasikan event baru.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isDemoData && (
                <span className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100 rounded-xl">
                  Data contoh (backend mati)
                </span>
              )}
              {loadError && (
                <span className="px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  {loadError}
                </span>
              )}

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-3 bg-coral hover:bg-coral-hover text-white text-sm font-bold rounded-2xl shadow-cheerful transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Buat Event Baru
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 border-b border-slate-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-3.5 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === 'OVERVIEW'
                  ? 'text-coral'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Ringkasan & Penjualan
              {activeTab === 'OVERVIEW' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('EVENTS')}
              className={`pb-3.5 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === 'EVENTS'
                  ? 'text-coral'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Kelola Event ({dashboardData?.events?.length || 0})
              {activeTab === 'EVENTS' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('ATTENDEES')}
              className={`pb-3.5 px-4 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === 'ATTENDEES'
                  ? 'text-coral'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Daftar Peserta & E-Tiket ({attendees.length})
              {activeTab === 'ATTENDEES' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral rounded-t-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ================= TAB 1: OVERVIEW & SALES ANALYTICS ================= */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            {/* 4 Key Performance Indicator Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Gross Revenue */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    +18% Bulan Ini
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Pendapatan Kotor
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  Rp {stats.totalRevenue.toLocaleString('id-ID')}
                </h3>
                <p className="text-xs text-slate-500 mt-2">
                  Dari total {stats.totalTicketsSold} tiket terbayar
                </p>
              </div>

              {/* Card 2: Tickets Sold */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center font-bold">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-coral-light text-coral">
                    {Math.round((stats.totalTicketsSold / stats.totalQuota) * 100)}% Terjual
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tiket Terjual
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {stats.totalTicketsSold}{' '}
                  <span className="text-base font-medium text-slate-400">/ {stats.totalQuota}</span>
                </h3>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-coral h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (stats.totalTicketsSold / stats.totalQuota) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Card 3: Sisa Kuota */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-sunshine/10 text-amber-700 flex items-center justify-center font-bold">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">
                    Sedia Terbatas
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Sisa Kuota Tiket
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {stats.totalAvailable}{' '}
                  <span className="text-base font-medium text-slate-400">tiket</span>
                </h3>
                <p className="text-xs text-slate-500 mt-2">Tersedia untuk pembeli publik</p>
              </div>

              {/* Card 4: Gate Check-in Rate */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-iris/10 text-iris flex items-center justify-center font-bold">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-iris-light text-iris">
                    Gate Scanner
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Kehadiran Gate Masuk
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {stats.checkInRate}%
                </h3>
                <p className="text-xs text-slate-500 mt-2">
                  {stats.checkedInCount} dari {stats.totalTicketsSold} penonton sudah check-in
                </p>
              </div>
            </div>

            {/* Event Performance & Tier Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Event Breakdown */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Rincian Penjualan per Tier
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pantau performa tier tiket dari event utama
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('EVENTS')}
                    className="text-xs font-bold text-coral hover:underline"
                  >
                    Lihat Semua Event →
                  </button>
                </div>

                <div className="space-y-4">
                  {dashboardData?.events?.[0]?.ticketTiers?.map((tier: any) => {
                    const sold = tier.totalQuota - tier.availableQuota;
                    const percent = Math.round((sold / tier.totalQuota) * 100);
                    return (
                      <div
                        key={tier.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-sm text-slate-900">
                              {tier.name}
                            </span>
                            <span className="ml-2 text-xs font-medium text-slate-500">
                              Rp {Number(tier.price).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-800">
                              {sold} / {tier.totalQuota}
                            </span>
                            <span className="text-xs text-slate-400 ml-1 font-semibold">
                              ({percent}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent > 80
                                ? 'bg-emerald-500'
                                : percent > 50
                                ? 'bg-coral'
                                : 'bg-sunshine'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Recent Bookings Feed */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Transaksi Terbaru
                    </h2>
                    <p className="text-xs text-slate-500">Aktivitas pemesanan tiket terkini</p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-mint animate-ping" />
                </div>

                <div className="divide-y divide-slate-100">
                  {dashboardData?.recentBookings?.map((b: any) => (
                    <div key={b.id} className="py-3.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">
                            {b.attendeeName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                            {b.bookingCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                          {b.eventTitle}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-600">
                          +Rp {Number(b.totalAmount).toLocaleString('id-ID')}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MANAGE EVENTS ================= */}
        {activeTab === 'EVENTS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-card-soft">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Daftar Konser & Acara</h2>
                <p className="text-xs text-slate-500">
                  Kelola konser musik aktif, kuota tiket, dan detail informasi acara
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 bg-coral text-white text-xs font-bold rounded-xl shadow-cheerful flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Event Baru
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dashboardData?.events?.map((ev: any) => (
                <div
                  key={ev.id}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card-soft flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ev.status}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {ev.ticketTiers?.length || 0} Tier Tiket
                      </span>
                    </div>

                    {ev.posterUrl && (
                      <div className="h-32 rounded-2xl overflow-hidden mb-3 bg-slate-100 border border-slate-100 shadow-2xs">
                        <img
                          src={resolveAssetUrl(ev.posterUrl)}
                          alt={ev.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <h3 className="text-lg font-black text-slate-900 mb-2">{ev.title}</h3>

                    <div className="space-y-1.5 text-xs text-slate-500 mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-coral" />
                        <span>
                          {new Date(ev.eventDate).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-coral" />
                        <span className="truncate">{ev.venueName}</span>
                      </div>
                    </div>

                    {/* Tier Mini List */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl mb-4">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Tier Tiket Aktif:
                      </p>
                      <div className="space-y-1.5">
                        {ev.ticketTiers?.map((t: any) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-700">{t.name}</span>
                            <span className="text-slate-500">
                              Rp {Number(t.price).toLocaleString('id-ID')} ({t.availableQuota}/
                              {t.totalQuota} tiket)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Omset Penjualan</p>
                      <p className="text-base font-black text-slate-900">
                        Rp {Number(ev.revenue || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <a
                      href={`/events/${ev.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      Buka Halaman Penonton
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: ATTENDEE & TICKET LIST ================= */}
        {activeTab === 'ATTENDEES' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card-soft flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, email, kode tiket..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-coral"
                  />
                </div>

                {/* Filter Status */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-coral"
                >
                  <option value="ALL">Semua Status Check-In</option>
                  <option value="CHECKED_IN">Sudah Check-In</option>
                  <option value="ACTIVE">Belum Check-In (Active)</option>
                </select>

                {/* Filter Event */}
                <select
                  value={selectedEventFilter}
                  onChange={(e) => setSelectedEventFilter(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-coral"
                >
                  <option value="ALL">Semua Konser / Event</option>
                  {dashboardData?.events?.map((ev: any) => (
                    <option key={ev.id} value={ev.title}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>


              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                Ekspor ke Excel / CSV
              </button>
            </div>

            {/* Attendees Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-card-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-4 px-6">Peserta</th>
                      <th className="py-4 px-6">Kode Tiket</th>
                      <th className="py-4 px-6">Tier Tiket</th>
                      <th className="py-4 px-6">Event</th>
                      <th className="py-4 px-6">Status Gate</th>
                      <th className="py-4 px-6 text-right">Waktu Check-In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAttendees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          Tidak ada peserta yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendees.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-extrabold text-slate-900">{att.attendeeName}</p>
                            <p className="text-[11px] text-slate-400">{att.attendeeEmail}</p>
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-coral">
                            {att.ticketCode}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-700">{att.tierName}</span>
                            <span className="block text-[11px] text-slate-400">
                              Rp {Number(att.price).toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-600">
                            {att.eventTitle}
                          </td>
                          <td className="py-4 px-6">
                            {att.status === 'CHECKED_IN' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Checked-In
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[10px] border border-amber-200">
                                <Clock className="w-3 h-3" />
                                Belum Hadir
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right font-medium text-slate-500">
                            {att.checkedInAt
                              ? new Date(att.checkedInAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) + ' WIB'
                              : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: BUAT EVENT BARU ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <span className="px-3 py-1 bg-coral/10 text-coral text-xs font-bold rounded-full uppercase tracking-wider mb-2 inline-block">
                Event Creator Studio
              </span>
              <h2 className="text-2xl font-black text-slate-900">Publikasikan Konser Baru</h2>
              <p className="text-xs text-slate-500 mt-1">
                Isi rincian konser dan tentukan tier tiket dengan kuota yang diinginkan.
              </p>
            </div>

            {createSuccessMsg && (
              <div className="p-4 mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {createSuccessMsg}
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-6">
              {/* Event Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Event / Konser *
                  </label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Contoh: Java Jazz Festival 2026"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-coral"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Slug URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEventSlug}
                      onChange={(e) => setNewEventSlug(e.target.value)}
                      placeholder="java-jazz-festival-2026"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:border-coral"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Waktu & Tanggal Acara *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-coral"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nama Venue / Lokasi *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEventVenue}
                      onChange={(e) => setNewEventVenue(e.target.value)}
                      placeholder="Contoh: JIExpo Kemayoran, Hall D2"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-coral"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alamat Venue
                    </label>
                    <input
                      type="text"
                      value={newEventAddress}
                      onChange={(e) => setNewEventAddress(e.target.value)}
                      placeholder="Jakarta Pusat, Indonesia"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-coral"
                    />
                  </div>
                </div>

                {/* Poster / Banner Upload Box */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Poster / Banner Konser</span>
                    <span className="text-[10px] text-slate-400 font-normal">Maks 5MB (JPG, PNG, WebP)</span>
                  </label>
                  {posterPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                      <img
                        src={posterPreview}
                        alt="Preview Poster"
                        className="w-full h-40 object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPosterFile(null);
                            setPosterPreview(null);
                          }}
                          className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Hapus Poster
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-coral/60 bg-slate-50 hover:bg-coral/5 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all group">
                      <div className="w-11 h-11 rounded-2xl bg-white shadow-2xs group-hover:scale-105 flex items-center justify-center text-coral mb-2 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Klik untuk unggah poster konser
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Format JPG, PNG, atau WebP (Maksimal 5MB)
                      </p>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Deskripsi Konser
                  </label>
                  <textarea
                    rows={3}
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    placeholder="Tuliskan gambaran acara, lineup musisi, fasilitas, dll..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-coral"
                  />
                </div>
              </div>

              {/* Dynamic Ticket Tiers Builder */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Tier Tiket & Kuota Penjualan
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tentukan kategori tiket yang bisa dibeli penonton
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTierRow}
                    className="text-xs font-bold text-coral hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Tier
                  </button>
                </div>

                <div className="space-y-3">
                  {tierInputs.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3"
                    >
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Nama Tier
                        </label>
                        <input
                          type="text"
                          required
                          value={tier.name}
                          onChange={(e) => updateTierRow(idx, 'name', e.target.value)}
                          placeholder="e.g. VIP Front-Row"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-coral"
                        />
                      </div>

                      <div className="w-full sm:w-36">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Harga (IDR)
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={tier.price}
                          onChange={(e) => updateTierRow(idx, 'price', Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-coral"
                        />
                      </div>

                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Total Kuota
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={tier.totalQuota}
                          onChange={(e) =>
                            updateTierRow(idx, 'totalQuota', Number(e.target.value))
                          }
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-coral"
                        />
                      </div>

                      {tierInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTierRow(idx)}
                          className="sm:mt-4 p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 bg-coral hover:bg-coral-hover text-white text-xs font-bold rounded-xl shadow-cheerful transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Mempublikasikan...' : 'Publikasikan Konser Sekarang'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboardPage;
