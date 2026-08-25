import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipesView, { RecipeResultsView } from '@/components/RecipesView';

const recipe = (overrides = {}) => ({
  name: '肉じゃが',
  emoji: '🥔',
  description: '定番の煮物',
  usedFromFridge: ['豚こま', 'じゃがいも'],
  usedFromDeals: [],
  missingIngredients: [],
  totalCost: 320,
  cookingTime: '約30分',
  ...overrides,
});

const favorite = (overrides = {}) => ({
  id: 'fav-1',
  savedAt: 1,
  recipe: recipe(),
  ...overrides,
});

// 提案結果ビュー（V字メニューから提案を実行した後に出る画面）
const renderResults = (props = {}) =>
  render(
    <RecipeResultsView
      currentRecipes={[recipe()]}
      currentMeta={{ source: 'fridge', fridgeCount: 2 }}
      onOpenRecipe={vi.fn()}
      onToggleFavorite={vi.fn()}
      expiringNames={[]}
      favorites={[]}
      {...props}
    />
  );

// レシピタブ（お気に入り一覧）
const renderFavorites = (props = {}) =>
  render(
    <RecipesView
      favorites={[]}
      onToggleFavorite={vi.fn()}
      onOpenRecipe={vi.fn()}
      {...props}
    />
  );

describe('RecipeResultsView — using up what is about to expire', () => {
  test('says which expiring ingredient a recipe uses up', () => {
    renderResults({ expiringNames: ['豚こま'] });
    expect(screen.getByText('豚こまを使い切れます')).toBeInTheDocument();
  });

  test('counts the rest when a recipe uses several of them', () => {
    renderResults({ expiringNames: ['豚こま', 'じゃがいも'] });
    expect(screen.getByText('豚こまほか1品を使い切れます')).toBeInTheDocument();
  });

  test('says nothing when the recipe uses none of them', () => {
    renderResults({ expiringNames: ['牛乳'] });
    expect(screen.queryByText(/使い切れます/)).not.toBeInTheDocument();
  });

  test('says nothing when nothing is about to expire', () => {
    renderResults({ expiringNames: [] });
    expect(screen.queryByText(/使い切れます/)).not.toBeInTheDocument();
  });

  test('tolerates a recipe with no fridge ingredients', () => {
    renderResults({
      currentRecipes: [recipe({ usedFromFridge: undefined })],
      expiringNames: ['豚こま'],
    });
    expect(screen.queryByText(/使い切れます/)).not.toBeInTheDocument();
  });
});

describe('RecipeResultsView — saving a proposed recipe', () => {
  test('shows a star on the left of every proposed recipe', () => {
    // Arrange & Act
    renderResults();

    // Assert — 44px はタップ目標の下限
    const star = screen.getByRole('button', { name: '肉じゃがをお気に入りに追加' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
    expect(star).toHaveStyle({ width: '44px', height: '44px' });
    expect(star.className).toContain('left-3');
  });

  test('marks a recipe that is already a favorite', () => {
    renderResults({ favorites: [favorite()] });

    expect(
      screen.getByRole('button', { name: '肉じゃがのお気に入りを解除' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('toggles the star without opening the recipe details', () => {
    // Arrange
    const onToggleFavorite = vi.fn();
    const onOpenRecipe = vi.fn();
    renderResults({ onToggleFavorite, onOpenRecipe });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '肉じゃがをお気に入りに追加' }));

    // Assert
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ name: '肉じゃが' }));
    expect(onOpenRecipe).not.toHaveBeenCalled();
  });

  test('shows where the proposal came from', () => {
    renderResults({ currentMeta: { source: 'combined', flyerCount: 4, fridgeCount: 2 } });
    expect(screen.getByText('チラシ 4件 + 冷蔵庫')).toBeInTheDocument();
  });
});

describe('RecipesView — the favorites tab', () => {
  test('shows an empty state when nothing has been saved', () => {
    renderFavorites({ favorites: [] });

    expect(screen.getByText('お気に入りはまだありません')).toBeInTheDocument();
  });

  test('lists what was saved', () => {
    renderFavorites({ favorites: [favorite()] });

    expect(screen.getByText('保存したレシピ 1件')).toBeInTheDocument();
    expect(screen.getByText('肉じゃが')).toBeInTheDocument();
  });

  test('opens a saved recipe', () => {
    // Arrange
    const onOpenRecipe = vi.fn();
    renderFavorites({ favorites: [favorite()], onOpenRecipe });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '肉じゃがの詳細を見る' }));

    // Assert
    expect(onOpenRecipe).toHaveBeenCalledWith(expect.objectContaining({ name: '肉じゃが' }));
  });

  test('can remove a saved recipe', () => {
    // Arrange
    const onToggleFavorite = vi.fn();
    renderFavorites({ favorites: [favorite()], onToggleFavorite });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '肉じゃがのお気に入りを解除' }));

    // Assert
    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ name: '肉じゃが' }));
  });

  test('shows every saved recipe as already starred', () => {
    // お気に入り一覧に出ているものは必ず登録済み
    renderFavorites({
      favorites: [favorite(), favorite({ id: 'fav-2', recipe: recipe({ name: '豚汁' }) })],
    });

    expect(screen.getByRole('button', { name: '肉じゃがのお気に入りを解除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '豚汁のお気に入りを解除' })).toBeInTheDocument();
  });
});
