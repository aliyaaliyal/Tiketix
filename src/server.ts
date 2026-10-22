import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { BookingExpiryWorker } from './jobs/expiryWorker';

async function bootstrap() {
  const app = createApp();

  const expiryWorker = new BookingExpiryWorker(30000); // Check every 30s
  expiryWorker.start();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Tiketix Backend Server is running on http://localhost:${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 API Base URL: http://localhost:${env.PORT}/api/v1`);
    console.log(`📑 Swagger API Docs: http://localhost:${env.PORT}/api-docs`);
    console.log(`💓 Health Check: http://localhost:${env.PORT}/health`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    expiryWorker.stop();
    server.close(async () => {
      console.log('HTTP server closed.');
      await prisma.$disconnect();
      console.log('Prisma database client disconnected.');
      process.exit(0);
    });

    // Force exit after 10s if hanging
    setTimeout(() => {
      console.error('⚠️ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
