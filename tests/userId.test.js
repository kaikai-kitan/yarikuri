import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  getUserId,
  peekUserId,
  resetUserId,
  RETENTION_DAYS,
  USER_ID_STORAGE_KEY,
  USER_ID_COOKIE_KEY,
} from '@/lib/userId';
import { readCookie, deleteCookie } from '@/lib/cookie';

const DAY = 86400 * 1000;

const seedStorage = (state) =>
  localStorage.setItem(USER_ID_STORAGE_KEY, JSON.stringify(state));

const storedState = () => JSON.parse(localStorage.getItem(USER_ID_STORAGE_KEY));

afterEach(() => vi.useRealTimers());

describe('getUserId', () => {
  test('issues an id on the first call', () => {
    // Arrange & Act
    const id = getUserId();

    // Assert
    expect(typeof id).toBe('string');
    expect(id.startsWith('u_')).toBe(true);
  });

  test('returns the same id on subsequent calls', () => {
    // Arrange
    const first = getUserId();

    // Act
    const second = getUserId();

    // Assert
    expect(second).toBe(first);
  });

  test('writes the id to both localStorage and the cookie', () => {
    // Arrange & Act
    const id = getUserId();

    // Assert
    expect(storedState().id).toBe(id);
    expect(JSON.parse(readCookie(USER_ID_COOKIE_KEY)).id).toBe(id);
  });

  test('restores the id from the cookie when localStorage was cleared', () => {
    // Arrange
    const id = getUserId();
    localStorage.clear();

    // Act
    const restored = getUserId();

    // Assert
    expect(restored).toBe(id);
  });

  test('rewrites localStorage from the cookie so both stay in sync', () => {
    // Arrange
    const id = getUserId();
    localStorage.clear();

    // Act
    getUserId();

    // Assert
    expect(storedState().id).toBe(id);
  });

  test('keeps the id when the cookie was cleared but localStorage survives', () => {
    // Arrange
    const id = getUserId();
    deleteCookie(USER_ID_COOKIE_KEY);

    // Act
    const restored = getUserId();

    // Assert
    expect(restored).toBe(id);
    expect(JSON.parse(readCookie(USER_ID_COOKIE_KEY)).id).toBe(id);
  });

  test('keeps the id when it was last used inside the retention period', () => {
    // Arrange
    const now = Date.now();
    seedStorage({
      v: 1,
      id: 'u_existing',
      issuedAt: now - 200 * DAY,
      lastSeenAt: now - (RETENTION_DAYS - 1) * DAY,
    });

    // Act & Assert
    expect(getUserId()).toBe('u_existing');
  });

  test('issues a new id when the retention period has lapsed', () => {
    // Arrange
    const now = Date.now();
    seedStorage({
      v: 1,
      id: 'u_stale',
      issuedAt: now - 400 * DAY,
      lastSeenAt: now - (RETENTION_DAYS + 1) * DAY,
    });

    // Act
    const id = getUserId();

    // Assert
    expect(id).not.toBe('u_stale');
    expect(storedState().id).toBe(id);
  });

  test('slides the expiry forward on each access', () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const id = getUserId();
    const firstSeen = storedState().lastSeenAt;

    // Act
    vi.setSystemTime(new Date('2026-04-01T00:00:00Z'));
    const again = getUserId();

    // Assert
    expect(again).toBe(id);
    expect(storedState().lastSeenAt).toBeGreaterThan(firstSeen);
    expect(storedState().issuedAt).toBe(peekUserId().issuedAt);
  });

  test('issues a new id when the stored JSON is malformed', () => {
    // Arrange
    localStorage.setItem(USER_ID_STORAGE_KEY, '{not json');

    // Act
    const id = getUserId();

    // Assert
    expect(id.startsWith('u_')).toBe(true);
    expect(storedState().id).toBe(id);
  });

  test('issues a new id when the stored record has no id', () => {
    // Arrange
    seedStorage({ v: 1, issuedAt: Date.now(), lastSeenAt: Date.now() });

    // Act & Assert
    expect(getUserId().startsWith('u_')).toBe(true);
  });
});

describe('peekUserId', () => {
  test('returns null and issues nothing when no id exists', () => {
    // Arrange & Act
    const peeked = peekUserId();

    // Assert
    expect(peeked).toBeNull();
    expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBeNull();
  });

  test('reports the id with its issue and expiry timestamps', () => {
    // Arrange
    const id = getUserId();

    // Act
    const peeked = peekUserId();

    // Assert
    expect(peeked.id).toBe(id);
    expect(peeked.expiresAt).toBe(peeked.lastSeenAt + RETENTION_DAYS * DAY);
  });

  test('does not slide the expiry forward', () => {
    // Arrange
    getUserId();
    const before = storedState().lastSeenAt;

    // Act
    peekUserId();

    // Assert
    expect(storedState().lastSeenAt).toBe(before);
  });

  test('returns null when the retention period has lapsed', () => {
    // Arrange
    const now = Date.now();
    seedStorage({
      v: 1,
      id: 'u_stale',
      issuedAt: now - 400 * DAY,
      lastSeenAt: now - (RETENTION_DAYS + 1) * DAY,
    });

    // Act & Assert
    expect(peekUserId()).toBeNull();
  });
});

describe('resetUserId', () => {
  test('replaces the current id with a new one', () => {
    // Arrange
    const before = getUserId();

    // Act
    const after = resetUserId();

    // Assert
    expect(after).not.toBe(before);
    expect(getUserId()).toBe(after);
  });

  test('replaces the id in the cookie as well', () => {
    // Arrange
    const before = getUserId();

    // Act
    const after = resetUserId();

    // Assert
    const fromCookie = JSON.parse(readCookie(USER_ID_COOKIE_KEY)).id;
    expect(fromCookie).toBe(after);
    expect(fromCookie).not.toBe(before);
  });

  test('issues an id even when none existed', () => {
    // Arrange & Act
    const id = resetUserId();

    // Assert
    expect(id.startsWith('u_')).toBe(true);
  });
});

describe('storage failures', () => {
  test('still returns an id when localStorage refuses the write', () => {
    // Arrange
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    // Act
    const id = getUserId();

    // Assert
    expect(id.startsWith('u_')).toBe(true);
    expect(error).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  test('falls back to the cookie when localStorage reads throw', () => {
    // Arrange
    const id = getUserId();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    // Act
    const restored = getUserId();

    // Assert
    expect(restored).toBe(id);
    vi.restoreAllMocks();
  });
});
