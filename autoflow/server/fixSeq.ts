import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`SELECT setval('"User_userId_seq"', COALESCE((SELECT MAX("userId") + 1 FROM "User"), 1), false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Task_id_seq"', COALESCE((SELECT MAX("id") + 1 FROM "Task"), 1), false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Project_id_seq"', COALESCE((SELECT MAX("id") + 1 FROM "Project"), 1), false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Team_id_seq"', COALESCE((SELECT MAX("id") + 1 FROM "Team"), 1), false);`);
    await prisma.$executeRawUnsafe(`SELECT setval('"Notification_id_seq"', COALESCE((SELECT MAX("id") + 1 FROM "Notification"), 1), false);`);
    console.log('✅ Database sequences successfully resynchronized!');
  } catch (error) {
    console.error('Error syncing sequences:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
