# Rencana Perbaikan Tiketix — Roadmap Sprint Prioritas

> Hasil review codebase `24 Okt 2026`. Urutan berdasarkan **dampak × risiko**: P0 = kebocoran data / bypass auth, P1 = correctness & race, P2 = scalability, P3 = hygiene & prod-readiness.
> Estimasi untuk 1 dev full-time. Total: ± 4 sprint (± 4–5 minggu).

## Ringkasan Eksekutif

| Area | Status | Aksi |
|---|---|---|
| Arsitektur modular + Prisma + transaksi atomik | ✅ Baik, pertahankan | Jangan dirombak |
| Keamanan (BOLA, JWT, CORS, upload) | 🔴 4 lubang P0 | Sprint 1 |
| Concurrency (booking/pay/checkin/expiry) | 🟡 Benar tapi kasar | Sprint 2 |
| Validasi, error handling, idempotency | 🟡 Kurang | Sprint 2–3 |
| Frontend (demo-fallback menutupi error) | 🔴 Menyesatkan di prod | Sprint 3 |
| Hygiene (dist ke-commit, logging, CI) | ⚪ Tech debt | Sprint 4 |

**Aturan sprint:** P0 tidak boleh lewat dari Sprint 1. Jangan mulai fitur baru sebelum P0 Done.

---

## Sprint 1 — Security Hotfix (P0) — Target: 1–2 hari

Tujuan: menutup kebocoran data & bypass auth. Rilis patch tanpa breaking change besar.

### 1.1 Kunci endpoint booking publik tanpa auth
- **ID:** `SEC-01` | **Prioritas:** P0 | **Estimasi:** 2 jam
- **Lokasi:** `src/modules/booking/booking.routes.ts:12`, `src/modules/booking/booking.controller.ts:getBookingByCode`, `src/modules/booking/booking.service.ts:getBookingByCode`
- **Masalah:** `GET /bookings/code/:bookingCode` tidak pakai `authenticate`. Siapapun bisa brute-force pola `TIK-YYYYMMDD-XXXX` dan membaca nama/email pembeli.
- **Perbaikan:**
  1. Tambah `authenticate` di route.
  2. Di service, cek kepemilikan: `if (role !== ADMIN && booking.userId !== currentUser.id) throw ForbiddenError`, kecuali caller adalah organizer pemilik event.
- **Acceptance:** tanpa token → `401`; token milik orang lain → `403`; pemilik/admin/organizer-event → `200`. Tambah test negatif.

### 1.2 BOLA — `organizerId` dari body saat create event
- **ID:** `SEC-02` | **Prioritas:** P0 | **Estimasi:** 2 jam
- **Lokasi:** `src/modules/event/event.validator.ts:createEventSchema`, `src/modules/event/event.controller.ts`, `src/modules/event/event.service.ts:createEvent`
- **Masalah:** skema membolehkan `organizerId` dari client. Attacker bisa membuat event atas nama organizer lain.
- **Perbaikan:**
  1. Hapus `organizerId` dari skema Zod (atau `.strip()`).
  2. Di controller: `organizerId = req.user.id` (kecuali `ADMIN` boleh override via query khusus).
- **Acceptance:** kirim `organizerId` palsu di body → diabaikan, event tetap milik `req.user.id`.

### 1.3 `JWT_SECRET` fallback lemah
- **ID:** `SEC-03` | **Prioritas:** P0 | **Estimasi:** 1 jam
- **Lokasi:** `src/config/env.ts:11`
- **Masalah:** default `tiketix-default-jwt-secret-dev-only`. Jika `.env` hilang di prod, server tetap jalan dengan secret publik.
- **Perbaikan:**
  ```ts
  JWT_SECRET: z.string().min(32),
  // + validasi: if (NODE_ENV==='production' && !process.env.JWT_SECRET) process.exit(1)
  ```
  Tambah `.env.example` dengan `JWT_SECRET=<generate-32-char>` + catatan `openssl rand -hex 32`.
- **Acceptance:** `NODE_ENV=production` tanpa `JWT_SECRET` → crash saat boot dengan pesan jelas, bukan jalan.

