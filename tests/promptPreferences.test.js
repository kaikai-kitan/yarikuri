import { describe, test, expect } from 'vitest';
import { servingsBlock, priorityBlock } from '../functions/api/_prompt.js';

describe('servingsBlock', () => {
  test('states how many people are eating', () => {
    expect(servingsBlock(4)).toContain('4人分');
  });

  test('keeps the per-person figures per person', () => {
    // 分量は人数分、金額とカロリーは1人前。ここを混ぜると画面の表示が壊れる。
    const block = servingsBlock(4);
    expect(block).toContain('1人前');
    expect(block).toMatch(/totalCost/);
    expect(block).toMatch(/calories/);
  });

  test('says nothing when the count is missing or unusable', () => {
    expect(servingsBlock(undefined)).toBe('');
    expect(servingsBlock(null)).toBe('');
    expect(servingsBlock(0)).toBe('');
    expect(servingsBlock(-2)).toBe('');
    expect(servingsBlock('4人')).toBe('');
  });
});

describe('priorityBlock', () => {
  test('asks for the cheapest first when cost is the axis', () => {
    expect(priorityBlock('cost')).toContain('材料費');
  });

  test('asks for the lightest first when calories are the axis', () => {
    const block = priorityBlock('calorie');
    expect(block).toContain('カロリー');
    expect(block).toContain('kcal');
  });

  test('asks for the quickest first when time is the axis', () => {
    expect(priorityBlock('time')).toContain('調理時間');
  });

  test('always names the field to sort on', () => {
    ['cost', 'calorie', 'time'].forEach((p) => {
      expect(priorityBlock(p)).toMatch(/並べ/);
    });
  });

  test('says nothing for an axis it does not know', () => {
    expect(priorityBlock('protein')).toBe('');
    expect(priorityBlock(undefined)).toBe('');
  });
});
