import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { isWithinBusinessHours, overlaps } from './booking-policy';

const zone = 'Asia/Colombo';
const when = (local: string) => DateTime.fromISO(local, { zone });

describe('booking schedule', () => {
  it('accepts a service ending exactly at close', () => {
    expect(isWithinBusinessHours(when('2026-11-28T17:00:00'), 60, zone)).toBe(true);
  });
  it('rejects closed days, times beyond closing and off-grid seconds', () => {
    expect(isWithinBusinessHours(when('2026-11-29T09:00:00'), 60, zone)).toBe(false);
    expect(isWithinBusinessHours(when('2026-11-28T17:30:00'), 60, zone)).toBe(false);
    expect(isWithinBusinessHours(when('2026-11-28T09:00:30'), 60, zone)).toBe(false);
  });
  it('handles a timezone offset consistently', () => {
    expect(isWithinBusinessHours(DateTime.fromISO('2026-11-28T03:30:00Z'), 60, zone)).toBe(true);
  });
  it('blocks partial overlap while allowing adjacent appointments', () => {
    const date = (hour: number, minute: number) => new Date(Date.UTC(2026, 10, 28, hour, minute));
    expect(overlaps(date(4, 0), date(5, 0), date(4, 30), date(5, 30))).toBe(true);
    expect(overlaps(date(4, 0), date(5, 0), date(5, 0), date(6, 0))).toBe(false);
  });
});
