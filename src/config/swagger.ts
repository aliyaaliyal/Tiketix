import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Tiketix API - Event Ticketing & Booking System',
    version: '1.0.0',
    description: `
**Tiketix** is a production-grade, high-concurrency event ticketing and booking platform built with Express, TypeScript, Prisma ORM, and PostgreSQL.

### Key Architectural Highlights:
- **Concurrency & Race Condition Proof**: Database check constraints, atomic gate check-ins, and optimistic locks on payment settlement.
- **Enterprise Security**: Multi-tier rate limiting, BOLA/IDOR protection, and RBAC (Admin, Organizer, Attendee).
- **Automated Verification**: Comprehensive integration tests covering all critical paths.
    `,
    contact: {
      name: 'Tiketix Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server (API v1)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan token JWT yang didapat dari endpoint login/register',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description message' },
          error: { type: 'object' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'budi@example.com' },
          password: { type: 'string', minLength: 6, example: 'Password123!' },
          name: { type: 'string', example: 'Budi Santoso' },
          role: { type: 'string', enum: ['ATTENDEE', 'ORGANIZER'], default: 'ATTENDEE' },
          phoneNumber: { type: 'string', example: '+6281234567890' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'attendee@tiketix.com' },
          password: { type: 'string', example: 'Password123!' },
        },
      },
      CreateEventInput: {
        type: 'object',
        required: ['title', 'slug', 'venueName', 'eventDate'],
        properties: {
          title: { type: 'string', example: 'Soundwave Music Festival 2026' },
          slug: { type: 'string', example: 'soundwave-festival-2026' },
          venueName: { type: 'string', example: 'Stadion Madya Gelora Bung Karno' },
          venueAddress: { type: 'string', example: 'Senayan, Jakarta Pusat' },
          eventDate: { type: 'string', format: 'date-time', example: '2026-11-28T15:00:00.000Z' },
          description: { type: 'string', example: 'Festival musik spektakuler dengan 3 panggung megah.' },
          posterUrl: { type: 'string', example: '/uploads/posters/poster-1729000-sample.png' },
          ticketTiers: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'price', 'totalQuota'],
              properties: {
                name: { type: 'string', example: 'Early Bird Festival' },
                price: { type: 'number', example: 150000 },
                totalQuota: { type: 'integer', example: 100 },
                description: { type: 'string', example: 'Akses general admission festival' },
              },
            },
          },
        },
      },
      CreateBookingInput: {
        type: 'object',
        required: ['eventId', 'items'],
        properties: {
          eventId: { type: 'string', format: 'uuid', example: 'e0000000-0000-0000-0000-000000000001' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['ticketTierId', 'quantity'],
              properties: {
                ticketTierId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', minimum: 1, example: 2 },
              },
            },
          },
        },
      },
      ProcessPaymentInput: {
        type: 'object',
        required: ['bookingCode'],
        properties: {
          bookingCode: { type: 'string', example: 'TIK-20261015-ABCD' },
          paymentGateway: { type: 'string', example: 'MANUAL' },
          attendees: {
            type: 'array',
            items: {
              type: 'object',
              required: ['ticketTierId', 'name', 'email'],
              properties: {
                ticketTierId: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Budi Santoso' },
                email: { type: 'string', format: 'email', example: 'budi@example.com' },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Autentikasi & Registrasi Pengguna' },
    { name: 'Events', description: 'Manajemen Konser & Acara' },
    { name: 'Bookings', description: 'Pemesanan & Reservasi Kuota Tiket' },
    { name: 'Payments', description: 'Simulasi Pembayaran & Penerbitan Tiket' },
    { name: 'Tickets', description: 'E-Ticket & Contactless Gate Check-in' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check API',
        description: 'Memeriksa status hidup server backend dan uptime service.',
        responses: {
          200: { description: 'Server aktif dan sehat' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrasi Pengguna Baru (Attendee / Organizer)',
        description: 'Mendaftarkan akun baru ke platform. Role ADMIN diblokir untuk keamanan publik.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
          },
        },
        responses: {
          201: { description: 'Akun berhasil didaftarkan dan JWT token diterbitkan' },
          400: { description: 'Data input tidak valid atau role ADMIN ditolak' },
          409: { description: 'Email sudah terdaftar di sistem' },
          429: { description: 'Batas percobaan autentikasi terlampaui' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login Akun Pengguna',
        description: 'Autentikasi menggunakan email dan password untuk mendapatkan Bearer JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } },
          },
        },
        responses: {
          200: { description: 'Login berhasil dan token diterbitkan' },
          401: { description: 'Email atau password salah' },
          429: { description: 'Batas percobaan autentikasi terlampaui' },
        },
      },
    },
    '/events': {
      get: {
        tags: ['Events'],
        summary: 'Daftar Semua Event / Konser',
        description: 'Mengambil daftar konser musik aktif beserta tier tiket yang tersedia.',
        responses: {
          200: { description: 'Daftar event berhasil diambil' },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Buat Event & Tier Tiket Baru (Organizer Only)',
        security: [{ bearerAuth: [] }],
        description: 'Mempublikasikan konser baru ke katalog Tiketix beserta tier kuota awal.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateEventInput' } },
          },
        },
        responses: {
          201: { description: 'Event berhasil dipublikasikan' },
          401: { description: 'Tidak terautentikasi' },
          403: { description: 'Role bukan ORGANIZER atau ADMIN' },
        },
      },
    },
    '/events/upload-poster': {
      post: {
        tags: ['Events'],
        summary: 'Upload Poster Konser (Organizer Only)',
        security: [{ bearerAuth: [] }],
        description: 'Mengunggah file poster konser (JPG, PNG, WebP) dengan batas maksimal 5MB.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  poster: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Poster berhasil diunggah' },
          400: { description: 'File tidak ada atau format tidak didukung' },
          403: { description: 'Role bukan ORGANIZER atau ADMIN' },
        },
      },
    },
    '/events/slug/{slug}': {
      get: {
        tags: ['Events'],
        summary: 'Detail Event Berdasarkan Slug',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detail konser ditemukan' },
          404: { description: 'Konser tidak ditemukan' },
        },
      },
    },
    '/events/organizer/dashboard': {
      get: {
        tags: ['Events'],
        summary: 'Statistik Dashboard Organizer',
        security: [{ bearerAuth: [] }],
        description: 'Menampilkan ringkasan pendapatan, tiket terjual, sisa kuota, dan booking terbaru.',
        responses: {
          200: { description: 'Data dashboard berhasil diambil' },
          403: { description: 'Akses ditolak' },
        },
      },
    },
    '/events/organizer/attendees': {
      get: {
        tags: ['Events'],
        summary: 'Daftar Peserta & Penonton Konser (EO)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Daftar penonton konser berhasil diambil' },
        },
      },
    },
    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Pesan Tiket Konser (Atomic Quota Reservation)',
        security: [{ bearerAuth: [] }],
        description: 'Membuat booking baru dan mengurangi kuota tiket secara atomik. Status booking: PENDING.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateBookingInput' } },
          },
        },
        responses: {
          201: { description: 'Booking berhasil dibuat' },
          400: { description: 'Kuota tiket habis atau tidak mencukupi' },
        },
      },
      get: {
        tags: ['Bookings'],
        summary: 'Daftar Riwayat Booking Pengguna',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Daftar booking berhasil diambil' },
        },
      },
    },
    '/bookings/code/{bookingCode}': {
      get: {
        tags: ['Bookings'],
        summary: 'Cari Booking Berdasarkan Booking Code (Owner / Organizer / Admin)',
        security: [{ bearerAuth: [] }],
        description:
          'Membutuhkan autentikasi. Hanya pemilik booking, organizer pemilik event, atau ADMIN yang boleh membaca. Mencegah enumerasi kode booking milik orang lain.',
        parameters: [
          { name: 'bookingCode', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Detail booking ditemukan' },
          401: { description: 'Tidak terautentikasi' },
          403: { description: 'Bukan pemilik booking / organizer event' },
          404: { description: 'Booking tidak ditemukan' },
        },
      },
    },
    '/bookings/{id}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Batalkan Booking & Kembalikan Kuota',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Booking dibatalkan dan kuota dikembalikan ke DB' },
          400: { description: 'Hanya booking berstatus PENDING yang dapat dibatalkan' },
        },
      },
    },
    '/payments/intent': {
      post: {
        tags: ['Payments'],
        summary: 'Buat Tagihan Simulasi (QRIS / VA / CC Palsu, Tanpa Uang Asli)',
        security: [{ bearerAuth: [] }],
        description:
          'Langkah 1 alur demo: membuat tagihan PENDING beserta instruksi bayar simulasi (QR payload / nomor VA / hint kartu). Idempotent — refresh atau klik ulang mengembalikan tagihan yang sama.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bookingCode'],
                properties: {
                  bookingCode: { type: 'string', example: 'TIK-20261015-ABCD' },
                  paymentMethod: { type: 'string', enum: ['QRIS', 'VA', 'CC', 'SIMULATOR'], example: 'QRIS' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tagihan simulasi dibuat (PENDING)' },
          400: { description: 'Booking sudah dibayar / expired / dibatalkan' },
        },
      },
    },
    '/payments/intent/{bookingCode}': {
      get: {
        tags: ['Payments'],
        summary: 'Status Tagihan + Booking (untuk polling frontend)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'bookingCode', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Status tagihan terbaru (PENDING / SETTLEMENT / null)' },
        },
      },
    },
    '/payments/pay': {
      post: {
        tags: ['Payments'],
        summary: 'Bayar Booking & Terbitkan E-Tiket (Idempotent, Anti Double-Charge)',
        security: [{ bearerAuth: [] }],
        description:
          'Langkah 2 alur demo (atau single-step untuk klien lama): menyelesaikan tagihan dan menerbitkan tiket via createMany atomik. Idempotent — klik ganda / retry mengembalikan struk yang sama tanpa tiket ganda.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ProcessPaymentInput' } },
          },
        },
        responses: {
          200: { description: 'Pembayaran sukses dan e-tiket resmi diterbitkan' },
          400: { description: 'Booking expired / dibatalkan / jumlah pemegang tiket tidak pas' },
        },
      },
    },
    '/tickets/my-tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'Daftar E-Tiket Milik Pengguna Login',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Daftar tiket aktif penonton' },
        },
      },
    },
    '/tickets/{id}': {
      get: {
        tags: ['Tickets'],
        summary: 'Detail E-Tiket (IDOR Protected)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Detail e-tiket ditemukan' },
          403: { description: 'Dilarang: tiket milik penonton lain' },
          404: { description: 'Tiket tidak ditemukan' },
        },
      },
    },
    '/tickets/checkin/{qrHash}': {
      post: {
        tags: ['Tickets'],
        summary: 'Check-in Tiket di Gate Konser (Atomic Double-Scan Guard)',
        security: [{ bearerAuth: [] }],
        description: 'Memindai QR Hash tiket penonton di meja registrasi masuk gate konser. Scan ulang ditolak.',
        parameters: [
          { name: 'qrHash', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Check-in berhasil, status tiket CHECKED_IN' },
          400: { description: 'Tiket sudah pernah check-in sebelumnya' },
          403: { description: 'Hanya ORGANIZER atau ADMIN yang berhak memindai tiket' },
        },
      },
    },
  },
};

export function setupSwagger(app: Application): void {
  // Swagger custom CSS for clean UI
  const swaggerOptions: swaggerUi.SwaggerUiOptions = {
    customSiteTitle: 'Tiketix API Documentation',
    customCss: `
      .topbar { display: none !important; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .btn.authorize { background-color: #FF5B37; border-color: #FF5B37; color: white; }
    `,
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
}
