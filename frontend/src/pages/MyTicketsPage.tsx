import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket, Download, Smartphone, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, DEMO_MODE } from '../services/api';
import { generateTicketPdf } from '../services/ticketPdf';

const DEFAULT_TICKETS = [
  {
    id: 'tkt-001',
    ticketCode: 'TWX-SW26-VSK101',
    qrHash: '8f4c91b0-e2d7-4c7b-99c1-52a1d2f6e9b8',
    tierName: 'VIP FRONT ROW PASS',
    eventTitle: 'SOUNDWAVE MUSIC FESTIVAL 2026',
    attendeeName: 'Budi Santoso',
    eventDate: 'Saturday, July 18, 2026 | 3:00 PM onwards',
    venue: 'Gelora Bung Karno (GBK) Main Stadium, Jakarta',
    gate: 'Gate A VIP Fast-Track',
    seat: 'FRONT ROW - VIP A1',
    status: 'ACTIVE',
  },
  {
    id: 'tkt-002',
    ticketCode: 'TWX-SW26-EB204',
    qrHash: '4a1b8c2d-99ff-41ea-82c3-11a2d3e4f506',
    tierName: 'EARLY BIRD FESTIVAL PASS',
    eventTitle: 'SOUNDWAVE MUSIC FESTIVAL 2026',
    attendeeName: 'Budi Santoso',
    eventDate: 'Saturday, July 18, 2026 | 3:00 PM onwards',
    venue: 'Gelora Bung Karno (GBK) Main Stadium, Jakarta',
    gate: 'Gate B General Admission',
    seat: 'Festival General Lawn',
    status: 'ACTIVE',
  },
];

