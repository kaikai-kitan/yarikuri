import { describe, test, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useMonthlyLimit, useExpenses } from '@/lib/hooks';
import { loadValue, saveValue } from '@/lib/storage';

const expense = (overrides = {}) => ({
  id: 'e-1',
  date: '2026-08-10',
  store: 'スーパーA',
  total: 1000,
  items: [{ name: '牛乳', price: 198, isFood: true }],
  createdAt: 1,
  ...overrides,
});

describe('storage values', () => {
  test('returns null when the key is missing', async () => {
    expect(await loadValue('budget:limit')).toBeNull();
  });

  test('round-trips a number', async () => {
    await saveValue('budget:limit', 30000);
    expect(await loadValue('budget:limit')).toBe(30000);
  });

  test('returns null when the stored JSON is malformed', async () => {
    localStorage.setItem('budget:limit', '{not json');
    expect(await loadValue('budget:limit')).toBeNull();
  });
});

describe('useMonthlyLimit', () => {
  test('starts at zero when nothing was saved', async () => {
    const { result } = renderHook(() => useMonthlyLimit());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBe(0);
  });

  test('restores a saved limit', async () => {
    localStorage.setItem('budget:limit', JSON.stringify(30000));
    const { result } = renderHook(() => useMonthlyLimit());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBe(30000);
  });

  test('persists a new limit', async () => {
    const { result } = renderHook(() => useMonthlyLimit());
    await waitFor(() => expect(result.current[2]).toBe(true));

    act(() => result.current[1](45000));

    await waitFor(() => expect(JSON.parse(localStorage.getItem('budget:limit'))).toBe(45000));
  });

  test('falls back to zero when the stored limit is not a usable number', async () => {
    localStorage.setItem('budget:limit', JSON.stringify('たくさん'));
    const { result } = renderHook(() => useMonthlyLimit());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBe(0);
  });

  test('rejects a negative stored limit', async () => {
    localStorage.setItem('budget:limit', JSON.stringify(-500));
    const { result } = renderHook(() => useMonthlyLimit());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBe(0);
  });
});

describe('useExpenses', () => {
  test('restores saved expenses', async () => {
    localStorage.setItem('budget:expenses', JSON.stringify([expense()]));
    const { result } = renderHook(() => useExpenses());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toHaveLength(1);
  });

  test('drops entries without an id, a date or a numeric total', async () => {
    // Arrange
    localStorage.setItem(
      'budget:expenses',
      JSON.stringify([
        expense(),
        { date: '2026-08-01', total: 100 },
        expense({ id: 'e-2', date: undefined }),
        expense({ id: 'e-3', total: 'abc' }),
        null,
      ])
    );

    // Act
    const { result } = renderHook(() => useExpenses());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].map((e) => e.id)).toEqual(['e-1']);
  });

  test('normalises a missing items array to an empty one', async () => {
    localStorage.setItem('budget:expenses', JSON.stringify([expense({ items: undefined })]));
    const { result } = renderHook(() => useExpenses());
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0][0].items).toEqual([]);
  });
});
