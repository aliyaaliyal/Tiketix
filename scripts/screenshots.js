const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const shot = (p) => page.screenshot({ path: p });

  // 1. LOGIN
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot('docs/login.png');
  console.log('OK login.png');

  // 2. Login sebagai ATTENDEE via tombol demo
  const demoBtns = page.getByRole('button', { name: /Penonton \(Demo\)/i });
  if ((await demoBtns.count()) > 0) {
    await demoBtns.first().click();
    await page.waitForTimeout(2500);
  }

  // 3. HOME (beranda katalog)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot('docs/home.png');
  console.log('OK home.png');

  // 4. CHECKOUT — booking PENDING dari demo:reset, buat intent QRIS
  // Ambil bookingCode PENDING terbaru via API dengan login langsung
  const loginRes = await page.request.post('http://localhost:5000/api/v1/auth/login', {
    data: { email: 'attendee@tiketix.com', password: 'Password123!' },
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.token;
  const bookingsRes = await page.request.get('http://localhost:5000/api/v1/bookings?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bookingsJson = await bookingsRes.json();
  const rows = bookingsJson?.data || [];
  const pending = rows.find((b) => b.status === 'PENDING' && String(b.bookingCode).startsWith('TIK-DEMO-PAY'));
  const bookingCode = pending?.bookingCode;
  console.log('PENDING booking:', bookingCode);
  if (!bookingCode) throw new Error('Tidak ada booking PENDING demo (jalankan npm run demo:reset)');

  // Pastikan token tersimpan agar CheckoutPage guard lolos
  await page.evaluate((t) => localStorage.setItem('tiketix_token', t), token);
  await page.goto(`http://localhost:5173/checkout/${bookingCode}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Isi nama bila kosong lalu buat tagihan QRIS
  const nameInput = page.locator('input').first();
  if ((await nameInput.count()) > 0) {
    const v = await nameInput.inputValue().catch(() => '');
    if (!v) await nameInput.fill('Budi Santoso');
  }
  const qrisLabel = page.locator('text=QRIS Instan').first();
  if ((await qrisLabel.count()) > 0) await qrisLabel.click();
  const intentBtn = page.getByRole('button', { name: /Buat Tagihan/i });
  if ((await intentBtn.count()) > 0) {
    await intentBtn.first().click();
    await page.waitForTimeout(3000);
  }
  await shot('docs/checkout.png');
  console.log('OK checkout.png');

  // 5. TIKET SAYA — bayar booking PENDING lain tidak perlu; pakai tiket dari booking PAID
  await page.goto('http://localhost:5173/my-tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot('docs/tickets.png');
  console.log('OK tickets.png');

  // 6. DASHBOARD EO — login sebagai organizer.
  // Catatan: AuthContext baca localStorage saat init, jadi set token+user
  // DULU lalu reload, baru buka /organizer (kalau tidak, guard melempar ke /).
  const orgLogin = await page.request.post('http://localhost:5000/api/v1/auth/login', {
    data: { email: 'organizer@tiketix.com', password: 'Password123!' },
  });
  const orgJson = (await orgLogin.json())?.data;
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem('tiketix_token', t);
      localStorage.setItem('tiketix_user', JSON.stringify(u));
    },
    { t: orgJson.token, u: orgJson.user }
  );
  await page.goto('http://localhost:5173/organizer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // Pastikan benar-benar dashboard (bukan redirect ke home)
  const url = page.url();
  console.log('dashboard URL:', url);
  if (!url.includes('/organizer')) throw new Error('Gagal masuk dashboard EO: ' + url);
  await shot('docs/dashboard.png');
  console.log('OK dashboard.png');

  // 7. SCANNER — kondisi kamera mati (headless tidak punya kamera).
  // Foto kondisi idle + panel input manual; kamera asli dicoba di laptop并茂实.
  await page.goto('http://localhost:5173/scanner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot('docs/scanner.png');
  console.log('OK scanner.png');

  await browser.close();
  console.log('DONE');
})().catch((e) => {
  console.error('SHOT FAILED:', e.message);
  process.exit(1);
});
