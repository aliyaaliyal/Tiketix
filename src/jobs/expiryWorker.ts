import { BookingRepository } from '../modules/booking/booking.repository';

export class BookingExpiryWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly bookingRepository: BookingRepository;

  constructor(private readonly intervalMs: number = 30000) {
    this.bookingRepository = new BookingRepository();
  }

  start(): void {
    if (this.timer) {
      return;
    }

    console.log(`⏱️ Booking Expiry Worker started (interval: ${this.intervalMs / 1000}s)`);

    // Initial check shortly after bootstrap
    setTimeout(() => {
      this.tick();
    }, 2000);

    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 Booking Expiry Worker stopped.');
    }
  }

  private async tick(): Promise<void> {
    if (this.isRunning) {
      return; // Prevent concurrent overlapping executions
    }

    this.isRunning = true;
    try {
      const expiredCount = await this.bookingRepository.expireOverdueBookings(50);
      if (expiredCount > 0) {
        console.log(
          `♻️ [ExpiryWorker] Expired ${expiredCount} overdue booking(s) and restored ticket quotas.`
        );
      }
    } catch (error: any) {
      console.error('❌ [ExpiryWorker] Error running expiration cycle:', error.message);
    } finally {
      this.isRunning = false;
    }
  }
}
