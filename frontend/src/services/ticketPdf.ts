import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface TicketPdfData {
  ticketCode: string;
  qrHash: string;
  tierName: string;
  eventTitle: string;
  attendeeName: string;
  eventDate: string;
  venue: string;
  gate: string;
  seat?: string;
  status?: string;
}

export async function generateTicketPdf(ticket: TicketPdfData): Promise<void> {
  // A5 dimensions in mm: 148 x 210
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 128 mm

  // 1. Background Canvas
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, 148, 210, 'F');

  // 2. Main Ticket Card Box
  const cardX = margin;
  const cardY = 12;
  const cardHeight = 186;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, contentWidth, cardHeight, 6, 6, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(cardX, cardY, contentWidth, cardHeight, 6, 6, 'S');

  // 3. Header Banner (Coral Gradient simulation)
  doc.setFillColor(255, 91, 55); // #FF5B37 Coral
  doc.roundedRect(cardX, cardY, contentWidth, 38, 6, 6, 'F');
  // Fill square corners at bottom of header banner
  doc.rect(cardX, cardY + 28, contentWidth, 10, 'F');

  // Brand Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TIKETIX • OFFICIAL LIVE PASS', cardX + 8, cardY + 10);

  // Event Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const eventTitleLines = doc.splitTextToSize(ticket.eventTitle.toUpperCase(), contentWidth - 16);
  doc.text(eventTitleLines, cardX + 8, cardY + 18);

  // Tier Name
  doc.setFontSize(10);
  doc.setTextColor(255, 237, 160); // light sunshine gold
  doc.text(`★ ${ticket.tierName.toUpperCase()} ★`, cardX + 8, cardY + 32);

  // 4. Perforation Line with Side Notches
  const perfY = cardY + 38;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineDashPattern([2, 2], 0);
  doc.line(cardX + 4, perfY, cardX + contentWidth - 4, perfY);
  doc.setLineDashPattern([], 0); // reset

  // Notch circles
  doc.setFillColor(248, 250, 252);
  doc.circle(cardX, perfY, 4, 'F');
  doc.circle(cardX + contentWidth, perfY, 4, 'F');

  // 5. Ticket Details Body
  let cursorY = perfY + 12;

  // Attendee Name & Status
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('NAMA PESERTA / ATTENDEE', cardX + 8, cursorY);
  doc.text('STATUS TIKET', cardX + contentWidth - 40, cursorY);

  cursorY += 5;
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(ticket.attendeeName, cardX + 8, cursorY);

  // Status Badge
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(cardX + contentWidth - 42, cursorY - 4, 34, 6, 2, 2, 'F');
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(ticket.status === 'CHECKED_IN' ? 'CHECKED-IN ✓' : 'VERIFIED ACTIVE', cardX + contentWidth - 40, cursorY);

  // Event Date & Gate
  cursorY += 10;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text('WAKTU & TANGGAL ACARA', cardX + 8, cursorY);
  doc.text('PINTU GERBANG (GATE)', cardX + 75, cursorY);

  cursorY += 5;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const dateLines = doc.splitTextToSize(ticket.eventDate, 62);
  doc.text(dateLines, cardX + 8, cursorY);

  doc.text(ticket.gate, cardX + 75, cursorY);

  // Venue Location
  cursorY += 12;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text('LOKASI VENUE', cardX + 8, cursorY);

  cursorY += 5;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const venueLines = doc.splitTextToSize(ticket.venue, contentWidth - 16);
  doc.text(venueLines, cardX + 8, cursorY);

  // 6. QR Code Section
  cursorY += 12;
  const qrBoxY = cursorY;
  const qrBoxHeight = 58;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(cardX + 8, qrBoxY, contentWidth - 16, qrBoxHeight, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(cardX + 8, qrBoxY, contentWidth - 16, qrBoxHeight, 4, 4, 'S');

  // Generate high-resolution QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(ticket.qrHash, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
    // Draw QR code centered in box
    const qrSize = 38;
    const qrX = cardX + (contentWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrBoxY + 3, qrSize, qrSize);
  } catch (err) {
    console.error('Failed to render QR Code into PDF:', err);
  }

  // Ticket Code underneath QR
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(ticket.ticketCode, cardX + contentWidth / 2, qrBoxY + 46, { align: 'center' });

  // QR Hash truncated
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6);
  doc.setFont('courier', 'normal');
  doc.text(ticket.qrHash, cardX + contentWidth / 2, qrBoxY + 52, { align: 'center' });

  // 7. Security & Verification Notice Footer
  const footerY = cardY + cardHeight - 22;
  doc.setDrawColor(241, 245, 249);
  doc.line(cardX + 8, footerY, cardX + contentWidth - 8, footerY);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    '• Tunjukkan e-tiket ini dalam bentuk cetak atau layar ponsel di meja registrasi gate masuk.',
    cardX + 8,
    footerY + 5
  );
  doc.text(
    '• Tiket ini hanya berlaku untuk 1 (satu) kali pemindaian masuk contactless check-in.',
    cardX + 8,
    footerY + 9
  );
  doc.text(
    `• Diterbitkan secara resmi oleh Sistem Tiketix pada ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
    cardX + 8,
    footerY + 13
  );

  // Save the PDF directly to user's device
  const filename = `Tiketix_${ticket.ticketCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}
