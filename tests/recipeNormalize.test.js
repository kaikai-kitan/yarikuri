import { describe, test, expect } from 'vitest';
import { normalizeRecipes, sortByPriority } from '../functions/api/_recipe.js';

const raw = (overrides = {}) => ({
  name: '肉じゃが',
  emoji: '🥔',
  description: '定番の煮物',
  usedFromFridge: ['豚こま'],
  usedFromDeals: [],
  missingIngredients: [{ name: 'みりん', estimatedPrice: 198, buyAt: 'スーパーA' }],
  totalCost: 320,
  calories: 480,
  cookingTime: '約30分',
  ...overrides,
});

describe('normalizeRecipes', () => {
  test('keeps a well formed recipe', () => {
    expect(normalizeRecipes([raw()])[0]).toMatchObject({
      name: '肉じゃが',
      totalCost: 320,
      calories: 480,
      cookingTime: '約30分',
    });
  });

  test('drops anything without a name', () => {
    expect(normalizeRecipes([raw({ name: '' }), raw({ name: null }), raw()])).toHaveLength(1);
  });

  test('turns a numeric string into a number so the card can format it', () => {
    // AIは数値を文字列で返すことがある。画面で toLocaleString を呼ぶ前に直す。
    const [recipe] = normalizeRecipes([raw({ totalCost: '320', calories: '480' })]);
    expect(recipe.totalCost).toBe(320);
    expect(recipe.calories).toBe(480);
  });

  test('records unknown calories as null rather than zero', () => {
    // 0kcal と「分からない」は違う。画面側で出し分けられるようにする。
    expect(normalizeRecipes([raw({ calories: undefined })])[0].calories).toBeNull();
    expect(normalizeRecipes([raw({ calories: 'たぶん500' })])[0].calories).toBeNull();
    expect(normalizeRecipes([raw({ calories: -20 })])[0].calories).toBeNull();
  });

  test('falls back to zero for a cost it cannot read', () => {
    expect(normalizeRecipes([raw({ totalCost: 'やすい' })])[0].totalCost).toBe(0);
  });

  test('repairs list fields that came back as something else', () => {
    const [recipe] = normalizeRecipes([
      raw({ usedFromFridge: 'ぶたこま', missingIngredients: null }),
    ]);
    expect(recipe.usedFromFridge).toEqual([]);
    expect(recipe.missingIngredients).toEqual([]);
  });

  test('keeps the shop name on a missing ingredient', () => {
    expect(normalizeRecipes([raw()])[0].missingIngredients[0]).toEqual({
      name: 'みりん',
      estimatedPrice: 198,
      buyAt: 'スーパーA',
    });
  });

  test('gives a recipe with no emoji something to draw', () => {
    expect(normalizeRecipes([raw({ emoji: undefined })])[0].emoji).toBe('🍽');
  });

  test('survives a response that is not a list at all', () => {
    expect(normalizeRecipes(null)).toEqual([]);
    expect(normalizeRecipes({ recipes: [] })).toEqual([]);
  });
});

describe('sortByPriority', () => {
  const cheap = { name: '安い', totalCost: 100, calories: 800, cookingTime: '約40分' };
  const light = { name: '低カロリー', totalCost: 500, calories: 200, cookingTime: '約30分' };
  const quick = { name: '時短', totalCost: 300, calories: 500, cookingTime: '約10分' };

  test('puts the cheapest first when cost is the axis', () => {
    expect(sortByPriority([light, quick, cheap], 'cost').map((r) => r.name)).toEqual([
      '安い',
      '時短',
      '低カロリー',
    ]);
  });

  test('puts the lightest first when calories are the axis', () => {
    expect(sortByPriority([cheap, quick, light], 'calorie').map((r) => r.name)).toEqual([
      '低カロリー',
      '時短',
      '安い',
    ]);
  });

  test('puts the quickest first when time is the axis', () => {
    expect(sortByPriority([cheap, light, quick], 'time').map((r) => r.name)).toEqual([
      '時短',
      '低カロリー',
      '安い',
    ]);
  });

  test('sends recipes with no calorie figure to the end', () => {
    // 不明なものを先頭に置くと「いちばん低カロリー」に見えてしまう
    const unknown = { name: '不明', totalCost: 100, calories: null };
    expect(sortByPriority([unknown, light], 'calorie').map((r) => r.name)).toEqual([
      '低カロリー',
      '不明',
    ]);
  });

  test('leaves the order alone for an axis it does not know', () => {
    const list = [cheap, light, quick];
    expect(sortByPriority(list, 'protein')).toEqual(list);
  });

  test('does not modify the list it was given', () => {
    const list = [light, cheap];
    sortByPriority(list, 'cost');
    expect(list.map((r) => r.name)).toEqual(['低カロリー', '安い']);
  });
});
