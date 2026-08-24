import { describe, test, expect, vi, afterEach } from 'vitest';
import { ocrReceipt, suggestRecipes, planWeek } from '@/lib/api';

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

describe('planWeek', () => {
  test('posts the fridge, deals, budget and start date', async () => {
    // Arrange
    const plan = { startDate: '2026-08-24', shoppingList: [], days: [{ day: 1, name: '肉じゃが' }] };
    const fn = mockFetch({ plan });
    const fridge = [{ name: '豚こま', daysLeft: 2 }];
    const budget = { remaining: 17000, daysLeft: 8, dailyAllowance: 2125, scope: 'food' };

    // Act
    const result = await planWeek({ fridge, flyerItems: [], budget, startDate: '2026-08-24' });

    // Assert
    expect(fn).toHaveBeenCalledWith('/api/plan-week', expect.objectContaining({ method: 'POST' }));
    expect(bodyOf(fn)).toEqual({ fridge, flyerItems: [], budget, startDate: '2026-08-24' });
    expect(result).toEqual(plan);
  });

  test('sends no budget when none is available', async () => {
    const fn = mockFetch({ plan: { days: [{ name: '肉じゃが' }] } });
    await planWeek({ fridge: [], startDate: '2026-08-24' });
    expect(bodyOf(fn).budget).toBeNull();
  });

  test('throws the error message returned by the server', async () => {
    mockFetch({ error: '献立を組み立てられませんでした' }, false, 500);
    await expect(planWeek({ fridge: [], startDate: '2026-08-24' }))
      .rejects.toThrow('献立を組み立てられませんでした');
  });

  test('throws a fallback message when the server sends no detail', async () => {
    mockFetch({}, false, 502);
    await expect(planWeek({ fridge: [], startDate: '2026-08-24' })).rejects.toThrow(/502/);
  });

  test('throws when the response contains no plan', async () => {
    mockFetch({});
    await expect(planWeek({ fridge: [], startDate: '2026-08-24' })).rejects.toThrow();
  });
});
