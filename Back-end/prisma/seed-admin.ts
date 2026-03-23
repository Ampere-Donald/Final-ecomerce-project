/**
 * Seed script to create the first admin user.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@newoteg.com ADMIN_PASSWORD=YourStrongPassword123 npx tsx prisma/seed-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nom = process.env.ADMIN_NOM || 'Admin';

  if (!email || !password) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables.');
    console.error('Usage: ADMIN_EMAIL=xxx ADMIN_PASSWORD=xxx npx tsx prisma/seed-admin.ts');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await prisma.adminUser.count();
  if (existing > 0) {
    console.log(`${existing} admin user(s) already exist. Skipping seed.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.create({
    data: {
      email,
      motDePasse: hashedPassword,
      nom,
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`First admin created successfully:`);
  console.log(`  ID:    ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Role:  ${admin.role}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
