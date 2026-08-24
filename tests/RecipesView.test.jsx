import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecipesView from '@/components/RecipesView';

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

const renderView = (props = {}) =>
  render(
    <RecipesView
      currentRecipes={[recipe()]}
      currentMeta={{ source: 'fridge', fridgeCount: 2 }}
      onSearchFromFlyer={vi.fn()}
      onSearchFromFridge={vi.fn()}
      onOpenRecipe={vi.fn()}
      fridgeCount={2}
      adSlot=""
      expiringNames={[]}
      {...props}
    />
  );

describe('RecipesView — using up what is about to expire', () => {
  test('says which expiring ingredient a recipe uses up', () => {
    renderView({ expiringNames: ['豚こま'] });
    expect(screen.getByText('豚こまを使い切れます')).toBeInTheDocument();
  });

  test('counts the rest when a recipe uses several of them', () => {
    renderView({ expiringNames: ['豚こま', 'じゃがいも'] });
    expect(screen.getByText('豚こまほか1品を使い切れます')).toBeInTheDocument();
  });

  test('says nothing when the recipe uses none of them', () => {
    renderView({ expiringNames: ['牛乳'] });
    expect(screen.queryByText(/使い切れます/)).not.toBeInTheDocument();
  });

  test('says nothing when nothing is about to expire', () => {
    renderView({ expiringNames: [] });
    expect(screen.queryByText(/使い切れます/)).not.toBeInTheDocument();
  });

  test('tolerates a recipe with no fridge ingredients', () => {
    renderView({ currentRecipes: [recipe({ usedFromFridge: undefined })], expiringNames: ['豚こま'] });
    expect(screen.queryByText(/使い切れます/)).not.toBeInTheDocument();
  });
});