### 1.4 Logika `getUserBookings` + tanpa pagination
- **ID:** `SEC-04` | **Prioritas:** P0/P1 | **Estimasi:** 3 jam
- **Lokasi:** `src/modules/booking/booking.controller.ts:getUserBookings`, `src/modules/booking/booking.repository.ts:findByUserId`
- **Masalah:** `req.user?.id || queryUserId` membingungkan; `findMany` tanpa `limit` = DoS data + kebocoran jika `userId` query disalahgunakan.
- **Perbaikan:**
  1. `userId = role===ADMIN && query.userId ? query.userId : req.user.id` (hapus fallback).
  2. Tambah `page, limit (max 50)` + `orderBy createdAt desc`. Validasi via Zod `bookingQuerySchema`.
- **Acceptance:** non-admin kirim `?userId=milik-orang` → tetap dapat datanya sendiri. `?limit=9999` → di-cap 50.

### 1.5 CORS `*` + `/uploads` statis terbuka
- **ID:** `SEC-05` | **Prioritas:** P0 | **Estimasi:** 2 jam
- **Lokasi:** `src/app.ts:12-18`
- **Masalah:** `cors()` allow-all + `express.static('/uploads')` tanpa `maxAge`/batasan. Siap untuk hotlink & enumerasi file.
- **Perbaikan:**
  1. `cors({ origin: env.FRONTEND_URL.split(','), credentials: true })`.
  2. Tambah `FRONTEND_URL` ke `env.ts`.
  3. `express.static(..., { maxAge: '7d', dotfiles: 'deny' })`.
- **Acceptance:** origin tak dikenal → CORS blocked di browser; cek header `Access-Control-Allow-Origin` bukan `*` di prod.

### 1.6 `MulterError` jadi 500 + validasi MIME saja
- **ID:** `SEC-06` | **Prioritas:** P0 | **Estimasi:** 2 jam
- **Lokasi:** `src/middlewares/errorHandler.ts`, `src/middlewares/upload.ts`
- **Masalah:** file >5MB / spoofed MIME → `500`. Hanya cek `mimetype` (mudah dipalsukan).
- **Perbaikan:**
  1. Handle `err instanceof multer.MulterError`: `LIMIT_FILE_SIZE → 413`, `LIMIT_UNEXPECTED_FILE → 400`.
  2. Cek ganda ekstensi `['.jpg','.jpeg','.png','.webp']` + tolak `double-ext (.php.jpg)`. Opsional: cek magic-bytes via `file-type`.
- **Acceptance:** upload 6MB → `413`; upload `.exe` rename `.jpg` → `400`.

**Definition of Done Sprint 1:** ✅ SELESAI `24 Okt 2026` — semua 6 item + `npm test` hijau (36 tests, 5 files) + `npm run build` sukses.

### Changelog Sprint 1 (yang diubah)
- `SEC-01` — `src/modules/booking/booking.routes.ts`: `GET /code/:bookingCode` + `GET /:id` kini wajib `authenticate`; `booking.service.ts:getBookingByCode/getBookingById`: cek owner / organizer-event / ADMIN → selain itu `403`. Swagger `/bookings/code` diupdate (`security: bearerAuth`, 401/403).
- `SEC-02` — `event.validator.ts`: `organizerId` dihapus dari skema body; `event.controller.ts:createEvent`: selalu `req.user.id` (ADMIN boleh override via `?organizerId=`). Tipe `CreateEventInput.organizerId` disuntik server-side.
- `SEC-03` — `config/env.ts`: `JWT_SECRET` min 32 char tanpa default lemah + `process.exit(1)` bila `NODE_ENV=production` tanpa secret eksplisit; `.env.example` ditambah `FRONTEND_URL` + catatan `openssl rand -hex 32`.
- `SEC-04` — `booking.validator.ts`: skema `bookingListQuerySchema` baru (`userId? page limit≤50`); `booking.controller.ts`: owner selalu `req.user.id`, non-admin `?userId=` diabaikan; `booking.repository.ts:findByUserId` paginated + return `{data, meta}`; `common/response.ts:sendSuccess` dukung param `meta`.
- `SEC-05` — `app.ts`: CORS allowlist dari `FRONTEND_URL` (bukan `*`) + `credentials:true`; `express.static('/uploads')` ditambah `dotfiles:deny, maxAge:7d, index:false`.
- `SEC-06` — `middlewares/errorHandler.ts`: `MulterError LIMIT_FILE_SIZE→413`, `LIMIT_UNEXPECTED_FILE→400`; `middlewares/upload.ts`: validasi ganda MIME+ekstensi + tolak double-extension (`*.php.jpg`).
- Tes baru: `tests/sprint1-security.test.ts` (12 tests: 401/403 booking, BOLA organizer, pagination cap, 413 upload). Total suite: **36 passed**.

