import { describe, test, expect } from 'vitest';
import {
  monthKey,
  daysLeftInMonth,
  expensesInMonth,
  totalOf,
  foodItemsOf,
  budgetSummary,
  projectExpense,
  categoryOf,
  totalByCategory,
  CATEGORIES,
  CATEGORY_LABELS,
} from '@/lib/budget';

const expense = (overrides = {}) => ({
  id: 'e-1',
  date: '2026-08-10',
  store: 'スーパーA',
  total: 1000,
  items: [{ name: '牛乳', price: 198, isFood: true }],
  createdAt: 1,
  ...overrides,
});

describe('monthKey', () => {
  test('formats a date as YYYY-MM', () => {
    expect(monthKey(new Date(2026, 7, 21))).toBe('2026-08');
  });

  test('zero-pads single digit months', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01');
  });
});

describe('daysLeftInMonth', () => {
  test('counts today as a remaining day', () => {
    // 2026-08-21、8月は31日 → 21日を含めて11日
    expect(daysLeftInMonth(new Date(2026, 7, 21))).toBe(11);
  });

  test('returns 1 on the last day of the month', () => {
    expect(daysLeftInMonth(new Date(2026, 7, 31))).toBe(1);
  });

  test('handles February in a leap year', () => {
    expect(daysLeftInMonth(new Date(2028, 1, 1))).toBe(29);
  });
});

describe('expensesInMonth', () => {
  test('keeps only the expenses inside the given month', () => {
    // Arrange
    const list = [
      expense({ id: 'e-1', date: '2026-08-01' }),
      expense({ id: 'e-2', date: '2026-07-31' }),
      expense({ id: 'e-3', date: '2026-08-31' }),
    ];

    // Act
    const result = expensesInMonth(list, '2026-08');

    // Assert
    expect(result.map((e) => e.id)).toEqual(['e-1', 'e-3']);
  });

  test('returns an empty array when nothing matches', () => {
    expect(expensesInMonth([expense({ date: '2026-07-01' })], '2026-08')).toEqual([]);
  });
});

describe('totalOf', () => {
  test('sums the receipt totals', () => {
    expect(totalOf([expense({ total: 1200 }), expense({ total: 800 })])).toBe(2000);
  });

  test('returns 0 for an empty list', () => {
    expect(totalOf([])).toBe(0);
  });

  test('ignores entries whose total is not a number', () => {
    expect(totalOf([expense({ total: 500 }), expense({ total: 'abc' })])).toBe(500);
  });
});

describe('foodItemsOf', () => {
  test('keeps only the items flagged as food', () => {
    // Arrange
    const e = expense({
      items: [
        { name: '牛乳', price: 198, isFood: true },
        { name: '洗剤', price: 320, isFood: false },
        { name: 'しょうゆ', price: 250, isFood: true },
      ],
    });

    // Act & Assert
    expect(foodItemsOf(e).map((i) => i.name)).toEqual(['牛乳', 'しょうゆ']);
  });

  test('returns an empty array when the expense has no items', () => {
    expect(foodItemsOf(expense({ items: undefined }))).toEqual([]);
  });
});

