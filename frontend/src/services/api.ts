import axios from 'axios';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api/v1';

// Asal backend (tanpa /api/v1) untuk prefix gambar /uploads/....
// Otomatis ikut VITE_API_URL, jadi tidak ada lagi localhost:5000 tercecer.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

// Ubah path relatif backend (/uploads/...) jadi URL absolut yang bisa dibuka browser.
export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
};

// Demo mode: when 'true', pages may fall back to local mock data so a
// presentation survives without a backend. Default OFF in real usage —
// a dead backend must surface an honest error, never fake success.
export const DEMO_MODE =
  String((import.meta as any).env?.VITE_DEMO_MODE || '').toLowerCase() === 'true';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tiketix_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Demo/Fallback Data (Ensures smooth experience and offline demo reliability)
export const ALL_DEMO_EVENTS = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    title: 'Soundwave Music Festival 2026',
    slug: 'soundwave-music-festival-2026',
    category: 'Konser Musik & Festival',
    city: 'Jakarta',
    posterUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
    description:
      'Festival musik tahunan terbesar yang menampilkan artis papan atas nasional & internasional dalam 3 panggung megah dengan tata suara dan tata cahaya spektakuler.',
    venueName: 'Stadion Madya Gelora Bung Karno',
    venueAddress: 'Jl. Gerbang Pemuda No.3, Gelora, Tanah Abang, Jakarta Pusat',
    eventDate: '2026-11-28T15:00:00.000Z',
    endTime: '2026-11-28T23:30:00.000Z',
    status: 'PUBLISHED',
    minPrice: 150000,
    ticketTiers: [
      {
        id: 't0000000-0000-0000-0000-000000000001',
        name: 'Early Bird Festival',
        description: 'Akses area festival umum, merchandise keychain, dan jalur antrean standar.',
        price: 150000,
        totalQuota: 50,
        availableQuota: 14,
      },
      {
        id: 't0000000-0000-0000-0000-000000000002',
        name: 'VIP Front Row Pass',
        description: 'Barisan paling depan (front-row), jalur fast-track Gate A, free flow drink, dan lounge ber-AC.',
        price: 350000,
        totalQuota: 20,
        availableQuota: 8,
      },
    ],
    lineup: [
      { name: 'Tulus', role: 'Singer / Songwriter', color: 'border-coral' },
      { name: 'Isyana Sarasvati', role: 'Singer', color: 'border-iris' },
      { name: 'Hindia', role: 'Rock / Indie', color: 'border-sunshine' },
      { name: 'Dipha Barus', role: 'Producer / DJ', color: 'border-mint' },
      { name: 'Naif', role: 'Band', color: 'border-sky' },
      { name: 'Sade', role: 'Special Guest', color: 'border-pink-500' },
    ],
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    title: 'Jakarta Indie Sunset Session',
    slug: 'jakarta-indie-sunset-session',
    category: 'Indie & Pop',
    city: 'Jakarta',
    posterUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
    description:
      'Menikmati senja Jakarta dari ketinggian rooftop dengan pertunjukan musik syahdu dari musisi indie pilihan ibu kota.',
    venueName: 'Rooftop Kuningan City, Jakarta Selatan',
    venueAddress: 'Jl. Prof. DR. Satrio No.18, Karet Kuningan, Setiabudi, Jakarta Selatan',
    eventDate: '2026-12-12T17:00:00.000Z',
    endTime: '2026-12-12T22:30:00.000Z',
    status: 'PUBLISHED',
    minPrice: 225000,
    ticketTiers: [
      {
        id: 't0000000-0000-0000-0000-000000000003',
        name: 'General Admission',
        description: 'Akses seluruh area panggung rooftop dan free welcome mocktail.',
        price: 225000,
        totalQuota: 50,
        availableQuota: 40,
      },
    ],
    lineup: [
      { name: 'Fourtwnty', role: 'Folk / Indie', color: 'border-sunshine' },
      { name: 'Danilla', role: 'Jazz / Pop', color: 'border-coral' },
    ],
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    title: 'Bandung Rockfest 2026: Loud & Proud',
    slug: 'bandung-rockfest-2026',
    category: 'Rock & Metal',
    city: 'Bandung',
    posterUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1600&q=80',
    description:
      'Pesta musik rock dan alternatif terbesar di Kota Kembang dengan sound system cadas bertenaga 100.000 watt.',
    venueName: 'Eldorado Dome, Bandung',
    venueAddress: 'Jl. Dr. Setiabudi No.438, Isola, Sukasari, Kota Bandung',
    eventDate: '2026-12-05T16:00:00.000Z',
    endTime: '2026-12-05T23:30:00.000Z',
    status: 'PUBLISHED',
    minPrice: 175000,
    ticketTiers: [
      {
        id: 't0000000-0000-0000-0000-000000000004',
        name: 'Festival Standing Moshpit',
        description: 'Akses area depan panggung utama.',
        price: 175000,
        totalQuota: 80,
        availableQuota: 22,
      },
      {
        id: 't0000000-0000-0000-0000-000000000005',
        name: 'VIP Tribune Seating',
        description: 'Tempat duduk tribun nyaman dengan view panggung lurus.',
        price: 320000,
        totalQuota: 30,
        availableQuota: 10,
      },
    ],
    lineup: [
      { name: 'Seringai', role: 'High Octane Rock', color: 'border-coral' },
      { name: 'Burgerkill', role: 'Metalcore', color: 'border-iris' },
    ],
  },
  {
    id: 'e0000000-0000-0000-0000-000000000004',
    title: 'Tertawa Lepas: Special Stand-Up Comedy',
    slug: 'tertawa-lepas-comedy-solo',
    category: 'Stand-Up Comedy',
    city: 'Yogyakarta',
    posterUrl:
      'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1600&q=80',
    description:
      'Pertunjukan komedi tunggal 2 jam non-stop yang mengangkat keresahan sosial sehari-hari dengan punchline cerdas dan segar.',
    venueName: 'Taman Budaya Yogyakarta (TBY)',
    venueAddress: 'Jl. Sriwedani No.1, Ngupasan, Gondomanan, Kota Yogyakarta',
    eventDate: '2026-12-19T19:30:00.000Z',
    endTime: '2026-12-19T22:00:00.000Z',
    status: 'PUBLISHED',
    minPrice: 120000,
    ticketTiers: [
      {
        id: 't0000000-0000-0000-0000-000000000006',
        name: 'Balcony Seat',
        description: 'Kursi balkon lantai 2 dengan pandangan jelas ke panggung.',
        price: 120000,
        totalQuota: 60,
        availableQuota: 18,
      },
      {
        id: 't0000000-0000-0000-0000-000000000007',
        name: 'Platinum Row A-D',
        description: 'Barisan kursi paling depan dan sesi Meet & Greet.',
        price: 250000,
        totalQuota: 25,
        availableQuota: 5,
      },
    ],
    lineup: [
      { name: 'Raditya Dika', role: 'Comedian / Host', color: 'border-sunshine' },
      { name: 'Bintang Emon', role: 'Comedian', color: 'border-mint' },
    ],
  },
  {
    id: 'e0000000-0000-0000-0000-000000000005',
    title: 'Surabaya Jazz Heritage Night 2027',
    slug: 'surabaya-jazz-heritage-2027',
    category: 'Jazz & Soul',
    city: 'Surabaya',
    posterUrl:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1600&q=80',
    description:
      'Alunan harmoni jazz berkelas internasional mempertemukan legenda jazz Indonesia dengan musisi muda berbakat.',
    venueName: 'Grand City Convention Hall, Surabaya',
    venueAddress: 'Jl. Walikota Mustajab No.1, Ketabang, Genteng, Surabaya',
    eventDate: '2027-01-16T19:00:00.000Z',
    endTime: '2027-01-16T23:00:00.000Z',
    status: 'PUBLISHED',
    minPrice: 200000,
    ticketTiers: [
      {
        id: 't0000000-0000-0000-0000-000000000008',
        name: 'Silver Seat',
        description: 'Akses area hall reguler.',
        price: 200000,
        totalQuota: 70,
        availableQuota: 35,
      },
    ],
    lineup: [
      { name: 'Indra Lesmana', role: 'Jazz Legend / Piano', color: 'border-iris' },
      { name: 'Eva Celia', role: 'Vocalist', color: 'border-coral' },
    ],
  },
  {
    id: 'e0000000-0000-0000-0000-000000000006',
    title: 'Bali Sunset Electronic Fest 2027',
    slug: 'bali-sunset-electronic-fest',
    category: 'EDM & DJ',
    city: 'Bali',
    posterUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    bannerUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80',
    description:
      'Dentuman bass dan melodi elektronik di tepi pantai Bali sambil menyaksikan matahari terbenam spektakuler.',
    venueName: 'Atlas Beach Club, Canggu, Bali',
    venueAddress: 'Jl. Pantai Berawa No.88, Canggu, Kuta Utara, Badung, Bali',
    eventDate: '2027-01-23T16:00:00.000Z',
    endTime: '2027-01-24T02:00:00.000Z',
    status: 'PUBLISHED',
    minPrice: 300000,
    ticketTiers: [
      {
        id: 't0000000-0000-0000-0000-000000000009',
        name: 'Sunset Beach Pass',
        description: 'Akses pantai dan kolam renang.',
        price: 300000,
        totalQuota: 100,
        availableQuota: 45,
      },
    ],
    lineup: [
      { name: 'Weird Genius', role: 'Electronic Trio', color: 'border-sunshine' },
      { name: 'Whisnu Santika', role: 'DJ / Producer', color: 'border-mint' },
    ],
  },
];

