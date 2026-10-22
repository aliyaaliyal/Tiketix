# Panduan Demo Tiketix ke Klien (3 Menit)

> Jargon teknis: tidak ada. Bacanya seperti naskah presentasi.
> Syarat: backend + frontend jalan, lalu `npm run demo:reset` sekali.

## 0. Persiapan (5 menit sebelum klien datang)

```bash
# Terminal 1 — database + backend
node scripts/start-db.js
npm run demo:reset        # siapkan panggung: akun, konser, booking, tiket
npm run dev               # backend di http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm run dev               # buka http://localhost:5173
```

Catat yang dicetak `demo:reset`:

- `Booking PENDING` → kode `TIK-DEMO-PAY-xxxxxx` (untuk adegan bayar)
- `qrHash` tiket `demo-qr-...` (untuk adegan scan)

## 1. Naskah 3 Menit

### Menit 1 — Login jujur (tunjukkan tidak ada sulap)

1. Buka `/login`. Katakan: *"Semua peran masuk lewat sini, Pak/Bu."*
2. Klik **Penonton (Demo)** → masuk sebagai `attendee@tiketix.com`.
3. Buka beranda: *"Ini konser asli dari database, bukan gambar tempel. Kalau saya bikin event baru di dashboard EO, langsung muncul di sini."*

### Menit 2 — Adegan bayar (ini andalannya)

1. Buka konser → pilih 2 tiket → **Beli Tiket Sekarang** → catat timer berjalan (hitungan asli dari server).
2. Pilih **QRIS** → klik **Buat Tagihan** → tunjukkan QR-nya.
3. **Scan QR pakai HP klien** — isinya kode booking asli.
4. Klik **Saya Sudah Bayar (Simulasi)** → tunjukkan tulisan *"Memverifikasi ke bank..."* → confetti → tiket terbit.
5. Buka **Tiket Saya** → tunjukkan QR tiket + tombol Download PDF.
6. *Kalimat kunci:* "Tombolnya saya klik 5 kali pun tetap 1 tiket, Pak — sistemnya anti double-charge."

### Menit 3 — Adegan penjual (untuk klien EO)

1. Logout → login via **EO (Demo)** → buka **Dashboard EO**: *"Ini omzet asli, Pak, bukan angka contoh."*
2. Buka tab **Attendees** → cari nama → **Download CSV** → buka di Excel depan klien.
3. Buka **Gate Scanner**, tempel `qrHash` dari `demo:reset` → **SCAN HIJAU**. Scan lagi → **MERAH: sudah dipakai**.
4. *Kalimat penutup:* "Mode bayar ini simulasi, Pak — tanpa uang asli. Kalau deal, ganti ke Midtrans cukup 1 modul, alurnya tetap sama."

## 2. Kalau klien bertanya...

| Pertanyaan | Jawaban |
|---|---|
| "Bayarnya ke mana, nomor rekeningnya?" | "Ini mode simulasi, Pak — QR/VA-nya contoh yang bisa discan. Kalau sudah deal, kita colok ke Midtrans/Xendit, tampilannya sama." |
| "Bisa bayar beneran?" | "Bisa, arsitekturnya sudah disiapkan (1 modul `SimulatedPSP`). Sekarang sengaja simulasi supaya demo tidak tergantung internet bank." |
| "Data saya aman?" | "Password diacakir (bcrypt), token kedaluwarsa 1 hari, tiket orang lain tidak bisa dibuka orang lain (403). Ada test-nya 44 biji." |
| "Kalau internet mati?" | Set `VITE_DEMO_MODE=true` di `frontend/.env` → tampil data contoh berlabel kuning. Default-nya jujur: error merah, bukan sukses palsu. |
| "Double-click / refresh saat bayar?" | "Aman — tagihannya idempotent, refresh mengembalikan tagihan yang sama." |

## 3. Checklist pulang

- [ ] Timer checkout berjalan (bukan angka diam)?
- [ ] QRIS bisa di-scan HP klien?
- [ ] Double-scan di gate DITOLAK merah?
- [ ] CSV terbuka rapi di Excel?
- [ ] Tidak ada tulisan "Budi Santoso" muncul tanpa login?

Kalau ada yang gagal → catat, jangan ditutupi. Klien lebih percaya yang jujur bilang *"ini bug, saya perbaiki besok"* daripada yang pura-pura sukses.
