import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, CheckCircle2, AlertTriangle, XCircle, Camera, Zap, Volume2, CameraOff } from 'lucide-react';
import { DEMO_MODE, api } from '../services/api';

export const ScannerPage: React.FC = () => {
  const [selectedGate, setSelectedGate] = useState('Gate A (VIP Fast-Track)');
  const [inputHash, setInputHash] = useState('');
  const [scanResult, setScanResult] = useState<{
    status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID' | null;
    message: string;
    ticketInfo?: {
      ticketCode: string;
      attendeeName: string;
      tierName: string;
      timestamp: string;
    };
  }>({ status: null, message: '' });

  // Jujur: mulai dari 0 (data asli), bukan 342 ketikan. Naik hanya saat scan sukses.
  const [checkedInCount, setCheckedInCount] = useState(0);

  // Kamera asli via html5-qrcode. Tidak ada simulasi: yang dibaca kamera
  // langsung dikirim ke POST /tickets/checkin/:qrHash.
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [switching, setSwitching] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = async () => {
    try {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          if (s.isScanning) await s.stop();
        } finally {
          s.clear();
        }
      }
    } catch {
      // abaikan: kamera mungkin sudah mati
    }
    setCameraOn(false);
  };

  useEffect(() => {
    // Bersihkan kamera saat pindah halaman / unmount.
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        (async () => {
          try {
            if (s.isScanning) await s.stop();
          } catch {
            // abaikan
          }
          try {
            s.clear();
          } catch {
            // abaikan
          }
        })();
      }
    };
  }, []);

  // Ganti kamera TANPA mematikan tampilan (video tidak reload, tidak kedip).
  // html5-qrcode tidak bisa ganti device saat jalan, jadi strateginya:
  // stop -> ganti deviceId -> start lagi di wadah yang sama.
  const startWithCamera = async (deviceId: string | null, mountId: string) => {
    const scanner = new Html5Qrcode(mountId);
    scannerRef.current = scanner;
    const facing = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' };
    await scanner.start(
      facing as any,
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
      (decodedText) => {
        // Cooldown 3 detik: 1 QR = 1 check-in, goyangan tangan tidak double-hitung.
        if (cooldownRef.current) return;
        if (decodedText === lastScannedRef.current) return;
        cooldownRef.current = true;
        lastScannedRef.current = decodedText;
        setLastScanned(decodedText);
        setInputHash(decodedText);
        setDebugMsg(
          `QR terbaca (${decodedText.length} karakter): ${decodedText.slice(0, 40)}... — mengirim ke server...`
        );
        void handleCheckQr(decodedText);
        try {
          const Ctx = window.AudioContext;
          if (Ctx) {
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            setTimeout(() => void ctx.close(), 200);
          }
        } catch {
          // suara beep opsional, gagal tidak masalah
        }
        setTimeout(() => {
          cooldownRef.current = false;
        }, 3000);
      },
      () => {
        // frame tanpa QR terdeteksi — abaikan diam-diam
      }
    );
  };

  const playBeep = () => {
    try {
      const Ctx = window.AudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        setTimeout(() => void ctx.close(), 200);
      }
    } catch {
      // suara beep opsional, gagal tidak masalah
    }
  };

  const onDecoded = (decodedText: string) => {
    // Cooldown 3 detik: 1 QR = 1 check-in, goyangan tangan tidak double-hitung.
    // Pakai ref (bukan state) agar callback kamera yang dibuat sekali tetap akurat.
    if (cooldownRef.current) return;
    if (decodedText === lastScannedRef.current) return;
    cooldownRef.current = true;
    lastScannedRef.current = decodedText;
    setLastScanned(decodedText);
    setInputHash(decodedText);
    setDebugMsg(
      `QR terbaca (${decodedText.length} karakter): ${decodedText.slice(0, 40)}... — mengirim ke server...`
    );
    void handleCheckQr(decodedText);
    playBeep();
    setTimeout(() => {
      cooldownRef.current = false;
    }, 3000);
  };

  const switchCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (!cameraOn || !scannerRef.current) return;
    setSwitching(true);
    try {
      const old = scannerRef.current;
      scannerRef.current = null;
      try {
        if (old.isScanning) await old.stop();
      } finally {
        old.clear();
      }
      await startWithCamera(deviceId || null, 'tiketix-qr-reader-live');
      setCameraError(null);
    } catch (err: any) {
      setCameraError(`Gagal ganti kamera: ${String(err?.message || err)}`);
    } finally {
      setSwitching(false);
    }
  };

  const handleImageFile = async (file: File) => {
    setCameraError(null);
    try {
      const scanner = scannerRef.current ?? new Html5Qrcode('tiketix-qr-reader-live');
      const keepRef = !!scannerRef.current;
      if (!keepRef) scannerRef.current = scanner;
      // scanFile menangkap QR dari foto/screenshot — jalan tanpa kamera.
      const decoded = await scanner.scanFile(file, false);
      onDecoded(decoded);
      if (!keepRef && !cameraOn) {
        scannerRef.current = null;
        try {
          scanner.clear();
        } catch {
          // abaikan
        }
      }
    } catch {
      setCameraError('Foto itu tidak mengandung QR yang terbaca. Coba foto yang lebih tajam / lebih dekat.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startCamera = async () => {
    setCameraError(null);
    setLastScanned(null);
    lastScannedRef.current = null;
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraError(
        'Kamera butuh HTTPS atau localhost. Buka halaman ini via https:// atau http://localhost agar browser mengizinkan kamera.'
      );
      return;
    }
    try {
      // Daftar kamera DULU (perlu izin; kalau label kosong, tetap lanjut dengan default).
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Kamera ${d.id.slice(0, 6)}` })));
          const back = devices.find((d) => /back|rear|belakang|environment/i.test(d.label));
          const firstId = (back ?? devices[0]).id;
          setSelectedCameraId((prev) => prev || firstId);
        }
      } catch {
        // getCameras bisa gagal sebelum izin — lanjut, start() akan minta izin sendiri
      }
      // Nyalakan state dulu agar wadah video (mountId) dirender,
      // lalu tunggu sampai div-nya benar-benar ada di DOM.
      setCameraOn(true);
      const mountId = 'tiketix-qr-reader-live';
      const t0 = Date.now();
      while (!document.getElementById(mountId)) {
        if (Date.now() - t0 > 3000) throw new Error('Wadah video tidak ditemukan. Refresh halaman lalu coba lagi.');
        await new Promise((r) => setTimeout(r, 50));
      }
      await startWithCamera(selectedCameraId || null, mountId);
    } catch (err: any) {
      scannerRef.current = null;
      setCameraOn(false);
      const msg = String(err?.message || err || '');
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setCameraError('Izin kamera ditolak. Klik ikon kamera di address bar browser → Allow, lalu coba lagi.');
      } else if (msg.toLowerCase().includes('notfounderror') || msg.toLowerCase().includes('no camera')) {
        setCameraError('Tidak ada kamera yang ditemukan di perangkat ini. Colok webcam / pakai HP, atau pakai input manual di bawah.');
      } else {
        setCameraError(`Kamera gagal dinyalakan: ${msg || 'perangkat sibuk / dipakai aplikasi lain?'}`);
      }
    }
  };

  const handleCheckQr = async (rawHash: string) => {
    const hash = rawHash.trim();
    if (!hash) {
      setScanResult({
        status: 'INVALID',
        message: 'Mohon masukkan QR hash atau kode tiket yang valid.',
      });
      return;
    }

    try {
      const res = await api.post(`/tickets/checkin/${hash}`);
      if (res.data?.data) {
        const t = res.data.data;
        setCheckedInCount((prev) => prev + 1);
        setScanResult({
          status: 'SUCCESS',
          message: 'CHECK-IN BERHASIL! (PINTU TERBUKA)',
          ticketInfo: {
            ticketCode: t.ticketCode,
            attendeeName: t.attendeeName,
            tierName: t.ticketTier?.name || 'PASS KONSER',
            timestamp: new Date().toLocaleTimeString('id-ID') + ' WIB',
          },
        });
        return;
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || '';
      if (
        errMsg.toLowerCase().includes('already') ||
        errMsg.toLowerCase().includes('sudah') ||
        errMsg.toLowerCase().includes('checked') ||
        err.response?.status === 400
      ) {
        setScanResult({
          status: 'ALREADY_USED',
          message: 'AKSES DITOLAK: TIKET SUDAH DIGUNAKAN SEBELUMNYA!',
          ticketInfo: {
            ticketCode: hash.length > 20 ? hash.substring(0, 16) + '...' : hash,
            attendeeName: 'Attendee Terdaftar',
            tierName: 'PASS TERVERIFIKASI',
            timestamp: 'Check-in telah tercatat di sistem',
          },
        });
        return;
      }

      setScanResult({
        status: 'INVALID',
        message: 'AKSES DITOLAK: QR CODE TIDAK DITEMUKAN / BATAL',
      });
    }
  };

  // Tombol cepat untuk DEMO: hanya aktif bila DEMO_MODE; selain itu yang
  // dipakai hanya hasil scan asli dari backend (jujur, tanpa contoh palsu).
  const handleSimulateScan = async (type: 'VALID' | 'DUPLICATE' | 'INVALID') => {
    if (!DEMO_MODE) {
      setScanResult({
        status: 'INVALID',
        message: 'Mode contoh nonaktif. Scan QR asli dari Tiket Saya.',
      });
      return;
    }
    if (type === 'VALID') {
      setCheckedInCount((prev) => prev + 1);
      setScanResult({
        status: 'SUCCESS',
        message: 'CHECK-IN BERHASIL! (CONTOH DEMO — bukan tiket asli)',
        ticketInfo: {
          ticketCode: 'TWX-SW26-VSK101',
          attendeeName: 'Contoh Demo',
          tierName: 'VIP FRONT ROW PASS (DEMO)',
          timestamp: new Date().toLocaleTimeString('id-ID'),
        },
      });
    } else if (type === 'DUPLICATE') {
      setScanResult({
        status: 'ALREADY_USED',
        message: 'AKSES DITOLAK: TIKET SUDAH DIGUNAKAN SEBELUMNYA!',
        ticketInfo: {
          ticketCode: 'TWX-SW26-VSK101',
          attendeeName: 'Budi Santoso',
          tierName: 'VIP FRONT ROW PASS',
          timestamp: 'Check-in tercatat pada 15:02 WIB',
        },
      });
    } else {
      setScanResult({
        status: 'INVALID',
        message: 'AKSES DITOLAK: QR CODE TIDAK DITEMUKAN / BATAL',
      });
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-900 text-white">
      {/* Top HUD Header */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-4 sticky top-18 z-30">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-iris flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">Staff Gate Entry Scanner</h1>
              <p className="text-[11px] text-slate-400">Soundwave Music Festival 2026 • Live Scanner</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 text-white focus:outline-none focus:border-iris"
            >
              <option>Gate A (VIP Fast-Track)</option>
              <option>Gate B (General Admission 1)</option>
              <option>Gate C (General Admission 2)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        {/* Kamera asli: div ini diisi video oleh html5-qrcode saat tombol dinyalakan. */}
        {!cameraOn ? (
          <div className="bg-slate-950 rounded-3xl border-2 border-slate-800 p-8 text-center shadow-2xl">
            <Camera className="w-10 h-10 mx-auto mb-3 text-iris" />
            <h2 className="text-base font-black text-white">Kamera belum menyala</h2>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Nyalakan kamera, lalu arahkan QR tiket ke bingkai. Hasilnya langsung dicek ke server — tanpa simulasi.
            </p>
            <button
              onClick={startCamera}
              className="px-6 py-3 rounded-2xl bg-iris hover:bg-iris-hover text-white text-sm font-bold transition-colors cursor-pointer"
            >
              Nyalakan Kamera
            </button>
            {cameraError && (
              <p className="mt-4 text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-800 rounded-xl px-4 py-2.5">
                {cameraError}
              </p>
            )}
          </div>
        ) : (
          <div className="relative w-full mx-auto bg-slate-950 rounded-3xl border-2 border-emerald-500 overflow-hidden shadow-2xl">
            {/* Wadah scanner: SATU id tetap, selalu ada saat cabang ini tampil.
                html5-qrcode mengisi video + bingkai QR di sini. */}
            <div id="tiketix-qr-reader-live" className="w-full overflow-hidden [&_video]:w-full [&_video]:rounded-t-3xl [&_img]:mx-auto" />
            {/* Pilih kamera (depan/belakang/USB) — ganti tanpa reload tampilan. */}
            {cameras.length > 1 && (
              <div className="mx-4 mb-2 flex items-center gap-2 text-xs">
                <Camera className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <select
                  value={selectedCameraId}
                  disabled={switching}
                  onChange={(e) => void switchCamera(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-iris"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {switching && <span className="text-slate-400">mengganti...</span>}
              </div>
            )}
            {/* Cadangan tanpa kamera: upload foto/screenshot QR. */}
            <div className="mx-4 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageFile(f);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border border-slate-700 text-slate-200 text-xs font-bold hover:border-iris transition-colors cursor-pointer"
              >
                Atau upload foto QR (cadangan kalau kamera buram)
              </button>
            </div>
            {debugMsg && (
              <p className="mx-4 mb-2 text-[11px] font-mono text-sky-300 bg-sky-950/60 border border-sky-800 rounded-xl px-3 py-2 break-all">
                {debugMsg}
              </p>
            )}
            {lastScanned && !debugMsg && (
              <p className="mx-4 mb-2 text-[11px] font-mono text-slate-400 break-all">
                Terakhir dibaca: {lastScanned.slice(0, 48)}...
              </p>
            )}
            <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-300 bg-slate-950">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Kamera AKTIF — arahkan QR ke bingkai
              </span>
              <button
                onClick={stopCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                <CameraOff className="w-3.5 h-3.5" /> Matikan
              </button>
            </div>
            <div className="flex items-center justify-between px-4 pb-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-sunshine" /> Cooldown 3 detik / QR</span>
              <span className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5 text-mint" /> Beep saat terbaca</span>
            </div>
          </div>
        )}

        {/* Scan Result Feedback Card */}
        {scanResult.status && (
          <div className="mt-6 animate-fade-in">
            {scanResult.status === 'SUCCESS' && (
              <div className="p-6 rounded-3xl bg-emerald-950/80 border-2 border-emerald-500 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-emerald-400 tracking-tight">
                      {scanResult.message}
                    </h3>
                    <div className="mt-3 p-3 bg-emerald-900/50 rounded-xl text-xs space-y-1 font-mono">
                      <p><span className="text-emerald-300">NAMA:</span> {scanResult.ticketInfo?.attendeeName}</p>
                      <p><span className="text-emerald-300">TIER:</span> {scanResult.ticketInfo?.tierName}</p>
                      <p><span className="text-emerald-300">KODE:</span> {scanResult.ticketInfo?.ticketCode}</p>
                      <p><span className="text-emerald-300">WAKTU:</span> {scanResult.ticketInfo?.timestamp}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scanResult.status === 'ALREADY_USED' && (
              <div className="p-6 rounded-3xl bg-amber-950/80 border-2 border-amber-500 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-amber-400 tracking-tight">
                      {scanResult.message}
                    </h3>
                    <p className="text-xs text-amber-200/80 mt-1">
                      {scanResult.ticketInfo?.timestamp}
                    </p>
                    <div className="mt-3 p-3 bg-amber-900/40 rounded-xl text-xs space-y-1 font-mono">
                      <p><span className="text-amber-300">PEMEGANG ASLI:</span> {scanResult.ticketInfo?.attendeeName}</p>
                      <p><span className="text-amber-300">TIER:</span> {scanResult.ticketInfo?.tierName}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {scanResult.status === 'INVALID' && (
              <div className="p-6 rounded-3xl bg-rose-950/80 border-2 border-rose-500 text-white shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-rose-400 tracking-tight">
                      {scanResult.message}
                    </h3>
                    <p className="text-xs text-rose-200/80 mt-1">
                      Hash tidak terdaftar dalam database konser ini atau telah dibatalkan.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Hash / Ticket Code Input */}
        <div className="mt-8 bg-slate-950 p-6 rounded-3xl border border-slate-800">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Input Manual Kode / Hash Tiket:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckQr(inputHash)}
              placeholder="Contoh: 8f4c91b0-e2d7-4c7b-99c1-52a1d2f6e9b8 atau TWX-SW26..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-iris font-mono"
            />
            <button
              onClick={() => handleCheckQr(inputHash)}
              className="px-5 py-2.5 rounded-xl bg-iris hover:bg-iris-hover text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Periksa QR
            </button>
          </div>

          {DEMO_MODE && (
            <>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mt-6 mb-3">
                Contoh presentasi (hanya karena VITE_DEMO_MODE=true):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleSimulateScan('VALID')}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Scan Tiket Valid (Baru)
                </button>
                <button
                  onClick={() => handleSimulateScan('DUPLICATE')}
                  className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Scan Tiket Terpakai (Duplikat)
                </button>
                <button
                  onClick={() => handleSimulateScan('INVALID')}
                  className="py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Scan Tiket Palsu / Invalid
                </button>
              </div>
            </>
          )}
        </div>

        {/* Live Attendance Stats */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Total Hadir di {selectedGate}:</span>
            <span className="ml-2 font-mono font-black text-white text-sm">{checkedInCount} / 500 Pengunjung</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-iris/20 text-iris font-bold">
            {((checkedInCount / 500) * 100).toFixed(1)}% Kapasitas
          </span>
        </div>
      </div>
    </div>
  );
};
