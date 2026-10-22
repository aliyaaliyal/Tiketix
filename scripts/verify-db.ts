import { prisma } from '../src/config/database';

async function verify() {
  console.log('🔍 Checking database contents...\n');

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  console.log('👥 USERS IN DATABASE:');
  console.table(users);

  const events = await prisma.event.findMany({
    include: {
      ticketTiers: true,
      organizer: { select: { name: true, email: true } },
    },
  });
  console.log('\n🎪 EVENTS IN DATABASE:');
  for (const ev of events) {
    console.log(`- ${ev.title} (Slug: ${ev.slug}) | Organizer: ${ev.organizer.name}`);
    console.log('  Tiers:');
    for (const tier of ev.ticketTiers) {
      console.log(
        `    * ${tier.name}: Price: Rp ${Number(tier.price).toLocaleString()} | Available Quota: ${tier.availableQuota}/${tier.totalQuota}`
      );
    }
  }

  await prisma.$disconnect();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
