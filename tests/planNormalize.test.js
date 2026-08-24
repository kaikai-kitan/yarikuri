import { describe, test, expect } from 'vitest';
import { normalizePlan } from '../functions/api/_plan.js';

const day = (n, overrides = {}) => ({
  day: n,
  name: `料理${n}`,
  emoji: '🍽',
  description: '説明',
  usedFromFridge: ['豚こま'],
  usedFromShopping: ['じゃがいも'],
  carryOver: ['にんじん'],
  addOns: [{ name: 'カレールー', estimatedPrice: 180 }],
  totalCost: 320,
  cookingTime: '約30分',
  reason: '豚こまが2日で切れるため',
  ...overrides,
});

const raw = (overrides = {}) => ({
  shoppingList: [{ name: '豚こま切れ', estimatedPrice: 398 }],
  days: Array.from({ length: 7 }, (_, i) => day(i + 1)),
  ...overrides,
});

describe('normalizePlan', () => {
  test('keeps a well-formed plan and stamps the start date', () => {
    const plan = normalizePlan(raw(), '2026-08-24');
    expect(plan.startDate).toBe('2026-08-24');
    expect(plan.days).toHaveLength(7);
    expect(plan.days[0]).toMatchObject({ day: 1, name: '料理1', reason: '豚こまが2日で切れるため' });
  });

  test('returns nothing when the response has no usable days', () => {
    expect(normalizePlan({ days: [] }, '2026-08-24')).toBeNull();
    expect(normalizePlan({}, '2026-08-24')).toBeNull();
    expect(normalizePlan(null, '2026-08-24')).toBeNull();
  });

  test('drops days with no dish name and renumbers the rest', () => {
    const plan = normalizePlan(raw({ days: [day(1), { day: 2, emoji: '🍛' }, day(3)] }), '2026-08-24');
    expect(plan.days.map((d) => d.name)).toEqual(['料理1', '料理3']);
    expect(plan.days.map((d) => d.day)).toEqual([1, 2]);
  });

  test('never returns more than a week', () => {
    const plan = normalizePlan(raw({ days: Array.from({ length: 10 }, (_, i) => day(i + 1)) }), '2026-08-24');
    expect(plan.days).toHaveLength(7);
  });

  test('fills in the lists a day may be missing', () => {
    const plan = normalizePlan({ days: [{ name: '肉じゃが' }] }, '2026-08-24');
    expect(plan.days[0]).toMatchObject({
      usedFromFridge: [],
      usedFromShopping: [],
      carryOver: [],
      addOns: [],
    });
  });

  test('keeps only string entries in the ingredient lists', () => {
    const plan = normalizePlan(
      { days: [day(1, { usedFromFridge: ['豚こま', 42, null, '  '] })] },
      '2026-08-24'
    );
    expect(plan.days[0].usedFromFridge).toEqual(['豚こま']);
  });

  test('rounds the costs and rejects the ones that are not numbers', () => {
    const plan = normalizePlan(
      { days: [day(1, { totalCost: '320.6' }), day(2, { totalCost: 'やすい' })] },
      '2026-08-24'
    );
    expect(plan.days[0].totalCost).toBe(321);
    expect(plan.days[1].totalCost).toBe(0);
  });

  test('keeps only add-ons that have a name', () => {
    const plan = normalizePlan(
      { days: [day(1, { addOns: [{ name: 'カレールー', estimatedPrice: 180 }, { estimatedPrice: 90 }, null] })] },
      '2026-08-24'
    );
    expect(plan.days[0].addOns).toEqual([{ name: 'カレールー', estimatedPrice: 180 }]);
  });

  test('defaults an add-on with no price to zero', () => {
    const plan = normalizePlan({ days: [day(1, { addOns: [{ name: '塩' }] })] }, '2026-08-24');
    expect(plan.days[0].addOns[0].estimatedPrice).toBe(0);
  });

  test('keeps only well-formed shopping list entries', () => {
    const plan = normalizePlan(
      raw({ shoppingList: [{ name: '豚こま', estimatedPrice: 398 }, { estimatedPrice: 100 }, 'にんじん'] }),
      '2026-08-24'
    );
    expect(plan.shoppingList).toEqual([{ name: '豚こま', estimatedPrice: 398 }]);
  });

  test('treats a missing shopping list as empty', () => {
    expect(normalizePlan({ days: [day(1)] }, '2026-08-24').shoppingList).toEqual([]);
  });

  test('truncates an overlong dish name', () => {
    const plan = normalizePlan({ days: [day(1, { name: 'あ'.repeat(80) })] }, '2026-08-24');
    expect(plan.days[0].name.length).toBe(40);
  });
});
