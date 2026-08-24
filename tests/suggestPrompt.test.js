import { describe, test, expect } from 'vitest';
import { fridgeLine, fridgeText, flyerText, urgentBlock, budgetBlock } from '../functions/api/_prompt.js';

describe('fridgeLine', () => {
  test('shows the days left for an ingredient that has an expiry', () => {
    expect(fridgeLine({ name: '豚こま', daysLeft: 2 })).toBe('・豚こま（あと2日）');
  });

  test('calls out an ingredient that expires today', () => {
    expect(fridgeLine({ name: '牛乳', daysLeft: 0 })).toBe('・牛乳（今日が期限）');
  });

  test('omits the note when there is no expiry', () => {
    expect(fridgeLine({ name: 'しょうゆ' })).toBe('・しょうゆ');
  });

  test('still accepts the plain strings older clients send', () => {
    expect(fridgeLine('玉ねぎ')).toBe('・玉ねぎ');
  });

  test('drops an entry with no usable name', () => {
    expect(fridgeLine({ daysLeft: 2 })).toBeNull();
    expect(fridgeLine(null)).toBeNull();
  });
});

describe('urgentBlock', () => {
  test('asks the AI to use up what is running out', () => {
    // Arrange & Act
    const block = urgentBlock([
      { name: '牛乳', daysLeft: 0 },
      { name: '豚こま', daysLeft: 2 },
      { name: 'キャベツ', daysLeft: 7 },
    ]);

    // Assert
    expect(block).toContain('【まもなく期限切れ】');
    expect(block).toContain('・牛乳');
    expect(block).toContain('・豚こま');
    expect(block).not.toContain('・キャベツ');
    expect(block).toContain('最優先で使い切る');
  });

  test('says nothing when everything has time left', () => {
    expect(urgentBlock([{ name: 'キャベツ', daysLeft: 7 }, { name: 'しょうゆ' }])).toBe('');
  });

  test('says nothing for the plain strings older clients send', () => {
    expect(urgentBlock(['玉ねぎ'])).toBe('');
  });

  test('says nothing for an empty fridge', () => {
    expect(urgentBlock([])).toBe('');
  });
});

describe('fridgeText', () => {
  test('lists the fridge with expiry notes', () => {
    expect(fridgeText([{ name: '豚こま', daysLeft: 2 }, { name: 'しょうゆ' }]))
      .toBe('・豚こま（あと2日）\n・しょうゆ');
  });

  test('says so when the fridge is empty', () => {
    expect(fridgeText([])).toBe('（登録なし）');
    expect(fridgeText(undefined)).toBe('（登録なし）');
  });
});

describe('flyerText', () => {
  test('lists the deals with their store', () => {
    expect(flyerText([{ name: '豚こま', price: 398, store: 'スーパーA' }]))
      .toBe('・豚こま 398円（スーパーA）');
  });

  test('omits the store when it is unknown', () => {
    expect(flyerText([{ name: '豚こま', price: 398, store: '' }])).toBe('・豚こま 398円');
  });

  test('says so when there are no deals', () => {
    expect(flyerText([])).toBe('（なし）');
  });
});

describe('budgetBlock', () => {
  test('asks for meals inside the daily allowance', () => {
    const block = budgetBlock({ remaining: 17000, daysLeft: 8, dailyAllowance: 2125, scope: 'food' });
    expect(block).toContain('今月の食費の残り');
    expect(block).toContain('17,000円');
  });

  test('names the overall budget when no food allocation is used', () => {
    expect(budgetBlock({ remaining: 25000, daysLeft: 8, dailyAllowance: 3125, scope: 'total' }))
      .toContain('今月の予算の残り');
  });

  test('switches to using up what is already there when overspent', () => {
    const block = budgetBlock({ remaining: -2000, daysLeft: 8, dailyAllowance: 0, scope: 'food' });
    expect(block).toContain('すでに超過');
    expect(block).toContain('買い足しをできる限り避け');
  });

  test('says nothing when no budget is set', () => {
    expect(budgetBlock(null)).toBe('');
    expect(budgetBlock({ remaining: 1000, daysLeft: 0, dailyAllowance: 0 })).toBe('');
  });
});
