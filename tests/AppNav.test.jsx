import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AppNav from '@/components/AppNav';

const navigation = vi.hoisted(() => ({
  pathname: '/',
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

// SVG の直線パス "M x y L x y" を始点・終点に分解する
const segmentOf = (path) => {
  const [, sx, sy, ex, ey] = path
    .getAttribute('d')
    .match(/M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/)
    .map(Number);
  return { from: { x: sx, y: sy }, to: { x: ex, y: ey } };
};

describe('AppNav — recipe proposal branches', () => {
  beforeEach(() => {
    navigation.pathname = '/';
    navigation.push.mockReset();
  });

  test('opens exactly two proposal choices connected by V-shaped lines', () => {
    render(<AppNav />);
    const trigger = screen.getByRole('button', { name: 'レシピ提案' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'レシピ提案の種類' })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const choices = screen.getByRole('group', { name: 'レシピ提案の種類' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(choices).getAllByRole('button')).toHaveLength(2);
    expect(
      within(choices).getByRole('button', { name: '1回だけレシピ提案' })
    ).toBeInTheDocument();
    expect(
      within(choices).getByRole('button', { name: '1週間分レシピ提案' })
    ).toBeInTheDocument();
    const lines = screen.getByTestId('proposal-v-lines');
    expect(lines).toHaveAttribute('aria-hidden', 'true');

    // 座標そのものではなく「V字であること」を確かめる。
    // 見た目の微調整でテストが壊れないようにするため。
    const [left, right] = [...lines.querySelectorAll('path')].map(segmentOf);
    expect([left, right]).toHaveLength(2);
    expect(left.from).toEqual(right.from);
    expect(left.to.x).toBeLessThan(left.from.x);
    expect(right.to.x).toBeGreaterThan(right.from.x);
    expect(left.to.y).toBeLessThan(left.from.y);
    expect(right.to.y).toBeLessThan(right.from.y);
    expect(left.from.x - left.to.x).toBeCloseTo(right.to.x - right.from.x, 0);
  });

  test('starts a one-off proposal from the flyer and the fridge together', () => {
    render(<AppNav />);
    fireEvent.click(screen.getByRole('button', { name: 'レシピ提案' }));

    fireEvent.click(screen.getByRole('button', { name: '1回だけレシピ提案' }));

    expect(navigation.push).toHaveBeenCalledWith('/recipes/?auto=combined');
    expect(screen.queryByRole('group', { name: 'レシピ提案の種類' })).not.toBeInTheDocument();
  });

  test('starts a week proposal and closes the branches', () => {
    render(<AppNav />);
    fireEvent.click(screen.getByRole('button', { name: 'レシピ提案' }));

    fireEvent.click(screen.getByRole('button', { name: '1週間分レシピ提案' }));

    expect(navigation.push).toHaveBeenCalledWith('/recipes/?auto=week');
    expect(screen.queryByRole('group', { name: 'レシピ提案の種類' })).not.toBeInTheDocument();
  });

  test('closes on Escape and returns focus to the proposal button', async () => {
    render(<AppNav />);
    const trigger = screen.getByRole('button', { name: 'レシピ提案' });
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('group', { name: 'レシピ提案の種類' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  test('closes when the current route changes', async () => {
    const { rerender } = render(<AppNav />);
    fireEvent.click(screen.getByRole('button', { name: 'レシピ提案' }));
    expect(screen.getByRole('group', { name: 'レシピ提案の種類' })).toBeInTheDocument();

    navigation.pathname = '/fridge/';
    rerender(<AppNav />);

    await waitFor(() => {
      expect(screen.queryByRole('group', { name: 'レシピ提案の種類' })).not.toBeInTheDocument();
    });
  });
});