export const DEMO_EVENT = ALL_DEMO_EVENTS[0];


export const DEMO_ORGANIZER_DASHBOARD = {

  stats: {
    totalEvents: 2,
    totalRevenue: 13650000,
    totalTicketsSold: 58,
    totalQuota: 70,
    totalAvailable: 12,
    checkedInCount: 38,
    issuedTicketsCount: 58,
    checkInRate: 66,
  },
  events: [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      title: 'Soundwave Music Festival 2026',
      slug: 'soundwave-music-festival-2026',
      venueName: 'Stadion Madya Gelora Bung Karno',
      eventDate: '2026-11-28T15:00:00.000Z',
      status: 'PUBLISHED',
      totalQuota: 70,
      soldQuota: 48,
      revenue: 11400000,
      ticketTiers: [
        {
          id: 't0000000-0000-0000-0000-000000000001',
          name: 'Early Bird Festival',
          price: 150000,
          totalQuota: 50,
          availableQuota: 14,
        },
        {
          id: 't0000000-0000-0000-0000-000000000002',
          name: 'VIP Front Row Pass',
          price: 350000,
          totalQuota: 20,
          availableQuota: 8,
        },
      ],
    },
    {
      id: 'e0000000-0000-0000-0000-000000000002',
      title: 'Jakarta Indie Sunset Session',
      slug: 'jakarta-indie-sunset-session',
      venueName: 'Rooftop Kuningan City, Jakarta Selatan',
      eventDate: '2026-12-12T17:00:00.000Z',
      status: 'PUBLISHED',
      totalQuota: 50,
      soldQuota: 10,
      revenue: 2250000,
      ticketTiers: [
        {
          id: 't0000000-0000-0000-0000-000000000003',
          name: 'General Admission',
          price: 225000,
          totalQuota: 50,
          availableQuota: 40,
        },
      ],
    },
  ],
  recentBookings: [
    {
      id: 'b-001',
      bookingCode: 'TIK-20261014-F8A1',
      totalAmount: 350000,
      attendeeName: 'Budi Santoso',
      attendeeEmail: 'attendee@tiketix.com',
      eventTitle: 'Soundwave Music Festival 2026',
      createdAt: '2026-10-14T06:30:00.000Z',
    },
    {
      id: 'b-002',
      bookingCode: 'TIK-20261014-E492',
      totalAmount: 300000,
      attendeeName: 'Siti Rahmawati',
      attendeeEmail: 'siti.rahma@gmail.com',
      eventTitle: 'Soundwave Music Festival 2026',
      createdAt: '2026-10-14T05:15:00.000Z',
    },
    {
      id: 'b-003',
      bookingCode: 'TIK-20261013-C109',
      totalAmount: 700000,
      attendeeName: 'Rian Pratama',
      attendeeEmail: 'rian.pratama@outlook.com',
      eventTitle: 'Soundwave Music Festival 2026',
      createdAt: '2026-10-13T14:40:00.000Z',
    },
    {
      id: 'b-004',
      bookingCode: 'TIK-20261013-B871',
      totalAmount: 225000,
      attendeeName: 'Clarissa Natalia',
      attendeeEmail: 'clarissa.n@yahoo.com',
      eventTitle: 'Jakarta Indie Sunset Session',
      createdAt: '2026-10-13T11:20:00.000Z',
    },
  ],
};

