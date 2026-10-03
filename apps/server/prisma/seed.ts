import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo users...');
  
  await prisma.user.upsert({
    where: { username: 'instructor' },
    update: {},
    create: {
      username: 'instructor',
      password: 'password123', // In a real app, hash this!
      role: 'INSTRUCTOR',
    },
  });

  await prisma.user.upsert({
    where: { username: 'trainee1' },
    update: {},
    create: {
      username: 'trainee1',
      password: 'password123',
      role: 'TRAINEE',
    },
  });

  await prisma.user.upsert({
    where: { username: 'trainee2' },
    update: {},
    create: {
      username: 'trainee2',
      password: 'password123',
      role: 'TRAINEE',
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
