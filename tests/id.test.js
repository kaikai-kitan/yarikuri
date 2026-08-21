import { describe, test, expect, vi, afterEach } from 'vitest';
import { newId } from '@/lib/id';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('newId', () => {
  test('returns a non-empty string', () => {
    // Arrange & Act
    const id = newId();

    // Assert
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('uses crypto.randomUUID when it is available', () => {
    // Arrange
    const randomUUID = vi.spyOn(crypto, 'randomUUID');

    // Act
    newId();

    // Assert
    expect(randomUUID).toHaveBeenCalled();
  });

  test('falls back to a generated id outside a secure context', () => {
    // Arrange
    vi.stubGlobal('crypto', {});

    // Act
    const id = newId();

    // Assert
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('falls back when crypto itself is undefined', () => {
    // Arrange
    vi.stubGlobal('crypto', undefined);

    // Act & Assert
    expect(() => newId()).not.toThrow();
  });

  test('returns unique ids across many calls in fallback mode', () => {
    // Arrange
    vi.stubGlobal('crypto', {});

    // Act
    const ids = new Set(Array.from({ length: 500 }, () => newId()));

    // Assert
    expect(ids.size).toBe(500);
  });
});