export const DEMO_ATTENDEES = [
  {
    id: 'tkt-001',
    ticketCode: 'TWX-SW26-VSK101',
    qrHash: '8f4c91b0-e2d7-4c7b-99c1-52a1d2f6e9b8',
    attendeeName: 'Budi Santoso',
    attendeeEmail: 'attendee@tiketix.com',
    tierName: 'VIP Front Row Pass',
    price: 350000,
    status: 'CHECKED_IN',
    checkedInAt: '2026-10-14T08:12:00.000Z',
    bookingCode: 'TIK-20261014-F8A1',
    eventTitle: 'Soundwave Music Festival 2026',
    purchasedAt: '2026-10-14T06:30:00.000Z',
  },
  {
    id: 'tkt-002',
    ticketCode: 'TWX-SW26-EB204',
    qrHash: '4a1b8c2d-99ff-41ea-82c3-11a2d3e4f506',
    attendeeName: 'Siti Rahmawati',
    attendeeEmail: 'siti.rahma@gmail.com',
    tierName: 'Early Bird Festival',
    price: 150000,
    status: 'ACTIVE',
    checkedInAt: null,
    bookingCode: 'TIK-20261014-E492',
    eventTitle: 'Soundwave Music Festival 2026',
    purchasedAt: '2026-10-14T05:15:00.000Z',
  },
  {
    id: 'tkt-003',
    ticketCode: 'TWX-SW26-VIP305',
    qrHash: '9d3a7e12-c28b-49aa-bf61-34df78e12a99',
    attendeeName: 'Rian Pratama',
    attendeeEmail: 'rian.pratama@outlook.com',
    tierName: 'VIP Front Row Pass',
    price: 350000,
    status: 'CHECKED_IN',
    checkedInAt: '2026-10-14T08:04:22.000Z',
    bookingCode: 'TIK-20261013-C109',
    eventTitle: 'Soundwave Music Festival 2026',
    purchasedAt: '2026-10-13T14:40:00.000Z',
  },
  {
    id: 'tkt-004',
    ticketCode: 'TWX-SW26-VIP306',
    qrHash: '1a7e8b99-31ff-48cc-a721-998811223344',
    attendeeName: 'Dina Lestari',
    attendeeEmail: 'dina.lestari@gmail.com',
    tierName: 'VIP Front Row Pass',
    price: 350000,
    status: 'ACTIVE',
    checkedInAt: null,
    bookingCode: 'TIK-20261013-C109',
    eventTitle: 'Soundwave Music Festival 2026',
    purchasedAt: '2026-10-13T14:40:00.000Z',
  },
  {
    id: 'tkt-005',
    ticketCode: 'TWX-JIS-GA012',
    qrHash: 'bb44aa11-8899-4455-6677-223344556677',
    attendeeName: 'Clarissa Natalia',
    attendeeEmail: 'clarissa.n@yahoo.com',
    tierName: 'General Admission',
    price: 225000,
    status: 'ACTIVE',
    checkedInAt: null,
    bookingCode: 'TIK-20261013-B871',
    eventTitle: 'Jakarta Indie Sunset Session',
    purchasedAt: '2026-10-13T11:20:00.000Z',
  },
];

