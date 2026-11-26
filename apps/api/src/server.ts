import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, BookingStatus, Role } from '@prisma/client';
import { DateTime } from 'luxon';
import { z } from 'zod';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { hours, isWithinBusinessHours, overlaps, startFor } from './booking-policy';

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT || 4000);
const zone = process.env.BUSINESS_TIMEZONE || 'Asia/Colombo';
const businessName = process.env.BUSINESS_NAME || 'Atelier Salon';
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) throw new Error('JWT_SECRET must have at least 32 characters');

app.use(express.json({ limit: '32kb' }));
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',') }));

type AuthedRequest = Request & { auth?: { id: string; role: Role } };
const publicUser = (user: { id: string; name: string; email: string; role: Role }) => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const tokenHash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const accessToken = (user: { id: string; role: Role }) => jwt.sign({ role: user.role }, jwtSecret, { subject: user.id, expiresIn: '15m' });
async function createSession(user: { id: string; role: Role }) {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  await prisma.session.create({ data: { userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
  return { accessToken: accessToken(user), refreshToken };
}
function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) { res.status(401).json({ error: 'Sign in to continue' }); return; }
  try {
    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    if (!decoded.sub || ![Role.CUSTOMER, Role.OWNER].includes(decoded.role)) throw new Error('Invalid token');
    req.auth = { id: decoded.sub, role: decoded.role };
    next();
  } catch { res.status(401).json({ error: 'Your session expired. Sign in again' }); }
}
function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.auth?.role !== Role.OWNER) { res.status(403).json({ error: 'Owner access required' }); return; }
  next();
}
const email = z.string().trim().email().transform(v => v.toLowerCase());
const password = z.string().min(8).max(128);
const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email, password });
const loginSchema = z.object({ email, password: z.string() });
const bookingSchema = z.object({ serviceId: z.string().min(1), staffId: z.string().min(1), startsAt: z.string().datetime({ offset: true }) });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bookingInclude = { service: true, staff: true } as const;
function mapBooking(booking: any) {
  return { id: booking.id, startsAt: booking.startsAt, endsAt: booking.endsAt, status: booking.status, service: booking.service, staff: booking.staff, customer: booking.user ? publicUser(booking.user) : undefined };
}
async function upsertReminders(tx: any, bookingId: string, startsAt: Date) {
  await tx.reminder.deleteMany({ where: { bookingId } });
  const now = Date.now();
  const data = [1440, 60].map(offsetMin => ({ bookingId, offsetMin, dueAt: new Date(startsAt.getTime() - offsetMin * 60_000) })).filter(item => item.dueAt.getTime() > now);
  if (data.length) await tx.reminder.createMany({ data });
}
async function assertBookable(tx: any, staffId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
  // Resource-level transaction lock serializes competing bookings, including reschedules.
  // Select an integer so Prisma does not try to deserialize PostgreSQL's void lock result.
  await tx.$queryRaw`SELECT 1::integer AS acquired FROM pg_advisory_xact_lock(hashtext(${staffId}))`;
  const conflict = await tx.booking.findFirst({ where: { staffId, status: BookingStatus.CONFIRMED, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) } });
  if (conflict) throw Object.assign(new Error('That time is no longer available'), { status: 409 });
}

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/config', (_req, res) => res.json({ businessName, timezone: zone, openingHour: hours.start, closingHour: hours.end, closedDays: hours.closedDays }));

