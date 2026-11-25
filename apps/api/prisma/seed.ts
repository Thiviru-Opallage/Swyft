import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();
async function main() {
  const ownerEmail = process.env.ADMIN_EMAIL;
  const ownerPassword = process.env.ADMIN_PASSWORD;
  if (!ownerEmail || !ownerPassword || ownerPassword.length < 8) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in apps/api/.env');
  await prisma.user.upsert({ where: { email: ownerEmail.toLowerCase() }, update: { name: 'Owner', role: Role.OWNER, passwordHash: await argon2.hash(ownerPassword) }, create: { name: 'Owner', email: ownerEmail.toLowerCase(), role: Role.OWNER, passwordHash: await argon2.hash(ownerPassword) } });
  for (const [index, service] of [
    { name: 'Signature cut', description: 'A considered cut, shaped to your hair and daily routine.', durationMinutes: 60, priceCents: 650000 },
    { name: 'Colour consultation', description: 'Plan your next colour with a stylist before committing.', durationMinutes: 30, priceCents: 300000 },
    { name: 'Wash & finish', description: 'A fresh wash and polished finish for the day ahead.', durationMinutes: 45, priceCents: 450000 },
    { name: 'Scalp ritual', description: 'A restorative treatment with time to slow down.', durationMinutes: 60, priceCents: 750000 }
  ].entries()) {
    const existing = await prisma.service.findFirst({ where: { name: service.name } });
    if (!existing) await prisma.service.create({ data: { ...service, sortOrder: index } });
  }
  if (!(await prisma.staff.count())) await prisma.staff.createMany({ data: [{ name: 'Amara' }, { name: 'Maya' }] });
}
main().then(() => prisma.$disconnect()).catch(async error => { console.error(error); await prisma.$disconnect(); process.exit(1); });