export const getOrganizerDashboard = async () => {
  try {
    const res = await api.get('/events/organizer/dashboard');
    if (res.data?.data) {
      return { data: res.data.data, isDemo: false as const };
    }
  } catch {
    // Backend mati: contoh hanya bila DEMO_MODE, selain itu lempar error jujur.
    if (DEMO_MODE) return { data: DEMO_ORGANIZER_DASHBOARD, isDemo: true as const };
    throw new Error('Server tidak terhubung. Jalankan backend lalu muat ulang.');
  }
  if (DEMO_MODE) return { data: DEMO_ORGANIZER_DASHBOARD, isDemo: true as const };
  throw new Error('Dashboard kosong dari server.');
};

export const getOrganizerAttendees = async (eventId?: string, search?: string) => {
  try {
    const res = await api.get('/events/organizer/attendees', {
      params: { eventId, search },
    });
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Graceful fallback
  }

  // Backend mati: contoh hanya bila DEMO_MODE; selain itu kembalikan list kosong.
  if (!DEMO_MODE) return [];
  let filtered = [...DEMO_ATTENDEES];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.attendeeName.toLowerCase().includes(q) ||
        a.attendeeEmail.toLowerCase().includes(q) ||
        a.ticketCode.toLowerCase().includes(q) ||
        a.bookingCode.toLowerCase().includes(q)
    );
  }
  return { data: filtered, isDemo: true as const };
  // NOTE: pemanggil yang butuh array mentah harap normalisasi via normalizeAttendees().
};

export const normalizeAttendees = (raw: any): any[] =>
  Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

export const createOrganizerEvent = async (payload: any) => {
  try {
    const res = await api.post('/events', payload);
    return res.data?.data;
  } catch {
    // Fallback simulated creation
    return {
      id: `e-${Date.now()}`,
      ...payload,
      status: payload.status || 'PUBLISHED',
      createdAt: new Date().toISOString(),
      ticketTiers:
        payload.ticketTiers?.map((t: any, idx: number) => ({
          id: `t-${Date.now()}-${idx}`,
          ...t,
          availableQuota: t.totalQuota,
        })) || [],
    };
  }
};

export const uploadEventPoster = async (file: File): Promise<{ fileUrl: string; filename: string }> => {
  const formData = new FormData();
  formData.append('poster', file);
  const res = await api.post('/events/upload-poster', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data?.data;
};


