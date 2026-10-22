# 🎟️ Tiketix — Event Booking & Ticketing Platform

Platform pemesanan tiket konser & event full-stack: katalog event, reservasi kuota atomik,
**pembayaran simulasi (QRIS / VA / kartu, tanpa uang asli)**, penerbitan e-tiket ber-QR,
dan **gate scanner kamera asli** anti-masuk-dua-kali.

> **Status:** siap demo ke klien. Payment memakai `SimulatedPSP` — ganti ke Midtrans/Xendit
> cukup sambungkan 1 modul, alur tetap sama.

## 📸 Tampilan

| Beranda (data asli DB) | Checkout QRIS (simulasi) |
|---|---|
| ![Beranda Tiketix](docs/home.png) | ![Checkout QRIS Tiketix](docs/checkout.png) |
| **E-tiket ber-QR** | **Dashboard EO (data asli)** |
| ![E-tiket Tiketix](docs/tickets.png) | ![Dashboard EO Tiketix](docs/dashboard.png) |
| **Gate scanner kamera asli** | **Login jujur** |
| ![Scanner Tiketix](docs/scanner.png) | ![Login Tiketix](docs/login.png) |

---

## ✨ Fitur

| Area | Isi |
|---|---|
| 🎫 Booking | Reservasi kuota atomik (`CHECK(available_quota >= 0)`), hold 30 menit, pagination, cancel kembalikan kuota |
| 💳 Payment simulasi | 2 langkah: `POST /payments/intent` (dapat QR/VA bohongan) → `POST /payments/pay` (settle + tiket terbit). **Idempotent** — klik 10x tetap 1 tiket |
| 🎟️ E-tiket | QR unik per tiket, halaman *Tiket Saya*, download PDF A5 |
| 📷 Gate scanner | Kamera laptop/HP asli (`html5-qrcode`) + upload foto QR + input manual. Scan ganda **ditolak atomik** (`ACTIVE → CHECKED_IN` sekali saja) |
| 📊 Dashboard EO | Omzet, tiket terjual, check-in rate, daftar penonton + ekspor CSV, buat event + upload poster |
| 🔐 Auth & security | JWT + bcrypt, RBAC `ATTENDEE/ORGANIZER/ADMIN`, proteksi BOLA/IDOR, rate-limit, CORS allowlist, validasi Zod |

---

## 🧱 Tech stack

**Backend** — TypeScript 5.6 · Node.js · Express 4 · Prisma 5 · PostgreSQL 16 ·
Zod · jsonwebtoken + bcryptjs · helmet / cors / express-rate-limit · multer ·
swagger-ui-express · Vitest + supertest

**Frontend** — React 19 · Vite 8 · Tailwind CSS 3 · react-router-dom 7 · axios ·
qrcode.react (tampil) · html5-qrcode (scan kamera) · qrcode + jspdf (PDF A5) ·
lucide-react · canvas-confetti

```
React (:5173) --axios/JWT--> Express (:5000/api/v1) --Prisma--> PostgreSQL
                                     |--multer--> uploads/posters/
                                     |--expiry worker (30 dtk)
                                     |--swagger di /api-docs
```

---

## 🚀 Cara jalan (5 menit)

### 1. Backend

```bash
npm install
cp .env.example .env            # isi JWT_SECRET (min 32 char) bila perlu
node scripts/start-db.js        # PostgreSQL embedded di :5432
npx prisma migrate deploy
npm run demo:reset              # panggung demo: akun + konser + booking + tiket
npm run dev                     # http://localhost:5000
```