---

## Sprint 2 — Correctness & Concurrency (P1) — Target: 3–5 hari

Tujuan: hilangkan TOCTOU, N+1, dan double-settlement.

### 2.1 Hilangkan TOCTOU pre-check kuota di `booking.service`
- **ID:** `COR-01` | **Prioritas:** P1 | **Estimasi:** 4 jam
- **Lokasi:** `src/modules/booking/booking.service.ts:30-56` → `src/modules/booking/booking.repository.ts:createWithTransaction`
- **Masalah:** `findUnique tier + if (availableQuota < qty)` di luar transaksi, lalu `decrement` di dalam. Race tetap aman karena `CHECK >=0`, tapi error kasar + N+1 query.
- **Perbaikan:** hapus pre-check kuota (pertahankan cek `tier.eventId`); andalkan `decrement` atomik + tangkap `P2004/23514` di `errorHandler` (sudah ada) → pesan `INSUFFICIENT_QUOTA`. Pertimbangkan `SELECT ... FOR UPDATE` bila perlu pesan stok per-tier.
- **Acceptance:** test konkurensi 20 parallel ke 1 tier sisa 5 → tepat 5 sukses, 15 `400 INSUFFICIENT_QUOTA`, `availableQuota` tidak pernah negatif.

### 2.2 Payment idempotency
- **ID:** `COR-02` | **Prioritas:** P1 | **Estimasi:** 1 hari
- **Lokasi:** `src/modules/payment/payment.repository.ts:settlePaymentAndIssueTickets`, `prisma/schema.prisma:PaymentTransaction`
- **Masalah:** `transactionCode = PAY-...-RANDOM` tiap retry. Retry/webhook ganda → 1 sukses 1 `400`, tidak idempotent. Tidak ada `unique(bookingId)`.
- **Perbaikan (pilih satu, rekomendasi A):**
  - A (mudah): tambah `@@unique([bookingId])` + di service tangkap `P2002` → return payment existing (safe-retry).
  - B (penuh): dukung header `Idempotency-Key` → simpan di `payload.idempotencyKey` + lookup sebelum transaksi.
- **Acceptance:** POST `/payments/pay` 2× bersamaan untuk booking sama → 1 sukses, 1 return hasil yang sama (bukan tiket ganda). `tickets.count == quantity`.

### 2.3 Bulk issuing tiket (`createMany`)
- **ID:** `COR-03` | **Prioritas:** P1 | **Estimasi:** 3 jam
- **Lokasi:** `src/modules/payment/payment.repository.ts:50-62`, `src/modules/payment/payment.service.ts:62-114`
- **Masalah:** loop `tx.ticket.create` per lembar → N roundtrip, lock transaksi lama.
- **Perbaikan:** `tx.ticket.createMany({ data: ticketsData })` lalu `findMany where bookingId`. Validasi `attendees.length === totalQty` sebelum transaksi; jika mismatch → `400`.
- **Acceptance:** booking 10 tiket → 1 insert batch; waktu p95 turun; test jumlah tiket tetap pas.

### 2.4 Bulk expiry worker
- **ID:** `COR-04` | **Prioritas:** P1 | **Estimasi:** 4 jam
- **Lokasi:** `src/modules/booking/booking.repository.ts:expireOverdueBookings`, `src/jobs/expiryWorker.ts`
- **Masalah:** `findMany(50) + for loop $transaction` → lambat saat ribuan overdue, rawan overlap.
- **Perbaikan:**
  1. Ambil `ids = SELECT id WHERE PENDING AND expires_at <= NOW() LIMIT 500`.
  2. `updateMany where { id:{in:ids}, status:PENDING } → EXPIRED` → dapat `count`.
  3. Restore kuota via 1 query per tier (group by `ticketTierId`) atau `executeRaw`.
  4. Tambah `SKIP LOCKED` bila Postgres padat (opsional).
