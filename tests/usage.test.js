import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  getQuota,
  canSearch,
  getStatus,
  consumeSearch,
  grantRewardTicket,
  FREE_LIMIT,
} from '@/lib/usage';

afterEach(() => vi.useRealTimers());

describe('usage quota', () => {
  test('starts the day with the full free allowance', () => {
    // Arrange & Act
    const status = getStatus();

    // Assert
    expect(status.freeRemaining).toBe(FREE_LIMIT);
    expect(status.rewardedTickets).toBe(0);
    expect(canSearch()).toBe(true);
  });

  test('consumes the free allowance before rewarded tickets', () => {
    // Arrange & Act
    const consumed = consumeSearch();

    // Assert
    expect(consumed).toBe(true);
    expect(getStatus().freeRemaining).toBe(0);
    expect(canSearch()).toBe(false);
  });

  test('refuses a search once the allowance and tickets are gone', () => {
    // Arrange
    consumeSearch();

    // Act & Assert
    expect(consumeSearch()).toBe(false);
    expect(getStatus().needsReward).toBe(true);
  });

  test('spends a rewarded ticket when the free allowance is used up', () => {
    // Arrange
    consumeSearch();
    grantRewardTicket();

    // Act
    const consumed = consumeSearch();

    // Assert
    expect(consumed).toBe(true);
    expect(getStatus().rewardedTickets).toBe(0);
  });

  test('restores the quota from the cookie when localStorage was cleared', () => {
    // Arrange
    consumeSearch();
    localStorage.clear();

    // Act & Assert
    expect(getStatus().freeRemaining).toBe(0);
  });

  test('resets the allowance when the date changes', () => {
    // Arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-01T09:00:00'));
    consumeSearch();
    expect(getStatus().freeRemaining).toBe(0);

    // Act
    vi.setSystemTime(new Date('2027-03-02T09:00:00'));

    // Assert
    expect(getStatus().freeRemaining).toBe(FREE_LIMIT);
  });

  test('ignores a malformed stored quota and starts fresh', () => {
    // Arrange
    localStorage.setItem('yarikuri:quota:v1', '{not json');

    // Act & Assert
    expect(getQuota().freeUsed).toBe(0);
  });
});
