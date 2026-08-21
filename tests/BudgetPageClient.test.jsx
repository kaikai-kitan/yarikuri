import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BudgetPageClient from '@/app/budget/client';
import { ocrReceipt } from '@/lib/api';

vi.mock('@/lib/api', () => ({ ocrReceipt: vi.fn() }));
vi.mock('@/lib/image', () => ({
  compressImage: vi.fn().mockResolvedValue({ base64: 'B64', mediaType: 'image/jpeg' }),
}));

const receipt = (overrides = {}) => ({
  store: 'スーパーA',
  date: '2026-08-21',
  total: 3240,
  items: [
    { name: '牛乳', price: 198, isFood: true },
    { name: 'しょうゆ', price: 250, isFood: true },
    { name: '洗剤', price: 320, isFood: false },
  ],
  ...overrides,
});

const stored = (key) => JSON.parse(localStorage.getItem(key) ?? '[]');
const file = () => new File(['x'], 'r.jpg', { type: 'image/jpeg' });

const scan = async () => {
  fireEvent.change(await screen.findByLabelText('レシートを読み取る'), { target: { files: [file()] } });
};

beforeEach(() => {
  vi.clearAllMocks();
  ocrReceipt.mockResolvedValue(receipt());
});

describe('BudgetPageClient', () => {
  test('saves the monthly budget', async () => {
    // Arrange
    render(<BudgetPageClient />);

    // Act
    fireEvent.change(await screen.findByLabelText('今月の予算'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: '設定' }));

    // Assert
    await waitFor(() => expect(JSON.parse(localStorage.getItem('budget:limit'))).toBe(30000));
  });

  test('shows the scanned receipt for confirmation', async () => {
    // Arrange
    localStorage.setItem('budget:limit', JSON.stringify(30000));
    render(<BudgetPageClient />);

    // Act
    await scan();

    // Assert
    expect(await screen.findByText('スーパーA')).toBeInTheDocument();
    expect(screen.getByText('冷蔵庫に2品を登録します')).toBeInTheDocument();
  });

  test('records the expense and stocks the fridge on confirmation', async () => {
    // Arrange
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    await waitFor(() => expect(stored('budget:expenses')).toHaveLength(1));
    expect(stored('budget:expenses')[0]).toMatchObject({ store: 'スーパーA', total: 3240 });
    await waitFor(() =>
      expect(stored('fridge:items').map((f) => f.name).sort()).toEqual(['しょうゆ', '牛乳'])
    );
  });

  test('does not put non-food items into the fridge', async () => {
    // Arrange
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    await waitFor(() => expect(stored('fridge:items')).toHaveLength(2));
    expect(stored('fridge:items').map((f) => f.name)).not.toContain('洗剤');
  });

  test('does not add a food item already in the fridge', async () => {
    // Arrange
    localStorage.setItem('fridge:items', JSON.stringify([{ id: 'f-1', name: '牛乳', addedAt: 1 }]));
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    await waitFor(() => expect(stored('fridge:items')).toHaveLength(2));
    expect(stored('fridge:items').filter((f) => f.name === '牛乳')).toHaveLength(1);
  });

  test('subtracts the receipt from the remaining budget', async () => {
    // Arrange
    localStorage.setItem('budget:limit', JSON.stringify(30000));
    ocrReceipt.mockResolvedValue(receipt({ date: new Date().toISOString().slice(0, 10), total: 3240 }));
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    expect(await screen.findByText('¥26,760')).toBeInTheDocument();
  });

  test('discards the receipt when cancelled', async () => {
    // Arrange
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: 'やめる' });

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));

    // Assert
    await waitFor(() => expect(screen.queryByText('記録する')).not.toBeInTheDocument());
    expect(stored('budget:expenses')).toEqual([]);
  });

  test('surfaces a readable message when the scan fails', async () => {
    // Arrange
    ocrReceipt.mockRejectedValue(new Error('レシートを読み取れませんでした'));
    render(<BudgetPageClient />);

    // Act
    await scan();

    // Assert
    expect(await screen.findByText('レシートを読み取れませんでした')).toBeInTheDocument();
    expect(stored('budget:expenses')).toEqual([]);
  });

  test('removes a recorded expense', async () => {
    // Arrange
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));
    await waitFor(() => expect(stored('budget:expenses')).toHaveLength(1));

    // Act
    fireEvent.click(screen.getByRole('button', { name: /の記録を削除/ }));

    // Assert
    await waitFor(() => expect(stored('budget:expenses')).toEqual([]));
  });

  test('shows the projected remaining budget before recording', async () => {
    // Arrange
    localStorage.setItem('budget:limit', JSON.stringify(30000));
    const today = new Date().toISOString().slice(0, 10);
    ocrReceipt.mockResolvedValue(receipt({ date: today, total: 3240 }));
    render(<BudgetPageClient />);

    // Act
    await scan();

    // Assert
    expect(await screen.findByText('記録後の残り')).toBeInTheDocument();
    expect(screen.getByText('¥26,760')).toBeInTheDocument();
  });

  test('warns before recording a receipt that breaks the budget', async () => {
    // Arrange
    localStorage.setItem('budget:limit', JSON.stringify(2000));
    const today = new Date().toISOString().slice(0, 10);
    ocrReceipt.mockResolvedValue(receipt({ date: today, total: 3240 }));
    render(<BudgetPageClient />);

    // Act
    await scan();

    // Assert
    expect(await screen.findByText('この記録で今月の予算を超えます')).toBeInTheDocument();
  });

  test('respects a category corrected before recording', async () => {
    // Arrange — 洗剤は daily と判定されているが、実は食材だった場合
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });

    // Act
    fireEvent.change(screen.getByLabelText('洗剤 のカテゴリ'), { target: { value: 'food' } });
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    await waitFor(() => expect(stored('fridge:items')).toHaveLength(3));
    expect(stored('fridge:items').map((f) => f.name)).toContain('洗剤');
  });

  test('keeps an item out of the fridge when it is recategorised away from food', async () => {
    // Arrange
    render(<BudgetPageClient />);
    await scan();
    await screen.findByRole('button', { name: '記録する' });

    // Act
    fireEvent.change(screen.getByLabelText('牛乳 のカテゴリ'), { target: { value: 'other' } });
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    await waitFor(() => expect(stored('fridge:items')).toHaveLength(1));
    expect(stored('fridge:items').map((f) => f.name)).toEqual(['しょうゆ']);
  });
});