- **Acceptance:** seed 1000 overdue → selesai <5 detik, tidak ada double-restore (kuota akhir = awal).

### 2.5 Validasi tanggal & kuota event
- **ID:** `COR-05` | **Prioritas:** P1 | **Estimasi:** 2 jam
- **Lokasi:** `src/modules/event/event.validator.ts`, `src/modules/event/event.service.ts`
- **Masalah:** `eventDate` masa lalu lolos, `endTime < eventDate` lolos, `totalQuota 0` via coerce.
- **Perbaikan:** `.refine(eventDate > now)`, `.refine(endTime > eventDate)`, `price .finite().nonnegative()`, `totalQuota .int().min(1).max(100000)`.
- **Acceptance:** 3 kasus negatif → `400` dengan pesan jelas.

**Definition of Done Sprint 2:** tambah/rapikan test `tests/booking-concurrency.test.ts` (parallel 20), `tests/payment-idempotency.test.ts` (baru), `tests/expiry-bulk.test.ts` (baru). Semua hijau.

---

## Sprint 3 — Backend Robustness + Frontend Decoupling (P1/P2) — Target: 4–5 hari

### 3.1 Ganti `as any` → tipe Prisma
- **ID:** `Q-01` | **Estimasi:** 3 jam
- **Lokasi:** `src/modules/ticket/ticket.service.ts`, `src/modules/payment/payment.service.ts:getPaymentById`, `src/modules/booking/booking.repository.ts`
- **Perbaikan:** pakai `Prisma.BookingGetPayload<{ include: ... }>` untuk return repository. Hapus semua `as any`. Nyalakan `noUncheckedIndexedAccess` bertahap.
- **Acceptance:** `npx tsc --noEmit` 0 error, 0 `as any` di `modules/`.

### 3.2 Pagination + filter `GET /events`
- **ID:** `Q-02` | **Estimasi:** 3 jam
- **Lokasi:** `src/modules/event/event.repository.ts:findAll`, `event.controller.ts:getAllEvents`
- **Perbaikan:** `?status=&search=&page=&limit=&sort=eventDate:asc`. Default `limit 12, max 50`. Return `{ data, meta: { total, page, totalPages } }`.
- **Acceptance:** frontend HomePage bisa infinite-scroll tanpa fetch 1000 event.

### 3.3 Logging terstruktur + request-id
- **ID:** `Q-03` | **Estimasi:** 4 jam
- **Lokasi:** `src/app.ts`, `src/server.ts`, `src/middlewares/` (baru `requestId.ts`)
- **Perbaikan:** tambah `pino-http` (atau `morgan` sementara), `X-Request-Id` di response, ganti `console.log` worker → logger. Jangan log `passwordHash`/token.
- **Acceptance:** tiap baris log ada `reqId`; error 500 bisa dilacak dari header.

### 3.4 Frontend: matikan silent demo-fallback di prod
- **ID:** `FE-01` | **Prioritas:** P1 | **Estimasi:** 1 hari
- **Lokasi:** `frontend/src/services/api.ts`, `frontend/src/context/AuthContext.tsx`, semua `pages/*.tsx`
- **Masalah:** `API_BASE_URL` hardcoded `localhost:5000`; `catch{}` selalu return `DEMO_*`; `AuthContext` default login `Budi Santoso + demo-jwt-token`. EO bisa mengira data demo = data asli.
- **Perbaikan:**
  1. `API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1'`.
  2. Tambah `VITE_DEMO_MODE=true/false`. Fallback demo hanya jika `VITE_DEMO_MODE==='true'`.
  3. Jika backend mati & bukan demo → tampilkan `error state + retry`, bukan data palsu.
  4. Hapus token `demo-*` default; `isAuthenticated = !!token && !!user`.
- **Acceptance:** `VITE_DEMO_MODE=false + backend mati` → UI tampil error, tidak ada event/tiket palsu. `VITE_DEMO_MODE=true` → demo tetap jalan untuk presentasi.

