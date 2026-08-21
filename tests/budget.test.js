import { describe, test, expect } from 'vitest';
import {
  monthKey,
  daysLeftInMonth,
  expensesInMonth,
  totalOf,
  foodItemsOf,
  budgetSummary,
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
