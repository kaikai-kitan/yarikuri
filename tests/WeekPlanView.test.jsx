import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeekPlanView from '@/components/WeekPlanView';

const NOW = new Date(2026, 7, 26); // 3日目

const day = (n, overrides = {}) => ({
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
  ...overrides,
});

const plan = (overrides = {}) => ({
  startDate: '2026-08-24',
  createdAt: 1,
  shoppingList: [
    { name: '豚こま切れ', estimatedPrice: 398 },
    { name: 'じゃがいも', estimatedPrice: 258 },
  ],
  days: Array.from({ length: 7 }, (_, i) => day(i + 1)),
  ...overrides,
});

const renderView = (props = {}) => {
  const handlers = { onClearPlan: vi.fn(), onToggleCooked: vi.fn() };
  render(<WeekPlanView plan={plan()} now={NOW} {...handlers} {...props} />);
  return handlers;
};

describe('WeekPlanView — the week at a glance', () => {
  test('shows the period the plan covers', () => {
    renderView();
    expect(screen.getByText('8/24 〜 8/30')).toBeInTheDocument();
  });

  test('lists every day of the plan', () => {
    renderView();
    expect(screen.getAllByTestId('plan-day')).toHaveLength(7);
  });

  test('shows the dish for each day', () => {
    renderView();
    expect(screen.getByText('料理1')).toBeInTheDocument();
    expect(screen.getByText('料理7')).toBeInTheDocument();
  });

  test('says why each dish sits on that day', () => {
    renderView();
    expect(screen.getByText('理由3')).toBeInTheDocument();
  });

  test('marks which day is today', () => {
    // Arrange & Act
    renderView();

    // Assert — 「今日」バッジが付いた日のカードが3日目であること
    const badge = screen.getByText('今日');
    expect(badge.closest('[data-testid="plan-day"]')).toHaveTextContent('料理3');
  });

  test('marks no day once the week is over', () => {
    renderView({ now: new Date(2026, 7, 31) });
    expect(screen.queryByText('今日')).not.toBeInTheDocument();
    expect(screen.getByText('この献立は終わりました')).toBeInTheDocument();
  });
});

describe('WeekPlanView — the shopping list', () => {
  test('lists what to buy on the first day with a total', () => {
    renderView();
    expect(screen.getByText('豚こま切れ')).toBeInTheDocument();
    expect(screen.getByText('¥656')).toBeInTheDocument();
  });

  test('says so when nothing needs buying', () => {
    renderView({ plan: plan({ shoppingList: [] }) });
    expect(screen.getByText('買い足しは不要です')).toBeInTheDocument();
  });
});

describe('WeekPlanView — carrying ingredients forward', () => {
  test('shows what the previous day left for this one', () => {
    // Arrange
    const days = [
      day(1, { name: '肉じゃが', carryOver: ['じゃがいも', 'にんじん'] }),
      day(2, { name: 'カレー' }),
    ];

    // Act
    renderView({ plan: plan({ days }) });

    // Assert
    expect(screen.getByText('前日から じゃがいも、にんじん')).toBeInTheDocument();
  });

  test('says nothing about carry-over on the first day', () => {
    renderView({ plan: plan({ days: [day(1, { carryOver: ['にんじん'] })] }) });
    expect(screen.queryByText(/前日から/)).not.toBeInTheDocument();
  });

  test('says nothing when the previous day left nothing', () => {
    renderView({ plan: plan({ days: [day(1), day(2)] }) });
    expect(screen.queryByText(/前日から/)).not.toBeInTheDocument();
  });
});

describe('WeekPlanView — buying a little extra', () => {
  test('shows what to add on the day with its price', () => {
    const days = [day(1), day(2, { addOns: [{ name: 'カレールー', estimatedPrice: 180 }] })];
    renderView({ plan: plan({ days }) });
    expect(screen.getByText('買い足し カレールー ¥180')).toBeInTheDocument();
  });

  test('joins several add-ons', () => {
    const days = [
      day(1, {
        addOns: [
          { name: 'カレールー', estimatedPrice: 180 },
          { name: '福神漬け', estimatedPrice: 120 },
        ],
      }),
    ];
    renderView({ plan: plan({ days }) });
    expect(screen.getByText('買い足し カレールー ¥180、福神漬け ¥120')).toBeInTheDocument();
  });

  test('says nothing when a day needs no extras', () => {
    renderView({ plan: plan({ days: [day(1)] }) });
    expect(screen.queryByText(/買い足し/)).not.toBeInTheDocument();
  });
});

describe('WeekPlanView — discarding the plan', () => {
  test('asks before discarding', () => {
    const { onClearPlan } = renderView();
    fireEvent.click(screen.getByRole('button', { name: '献立を消す' }));
    expect(onClearPlan).not.toHaveBeenCalled();
    expect(screen.getByText('この献立を消しますか？')).toBeInTheDocument();
  });

  test('discards once confirmed', () => {
    const { onClearPlan } = renderView();
    fireEvent.click(screen.getByRole('button', { name: '献立を消す' }));
    fireEvent.click(screen.getByRole('button', { name: '消す' }));
    expect(onClearPlan).toHaveBeenCalled();
  });

  test('keeps the plan when cancelled', () => {
    const { onClearPlan } = renderView();
    fireEvent.click(screen.getByRole('button', { name: '献立を消す' }));
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));
    expect(onClearPlan).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '献立を消す' })).toBeInTheDocument();
  });
});

describe('WeekPlanView — marking a day as cooked', () => {
  test('offers to mark each day as cooked', () => {
    renderView({ plan: plan({ days: [day(1), day(2)] }) });
    expect(screen.getByRole('button', { name: '料理1 を作った' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '料理2 を作った' })).toBeInTheDocument();
  });

  test('reports which day was cooked', () => {
    const { onToggleCooked } = renderView({ plan: plan({ days: [day(1), day(2)] }) });
    fireEvent.click(screen.getByRole('button', { name: '料理2 を作った' }));
    expect(onToggleCooked).toHaveBeenCalledWith(1);
  });

  test('shows a cooked day as done', () => {
    renderView({ plan: plan({ days: [day(1, { cookedAt: 1700 })] }) });
    expect(screen.getByRole('button', { name: '料理1 を作っていないことにする' })).toBeInTheDocument();
    expect(screen.getByText('作りました')).toBeInTheDocument();
  });

  test('reports undoing a cooked day', () => {
    const { onToggleCooked } = renderView({ plan: plan({ days: [day(1, { cookedAt: 1700 })] }) });
    fireEvent.click(screen.getByRole('button', { name: '料理1 を作っていないことにする' }));
    expect(onToggleCooked).toHaveBeenCalledWith(0);
  });

  test('shows how far through the week the cooking is', () => {
    renderView({ plan: plan({ days: [day(1, { cookedAt: 1 }), day(2, { cookedAt: 2 }), day(3)] }) });
    expect(screen.getByText('3日中2日ぶん作りました')).toBeInTheDocument();
  });

  test('shows no progress before anything is cooked', () => {
    renderView();
    expect(screen.queryByText(/ぶん作りました/)).not.toBeInTheDocument();
  });
});
