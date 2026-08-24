import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
      onPlanWeek={vi.fn()}
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

describe('RecipesView — planning a week', () => {
  test('offers to plan a week of meals', () => {
    renderView();
    expect(screen.getByRole('button', { name: /1週間分の献立を作る/ })).toBeInTheDocument();
  });

  test('explains what the plan does', () => {
    renderView();
    expect(screen.getByText('前日の残りを繋いで7日分をまとめて提案')).toBeInTheDocument();
  });

  test('asks for the plan when pressed', () => {
    // Arrange
    const onPlanWeek = vi.fn();
    render(
      <RecipesView
        currentRecipes={[]}
        currentMeta={null}
        onSearchFromFlyer={vi.fn()}
        onSearchFromFridge={vi.fn()}
        onPlanWeek={onPlanWeek}
        onOpenRecipe={vi.fn()}
        fridgeCount={3}
        adSlot=""
        expiringNames={[]}
      />
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: /1週間分の献立を作る/ }));

    // Assert
    expect(onPlanWeek).toHaveBeenCalled();
  });

  test('cannot plan a week with an empty fridge', () => {
    // Arrange
    const onPlanWeek = vi.fn();
    render(
      <RecipesView
        currentRecipes={[]}
        currentMeta={null}
        onSearchFromFlyer={vi.fn()}
        onSearchFromFridge={vi.fn()}
        onPlanWeek={onPlanWeek}
        onOpenRecipe={vi.fn()}
        fridgeCount={0}
        adSlot=""
        expiringNames={[]}
      />
    );

    // Act & Assert
    expect(screen.getByRole('button', { name: /1週間分の献立を作る/ })).toBeDisabled();
  });
});