### 3.5 Upload & error message konsisten (id/en)
- **ID:** `Q-04` | **Estimasi:** 2 jam
- **Lokasi:** `src/middlewares/upload.ts`, `src/common/response.ts`, `frontend/src/services/api.ts:uploadEventPoster`
- **Perbaikan:** samakan bahasa error (pilih `id`), kembalikan `fileUrl` absolut + `filename`. Di frontend tampilkan progress & pesan `413`.
- **Acceptance:** upload gagal tampilkan pesan manusiawi, bukan `Internal server error`.

---

## Sprint 4 — Prod-Readiness & Hygiene (P3) — Target: 3–4 hari

### 4.1 Bersihkan artefak dari git
- **ID:** `OPS-01` | **Estimasi:** 1 jam
- **Lokasi:** root `.gitignore`
- **Masalah:** `dist/`, `frontend/dist/`, `.pgdata/` ter-commit (terlihat dari `ls`). Bloat + risiko membocorkan build.
- **Perbaikan:**
  ```bash
  git rm -r --cached dist frontend/dist .pgdata uploads
  # .gitignore tambah:
  # dist/ frontend/dist/ .pgdata/ uploads/* !uploads/.gitkeep coverage/
  ```
- **Acceptance:** `git ls-files | grep dist` kosong; clone baru tetap bisa `npm i && npm run build`.

### 4.2 Dependency injection di routes agar testable
- **ID:** `OPS-02` | **Estimasi:** 4 jam
- **Lokasi:** `src/modules/*/ *.routes.ts`, `src/routes/index.ts`
- **Masalah:** `new Repository()` di top-level singleton → susah mock Prisma.
- **Perbaikan:** ubah ke `export function createBookingRouter(deps)`, rakit di `routes/index.ts`. Tidak perlu framework DI berat.
- **Acceptance:** test service bisa inject mock repo tanpa `__mocks__/prisma`.

### 4.3 CI + migrasi aman + seed
- **ID:** `OPS-03` | **Estimasi:** 1 hari
- **File baru:** `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml` (cek `scripts/start-db.js` sudah ada)
- **Perbaikan:** CI: `npm ci → npx prisma validate → npm run build → npm test`. Blok merge jika gagal. Dokumentasikan `prisma migrate deploy` untuk prod (bukan `migrate dev`).
- **Acceptance:** PR baru otomatis jalan CI hijau.

### 4.4 Audit log & metrik minimal
- **ID:** `OPS-04` | **Estimasi:** 1 hari (bisa dipindah ke next)
- **Lokasi:** baru `prisma model AuditLog` atau tabel `*_events`
- **Perbaikan (MVP):** log `PAYMENT_SETTLED, TICKET_CHECKED_IN, BOOKING_EXPIRED` ke tabel/STDOUT terstruktur. Tambah endpoint `/metrics` sederhana (count booking/hari) untuk dashboard.
- **Acceptance:** tiap check-in tercatat `who, when, qrHash`.

### 4.5 Dokumentasi & Swagger jujur
- **ID:** `OPS-05` | **Estimasi:** 2 jam
- **Lokasi:** `README.md`, `src/config/swagger.ts`
- **Perbaikan:** tandai endpoint yang butuh auth di Swagger (`security: bearerAuth` yang masih hilang: `GET /bookings/code`, `GET /bookings/:id`). Tambah bagian `DEM0_MODE` di README frontend. Tambah `SECURITY.md` (cara lapor vuln + rotasi JWT).
- **Acceptance:** `Try it out` di Swagger tanpa token untuk endpoint proteksi → `401` sesuai docs.

---

## Matriks Prioritas (Ringkasan)

| ID | Item | Dampak jika dibiarkan | Effort | Sprint |
|---|---|---|---|---|
| SEC-01 | Booking-by-code tanpa auth | Kebocoran PII | S | 1 |
| SEC-02 | organizerId dari body | Pemalsuan event | S | 1 |
| SEC-03 | JWT default lemah | Takeover akun | XS | 1 |
| SEC-04 | getUserBookings + pagination | Kebocoran + DoS | S | 1 |
| SEC-05 | CORS * | CSRF/hotlink | S | 1 |
| SEC-06 | MulterError 500 | UX + info-leak | S | 1 |
| COR-01 | TOCTOU kuota | Oversell UX buruk | M | 2 |
| COR-02 | Idempotency payment | Tiket ganda | M | 2 |
| COR-03 | createMany tiket | Lock lama, lambat | S | 2 |
| COR-04 | Bulk expiry | Worker macet saat spike | M | 2 |
| COR-05 | Validasi tanggal | Event invalid | S | 2 |
| FE-01 | Demo-fallback silent | Keputusan bisnis salah | M | 3 |
| Q-01..Q-04 | Tipe, pagination, log | Tech debt | M | 3 |
| OPS-01..05 | Git, CI, audit | Prod-risk | M | 4 |

