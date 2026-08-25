import { describe, test, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFavorites, useFridge, useHistory } from '@/lib/hooks';

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

  test('keeps a well-formed expiry date', async () => {
    // Arrange
    localStorage.setItem(
      'fridge:items',
      JSON.stringify([{ id: 'f-1', name: '牛乳', addedAt: 1, expiresAt: '2026-08-30' }])
    );

    // Act
    const { result } = renderHook(() => useFridge());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0][0].expiresAt).toBe('2026-08-30');
  });

  test('keeps the item but drops a malformed expiry date', async () => {
    // Arrange
    localStorage.setItem(
      'fridge:items',
      JSON.stringify([{ id: 'f-1', name: '牛乳', addedAt: 1, expiresAt: 'まだ大丈夫' }])
    );

    // Act
    const { result } = renderHook(() => useFridge());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toHaveLength(1);
    expect(result.current[0][0].expiresAt).toBeUndefined();
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

describe('useFavorites', () => {
  const makeRecipe = (name = '肉じゃが') => ({
    name,
    emoji: '🥔',
    description: '定番の煮物',
    totalCost: 320,
  });

  test('restores saved favorite recipes from localStorage', async () => {
    // Arrange
    const saved = [{ id: 'fav-1', savedAt: 1, recipe: makeRecipe() }];
    localStorage.setItem('recipes:favorites', JSON.stringify(saved));

    // Act
    const { result } = renderHook(() => useFavorites());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toEqual(saved);
  });

  test('drops stored entries without a usable recipe name', async () => {
    // Arrange
    localStorage.setItem(
      'recipes:favorites',
      JSON.stringify([
        { id: 'fav-1', savedAt: 1, recipe: makeRecipe() },
        { id: 'fav-2', savedAt: 2, recipe: { name: '  ' } },
        { id: 'fav-3', savedAt: 3 },
        null,
      ])
    );

    // Act
    const { result } = renderHook(() => useFavorites());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].map((favorite) => favorite.id)).toEqual(['fav-1']);
  });

  test('adds a favorite and persists its recipe snapshot', async () => {
    // Arrange
    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => result.current[1](makeRecipe()));

    // Assert
    await waitFor(() => expect(result.current[0]).toHaveLength(1));
    expect(result.current[0][0].recipe.name).toBe('肉じゃが');
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('recipes:favorites'))[0].recipe.name).toBe('肉じゃが')
    );
  });

  test('toggles the same normalized recipe name off instead of duplicating it', async () => {
    // Arrange
    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current[2]).toBe(true));
    act(() => result.current[1](makeRecipe('肉じゃが')));

    // Act
    act(() => result.current[1](makeRecipe('  肉じゃが  ')));

    // Assert
    expect(result.current[0]).toEqual([]);
  });

  test('keeps both favorites when two toggles are batched', async () => {
    // Arrange
    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current[2]).toBe(true));

    // Act
    act(() => {
      result.current[1](makeRecipe('肉じゃが'));
      result.current[1](makeRecipe('親子丼'));
    });

    // Assert
    expect(result.current[0].map((favorite) => favorite.recipe.name)).toEqual([
      '親子丼',
      '肉じゃが',
    ]);
  });
});