export const MyTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const justPurchased = location.state?.justPurchased;

  // Active tickets state
  const [tickets, setTickets] = useState<any[]>(DEFAULT_TICKETS);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const handleDownloadPdf = async (ticket: any) => {
    try {
      setDownloadingId(ticket.id);
      await generateTicketPdf({
        ticketCode: ticket.ticketCode,
        qrHash: ticket.qrHash,
        tierName: ticket.tierName,
        eventTitle: ticket.eventTitle,
        attendeeName: ticket.attendeeName,
        eventDate: ticket.eventDate,
        venue: ticket.venue,
        gate: ticket.gate,
        seat: ticket.seat,
        status: ticket.status,
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal mengunduh PDF tiket. Silakan coba beberapa saat lagi.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const fetchUserTickets = async () => {
      setLoading(true);
      try {
        const res = await api.get('/tickets/my-tickets');
        if (res.data?.data && res.data.data.length > 0) {
          const mapped = res.data.data.map((t: any) => ({
            id: t.id,
            ticketCode: t.ticketCode,
            qrHash: t.qrHash,
            tierName: (t.ticketTier?.name || 'Festival Pass').toUpperCase(),
            eventTitle: (t.booking?.event?.title || 'Soundwave Music Festival 2026').toUpperCase(),
            attendeeName: t.attendeeName || user?.name || 'Budi Santoso',
            eventDate: t.booking?.event?.eventDate
              ? new Date(t.booking.event.eventDate).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' WIB'
              : 'Saturday, July 18, 2026 | 3:00 PM onwards',
            venue: t.booking?.event?.venueName || 'Gelora Bung Karno (GBK) Main Stadium, Jakarta',
            gate: t.ticketTier?.name?.toLowerCase().includes('vip')
              ? 'Gate A VIP Fast-Track'
              : 'Gate B General Admission',
            seat: t.ticketTier?.name || 'General Admission',
            status: t.status,
          }));
          setTickets(mapped);
          return;
        }
        // Backend hidup tapi user belum punya tiket: tampilkan kosong (jujur).
        setTickets([]);
      } catch {
        // Backend mati: mock hanya bila DEMO_MODE, selain itu kosong + jujur.
        if (!DEMO_MODE) setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserTickets();
  }, [user]);

  const activeTickets = tickets.filter((t) => t.status === 'ACTIVE');
  const historyTickets = tickets.filter((t) => t.status !== 'ACTIVE');
  const displayedTickets = activeTab === 'ACTIVE' ? activeTickets : historyTickets;

  return (
    <div className="min-h-screen pb-24 bg-canvas bg-confetti">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {/* Purchase celebration alert */}
        {justPurchased && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-bounce">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-extrabold text-sm">Pembayaran Berhasil & Tiket Resmi Diterbitkan!</p>
                <p className="text-xs text-emerald-700">E-tiket Anda sudah siap dengan QR code unik untuk masuk ke venue konser.</p>
              </div>
            </div>
            <span className="text-xs font-bold uppercase px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg">
              Terkonfirmasi ✓
            </span>
          </div>
        )}

        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-coral/20 text-coral text-xs font-bold shadow-sm mb-3">
            <Ticket className="w-3.5 h-3.5" />
            E-Ticket Digital Pass
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tiket Aktif Saya
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tunjukkan QR Code di gate masuk venue konser untuk contactless check-in
          </p>

          {/* Tab selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl mt-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'ACTIVE'
                  ? 'bg-white text-coral shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tiket Mendatang ({activeTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-5 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Riwayat Selesai ({historyTickets.length})
            </button>
          </div>
        </div>

        {/* E-Ticket Passes List (From Approved Cheerful Visual Render) */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Memuat e-tiket Anda...</p>
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Tidak ada tiket di kategori ini</h3>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'ACTIVE'
                ? 'Semua tiket Anda mungkin telah digunakan atau belum melakukan pemesanan baru.'
                : 'Belum ada riwayat tiket yang telah selesai / check-in.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {displayedTickets.map((ticket) => (
            <div key={ticket.id} className="flex justify-center">
              {/* Concert Ticket Card Pass (Apple Wallet Style with Perforation Notch) */}
              <div className="w-full max-w-md bg-white rounded-3xl shadow-ticket border border-slate-100 overflow-hidden relative transition-transform hover:-translate-y-1 duration-300">
                {/* 1. Header Gradient Banner */}
                <div className="bg-gradient-to-r from-coral via-[#FF7E40] to-sunshine p-6 text-white relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-white/90">
                        {ticket.eventTitle}
                      </p>
                      <h3 className="text-2xl font-black tracking-tight mt-0.5">
                        {ticket.tierName}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* 2. Side Perforation Notch Dividers */}
                <div className="relative border-b-2 border-dashed border-slate-200/80 my-0">
                  <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-canvas shadow-inner border-r border-slate-200" />
                  <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-canvas shadow-inner border-l border-slate-200" />
                </div>

                {/* 3. Ticket Main Body */}
                <div className="p-6 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATTENDEE NAME</p>
                      <p className="text-base font-extrabold text-slate-900">{ticket.attendeeName}</p>
                    </div>
                    {ticket.status === 'ACTIVE' ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ACTIVE / READY TO SCAN
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                        CHECKED IN ✓
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">EVENT DATE</p>
                      <p className="font-bold text-slate-800 leading-tight mt-0.5">{ticket.eventDate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GATE & LANE</p>
                      <p className="font-bold text-slate-800 leading-tight mt-0.5">{ticket.gate}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">VENUE LOCATION</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{ticket.venue}</p>
                  </div>

                  {/* 4. High-Resolution Scannable QR Code & Barcode Box */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center">
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 mb-3">
                      <QRCodeSVG
                        value={ticket.qrHash}
                        size={150}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    {/* Barcode representation */}
                    <div className="w-full text-center font-mono">
                      <div className="h-9 w-4/5 mx-auto flex items-end justify-center gap-0.5 mb-1.5">
                        {[4, 2, 6, 3, 5, 2, 4, 1, 6, 3, 2, 5, 3, 6, 2, 4, 5, 2, 3, 6, 4, 2, 5, 3, 2, 6, 3, 5, 4].map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${h * 4}px` }}
                            className={`w-1 ${i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-400'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-bold text-slate-800 tracking-widest">{ticket.ticketCode}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">{ticket.qrHash}</p>
                    </div>
                  </div>

                  {/* 5. Ticket Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleDownloadPdf(ticket)}
                      disabled={downloadingId === ticket.id}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {downloadingId === ticket.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-coral" />
                          Membuat PDF...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-slate-500" />
                          Download PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => alert(`Tiket ${ticket.ticketCode} tersimpan ke Google/Apple Wallet!`)}
                      className="py-2.5 px-3 rounded-xl bg-coral hover:bg-coral-hover text-white font-bold text-xs shadow-cheerful flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      Save to Phone
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
};
