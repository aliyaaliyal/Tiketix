const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', '.pgdata');
const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  persistent: true,
});

async function main() {
  try {
    if (!fs.existsSync(dbDir)) {
      console.log('📦 Inisialisasi cluster PostgreSQL...');
      await pg.initialise();
    }
    console.log('🐘 Menjalankan server PostgreSQL di port 5432...');
    await pg.start();
    console.log('✅ PostgreSQL aktif dan siap menerima koneksi di port 5432!');

    try {
      await pg.createDatabase('tiketix_db');
      console.log('✅ Database tiketix_db siap digunakan.');
    } catch {
      // Database sudah ada
    }
  } catch (error) {
    console.error('❌ Gagal menjalankan PostgreSQL:', error.message);
  }
}

main();

process.on('SIGINT', async () => {
  console.log('\n🛑 Menghentikan server PostgreSQL...');
  try {
    await pg.stop();
  } catch {}
  process.exit(0);
});