app.post('/auth/register', async (req, res) => {
  const parsed = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) return res.status(409).json({ error: 'An account already uses this email' });
  const user = await prisma.user.create({ data: { name: parsed.name, email: parsed.email, passwordHash: await argon2.hash(parsed.password) } });
  res.status(201).json({ user: publicUser(user), ...(await createSession(user)) });
});
app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!user || !(await argon2.verify(user.passwordHash, parsed.password))) return res.status(401).json({ error: 'Incorrect email or password' });
  res.json({ user: publicUser(user), ...(await createSession(user)) });
});
app.post('/auth/refresh', async (req, res) => {
  const parsed = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  const session = await prisma.session.findUnique({ where: { tokenHash: tokenHash(parsed.refreshToken) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return res.status(401).json({ error: 'Session expired' });
  const result = await prisma.$transaction(async tx => {
    await tx.session.delete({ where: { id: session.id } });
    const newToken = crypto.randomBytes(48).toString('base64url');
    await tx.session.create({ data: { userId: session.userId, tokenHash: tokenHash(newToken), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    return newToken;
  });
  res.json({ user: publicUser(session.user), accessToken: accessToken(session.user), refreshToken: result });
});
app.post('/auth/logout', async (req, res) => {
  const parsed = z.object({ refreshToken: z.string() }).parse(req.body);
  await prisma.session.deleteMany({ where: { tokenHash: tokenHash(parsed.refreshToken) } });
  res.status(204).end();
});

app.get('/services', async (_req, res) => res.json(await prisma.service.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })));
app.get('/staff', async (_req, res) => res.json(await prisma.staff.findMany({ where: { active: true }, orderBy: { name: 'asc' } })));
app.get('/availability', async (req, res) => {
  const parsed = z.object({ date: dateSchema, serviceId: z.string(), staffId: z.string() }).parse(req.query);
  const [service, staff] = await Promise.all([prisma.service.findUnique({ where: { id: parsed.serviceId } }), prisma.staff.findUnique({ where: { id: parsed.staffId } })]);
  if (!service?.active || !staff?.active) return res.status(404).json({ error: 'Service or staff member not found' });
  const opening = startFor(parsed.date, hours.start, 0, zone);
  if (!opening.isValid) return res.status(400).json({ error: 'Invalid date' });
  const closing = startFor(parsed.date, hours.end, 0, zone);
  const booked = await prisma.booking.findMany({ where: { staffId: staff.id, status: BookingStatus.CONFIRMED, startsAt: { lt: closing.toJSDate() }, endsAt: { gt: opening.toJSDate() } } });
  const slots = [];
  for (let cursor = opening; cursor.plus({ minutes: service.durationMinutes }) <= closing; cursor = cursor.plus({ minutes: 30 })) {
    if (!isWithinBusinessHours(cursor, service.durationMinutes, zone)) continue;
    if (cursor.toMillis() < Date.now() + 60 * 60 * 1000) continue;
    const end = cursor.plus({ minutes: service.durationMinutes });
    slots.push({ startsAt: cursor.toUTC().toISO(), label: cursor.toFormat('h:mm a'), available: !booked.some(b => overlaps(b.startsAt, b.endsAt, cursor.toJSDate(), end.toJSDate())) });
  }
  res.json({ date: parsed.date, timezone: zone, slots });
});

app.get('/bookings', requireAuth, async (req: AuthedRequest, res) => {
  const bookings = await prisma.booking.findMany({ where: { userId: req.auth!.id }, include: bookingInclude, orderBy: { startsAt: 'desc' } });
  res.json(bookings.map(mapBooking));
});
app.post('/bookings', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = bookingSchema.parse(req.body);
  const [service, staff] = await Promise.all([prisma.service.findUnique({ where: { id: parsed.serviceId } }), prisma.staff.findUnique({ where: { id: parsed.staffId } })]);
  if (!service?.active || !staff?.active) return res.status(404).json({ error: 'Service or staff member not found' });
  const start = DateTime.fromISO(parsed.startsAt);
  if (!start.isValid || start.toMillis() < Date.now() + 60 * 60 * 1000 || !isWithinBusinessHours(start, service.durationMinutes, zone)) return res.status(400).json({ error: 'Choose an available time at least one hour ahead' });
  const startsAt = start.toJSDate();
  const endsAt = start.plus({ minutes: service.durationMinutes }).toJSDate();
  const booking = await prisma.$transaction(async tx => {
    await assertBookable(tx, staff.id, startsAt, endsAt);
    const created = await tx.booking.create({ data: { userId: req.auth!.id, serviceId: service.id, staffId: staff.id, startsAt, endsAt }, include: bookingInclude });
    await upsertReminders(tx, created.id, startsAt);
    return created;
  });
  res.status(201).json(mapBooking(booking));
});
app.post('/bookings/:id/cancel', requireAuth, async (req: AuthedRequest, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id as string } });
  if (!booking || booking.userId !== req.auth!.id) return res.status(404).json({ error: 'Appointment not found' });
  if (booking.status !== BookingStatus.CONFIRMED || booking.startsAt < new Date()) return res.status(400).json({ error: 'This appointment can no longer be cancelled' });
  const changed = await prisma.$transaction(async tx => {
    const item = await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELLED }, include: bookingInclude });
    await tx.reminder.deleteMany({ where: { bookingId: booking.id } });
    return item;
  });
  res.json(mapBooking(changed));
});
app.post('/bookings/:id/reschedule', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ startsAt: z.string().datetime({ offset: true }) }).parse(req.body);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id as string }, include: { service: true } });
  if (!booking || booking.userId !== req.auth!.id) return res.status(404).json({ error: 'Appointment not found' });
  if (booking.status !== BookingStatus.CONFIRMED || booking.startsAt < new Date()) return res.status(400).json({ error: 'This appointment can no longer be rescheduled' });
  const start = DateTime.fromISO(parsed.startsAt);
  if (!start.isValid || start.toMillis() < Date.now() + 60 * 60 * 1000 || !isWithinBusinessHours(start, booking.service.durationMinutes, zone)) return res.status(400).json({ error: 'Choose an available time at least one hour ahead' });
  const startsAt = start.toJSDate();
  const endsAt = start.plus({ minutes: booking.service.durationMinutes }).toJSDate();
  const changed = await prisma.$transaction(async tx => {
    await assertBookable(tx, booking.staffId, startsAt, endsAt, booking.id);
    const item = await tx.booking.update({ where: { id: booking.id }, data: { startsAt, endsAt }, include: bookingInclude });
    await upsertReminders(tx, item.id, startsAt);
    return item;
  });
  res.json(mapBooking(changed));
});

