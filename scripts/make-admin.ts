/**
 * Script to promote a user to ADMIN role.
 * Usage: npx ts-node scripts/make-admin.ts <email>
 * 
 * This script should only be run by developers with direct database access.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx ts-node scripts/make-admin.ts <email>');
    console.error('Example: npx ts-node scripts/make-admin.ts admin@example.com');
    process.exit(1);
  }

  const trimmedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: trimmedEmail },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${trimmedEmail}`);
    process.exit(1);
  }

  if (user.role === 'ADMIN') {
    console.log(`✅ User ${user.email} is already an ADMIN`);
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, name: true, role: true },
  });

  console.log(`✅ Successfully promoted user to ADMIN:`);
  console.log(`   Email: ${updated.email}`);
  console.log(`   Name: ${updated.name}`);
  console.log(`   Role: ${updated.role}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
