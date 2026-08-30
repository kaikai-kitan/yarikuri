import { describe, test, expect } from 'vitest';
import {
  isMockEnabled,
  mockRecipes,
  mockFlyerItems,
  mockReceipt,
  mockPlan,
} from '../functions/api/_mock.js';
import { normalizeReceipt } from '../functions/api/_receipt.js';
import { normalizePlan } from '../functions/api/_plan.js';

const fridge = [{ name: '豚こま切れ' }, { name: 'じゃがいも' }, { name: '玉ねぎ' }];
const flyer = [{ name: '鶏もも肉', price: 98, store: 'スーパーA' }];

describe('isMockEnabled', () => {
  test('is off unless it is switched on deliberately', () => {
    expect(isMockEnabled({})).toBe(false);
    expect(isMockEnabled({ MOCK_AI: '0' })).toBe(false);
    expect(isMockEnabled({ MOCK_AI: 'true' })).toBe(false);
    expect(isMockEnabled(undefined)).toBe(false);
  });

  test('is on when MOCK_AI is exactly 1', () => {
    expect(isMockEnabled({ MOCK_AI: '1' })).toBe(true);
  });
});

describe('mockRecipes', () => {
  test('proposes three recipes', () => {
    expect(mockRecipes(fridge, flyer)).toHaveLength(3);
  });

  test('builds them out of what is actually in the fridge', () => {
    // Act
    const recipes = mockRecipes(fridge, flyer);

    // Assert — 画面で在庫と噛み合って見えるように、実際の食材名を使う
    const used = recipes.flatMap((r) => r.usedFromFridge);
    expect(used).toContain('豚こま切れ');
    expect(used).toContain('じゃがいも');
  });

  test('uses the flyer items when there are any', () => {
    const recipes = mockRecipes(fridge, flyer);
    expect(recipes.flatMap((r) => r.usedFromDeals)).toContain('鶏もも肉');
  });

  test('still works with an empty fridge and no flyer', () => {
    // Arrange & Act
    const recipes = mockRecipes([], []);

    // Assert
    expect(recipes).toHaveLength(3);
    recipes.forEach((r) => {
      expect(r.usedFromFridge).toEqual([]);
      expect(r.usedFromDeals).toEqual([]);
    });
  });

  test('gives every recipe the fields the cards read', () => {
    mockRecipes(fridge, flyer).forEach((r) => {
      expect(typeof r.name).toBe('string');
      expect(r.name).not.toBe('');
      expect(typeof r.emoji).toBe('string');
      expect(typeof r.description).toBe('string');
      expect(Array.isArray(r.missingIngredients)).toBe(true);
      expect(Number.isFinite(r.totalCost)).toBe(true);
      expect(typeof r.cookingTime).toBe('string');
    });
  });

  test('is deterministic so the screen does not shuffle on every call', () => {
    expect(mockRecipes(fridge, flyer)).toEqual(mockRecipes(fridge, flyer));
  });
});

describe('mockFlyerItems', () => {
  test('returns priced items with a store name', () => {
    const items = mockFlyerItems();
    expect(items.length).toBeGreaterThan(0);
    items.forEach((i) => {
      expect(i.name).toBeTruthy();
      expect(Number.isFinite(i.price)).toBe(true);
      expect(i.store).toBeTruthy();
    });
  });
});

describe('mockReceipt', () => {
  test('survives the same normalizer the real response goes through', () => {
    // Arrange & Act
    const receipt = normalizeReceipt(mockReceipt());

    // Assert
    expect(receipt.store).toBeTruthy();
    expect(receipt.items.length).toBeGreaterThan(0);
    expect(receipt.total).toBeGreaterThan(0);
  });

  test('includes food so the fridge gets something to hold', () => {
    const receipt = normalizeReceipt(mockReceipt());
    expect(receipt.items.some((i) => i.category === 'food')).toBe(true);
  });

  test('includes a non-food line so the category split is visible', () => {
    const receipt = normalizeReceipt(mockReceipt());
    expect(receipt.items.some((i) => i.category !== 'food')).toBe(true);
  });
});

describe('mockPlan', () => {
  test('survives the same normalizer the real response goes through', () => {
    // Act
    const plan = normalizePlan(mockPlan(fridge), '2026-08-25');

    // Assert
    expect(plan).not.toBeNull();
    expect(plan.days).toHaveLength(7);
    expect(plan.startDate).toBe('2026-08-25');
  });

  test('explains why each day sits where it does', () => {
    const plan = normalizePlan(mockPlan(fridge), '2026-08-25');
    plan.days.forEach((d) => expect(d.reason).not.toBe(''));
  });

  test('chains at least one ingredient from one day to the next', () => {
    // 献立の売りは食材の繋ぎ。モックでもそこが見えないと確認にならない。
    const plan = normalizePlan(mockPlan(fridge), '2026-08-25');
    expect(plan.days.some((d) => d.carryOver.length > 0)).toBe(true);
  });

  test('comes with a shopping list', () => {
    const plan = normalizePlan(mockPlan(fridge), '2026-08-25');
    expect(plan.shoppingList.length).toBeGreaterThan(0);
    plan.shoppingList.forEach((s) => expect(s.estimatedPrice).toBeGreaterThan(0));
  });
});

describe('mock calories', () => {
  test('gives every mock recipe a calorie figure', () => {
    // カロリー軸を選んだときに並びが変わることを画面で確認できる必要がある
    mockRecipes(fridge, flyer).forEach((r) => {
      expect(Number.isFinite(r.calories)).toBe(true);
      expect(r.calories).toBeGreaterThan(0);
    });
  });

  test('spreads the calories so sorting by them visibly reorders', () => {
    const values = mockRecipes(fridge, flyer).map((r) => r.calories);
    expect(new Set(values).size).toBe(values.length);
  });

  test('gives every day of the mock plan a calorie figure', () => {
    normalizePlan(mockPlan(fridge), '2026-08-30').days.forEach((d) => {
      expect(Number.isFinite(d.calories)).toBe(true);
    });
  });
});
