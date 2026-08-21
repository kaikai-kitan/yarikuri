import { describe, test, expect } from 'vitest';
import { normalizeReceipt } from '../functions/api/_receipt.js';

const today = () => new Date().toISOString().slice(0, 10);

describe('normalizeReceipt', () => {
  test('keeps well-formed items', () => {
    // Arrange & Act
    const r = normalizeReceipt({
      store: 'スーパーA',
      date: '2026-08-21',
      total: 500,
      items: [{ name: '牛乳', price: 198, category: 'food' }],
    });

    // Assert
    expect(r).toMatchObject({ store: 'スーパーA', date: '2026-08-21', total: 500 });
    expect(r.items).toEqual([{ name: '牛乳', price: 198, category: 'food', isFood: true }]);
  });

  test('drops items without a name or a numeric price', () => {
    const r = normalizeReceipt({
      total: 100,
      items: [
        { name: '牛乳', price: 198, category: 'food' },
        { name: '   ', price: 100, category: 'food' },
        { name: '謎', price: 'たかい', category: 'food' },
        null,
      ],
    });
    expect(r.items.map((i) => i.name)).toEqual(['牛乳']);
  });

  test('maps each known category through', () => {
    const r = normalizeReceipt({
      total: 900,
      items: [
        { name: '牛乳', price: 200, category: 'food' },
        { name: '洗剤', price: 300, category: 'daily' },
        { name: '雑誌', price: 400, category: 'other' },
      ],
    });
    expect(r.items.map((i) => i.category)).toEqual(['food', 'daily', 'other']);
  });

  test('falls back to other for an unknown category', () => {
    const r = normalizeReceipt({ total: 1, items: [{ name: '謎', price: 1, category: 'groceries' }] });
    expect(r.items[0].category).toBe('other');
  });

  test('accepts a legacy isFood flag when no category is given', () => {
    const r = normalizeReceipt({ total: 1, items: [{ name: '牛乳', price: 1, isFood: true }] });
    expect(r.items[0].category).toBe('food');
  });

  test('mirrors the category into isFood for older clients', () => {
    const r = normalizeReceipt({
      total: 2,
      items: [
        { name: '牛乳', price: 1, category: 'food' },
        { name: '洗剤', price: 1, category: 'daily' },
      ],
    });
    expect(r.items.map((i) => i.isFood)).toEqual([true, false]);
  });

  test('falls back to today when the date is missing or malformed', () => {
    expect(normalizeReceipt({ total: 1, items: [] }).date).toBe(today());
    expect(normalizeReceipt({ date: '2026/08/21', total: 1, items: [] }).date).toBe(today());
  });

  test('uses the item total when the receipt total cannot be read', () => {
    const r = normalizeReceipt({
      items: [
        { name: '牛乳', price: 200, category: 'food' },
        { name: '洗剤', price: 300, category: 'daily' },
      ],
    });
    expect(r.total).toBe(500);
  });

  test('truncates an overlong store name', () => {
    const r = normalizeReceipt({ store: 'あ'.repeat(50), total: 1, items: [] });
    expect(r.store.length).toBe(30);
  });

  test('caps the number of items', () => {
    const items = Array.from({ length: 80 }, (_, i) => ({ name: `品${i}`, price: 1, category: 'food' }));
    expect(normalizeReceipt({ total: 80, items }).items).toHaveLength(60);
  });

  test('survives a response with no items array at all', () => {
    const r = normalizeReceipt({ store: 'A', total: 300 });
    expect(r.items).toEqual([]);
    expect(r.total).toBe(300);
  });
});
