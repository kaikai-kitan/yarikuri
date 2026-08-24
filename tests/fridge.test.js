import { describe, test, expect } from 'vitest';
import {
  daysUntilExpiry,
  expiryState,
  sortByExpiry,
  EXPIRY_SOON_DAYS,
} from '@/lib/fridge';

const now = new Date(2026, 7, 24); // 2026-08-24
const item = (overrides = {}) => ({ id: 'f-1', name: '牛乳', addedAt: 1, ...overrides });

describe('daysUntilExpiry', () => {
  test('counts today as zero days left', () => {
    expect(daysUntilExpiry(item({ expiresAt: '2026-08-24' }), now)).toBe(0);
  });

  test('counts tomorrow as one day left', () => {
    expect(daysUntilExpiry(item({ expiresAt: '2026-08-25' }), now)).toBe(1);
  });

  test('counts yesterday as one day past', () => {
    expect(daysUntilExpiry(item({ expiresAt: '2026-08-23' }), now)).toBe(-1);
  });

  test('spans a month boundary correctly', () => {
    expect(daysUntilExpiry(item({ expiresAt: '2026-09-02' }), now)).toBe(9);
  });

  test('ignores the time of day', () => {
    const lateEvening = new Date(2026, 7, 24, 23, 59);
    expect(daysUntilExpiry(item({ expiresAt: '2026-08-25' }), lateEvening)).toBe(1);
  });

  test('returns nothing when no expiry is set', () => {
    expect(daysUntilExpiry(item(), now)).toBeNull();
  });

  test('returns nothing for a malformed expiry', () => {
    expect(daysUntilExpiry(item({ expiresAt: '2026/08/25' }), now)).toBeNull();
    expect(daysUntilExpiry(item({ expiresAt: 'まだ大丈夫' }), now)).toBeNull();
  });
});

describe('expiryState', () => {
  test('treats an item without an expiry as fresh', () => {
    expect(expiryState(item(), now)).toBe('fresh');
  });

  test('treats a distant expiry as fresh', () => {
    expect(expiryState(item({ expiresAt: '2026-08-30' }), now)).toBe('fresh');
  });

  test('warns from the threshold onwards', () => {
    expect(EXPIRY_SOON_DAYS).toBe(3);
    expect(expiryState(item({ expiresAt: '2026-08-27' }), now)).toBe('soon');
    expect(expiryState(item({ expiresAt: '2026-08-28' }), now)).toBe('fresh');
  });

  test('treats today as soon, not expired', () => {
    expect(expiryState(item({ expiresAt: '2026-08-24' }), now)).toBe('soon');
  });

  test('treats a past date as expired', () => {
    expect(expiryState(item({ expiresAt: '2026-08-23' }), now)).toBe('expired');
  });
});

describe('sortByExpiry', () => {
  test('puts the soonest expiry first', () => {
    // Arrange
    const items = [
      item({ id: 'a', expiresAt: '2026-08-30' }),
      item({ id: 'b', expiresAt: '2026-08-25' }),
      item({ id: 'c', expiresAt: '2026-08-27' }),
    ];

    // Act & Assert
    expect(sortByExpiry(items, now).map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  test('puts expired items before everything else', () => {
    const items = [item({ id: 'a', expiresAt: '2026-08-25' }), item({ id: 'b', expiresAt: '2026-08-20' })];
    expect(sortByExpiry(items, now).map((i) => i.id)).toEqual(['b', 'a']);
  });

  test('puts items with no expiry last', () => {
    const items = [item({ id: 'a' }), item({ id: 'b', expiresAt: '2026-08-30' })];
    expect(sortByExpiry(items, now).map((i) => i.id)).toEqual(['b', 'a']);
  });

  test('keeps the original order among items with no expiry', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })];
    expect(sortByExpiry(items, now).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  test('does not mutate the list it is given', () => {
    // Arrange
    const items = [item({ id: 'a', expiresAt: '2026-08-30' }), item({ id: 'b', expiresAt: '2026-08-25' })];

    // Act
    sortByExpiry(items, now);

    // Assert
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  test('tolerates an empty or missing list', () => {
    expect(sortByExpiry([], now)).toEqual([]);
    expect(sortByExpiry(undefined, now)).toEqual([]);
  });
});