describe('budgetSummary', () => {
  const now = new Date(2026, 7, 21); // 残り11日

  test('reports the remaining budget for the current month', () => {
    // Arrange
    const expenses = [
      expense({ date: '2026-08-05', total: 12000 }),
      expense({ date: '2026-08-18', total: 8000 }),
    ];

    // Act
    const s = budgetSummary({ monthlyLimit: 30000, expenses, now });

    // Assert
    expect(s.spent).toBe(20000);
    expect(s.remaining).toBe(10000);
    expect(s.isOver).toBe(false);
  });

  test('excludes expenses from other months', () => {
    // Arrange
    const expenses = [expense({ date: '2026-07-30', total: 9999 })];

    // Act & Assert
    expect(budgetSummary({ monthlyLimit: 30000, expenses, now }).spent).toBe(0);
  });

  test('divides the remaining budget across the days left', () => {
    // Arrange & Act
    const s = budgetSummary({ monthlyLimit: 30000, expenses: [expense({ date: '2026-08-01', total: 19000 })], now });

    // Assert
    expect(s.daysLeft).toBe(11);
    expect(s.dailyAllowance).toBe(1000); // 11000 / 11
  });

  test('flags an overspent month and clamps the daily allowance to zero', () => {
    // Arrange & Act
    const s = budgetSummary({ monthlyLimit: 10000, expenses: [expense({ date: '2026-08-02', total: 12000 })], now });

    // Assert
    expect(s.remaining).toBe(-2000);
    expect(s.isOver).toBe(true);
    expect(s.dailyAllowance).toBe(0);
  });

  test('reports that no budget has been set yet', () => {
    // Arrange & Act
    const s = budgetSummary({ monthlyLimit: 0, expenses: [], now });

    // Assert
    expect(s.hasLimit).toBe(false);
    expect(s.remaining).toBe(0);
  });

  test('treats a configured budget as set', () => {
    expect(budgetSummary({ monthlyLimit: 30000, expenses: [], now }).hasLimit).toBe(true);
  });

  test('tolerates a missing expense list', () => {
    expect(budgetSummary({ monthlyLimit: 30000, expenses: undefined, now }).spent).toBe(0);
  });
});

describe('projectExpense', () => {
  const now = new Date(2026, 7, 21); // 8月、残り11日
  const base = { monthlyLimit: 30000, expenses: [expense({ date: '2026-08-05', total: 10000 })], now };

  test('reports the remaining budget as it will be after recording', () => {
    // Arrange
    const summary = budgetSummary(base);

    // Act
    const p = projectExpense({ summary, amount: 3240, date: '2026-08-21', now });

    // Assert
    expect(summary.remaining).toBe(20000);
    expect(p.applies).toBe(true);
    expect(p.remaining).toBe(16760);
    expect(p.isOver).toBe(false);
  });

  test('flags a receipt that would push the month over budget', () => {
    const p = projectExpense({ summary: budgetSummary(base), amount: 25000, date: '2026-08-21', now });
    expect(p.remaining).toBe(-5000);
    expect(p.isOver).toBe(true);
  });

  test('recalculates the daily allowance from the projected remainder', () => {
    const p = projectExpense({ summary: budgetSummary(base), amount: 9000, date: '2026-08-21', now });
    expect(p.remaining).toBe(11000);
    expect(p.dailyAllowance).toBe(1000);
  });

  test('does not touch this month when the receipt is from another month', () => {
    // Arrange
    const summary = budgetSummary(base);

    // Act
    const p = projectExpense({ summary, amount: 5000, date: '2026-07-28', now });

    // Assert
    expect(p.applies).toBe(false);
    expect(p.remaining).toBe(summary.remaining);
    expect(p.isOver).toBe(false);
  });

  test('reports nothing to project when no budget is set', () => {
    const p = projectExpense({
      summary: budgetSummary({ monthlyLimit: 0, expenses: [], now }),
      amount: 3240,
      date: '2026-08-21',
      now,
    });
    expect(p.applies).toBe(false);
  });

  test('clamps the projected daily allowance to zero when overspent', () => {
    const p = projectExpense({ summary: budgetSummary(base), amount: 25000, date: '2026-08-21', now });
    expect(p.dailyAllowance).toBe(0);
  });
});

