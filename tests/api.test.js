import { describe, test, expect, vi, afterEach } from 'vitest';
import { ocrReceipt, suggestRecipes, planWeek, fetchRecipeLink } from '@/lib/api';

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

describe('fetchRecipeLink', () => {
  const link = {
    title: '基本の肉じゃが',
    url: 'https://recipe.rakuten.co.jp/recipe/1/',
    imageUrl: 'https://image.example/1.jpg',
    materials: ['豚こま切れ 200g'],
    indication: '約30分',
    cost: '300円前後',
  };

  test('posts the dish name and returns the link', async () => {
    // Arrange
    const fn = mockFetch({ link, reason: null });

    // Act
    const result = await fetchRecipeLink('肉じゃが');

    // Assert
    expect(fn).toHaveBeenCalledWith('/api/recipe-link', expect.objectContaining({ method: 'POST' }));
    expect(bodyOf(fn)).toEqual({ name: '肉じゃが' });
    expect(result).toEqual({ link, reason: null });
  });

  test('reports that no recipe was found', async () => {
    // 楽天で引けなくてもサーバーがWeb検索リンクを返す
    const search = { title: '「宇宙料理」のレシピを検索', url: 'https://www.google.com/search?q=x', source: 'search' };
    mockFetch({ link: search, reason: 'no_match' });
    expect(await fetchRecipeLink('宇宙料理')).toEqual({ link: search, reason: 'no_match' });
  });

  test('passes on why the rakuten lookup did not work', async () => {
    const search = { title: '「肉じゃが」のレシピを検索', url: 'https://www.google.com/search?q=x', source: 'search' };
    mockFetch({ link: search, reason: 'not_configured' });
    expect(await fetchRecipeLink('肉じゃが')).toEqual({ link: search, reason: 'not_configured' });
  });

  test('reports no link rather than throwing when the server fails', async () => {
    // リンクが出ないだけで献立は使えるため、失敗を握って null を返す
    mockFetch({ error: 'なにか失敗' }, false, 500);
    expect(await fetchRecipeLink('肉じゃが')).toEqual({ link: null, reason: 'upstream_error' });
  });
});

describe('提案の設定がサーバーまで届く', () => {
  const preferences = { servings: 4, priority: 'calorie' };

  test('suggestRecipes sends the servings and the axis', async () => {
    // Arrange
    const fn = mockFetch({ recipes: [] });

    // Act
    await suggestRecipes(['豚こま'], [], null, preferences);

    // Assert
    expect(bodyOf(fn)).toMatchObject({ servings: 4, priority: 'calorie' });
  });

  test('planWeek sends the servings and the axis', async () => {
    const fn = mockFetch({ plan: { days: [], shoppingList: [], startDate: '2026-08-30' } });

    await planWeek({ fridge: ['豚こま'], startDate: '2026-08-30', preferences });

    expect(bodyOf(fn)).toMatchObject({ servings: 4, priority: 'calorie' });
  });

  test('omits them when no settings were given', async () => {
    // 未設定のときはサーバー側の既定に任せる
    const fn = mockFetch({ recipes: [] });

    await suggestRecipes(['豚こま'], []);

    expect(bodyOf(fn).servings).toBeUndefined();
    expect(bodyOf(fn).priority).toBeUndefined();
  });
});