## Paket Payment-Demo (dikerjakan 24 Okt 2026 — cocok untuk demo ke klien)

Tujuan: tombol bayar terlihat & terasa seperti gateway asli (ada nomor VA / QR untuk
di-scan, ada jeda verifikasi, anti double-klik) **tapi tanpa uang asli** (tanpa
Midtrans/Dana/OVO). Ganti ke gateway asli cukup sambungkan 1 modul (`SimulatedPSP`).

### Backend
- `POST /payments/intent` (baru): bikin tagihan PENDING + instruksi simulasi.
  - QRIS → `qrPayload` (`TIKETIX-QRIS-SIM:...`, dirender jadi QR) + `nmid`
  - VA → `vaNumber` (`8808` + 10 digit) + tombol Salin
  - CC → `cardHint` kartu demo (tidak didebet)
  - **Idempotent**: refresh / klik 2x mengembalikan tagihan YANG SAMA (tidak ganda).
- `GET /payments/intent/:bookingCode` (baru): status tagihan terbaru untuk polling.
- `POST /payments/pay` (diperkuat, tetap kompatibel ke belakang):
  - settle idempotent → bayar ulang booking PAID mengembalikan struk yang sama
    (`alreadySettled: true`) + tiket yang sama, **tanpa tiket ganda** (anti double-charge).
  - penerbitan tiket `create` satu-satu → `createMany` (1x insert) + PENDING sisa jadi EXPIRED.
  - `attendees.length` wajib pas dengan jumlah tiket, kalau tidak → `400` jujur.
- Swagger `/api-docs` ditambah 2 endpoint intent + deskripsi mode simulasi.
- Tes: `tests/payment-demo.test.ts` (8 tes) + update 1 tes lama jadi ekspektasi idempotent.

### Frontend (`CheckoutPage.tsx` ditulis ulang 2 langkah)
1. **FORM** (data pemegang tiket + pilih QRIS/VA/CC) → `POST /payments/intent`
2. **INSTRUKSI** (QR bisa scan / VA bisa salin / hint kartu) → klik
   *"Saya Sudah Bayar (Simulasi)"* → jeda verifikasi ala bank 2 detik → `POST /payments/pay` → confetti → `/my-tickets`.
- Timer **jujur dari `expiresAt` server** (bukan `29:58` hardcoded); kalau kedaluwarsa → layar *"buat pesanan baru"*.
- Error **jujur**: gagal bayar → banner merah berisi pesan asli, TIDAK confetti palsu.
- Banner biru *"Mode Simulasi"* di atas halaman supaya klien paham sejak awal.
- Cancel **benar-benar panggil** `POST /bookings/:id/cancel` (kuota kembali, momen demo bagus).
- Buka `/checkout/:kode` langsung via URL: fetch booking asli dari backend.

### Demo-mode yang jujur
- `frontend/src/services/api.ts`: `VITE_API_URL` + flag `VITE_DEMO_MODE` (lihat `frontend/.env.example`).
- Data palsu hanya dipakai bila `VITE_DEMO_MODE=true`. Default `false` = backend mati → error jujur.
- `EventDetailPage`: gagal booking → pesan error asli (fallback palsu hanya saat demo-mode).
- `MyTicketsPage`: backend hidup tapi tiket kosong → tampilkan kosong (dulu selalu ada 2 tiket palsu).

