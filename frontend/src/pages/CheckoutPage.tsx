import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  QrCode,
  CreditCard,
  Building2,
  Ticket,
  X,
  Copy,
  Check,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Step = 'FORM' | 'INSTRUCTION' | 'VERIFYING' | 'SUCCESS';

interface IntentData {
  payment: {
    id: string;
    transactionCode: string;
    paymentMethod: string;
    instruction: Record<string, any>;
    status: string;
  };
  expiresAt: string;
  totalAmount: number;
}

export const CheckoutPage: React.FC = () => {
  const { bookingCode } = useParams<{ bookingCode: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);

  // Halaman bayar wajib login: lempar ke /login bila token demo/offline.
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
    else setAuthChecked(true);
  }, [isAuthenticated, navigate]);

  // Booking awal dari state router (habis bikin booking) — TIDAK ada fallback palsu.
  // Kalau user buka URL langsung tanpa state, kita fetch booking asli dari backend.
  const initialBooking = location.state?.booking || null;
  const [bookingData, setBookingData] = useState<any>(initialBooking);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Timer JUJUR: dihitung dari expiresAt server, bukan angka hardcoded.
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'VA' | 'CC'>('QRIS');
  const [attendeeName, setAttendeeName] = useState(user?.name || '');
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Alur demo 2 langkah: FORM -> INSTRUCTION (VA/QR) -> VERIFYING -> SUCCESS
  const [step, setStep] = useState<Step>('FORM');
  const [intent, setIntent] = useState<IntentData | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. Kalau dibuka via URL langsung: ambil booking asli dari backend.
  useEffect(() => {
    if (bookingData || !bookingCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/bookings/code/${bookingCode}`);
        if (!cancelled && res.data?.data) setBookingData(res.data.data);
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(
            err?.response?.data?.message ||
              'Booking tidak ditemukan atau server tidak terhubung. Kembali dan buat pesanan baru.'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingCode, bookingData]);

  // Sinkronkan nama/email default saat user/booking datang terlambat.
  useEffect(() => {
    if (!attendeeName && (bookingData?.user?.name || user?.name)) {
      setAttendeeName(bookingData?.user?.name || user?.name || '');
    }
    if (!attendeeEmail && (bookingData?.user?.email || user?.email)) {
      setAttendeeEmail(bookingData?.user?.email || user?.email || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingData, user]);

  // 2. Timer jujur dari expiresAt server.
  useEffect(() => {
    if (!bookingData?.expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(bookingData.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(left);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [bookingData]);

  const minutes = Math.floor((timeLeft ?? 0) / 60);
  const seconds = (timeLeft ?? 0) % 60;
  const isTimeLow = (timeLeft ?? 0) < 5 * 60;
  const isExpired = timeLeft === 0;

  const buildAttendees = useCallback(() => {
    const attendeesList: Array<{ ticketTierId: string; name: string; email: string }> = [];
    const bookingItems = bookingData?.bookingItems || location.state?.items || [];
    if (bookingItems.length > 0) {
      bookingItems.forEach((item: any) => {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          attendeesList.push({ ticketTierId: item.ticketTierId, name: attendeeName, email: attendeeEmail });
        }
      });
    }
    return attendeesList;
  }, [bookingData, location.state?.items, attendeeName, attendeeEmail]);

  // Langkah 1: minta "tagihan simulasi" ke backend (dapat QR/VA palsu tapi realistis).
  const handleCreateIntent = async () => {
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      setPayError('Lengkapi nama dan email pemegang tiket dulu ya.');
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const res = await api.post('/payments/intent', {
        bookingCode: bookingData.bookingCode,
        paymentMethod,
      });
      const data = res.data?.data;
      setIntent({
        payment: data.payment,
        expiresAt: data.expiresAt,
        totalAmount: Number(data.totalAmount),
      });
      setStep('INSTRUCTION');
    } catch (err: any) {
      // JUJUR: tampilkan error asli, jangan confetti palsu.
      const msg: string =
        err?.response?.data?.message || 'Gagal membuat tagihan. Periksa koneksi server lalu coba lagi.';
      setPayError(msg);
    } finally {
      setPaying(false);
    }
  };

  // Langkah 2: "Saya sudah bayar (simulasi)" -> jeda verifikasi ala bank -> settle.
  const handleConfirmPaid = async () => {
    setPaying(true);
    setPayError(null);
    setStep('VERIFYING');
    // Jeda dramatis 2 detik supaya terasa seperti verifikasi bank (penting untuk demo).
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const res = await api.post('/payments/pay', {
        bookingCode: bookingData.bookingCode,
        paymentGateway: 'SIMULATOR',
        paymentMethod,
        attendees: buildAttendees(),
      });
      const receipt = res.data?.data;
      setStep('SUCCESS');
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF5B37', '#FFB800', '#7C5DFA', '#10B981'],
      });
      setTimeout(() => {
        navigate('/my-tickets', {
          state: {
            justPurchased: true,
            bookingCode: bookingData.bookingCode,
            attendeeName,
            alreadySettled: receipt?.alreadySettled === true,
          },
        });
      }, 1400);
    } catch (err: any) {
      setStep('INSTRUCTION');
      setPayError(
        err?.response?.data?.message || 'Pembayaran gagal diproses. Coba lagi atau buat pesanan baru.'
      );
    } finally {
      setPaying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Yakin batalkan pesanan? Kuota tiket langsung dikembalikan ke publik.')) return;
    setCancelling(true);
    try {
      // Cari booking id: dari state, atau fetch by code.
      let bookingId = bookingData?.id;
      if (!bookingId && bookingCode) {
        const res = await api.get(`/bookings/code/${bookingCode}`);
        bookingId = res.data?.data?.id;
      }
      if (bookingId) {
        await api.post(`/bookings/${bookingId}/cancel`);
      }
      setIsCancelled(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal membatalkan. Coba lagi.');
    } finally {
      setCancelling(false);
    }
  };

  const copyVa = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard tidak tersedia — biarkan user salin manual
    }
  };

  // ── Render states ──────────────────────────────────────────────
  if (fetchError && !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center border border-red-200 shadow-card-soft">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">Booking tidak ditemukan</h2>
          <p className="text-xs text-slate-500 mb-6">{fetchError}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-coral text-white font-bold text-sm rounded-xl"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  if (!authChecked || !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center border border-slate-100 shadow-card-soft">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Pemesanan Dibatalkan</h2>
          <p className="text-xs text-slate-500 mb-6">
            Kuota tiket Anda telah otomatis dikembalikan ke kuota umum. Mengarahkan Anda kembali ke beranda...
          </p>
        </div>
      </div>
    );
  }

  const instruction = intent?.payment?.instruction || {};
  const transactionCode = intent?.payment?.transactionCode;

  return (
    <div className="min-h-screen pb-20">
      {/* ⏱️ Timer JUJUR dari server (expiresAt) */}
      <div
        className={`sticky top-18 z-40 px-4 py-3 text-center text-xs font-bold transition-colors ${
          isExpired || isTimeLow ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-r from-coral to-sunshine text-white'
        } shadow-md`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          {isExpired ? (
            <span>PESANAN KEDALUWARSA — silakan buat reservasi baru</span>
          ) : (
            <>
              <span>SELESAIKAN PEMBAYARAN DALAM:</span>
              <span className="bg-white text-slate-900 font-mono px-2.5 py-0.5 rounded-lg text-sm font-black shadow-xs">
                {timeLeft === null ? '--:--' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
              </span>
              <span className="hidden sm:inline-block">• Kuota tiket ditahan eksklusif untuk Anda!</span>
            </>
          )}
        </div>
      </div>

      {/* Banner mode simulasi — jujur ke klien bahwa ini tanpa uang asli */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs">
          <Receipt className="w-4 h-4 flex-shrink-0" />
          <p>
            <b>Mode Simulasi Pembayaran</b> — tidak ada uang asli yang bergerak. Ganti ke Midtrans/Xendit cukup
            sambungkan 1 modul backend (<span className="font-mono">SimulatedPSP → MidtransPSP</span>).
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left: ringkasan reservasi */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-card-soft">
              <div className="flex items-center gap-2 text-xs font-bold text-coral uppercase tracking-wider mb-2">
                <Ticket className="w-4 h-4" />
                Ringkasan Reservasi
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-4">Rincian Pesanan Anda</h2>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2 mb-4 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">KODE BOOKING:</span>
                  <span className="font-bold text-slate-900">{bookingData.bookingCode}</span>
                </div>
                {bookingData.eventDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">TANGGAL EVENT:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(bookingData.eventDate).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">STATUS:</span>
                  <span className="font-bold text-amber-600">● PENDING (HOLD)</span>
                </div>
                {transactionCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">NO. TAGIHAN:</span>
                    <span className="font-bold text-slate-900">{transactionCode}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="pt-2 border-slate-200 flex justify-between text-sm">
                  <span className="font-extrabold text-slate-900">Total Tagihan</span>
                  <span className="text-lg font-black text-coral">
                    Rp {Number(bookingData.totalAmount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200/80 text-xs">
              <div className="flex items-start gap-2.5 text-amber-900 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Ingin membatalkan atau mengubah pesanan? Tiket akan segera dikembalikan ke kuota umum.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling || isExpired === false ? cancelling : false}
                className="w-full py-2 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelling ? 'Membatalkan...' : 'Batalkan Reservasi Tiket'}
              </button>
            </div>
          </div>

          {/* Right: langkah pembayaran */}
          <div className="md:col-span-7 space-y-6">
            {payError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pembayaran belum berhasil.</p>
                  <p>{payError}</p>
                </div>
              </div>
            )}

            {isExpired ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-card-soft text-center">
                <Clock className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Waktu pembayaran habis</h3>
                <p className="text-xs text-slate-500 mb-6">
                  Kuota yang ditahan sudah dikembalikan ke publik oleh sistem. Silakan buat pesanan baru.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-coral text-white font-bold text-sm rounded-2xl"
                >
                  Cari Event Lagi
                </button>
              </div>
            ) : step === 'FORM' ? (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">1. Data Pemegang E-Tiket</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap (Sesuai KTP/Identitas)
                    </label>
                    <input
                      type="text"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email Penerima Tiket</label>
                      <input
                        type="email"
                        value={attendeeEmail}
                        onChange={(e) => setAttendeeEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-extrabold text-slate-900 mb-4">2. Pilih Metode Pembayaran</h3>
                <div className="space-y-3 mb-8">
                  {(
                    [
                      { id: 'QRIS', icon: QrCode, title: 'QRIS Instan (BCA, GoPay, OVO, Dana)', desc: 'Scan QR, konfirmasi otomatis', color: 'bg-coral-light text-coral' },
                      { id: 'VA', icon: Building2, title: 'Virtual Account Bank', desc: 'BCA, Mandiri, BNI, BRI (simulasi)', color: 'bg-iris-light text-iris' },
                      { id: 'CC', icon: CreditCard, title: 'Kartu Kredit / Debit Online', desc: 'Visa, Mastercard, JCB (simulasi)', color: 'bg-sunshine-light text-amber-700' },
                    ] as const
                  ).map((m) => (
                    <label
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        paymentMethod === m.id ? 'border-coral bg-coral-light/20 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color}`}>
                          <m.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{m.title}</p>
                          <p className="text-xs text-slate-500">{m.desc}</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="method"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                        className="accent-coral w-4 h-4"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCreateIntent}
                  disabled={paying || isExpired}
                  className="w-full py-4 bg-coral hover:bg-coral-hover disabled:opacity-40 text-white font-extrabold text-base rounded-2xl shadow-cheerful transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paying ? (
                    <span>Membuat Tagihan...</span>
                  ) : (
                    <>
                      <span>Buat Tagihan (Rp {Number(bookingData.totalAmount || 0).toLocaleString('id-ID')})</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                  <span>Simulasi aman — tidak ada dana yang didebet</span>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-card-soft">
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">3. Selesaikan Pembayaran</h3>
                <p className="text-xs text-slate-500 mb-6">
                  Tagihan <span className="font-mono font-bold text-slate-800">{transactionCode}</span> via{' '}
                  <b>{intent?.payment.paymentMethod}</b> sebesar{' '}
                  <b>Rp {Number(intent?.totalAmount || 0).toLocaleString('id-ID')}</b>
                </p>

                {step === 'VERIFYING' ? (
                  <div className="py-10 text-center">
                    <RefreshCw className="w-10 h-10 text-coral animate-spin mx-auto mb-3" />
                    <p className="font-extrabold text-slate-900">Memverifikasi ke bank (simulasi)...</p>
                    <p className="text-xs text-slate-500 mt-1">Jangan tutup halaman ini</p>
                  </div>
                ) : step === 'SUCCESS' ? (
                  <div className="py-10 text-center">
                    <p className="font-extrabold text-emerald-700 text-lg">Pembayaran Diterima ✓</p>
                    <p className="text-xs text-slate-500 mt-1">Menerbitkan e-tiket & mengarahkan ke Tiket Saya...</p>
                  </div>
                ) : (
                  <>
                    {intent?.payment.paymentMethod === 'QRIS' && instruction.qrPayload && (
                      <div className="flex flex-col items-center bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-3">
                          <QRCodeSVG value={instruction.qrPayload} size={180} level="M" includeMargin={false} />
                        </div>
                        <p className="text-xs font-bold text-slate-800">Scan QR ini dengan e-wallet / m-banking apa pun</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1 break-all text-center">
                          {instruction.qrPayload}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">NMID: {instruction.nmid} (simulasi)</p>
                      </div>
                    )}

                    {intent?.payment.paymentMethod === 'VA' && instruction.vaNumber && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {instruction.bankName} — Nomor Virtual Account
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-2xl font-black text-slate-900 tracking-wider">
                            {instruction.vaNumber}
                          </p>
                          <button
                            onClick={() => copyVa(instruction.vaNumber)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-coral"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Tersalin!' : 'Salin'}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Transfer tepat <b>Rp {Number(intent?.totalAmount || 0).toLocaleString('id-ID')}</b> (simulasi —
                          tidak perlu transfer beneran).
                        </p>
                      </div>
                    )}

                    {intent?.payment.paymentMethod === 'CC' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Kartu Demo
                        </p>
                        <p className="font-mono text-lg font-black text-slate-900">{instruction.cardHint}</p>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Klik tombol di bawah — tidak ada pendebetan kartu (simulasi).
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmPaid}
                      disabled={paying}
                      className="w-full py-4 bg-coral hover:bg-coral-hover disabled:opacity-40 text-white font-extrabold text-base rounded-2xl shadow-cheerful transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {paying ? <span>Memproses...</span> : <><span>Saya Sudah Bayar (Simulasi)</span><ArrowRight className="w-5 h-5" /></>}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('FORM');
                        setIntent(null);
                      }}
                      className="w-full mt-3 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      ← Ganti metode pembayaran
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                      <span>Klik ganda aman — sistem anti double-charge (idempotent)</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
