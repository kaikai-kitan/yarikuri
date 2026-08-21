import { describe, test, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFridge, useHistory } from '@/lib/hooks';

describe('useFridge', () => {
  test('drops stored entries that are missing an id or name', async () => {
    // Arrange
    localStorage.setItem(
      'fridge:items',
      JSON.stringify([{ id: 'id-1', name: '玉ねぎ', addedAt: 1 }, { name: 'idがない' }, null])
    );

    // Act
    const { result } = renderHook(() => useFridge());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].map((f) => f.id)).toEqual(['id-1']);
  });

  test('restores saved fridge items from localStorage on mount', async () => {
    // Arrange
    const saved = [{ id: 'id-1', name: '玉ねぎ', addedAt: 1 }];
    localStorage.setItem('fridge:items', JSON.stringify(saved));

    // Act
    const { result } = renderHook(() => useFridge());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toEqual(saved);
  });

  test('persists fridge items after they change', async () => {
    // Arrange
    const { result } = renderHook(() => useFridge());
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => result.current[1]([{ id: 'id-2', name: '卵', addedAt: 2 }]));

    // Assert
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('fridge:items'))[0].name).toBe('卵')
    );
  });
});

describe('useHistory', () => {
  const makeSearch = (id, overrides = {}) => ({
    id,
    searchedAt: 1,
    source: 'fridge',
    fridgeUsed: [],
    flyerItems: null,
    recipes: [{ title: 'カレー' }],
    ...overrides,
  });

  test('restores saved search history from localStorage on mount', async () => {
    // Arrange
    const saved = [makeSearch('h-1')];
    localStorage.setItem('history:searches', JSON.stringify(saved));

    // Act
    const { result } = renderHook(() => useHistory());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toEqual(saved);
  });

  test('prepends a pushed entry to the history', async () => {
    // Arrange
    localStorage.setItem('history:searches', JSON.stringify([makeSearch('h-1')]));
    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => result.current[1](makeSearch('h-2')));

    // Assert
    await waitFor(() => expect(result.current[0].map((h) => h.id)).toEqual(['h-2', 'h-1']));
  });

  test('keeps at most `limit` entries in the history', async () => {
    // Arrange
    localStorage.setItem(
      'history:searches',
      JSON.stringify([makeSearch('h-1'), makeSearch('h-2')])
    );
    const { result } = renderHook(() => useHistory(2));
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => result.current[1](makeSearch('h-3')));

    // Assert
    await waitFor(() => expect(result.current[0].map((h) => h.id)).toEqual(['h-3', 'h-1']));
  });

  test('persists a pushed entry to localStorage', async () => {
    // Arrange
    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => result.current[1](makeSearch('h-1')));

    // Assert
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('history:searches'))[0].id).toBe('h-1')
    );
  });

  test('drops stored entries that have no recipes array', async () => {
    // Arrange
    localStorage.setItem(
      'history:searches',
      JSON.stringify([makeSearch('h-1'), { id: 'h-broken', searchedAt: 2 }])
    );

    // Act
    const { result } = renderHook(() => useHistory());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].map((h) => h.id)).toEqual(['h-1']);
  });
});