const deviceSchema = z.object({ pushToken: z.string().regex(/^(Exponent|Expo)PushToken\[[^\]]+\]$/) });
app.post('/devices', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = deviceSchema.parse(req.body);
  await prisma.device.upsert({ where: { pushToken: parsed.pushToken }, update: { userId: req.auth!.id }, create: { userId: req.auth!.id, pushToken: parsed.pushToken } });
  res.status(204).end();
});
app.delete('/devices', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = deviceSchema.parse(req.body);
  await prisma.device.deleteMany({ where: { userId: req.auth!.id, pushToken: parsed.pushToken } });
  res.status(204).end();
});
app.get('/admin/bookings', requireAuth, requireOwner, async (req, res) => {
  const date = req.query.date ? dateSchema.parse(req.query.date) : DateTime.now().setZone(zone).toISODate()!;
  const start = DateTime.fromISO(date, { zone }).startOf('day');
  const bookings = await prisma.booking.findMany({ where: { startsAt: { gte: start.toJSDate(), lt: start.plus({ days: 1 }).toJSDate() } }, include: { ...bookingInclude, user: true }, orderBy: { startsAt: 'asc' } });
  res.json(bookings.map(mapBooking));
});
app.patch('/admin/bookings/:id', requireAuth, requireOwner, async (req, res) => {
  const parsed = z.object({ status: z.enum([BookingStatus.CANCELLED, BookingStatus.COMPLETED]) }).parse(req.body);
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id as string } });
  if (!booking) return res.status(404).json({ error: 'Appointment not found' });
  if (booking.status !== BookingStatus.CONFIRMED) return res.status(400).json({ error: 'Only confirmed appointments can be updated' });
  const changed = await prisma.$transaction(async tx => {
    const item = await tx.booking.update({ where: { id: booking.id }, data: { status: parsed.status }, include: { ...bookingInclude, user: true } });
    await tx.reminder.deleteMany({ where: { bookingId: booking.id } });
    return item;
  });
  res.json(mapBooking(changed));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Invalid input' }); return; }
  const status = error instanceof Error && 'status' in error ? Number(error.status) : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again' : (error as Error).message });
});

async function sendDueReminders() {
  const due = await prisma.reminder.findMany({ where: { sentAt: null, dueAt: { lte: new Date() }, booking: { status: BookingStatus.CONFIRMED, startsAt: { gt: new Date() } } }, include: { booking: { include: { service: true, user: { include: { devices: true } } } } }, take: 40 });
  for (const reminder of due) {
    const tokens = reminder.booking.user.devices.map(device => device.pushToken);
    if (!tokens.length) { await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } }); continue; }
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tokens.map(to => ({ to, sound: 'default', channelId: 'appointments', title: 'Your Swyft appointment', body: `${reminder.booking.service.name} is ${reminder.offsetMin === 1440 ? 'tomorrow' : 'in one hour'}.`, data: { bookingId: reminder.booking.id } }))) });
      if (!response.ok) throw new Error(`Push service returned ${response.status}`);
      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date(), attempts: { increment: 1 } } });
    } catch (error) {
      console.error('Reminder delivery failed', error);
      await prisma.reminder.update({ where: { id: reminder.id }, data: { attempts: { increment: 1 } } });
    }
  }
}

app.listen(port, () => console.log(`Swyft API listening on http://localhost:${port}`));
setInterval(() => { void sendDueReminders().catch(console.error); }, 60_000);
void sendDueReminders().catch(console.error);