Cek: `http://localhost:5000/health` → `{"status":"UP"}` ·
Swagger: `http://localhost:5000/api-docs`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # default sudah benar untuk lokal
npm run dev                     # http://localhost:5173
```

Akun demo (password `Password123!`):
`attendee@tiketix.com` (penonton) · `organizer@tiketix.com` (EO)

### 3. Perintah penting

| Perintah | Fungsi |
|---|---|
| `npm run demo:reset` | Reset panggung demo 1-klik (idempotent) |
| `npm test` | 44 integration tests (6 files) |
| `npm run build` / `npm start` | Build + jalan prod backend |
| `npm --prefix frontend run build` | Build frontend |

Naskah presentasi 3 menit: **`PANDUAN_DEMO.md`**

---

## 🎬 Alur demo (ringkas)

1. **Login** di `/login` → *Penonton (Demo)* → beli tiket → timer server berjalan
2. **Bayar**: pilih QRIS → *Buat Tagihan* → scan QR pakai HP → *Saya Sudah Bayar* → confetti → tiket terbit di *Tiket Saya*
3. **Scan** (tab incognito, login EO): `/scanner` → *Nyalakan Kamera* → arahkan QR → **hijau** → scan lagi → **merah ditolak**
4. **EO**: `/organizer` → omzet asli → *Attendees* → Download CSV → buka di Excel

Detail + jawaban pertanyaan klien: **`PANDUAN_DEMO.md`**

---

## 🔌 API ringkas

| Method & path | Auth | Fungsi |
|---|---|---|
| `POST /api/v1/auth/register` · `POST /api/v1/auth/login` · `GET /api/v1/auth/me` | publik / publik / login | Akun + JWT |
| `GET /api/v1/events` · `POST /api/v1/events` | publik / EO | Katalog + buat event |
| `POST /api/v1/events/upload-poster` | EO | Upload poster (5 MB, JPG/PNG/WebP) |
| `GET /api/v1/events/organizer/dashboard` · `/organizer/attendees` | EO | Statistik + penonton |
| `POST /api/v1/bookings` · `GET /api/v1/bookings` | login | Pesan tiket · riwayat (paginated) |
| `GET /api/v1/bookings/code/:code` · `GET /api/v1/bookings/:id` | owner/EO/Admin | Detail (anti-intip) |
| `POST /api/v1/bookings/:id/cancel` | owner/Admin | Batal + kembalikan kuota |
| `POST /api/v1/payments/intent` | owner/Admin | Tagihan simulasi (PENDING, idempotent) |
| `GET /api/v1/payments/intent/:bookingCode` | owner/Admin | Status tagihan (polling) |
| `POST /api/v1/payments/pay` | owner/Admin | Settle + terbitkan tiket (idempotent) |
| `GET /api/v1/tickets/my-tickets` · `GET /api/v1/tickets/:id` | login (IDOR-checked) | Tiket saya · detail |
| `POST /api/v1/tickets/checkin/:qrHash` | EO/Admin | Check-in atomik gate |

Kontrak lengkap + *Try it out*: `http://localhost:5000/api-docs`

---

## 🧪 Testing

```bash
npm test   # vitest run — 44 tests, 6 files
```

Yang diuji: auth & RBAC, race kuota, optimistic-lock payment, idempotent
intent/pay, expiry worker, upload guards, security Sprint-1 (401/403/413),
double-scan gate.

---

## 🔒 Keamanan (ringkas)

- JWT wajib di endpoint sensitif; booking-by-code dicek owner/organizer-event/Admin
- `organizerId` event selalu dari token (bukan body); register menolak role `ADMIN`
- Booking list pinned ke user sendiri + pagination (max 50)
- CORS allowlist (`FRONTEND_URL`), helmet, rate-limit global + auth
- Upload: batas 5 MB, whitelist MIME + ekstensi, tolak double-extension

---

## ⚙️ Konfigurasi

Backend (`.env`, lihat `.env.example`):

| Var | Contoh |
|---|---|
| `PORT` | `5000` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/tiketix_db?schema=public` |
| `JWT_SECRET` | min 32 char — **wajib di production** (app menolak boot tanpanya) |
| `FRONTEND_URL` | `http://localhost:5173` (koma-separated untuk banyak origin) |

Frontend (`frontend/.env`):

| Var | Fungsi |
|---|---|
| `VITE_API_URL` | `http://localhost:5000/api/v1` |
| `VITE_DEMO_MODE` | `true` = backend mati tampilkan contoh berlabel · `false` = tampilkan error jujur |

---

## 📁 Struktur repo

```
src/modules/{auth,booking,event,payment,ticket,ticket-tier,user}/  # controller-service-repo-validator-routes
src/{common,config,jobs,middlewares,routes}/                       # jwt, env, expiry worker, auth/rate-limit/upload
prisma/{schema.prisma,migrations,seed.ts,demo-reset.ts}
tests/                                                             # 6 files, 44 tests
frontend/src/{pages,components,services,context}/                 # Home, Checkout, Scanner, EO dashboard, Auth
PANDUAN_DEMO.md · RENCANA_PERBAIKAN.md
```

---

## 📜 Skrip screenshot

Semua gambar di atas diambil otomatis (bukan editan) via Playwright:

```bash
npm run demo:reset        # siapkan data demo dulu
node scripts/screenshots.js   # hasil ke docs/*.png
```

## 🗺️ Roadmap

- [x] Sprint 1 — security hotfix (auth booking, BOLA, JWT, pagination, CORS, upload)
- [x] Payment simulasi 2-langkah + idempotent + timer server
- [x] Login jujur + halaman jujur + `demo:reset` + panduan demo
- [x] Scanner kamera asli + upload-foto QR + pilih kamera
- [ ] Ganti `SimulatedPSP` → Midtrans/Xendit (1 modul)
- [ ] Kolom `city/category` di DB (ganti fallback homepage)
- [ ] CI GitHub Actions + Dockerfile
