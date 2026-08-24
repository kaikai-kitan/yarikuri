import { describe, test, expect } from 'vitest';
import { fridgeLine, urgentBlock } from '../functions/api/suggest-recipes.js';

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