describe('categoryOf', () => {
  test('uses the explicit category when the item has one', () => {
    expect(categoryOf({ name: '洗剤', price: 320, category: 'daily' })).toBe('daily');
  });

  test('falls back to isFood for records saved before categories existed', () => {
    expect(categoryOf({ name: '牛乳', price: 198, isFood: true })).toBe('food');
    expect(categoryOf({ name: '洗剤', price: 320, isFood: false })).toBe('other');
  });

  test('treats an unknown category as other', () => {
    expect(categoryOf({ name: '謎', price: 1, category: 'groceries' })).toBe('other');
  });

  test('treats a missing item as other', () => {
    expect(categoryOf(undefined)).toBe('other');
    expect(categoryOf({ name: '謎', price: 1 })).toBe('other');
  });

  test('prefers the explicit category over a conflicting isFood flag', () => {
    expect(categoryOf({ name: '惣菜', price: 400, category: 'other', isFood: true })).toBe('other');
  });
});

describe('CATEGORIES', () => {
  test('exposes the three categories with Japanese labels', () => {
    expect(CATEGORIES).toEqual(['food', 'daily', 'other']);
    expect(CATEGORY_LABELS.food).toBe('食費');
    expect(CATEGORY_LABELS.daily).toBe('日用品');
    expect(CATEGORY_LABELS.other).toBe('その他');
  });
});

describe('totalByCategory', () => {
  const withItems = (id, items, total) => expense({ id, items, total });

  test('sums item prices per category', () => {
    // Arrange
    const list = [
      withItems('e-1', [
        { name: '牛乳', price: 200, category: 'food' },
        { name: '洗剤', price: 300, category: 'daily' },
      ], 500),
      withItems('e-2', [{ name: '豆腐', price: 100, category: 'food' }], 100),
    ];

    // Act
    const totals = totalByCategory(list);

    // Assert
    expect(totals.food).toBe(300);
    expect(totals.daily).toBe(300);
    expect(totals.other).toBe(0);
  });

  test('classifies legacy isFood items', () => {
    // Arrange
    const list = [
      withItems('e-1', [
        { name: '牛乳', price: 200, isFood: true },
        { name: '洗剤', price: 300, isFood: false },
      ], 500),
    ];

    // Act & Assert
    expect(totalByCategory(list)).toEqual({ food: 200, daily: 0, other: 300 });
  });

  test('books the unexplained remainder of a receipt to other', () => {
    // 品目の合計(300)がレシート合計(500)に満たない差額は「その他」に寄せる
    const list = [withItems('e-1', [{ name: '牛乳', price: 300, category: 'food' }], 500)];
    expect(totalByCategory(list)).toEqual({ food: 300, daily: 0, other: 200 });
  });

  test('does not invent a negative remainder when items exceed the total', () => {
    const list = [withItems('e-1', [{ name: '牛乳', price: 800, category: 'food' }], 500)];
    expect(totalByCategory(list).other).toBe(0);
  });

  test('books an itemless expense entirely to other', () => {
    expect(totalByCategory([withItems('e-1', [], 1200)])).toEqual({ food: 0, daily: 0, other: 1200 });
  });

  test('returns zeroes for an empty list', () => {
    expect(totalByCategory([])).toEqual({ food: 0, daily: 0, other: 0 });
  });
});

describe('totalByCategory — expense level category', () => {
  test('books an itemless expense to its own category', () => {
    // 手入力の記録は品目を持たないため、記録自体のカテゴリで集計する
    const list = [expense({ id: 'm-1', items: [], total: 1200, category: 'food' })];
    expect(totalByCategory(list)).toEqual({ food: 1200, daily: 0, other: 0 });
  });

  test('books the tax remainder of a receipt to the receipt category', () => {
    const list = [
      expense({
        id: 'e-1',
        items: [{ name: '牛乳', price: 2131, category: 'food' }],
        total: 2313,
        category: 'food',
      }),
    ];
    expect(totalByCategory(list)).toEqual({ food: 2313, daily: 0, other: 0 });
  });

  test('still books the remainder to other when the expense has no category', () => {
    const list = [expense({ id: 'e-1', items: [{ name: '牛乳', price: 300, category: 'food' }], total: 500 })];
    expect(totalByCategory(list)).toEqual({ food: 300, daily: 0, other: 200 });
  });
});
