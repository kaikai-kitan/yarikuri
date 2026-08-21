import { describe, test, expect, vi, afterEach } from 'vitest';
import { readCookie, writeCookie, deleteCookie } from '@/lib/cookie';

describe('cookie', () => {
  test('returns null when the cookie is not set', () => {
    // Arrange & Act & Assert
    expect(readCookie('missing')).toBeNull();
  });

  test('round-trips a written value', () => {
    // Arrange & Act
    writeCookie('yarikuri_test', 'hello', 1);

    // Assert
    expect(readCookie('yarikuri_test')).toBe('hello');
  });

  test('round-trips a value needing URL encoding', () => {
    // Arrange
    const value = JSON.stringify({ id: 'u_1', text: '牛乳を買う' });

    // Act
    writeCookie('yarikuri_test', value, 1);

    // Assert
    expect(readCookie('yarikuri_test')).toBe(value);
  });

  test('does not confuse a cookie whose name is a suffix of another', () => {
    // Arrange
    writeCookie('yarikuri_uid', 'wanted', 1);
    writeCookie('other_yarikuri_uid', 'unwanted', 1);

    // Act & Assert
    expect(readCookie('yarikuri_uid')).toBe('wanted');
  });

  test('deletes a cookie', () => {
    // Arrange
    writeCookie('yarikuri_test', 'hello', 1);

    // Act
    deleteCookie('yarikuri_test');

    // Assert
    expect(readCookie('yarikuri_test')).toBeNull();
  });

  describe('outside the browser (SSR)', () => {
    afterEach(() => vi.unstubAllGlobals());

    test('reads nothing when there is no document', () => {
      // Arrange
      vi.stubGlobal('document', undefined);

      // Act & Assert
      expect(readCookie('yarikuri_uid')).toBeNull();
    });

    test('writing is a no-op when there is no document', () => {
      // Arrange
      vi.stubGlobal('document', undefined);

      // Act & Assert
      expect(() => writeCookie('yarikuri_uid', 'x', 1)).not.toThrow();
    });

    test('deleting is a no-op when there is no document', () => {
      // Arrange
      vi.stubGlobal('document', undefined);

      // Act & Assert
      expect(() => deleteCookie('yarikuri_uid')).not.toThrow();
    });
  });
});
