import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeView from '@/components/HomeView';

const MINUTE = 60 * 1000;

const entry = (overrides = {}) => ({
  id: 'h1',
  searchedAt: Date.now(),
  source: 'fridge',
  recipes: [
    { name: '肉じゃが', emoji: '🥔' },
    { name: '豚汁', emoji: '🍲' },
  ],
  ...overrides,
});

const day = (n) => ({
  day: n,
  name: `料理${n}`,
  emoji: '🍽',
  description: '説明',
  reason: `理由${n}`,
  usedFromFridge: [],
  usedFromShopping: [],
  carryOver: [],
  addOns: [],
  totalCost: 300,
  cookingTime: '約20分',
});

const weekPlan = () => ({
  startDate: '2026-08-24',
  createdAt: 1,
  shoppingList: [{ name: '豚こま切れ', estimatedPrice: 398 }],
  days: Array.from({ length: 7 }, (_, i) => day(i + 1)),
});

const renderView = (props = {}) => {
  const handlers = {
    onOpenHistory: vi.fn(),
    onClearPlan: vi.fn(),
    onToggleCooked: vi.fn(),
    onFetchLink: vi.fn(),
  };
  render(
    <HomeView
      history={[entry()]}
      weekPlan={null}
      recipeLinks={{}}
      linkingAvailable
      adSlot=""
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe('HomeView — 直近のメニュー一覧だけを置く', () => {
  test('lists every recent menu, not only the newest one', () => {
    // Arrange
    const history = [
      entry({ id: 'h1', recipes: [{ name: '肉じゃが', emoji: '🥔' }] }),
      entry({ id: 'h2', searchedAt: Date.now() - 30 * MINUTE, recipes: [{ name: '麻婆豆腐', emoji: '🌶' }] }),
      entry({ id: 'h3', searchedAt: Date.now() - 90 * MINUTE, recipes: [{ name: '親子丼', emoji: '🍚' }] }),
    ];

    // Act
    renderView({ history });

    // Assert
    expect(screen.getByText(/肉じゃが/)).toBeInTheDocument();
    expect(screen.getByText(/麻婆豆腐/)).toBeInTheDocument();
    expect(screen.getByText(/親子丼/)).toBeInTheDocument();
  });

  test('shows every dish of a menu, not just the first', () => {
    renderView({ history: [entry()] });
    expect(screen.getByText(/肉じゃが/)).toBeInTheDocument();
    expect(screen.getByText(/豚汁/)).toBeInTheDocument();
  });

  test('opens the menu that was tapped', () => {
    // Arrange
    const target = entry({ id: 'h2', recipes: [{ name: '麻婆豆腐', emoji: '🌶' }] });
    const { onOpenHistory } = renderView({ history: [entry(), target] });

    // Act
    fireEvent.click(screen.getByRole('button', { name: /麻婆豆腐/ }));

    // Assert
    expect(onOpenHistory).toHaveBeenCalledWith(target);
  });

  test('tells the user where menus come from when there are none', () => {
    renderView({ history: [] });
    expect(screen.getByText('まだメニューがありません')).toBeInTheDocument();
  });
});

describe('HomeView — 消したもの', () => {
  test('has no recipe suggestion buttons', () => {
    // 提案は下部ナビのV字メニューに集約したため、ホームからは外す
    renderView();
    expect(screen.queryByText(/一発レシピ作成/)).not.toBeInTheDocument();
    expect(screen.queryByText(/その他の検索オプション/)).not.toBeInTheDocument();
    expect(screen.queryByText(/レシピ提案/)).not.toBeInTheDocument();
  });

  test('has no stock or history counters', () => {
    renderView();
    expect(screen.queryByText('冷蔵庫の在庫')).not.toBeInTheDocument();
    expect(screen.queryByText('検索履歴')).not.toBeInTheDocument();
  });
});

describe('HomeView — 1週間の献立', () => {
  test('shows the week plan when one was made', () => {
    renderView({ weekPlan: weekPlan() });
    expect(screen.getByText('料理1')).toBeInTheDocument();
  });

  test('shows nothing about a week plan when there is none', () => {
    renderView({ weekPlan: null });
    expect(screen.queryByText('料理1')).not.toBeInTheDocument();
  });
});

describe('HomeView — いつ作ったか', () => {
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  test.each([
    ['たった今', 0],
    ['5分前', 5 * MINUTE],
    ['3時間前', 3 * HOUR],
    ['2日前', 2 * DAY],
  ])('shows %s', (label, ago) => {
    renderView({ history: [entry({ searchedAt: Date.now() - ago })] });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  test('falls back to a calendar date once it is over a week old', () => {
    // Arrange
    const old = new Date(2026, 0, 9, 12, 0, 0).getTime();

    // Act
    renderView({ history: [entry({ searchedAt: old })] });

    // Assert
    expect(screen.getByText('1/9')).toBeInTheDocument();
  });

  test('marks a menu that came from a flyer', () => {
    renderView({ history: [entry({ source: 'flyer' })] });
    expect(screen.getByText('チラシ')).toBeInTheDocument();
  });

  test('marks a menu that came from the fridge', () => {
    renderView({ history: [entry({ source: 'fridge' })] });
    expect(screen.getByText('冷蔵庫')).toBeInTheDocument();
  });
});
