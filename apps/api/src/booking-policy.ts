import { DateTime } from 'luxon';

export const hours = { start: 9, end: 18, closedDays: [0, 1] }; // Sunday and Monday

export function startFor(date: string, hour: number, minute: number, zone: string) {
  return DateTime.fromISO(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, { zone });
}

export function isWithinBusinessHours(start: DateTime, durationMinutes: number, zone: string) {
  const local = start.setZone(zone);
  const weekday = local.weekday % 7;
  const opening = startFor(local.toISODate()!, hours.start, 0, zone);
  const closing = startFor(local.toISODate()!, hours.end, 0, zone);
  return !hours.closedDays.includes(weekday)
    && local.toMillis() >= opening.toMillis()
    && local.plus({ minutes: durationMinutes }).toMillis() <= closing.toMillis()
    && local.minute % 30 === 0
    && local.second === 0
    && local.millisecond === 0;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}
