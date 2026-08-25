import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecipesPageClient from '@/app/recipes/client';
import { planWeek, suggestRecipes } from '@/lib/api';

const navigation = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  searchParams: {
    get: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => navigation.searchParams,
}));

vi.mock('@/lib/api', () => ({
  fetchRecipeLink: vi.fn(),
  ocrFlyer: vi.fn(),
  planWeek: vi.fn(),
  suggestRecipes: vi.fn(),
}));

vi.mock('@/components/RewardAdModal', () => ({
  default: ({ onClaim, onCancel }) => (
    <div>
      <button type="button" onClick={onClaim}>広告視聴を完了</button>
      <button type="button" onClick={onCancel}>広告を閉じる</button>
    </div>
  ),
}));

vi.mock('@/components/SearchingScreen', () => ({
  default: () => <div>提案中</div>,
}));

vi.mock('@/components/WeekPlanView', () => ({
  default: () => <div>週間献立</div>,
}));

const suggestedRecipe = {
  name: '肉じゃが',
  description: '定番の煮物',
  usedFromFridge: ['じゃがいも'],
  missingIngredients: [],
  totalCost: 320,
};

const weekPlan = {
  startDate: '2026-08-24',
  days: [{ date: '2026-08-24', name: '肉じゃが', usedFromFridge: ['じゃがいも'] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  navigation.searchParams.get.mockReturnValue(null);
  localStorage.setItem(
    'fridge:items',
    JSON.stringify([{ id: 'f-1', name: 'じゃがいも', addedAt: 1 }])
  );
  suggestRecipes.mockResolvedValue([suggestedRecipe]);
  planWeek.mockResolvedValue(weekPlan);
});

describe.sequential('RecipesPageClient — proposal mode routing', () => {
  test('runs a one-time recipe proposal straight away', async () => {
    // Arrange — 広告ゲートは廃止されたため、提案はそのまま走る
    navigation.searchParams.get.mockReturnValue('fridge');

    // Act
    render(<RecipesPageClient />);

    // Assert
    await waitFor(() => expect(suggestRecipes).toHaveBeenCalled());
    expect(planWeek).not.toHaveBeenCalled();
    expect(navigation.router.replace).toHaveBeenCalledWith('/recipes/', {
      scroll: false,
    });
  });

  test('runs a week proposal straight away', async () => {
    // Arrange
    navigation.searchParams.get.mockReturnValue('week');

    // Act
    render(<RecipesPageClient />);

    // Assert
    await waitFor(() => expect(planWeek).toHaveBeenCalled());
    expect(suggestRecipes).not.toHaveBeenCalled();
    expect(navigation.router.replace).toHaveBeenCalledWith('/recipes/', {
      scroll: false,
    });
  });

  test('consumes a week request and explains when the fridge is empty', async () => {
    // Arrange
    localStorage.setItem('fridge:items', JSON.stringify([]));
    navigation.searchParams.get.mockReturnValue('week');

    // Act
    render(<RecipesPageClient />);

    // Assert
    expect(
      await screen.findByText('冷蔵庫タブで食材を追加してください')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '広告視聴を完了' })).not.toBeInTheDocument();
    expect(navigation.router.replace).toHaveBeenCalledWith('/recipes/', {
      scroll: false,
    });
  });
});
