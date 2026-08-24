import { describe, test, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useWeekPlan } from '@/lib/hooks';
import {
  PLAN_DAYS,
  sanitizePlan,
  planDayDate,
  currentDayIndex,
  isPlanFinished,
  cookedCount,
} from '@/lib/plan';

const day = (n, overrides = {}) => ({
  day: n,
  name: `料理${n}`,
  emoji: '🍽',
  description: '説明',
  usedFromFridge: [],
  usedFromShopping: [],
  carryOver: [],
  addOns: [],
  totalCost: 300,
  cookingTime: '約20分',
  reason: '理由',
  ...overrides,
});

const plan = (overrides = {}) => ({
  v: 1,
  startDate: '2026-08-24',
  createdAt: 1,
  shoppingList: [{ name: '豚こま切れ', estimatedPrice: 398 }],
  days: Array.from({ length: 7 }, (_, i) => day(i + 1)),
  ...overrides,
});

describe('planDayDate', () => {
  test('gives the start date for the first day', () => {
    expect(planDayDate('2026-08-24', 0)).toBe('2026-08-24');
  });

  test('walks forward one day at a time', () => {
    expect(planDayDate('2026-08-24', 3)).toBe('2026-08-27');
  });

  test('crosses a month boundary', () => {
    expect(planDayDate('2026-08-29', 6)).toBe('2026-09-04');
  });
});

describe('currentDayIndex', () => {
  test('is the first day on the start date', () => {
    expect(currentDayIndex(plan(), new Date(2026, 7, 24))).toBe(0);
  });

  test('advances with the calendar', () => {
    expect(currentDayIndex(plan(), new Date(2026, 7, 27))).toBe(3);
  });

  test('is the last day at the end of the week', () => {
    expect(currentDayIndex(plan(), new Date(2026, 7, 30))).toBe(6);
  });

  test('reports nothing once the week is over', () => {
    expect(currentDayIndex(plan(), new Date(2026, 7, 31))).toBeNull();
  });

  test('reports nothing before the plan starts', () => {
    expect(currentDayIndex(plan(), new Date(2026, 7, 23))).toBeNull();
  });

  test('reports nothing without a plan', () => {
    expect(currentDayIndex(null, new Date(2026, 7, 24))).toBeNull();
  });
});

describe('isPlanFinished', () => {
  test('is not finished during the week', () => {
    expect(isPlanFinished(plan(), new Date(2026, 7, 30))).toBe(false);
  });

  test('is finished the day after the last day', () => {
    expect(isPlanFinished(plan(), new Date(2026, 7, 31))).toBe(true);
  });

  test('treats a missing plan as finished', () => {
    expect(isPlanFinished(null, new Date(2026, 7, 24))).toBe(true);
  });
});

describe('cookedCount', () => {
  test('counts the days already cooked', () => {
    const p = plan({ days: [day(1, { cookedAt: 1 }), day(2), day(3, { cookedAt: 2 })] });
    expect(cookedCount(p)).toBe(2);
  });

  test('counts nothing for a fresh plan', () => {
    expect(cookedCount(plan())).toBe(0);
    expect(cookedCount(null)).toBe(0);
  });
});

describe('sanitizePlan', () => {
  test('keeps a well-formed plan', () => {
    expect(sanitizePlan(plan()).days).toHaveLength(7);
  });

  test('defines the week length', () => {
    expect(PLAN_DAYS).toBe(7);
  });

  test('rejects a plan without a usable start date', () => {
    expect(sanitizePlan(plan({ startDate: '2026/08/24' }))).toBeNull();
    expect(sanitizePlan(plan({ startDate: undefined }))).toBeNull();
  });

  test('rejects a plan with no days', () => {
    expect(sanitizePlan(plan({ days: [] }))).toBeNull();
    expect(sanitizePlan(plan({ days: undefined }))).toBeNull();
  });

  test('rejects junk outright', () => {
    expect(sanitizePlan(null)).toBeNull();
    expect(sanitizePlan('こんだて')).toBeNull();
  });

  test('drops days that have no dish name', () => {
    const p = sanitizePlan(plan({ days: [day(1), { day: 2 }, day(3)] }));
    expect(p.days.map((d) => d.name)).toEqual(['料理1', '料理3']);
  });

  test('renumbers the days it keeps', () => {
    const p = sanitizePlan(plan({ days: [day(1), { day: 2 }, day(3)] }));
    expect(p.days.map((d) => d.day)).toEqual([1, 2]);
  });

  test('never keeps more than a week', () => {
    const p = sanitizePlan(plan({ days: Array.from({ length: 10 }, (_, i) => day(i + 1)) }));
    expect(p.days).toHaveLength(7);
  });

  test('fills in the list fields a day may be missing', () => {
    const p = sanitizePlan(plan({ days: [{ day: 1, name: '肉じゃが' }] }));
    expect(p.days[0]).toMatchObject({
      usedFromFridge: [],
      usedFromShopping: [],
      carryOver: [],
      addOns: [],
    });
  });

  test('keeps only well-formed shopping list entries', () => {
    const p = sanitizePlan(
      plan({ shoppingList: [{ name: '豚こま', estimatedPrice: 398 }, { estimatedPrice: 100 }, null] })
    );
    expect(p.shoppingList).toEqual([{ name: '豚こま', estimatedPrice: 398 }]);
  });

  test('treats a missing shopping list as empty', () => {
    expect(sanitizePlan(plan({ shoppingList: undefined })).shoppingList).toEqual([]);
  });
});

describe('useWeekPlan', () => {
  test('starts with no plan', async () => {
    const { result } = renderHook(() => useWeekPlan());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBeNull();
  });

  test('restores a saved plan', async () => {
    // Arrange
    localStorage.setItem('plan:week', JSON.stringify(plan()));

    // Act
    const { result } = renderHook(() => useWeekPlan());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].days).toHaveLength(7);
    expect(result.current[0].startDate).toBe('2026-08-24');
  });

  test('discards a plan that cannot be read', async () => {
    localStorage.setItem('plan:week', JSON.stringify({ startDate: 'いつか', days: [] }));
    const { result } = renderHook(() => useWeekPlan());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBeNull();
  });

  test('persists a new plan', async () => {
    // Arrange
    const { result } = renderHook(() => useWeekPlan());
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => result.current[1](plan()));

    // Assert
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('plan:week')).startDate).toBe('2026-08-24')
    );
  });
});
