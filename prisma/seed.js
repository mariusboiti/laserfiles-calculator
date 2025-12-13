const fs = require('fs');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function readSchema() {
  const schemaPath = path.join(__dirname, 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const userModelMatch = schema.match(/model\s+User\s*\{([\s\S]*?)\n\}/m);
  if (!userModelMatch) {
    throw new Error('Could not find `model User { ... }` in prisma/schema.prisma');
  }

  const userBlock = userModelMatch[1];
  const fieldLines = userBlock
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//'));

  const fields = fieldLines
    .map((l) => l.split(/\s+/)[0])
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));

  const roleEnumMatch = schema.match(/enum\s+UserRole\s*\{([\s\S]*?)\n\}/m);
  const roleValues = roleEnumMatch
    ? roleEnumMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//'))
    : [];

  return {
    userModelName: 'User',
    userFields: fields,
    userRoleEnumValues: roleValues,
  };
}

function getEnv(name, fallback) {
  const v = process.env[name];
  return v && String(v).trim().length > 0 ? String(v).trim() : fallback;
}

async function upsertUser(prisma, { email, password, name, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      name,
      role,
    },
    create: {
      email,
      password: passwordHash,
      name,
      role,
    },
  });

  return user;
}

async function main() {
  const { userFields, userRoleEnumValues } = readSchema();

  const requiredFields = ['email', 'password', 'name'];
  for (const f of requiredFields) {
    if (!userFields.includes(f)) {
      throw new Error(`Prisma schema User model is missing required field: ${f}`);
    }
  }

  if (!userFields.includes('role')) {
    throw new Error('Prisma schema User model is missing required field: role');
  }

  const adminRole = userRoleEnumValues.includes('ADMIN') ? 'ADMIN' : userRoleEnumValues[0];
  const workerRole = userRoleEnumValues.includes('WORKER') ? 'WORKER' : userRoleEnumValues[0];
  if (!adminRole || !workerRole) {
    throw new Error('Could not determine UserRole enum values from schema.prisma');
  }

  const adminEmail = getEnv('SEED_ADMIN_EMAIL', 'admin@example.com');
  const adminPassword = getEnv('SEED_ADMIN_PASSWORD', 'admin123');
  const workerEmail = getEnv('SEED_WORKER_EMAIL', 'worker@example.com');
  const workerPassword = getEnv('SEED_WORKER_PASSWORD', 'worker123');

  const prisma = new PrismaClient();
  try {
    const admin = await upsertUser(prisma, {
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      role: adminRole,
    });

    const worker = await upsertUser(prisma, {
      email: workerEmail,
      password: workerPassword,
      name: 'Worker User',
      role: workerRole,
    });

    // eslint-disable-next-line no-console
    console.log(`[seed] Upserted users:`);
    // eslint-disable-next-line no-console
    console.log(`- ${admin.email} (${admin.role})`);
    // eslint-disable-next-line no-console
    console.log(`- ${worker.email} (${worker.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed:', err);
  process.exitCode = 1;
});
