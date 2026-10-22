import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  ShieldCheck,
  Ticket,
  AlertCircle,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ALL_DEMO_EVENTS, DEMO_EVENT, DEMO_MODE, api, resolveAssetUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const EventDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fallbackEvent = ALL_DEMO_EVENTS.find((e) => e.slug === slug) || DEMO_EVENT;
  const [event, setEvent] = useState<any>(fallbackEvent);

  // Selected ticket quantities per tier: { [tierId]: count }
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (fallbackEvent.ticketTiers && fallbackEvent.ticketTiers[0]) {
      initial[fallbackEvent.ticketTiers[0].id] = 1;
    }
    return initial;
  });

  useEffect(() => {
    const fetchLiveEvent = async () => {
      try {
        const res = await api.get(`/events/slug/${slug}`);
        if (res.data?.data) {
          const apiEv = res.data.data;
          setEvent((prev: any) => ({
            ...prev,
            ...apiEv,
            bannerUrl: resolveAssetUrl(apiEv.bannerUrl) || prev.bannerUrl,
            posterUrl: resolveAssetUrl(apiEv.posterUrl) || prev.posterUrl,
            lineup: prev.lineup || apiEv.lineup,
            ticketTiers:
              apiEv.ticketTiers?.map((t: any) => ({
                ...t,
                price: Number(t.price),
              })) || prev.ticketTiers,
          }));

          if (apiEv.ticketTiers && apiEv.ticketTiers.length > 0) {
            setQuantities({ [apiEv.ticketTiers[0].id]: 1 });
          }
        }
      } catch {
        // Fallback to static demo event
      }
    };

    if (slug) {
      fetchLiveEvent();
    }
  }, [slug]);


  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateQuantity = (tierId: string, delta: number, maxQuota: number) => {
    const current = quantities[tierId] || 0;
    const nextVal = Math.max(0, Math.min(maxQuota, current + delta));
    setQuantities((prev) => ({
      ...prev,
      [tierId]: nextVal,
    }));
  };

  const totalTickets = Object.values(quantities).reduce((acc: number, q: number) => acc + q, 0);

  const subtotal = event.ticketTiers.reduce((acc: number, tier: any) => {
    return acc + (quantities[tier.id] || 0) * Number(tier.price);
  }, 0);

  const serviceFee = totalTickets > 0 ? 15000 : 0;
  const grandTotal = subtotal + serviceFee;

  const handleBooking = async () => {
    if (totalTickets === 0) {
      setErrorMsg('Pilih minimal 1 lembar tiket untuk melanjutkan.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierId, qty]) => ({
        ticketTierId: tierId,
        quantity: qty,
      }));

    try {
      // Call backend POST /api/v1/bookings
      const res = await api.post('/bookings', {
        eventId: event.id,
        items,
      });

      if (res.data?.data) {
        const bookingCode = res.data.data.bookingCode;
        navigate(`/checkout/${bookingCode}`, {
          state: {
            booking: res.data.data,
            items,
            grandTotal,
          },
        });
        return;
      }
    } catch (err: any) {
      // Honest error first. Fake booking fallback ONLY in DEMO_MODE
      // (VITE_DEMO_MODE=true) so a dead backend never shows fake success.
      if (DEMO_MODE) {
        const fallbackCode = `TIK-20261012-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        navigate(`/checkout/${fallbackCode}`, {
          state: {
            booking: {
              bookingCode: fallbackCode,
              totalAmount: grandTotal,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              user: { name: user?.name || 'Demo User', email: user?.email || 'demo@tiketix.id' },
            },
            items,
            quantities,
            grandTotal,
          },
        });
      } else {
        setErrorMsg(
          err?.response?.data?.message ||
            'Gagal membuat pesanan. Server tidak terhubung — coba lagi.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Event Hero Showcase Banner */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            src={
              event.bannerUrl ||
              'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80'
            }
            alt={event.title}
            className="w-full h-full object-cover filter blur-xs"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-10" />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral/90 text-white text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Official Event 2026
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 max-w-3xl">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sunshine" />
              <span>
                {new Date(event.eventDate).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                •{' '}
                {new Date(event.eventDate).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-coral" />
              <span>
                {event.venueName}
                {event.city ? `, ${event.city}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-mint" />
              <span className="text-white font-bold">Tiketix Verified Promotor ✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Details (Left) + Booking Box (Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Lineup, Info, Guidelines */}
          <div className="lg:col-span-7 space-y-10">
            {/* Artist Lineup Showcase if available */}
            {event.lineup && event.lineup.length > 0 && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      Artist Lineup
                    </h3>
                    <p className="text-xs text-slate-500">
                      Menampilkan musisi papan atas nasional & internasional
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-sunshine-light text-amber-800 text-xs font-bold rounded-full">
                    Official Lineup
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
                  {event.lineup.map((artist: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center group">
                      <div
                        className={`w-16 h-16 rounded-full bg-slate-50 border-3 ${artist.color || 'border-coral'} shadow-sm flex items-center justify-center font-extrabold text-base text-slate-800 font-mono group-hover:scale-110 transition-transform`}
                      >
                        {artist.name.charAt(0)}
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-800 truncate w-full">
                        {artist.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate w-full">
                        {artist.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Event Description */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mb-4">
                Tentang Acara
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {event.description}
              </p>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Fasilitas & Venue:</h4>
              <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                <li>Lokasi: {event.venueAddress}</li>
                <li>Gerbang dibuka (Open Gate): Pukul 13:30 WIB</li>
                <li>Fasilitas: Food & Beverage Area, Musholla, Medis, Merchandise Booth resmi</li>
                <li>Area parkir luas di kawasan Gelora Bung Karno</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Ticket Booking Box (Stick to viewport on desktop) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card-soft">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Tiket Booking
                  </h3>
                  <p className="text-xs text-slate-500">Pilih tier dan jumlah tiket</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-coral-light text-coral text-xs font-bold rounded-full">
                  <Ticket className="w-3.5 h-3.5" />
                  Live Sale
                </div>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Tiers List */}
              <div className="space-y-4 mb-6">
                {event.ticketTiers.map((tier: any) => {
                  const qty = quantities[tier.id] || 0;
                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        qty > 0
                          ? 'border-coral/50 bg-coral-light/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{tier.name}</h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-coral text-white">
                              {tier.availableQuota < 10 ? 'Selling Fast' : 'Available'}
                            </span>
                          </div>
                          <p className="text-base font-black text-coral mt-0.5">
                            Rp {tier.price.toLocaleString('id-ID')}
                          </p>
                        </div>

                        {/* Stepper counter */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(tier.id, -1, tier.availableQuota)}
                            disabled={qty === 0}
                            className="w-7 h-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-sm shadow-xs disabled:opacity-30 hover:bg-slate-100 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm text-slate-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(tier.id, 1, tier.availableQuota)}
                            disabled={qty >= tier.availableQuota}
                            className="w-7 h-7 rounded-lg bg-coral text-white flex items-center justify-center font-bold text-sm shadow-xs disabled:opacity-30 hover:bg-coral-hover transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        {tier.description}
                      </p>
                      <p className="text-[11px] text-amber-700 font-semibold mt-2">
                        🔥 Tersisa {tier.availableQuota} tiket dari {tier.totalQuota} kuota
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({totalTickets} tiket)</span>
                  <span className="font-bold text-slate-900">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Layanan Sistem</span>
                  <span className="font-bold text-slate-900">Rp {serviceFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline text-sm">
                  <span className="font-extrabold text-slate-900">Total Pembayaran</span>
                  <span className="text-xl font-black text-coral">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleBooking}
                disabled={loading || totalTickets === 0}
                className="w-full py-4 bg-coral hover:bg-coral-hover disabled:opacity-40 text-white font-extrabold text-base rounded-2xl shadow-cheerful transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>Mengunci Kuota...</span>
                ) : (
                  <>
                    <span>Beli Tiket Sekarang</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                <span>Kuota langsung dikunci 30 menit begitu kamu klik beli</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
