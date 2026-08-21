import { describe, test, expect, vi, afterEach } from 'vitest';
import { ocrReceipt, suggestRecipes } from '@/lib/api';

const mockFetch = (body, ok = true, status = 200) => {
  const fn = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', fn);
  return fn;
};

const bodyOf = (fn) => JSON.parse(fn.mock.calls[0][1].body);

afterEach(() => vi.unstubAllGlobals());

describe('ocrReceipt', () => {
  test('posts the image and returns the parsed receipt', async () => {
    // Arrange
    const receipt = { store: 'スーパーA', date: '2026-08-21', total: 3240, items: [] };
    const fn = mockFetch({ receipt });

    // Act
    const result = await ocrReceipt('BASE64', 'image/jpeg');

    // Assert
    expect(fn).toHaveBeenCalledWith('/api/ocr-receipt', expect.objectContaining({ method: 'POST' }));
    expect(bodyOf(fn)).toEqual({ imageBase64: 'BASE64', mediaType: 'image/jpeg' });
    expect(result).toEqual(receipt);
  });

  test('throws the error message returned by the server', async () => {
    // Arrange
    mockFetch({ error: 'レシートを読み取れませんでした' }, false, 400);

    // Act & Assert
    await expect(ocrReceipt('BASE64', 'image/jpeg')).rejects.toThrow('レシートを読み取れませんでした');
  });

  test('throws a fallback message when the server sends no detail', async () => {
    // Arrange
    mockFetch({}, false, 500);

    // Act & Assert
    await expect(ocrReceipt('BASE64', 'image/jpeg')).rejects.toThrow(/500/);
  });

  test('throws when the response contains no receipt', async () => {
    // Arrange
    mockFetch({});

    // Act & Assert
    await expect(ocrReceipt('BASE64', 'image/jpeg')).rejects.toThrow();
  });
});

describe('suggestRecipes', () => {
  test('sends the budget context when one is given', async () => {
    // Arrange
    const fn = mockFetch({ recipes: [] });
    const budget = { remaining: 12000, daysLeft: 10, dailyAllowance: 1200 };

    // Act
    await suggestRecipes(['卵'], [], budget);

    // Assert
    expect(bodyOf(fn)).toEqual({ fridge: ['卵'], flyerItems: [], budget });
  });

  test('sends no budget when none is available', async () => {
    // Arrange
    const fn = mockFetch({ recipes: [] });

    // Act
    await suggestRecipes(['卵'], []);

    // Assert
    expect(bodyOf(fn).budget).toBeNull();
  });

  test('returns the recipes from the server', async () => {
    // Arrange
    mockFetch({ recipes: [{ name: '卵チャーハン' }] });

    // Act & Assert
    expect(await suggestRecipes([], [])).toEqual([{ name: '卵チャーハン' }]);
  });
});