### Cara demo ke klien (skrip 3 menit)
1. Pilih tiket → *Beli* → tunjukkan timer jujur berjalan + kode booking.
2. Pilih QRIS → tunjukkan QR → scan pakai HP (isinya kode booking) → klik *Saya Sudah Bayar*.
3. Tunjukkan jeda *"Memverifikasi ke bank..."* → confetti → tiket + QR muncul di *Tiket Saya*.
4. (Opsional, untuk klien teknis) klik Bayar 5x cepat → tegaskan *"tetap 1 tiket, ini anti double-charge"*; tunjukkan Swagger `POST /payments/intent`.

## Cara Eksekusi

1. Buat branch `fix/sprint-1-sec-hotfix` dari `main`. Satu PR per ID (`SEC-01`, dst) agar review kecil.
2. Setiap PR wajib: test negatif + update Swagger bila ubah kontrak + `npm run build` lolos.
3. Setelah Sprint 1 merge → tag `v1.0.1-sec-hotfix` dan redeploy. Baru lanjut Sprint 2.
4. Jangan kerjakan `OPS-04` (audit log) sebelum `COR-02` selesai — urutan penting.

## Definition of Done Global

- [ ] `npm test` (vitest) hijau, coverage critical path (booking/pay/checkin/expiry) >80%.
- [ ] `npx tsc --noEmit` 0 error, `npm run build` sukses.
- [ ] Tidak ada `demo-token` / `JWT default` di prod. `git ls-files` bersih dari `dist/`.
- [ ] Swagger cocok dengan perilaku asli (coba 401/403/413 manual).
- [ ] README diperbarui: `VITE_API_URL`, `VITE_DEMO_MODE`, `FRONTEND_URL`, cara seeding.

---
## Paket Login-Jujur + Halaman-Jujur (dikerjakan 24 Okt 2026 — lanjutan payment-demo)

Tujuan: demo tidak bisa lagi "ketahuan bohong". Tidak ada user/token/data palsu diam-diam.

### Auth (A)
- `AuthContext`: user/token default palsu DIHAPUS (mulai kosong). `loginAsDemo` selalu coba backend dulu (akun `demo:reset`); akun lokal offline hanya bila `VITE_DEMO_MODE=true`. `isAuthenticated` false untuk token `demo-*`.
- Baru: `LoginPage` (form + 2 tombol demo eksplisit + daftar akun demo + pesan error asli) dan `RegisterPage` (daftar ATTENDEE/ORGANIZER → auto-login).
- Baru: `ProtectedRoute` — `/checkout, /my-tickets` wajib login; `/scanner, /organizer` wajib ORGANIZER/ADMIN. Penonton buka scanner → dilempar ke beranda.
- `Navbar`: pil Attendee/Organizer DIHAPUS (itu yang bikin malu). Belum login → tombol Masuk; link Dashboard EO hanya muncul untuk EO/ADMIN; logout → ke /login.
- `CheckoutPage`: guard login ganda (route + di halaman).

### Halaman jujur (B)
- `HomePage`: fetch `GET /events` dulu; contoh hanya bila DEMO_MODE + banner kuning; backend mati + mode nyata → panel merah jujur. Hero fallback aman bila kosong.
- `OrganizerDashboardPage`: statistik default NOL (bukan Rp 13,5 jt palsu); badge "Data contoh" bila demo; pesan error bila server mati. `api.ts`: `getOrganizerDashboard` return `{data, isDemo}`, fallback contoh hanya saat DEMO_MODE (selain itu throw); `normalizeAttendees` untuk attendees.
- `ScannerPage`: counter dari 342 ketikan → 0; tombol contoh hanya jalan saat DEMO_MODE (label jelas DEMO), selain itu disuruh scan QR asli.
- `EventDetailPage`/`MyTicketsPage`/`CheckoutPage` touch-up kemarin tetap berlaku (Checkout ditulis ulang 2 langkah sebelumnya).

### Reset demo 1-klik (C)
- `prisma/demo-reset.ts` + `npm run demo:reset`: siapkan akun demo, 1 konser + 2 tier, 1 booking PENDING (adegan bayar) + 1 booking PAID + tiket ACTIVE (adegan scan, qrHash dicetak). Idempotent.
- `PANDUAN_DEMO.md`: naskah 3 menit + jawaban pertanyaan klien + checklist pulang.

---

*File ini adalah backlog hidup. Coret item yang selesai dan tambah tanggal + PIC di tiap PR.*
