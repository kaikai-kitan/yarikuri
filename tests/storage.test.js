import { describe, test, expect, vi, afterEach } from 'vitest';
import { loadList, saveList, clearKey } from '@/lib/storage';

const KEY = 'todo:items';

afterEach(() => vi.restoreAllMocks());

describe('storage', () => {
  test('returns an empty array when the key is missing', async () => {
    // Arrange & Act
    const result = await loadList(KEY);

    // Assert
    expect(result).toEqual([]);
  });

  test('round-trips a saved list', async () => {
    // Arrange
    const list = [{ id: 'id-1', text: '牛乳を買う' }];

    // Act
    await saveList(KEY, list);

    // Assert
    expect(await loadList(KEY)).toEqual(list);
  });

  test('returns an empty array when the stored value is not an array', async () => {
    // Arrange
    localStorage.setItem(KEY, JSON.stringify({ nope: true }));

    // Act & Assert
    expect(await loadList(KEY)).toEqual([]);
  });

  test('returns an empty array when the stored JSON is malformed', async () => {
    // Arrange
    localStorage.setItem(KEY, '{not json');

    // Act & Assert
    expect(await loadList(KEY)).toEqual([]);
  });

  test('logs instead of throwing when saving fails', async () => {
    // Arrange
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    // Act
    await saveList(KEY, [{ id: 'id-1' }]);

    // Assert
    expect(error).toHaveBeenCalled();
  });

  test('removes a stored key', async () => {
    // Arrange
    await saveList(KEY, [{ id: 'id-1' }]);

    // Act
    await clearKey(KEY);

    // Assert
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  test('logs instead of throwing when clearing fails', async () => {
    // Arrange
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    // Act
    await clearKey(KEY);

    // Assert
    expect(error).toHaveBeenCalled();
  });
});
