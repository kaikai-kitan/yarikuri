import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BudgetView from '@/components/BudgetView';

const summary = (overrides = {}) => ({
  monthlyLimit: 30000,
  hasLimit: true,
  spent: 20000,
  remaining: 10000,
  daysLeft: 11,
  dailyAllowance: 909,
  isOver: false,
  ...overrides,
});

const receipt = (overrides = {}) => ({
  store: 'スーパーA',
  date: '2026-08-21',
  total: 3240,
  items: [
    { name: '牛乳', price: 198, isFood: true },
    { name: '洗剤', price: 320, isFood: false },
  ],
  ...overrides,
});

const renderView = (props = {}) => {
  const handlers = {
    onSetLimit: vi.fn(),
    onScanReceipt: vi.fn(),
    onConfirmReceipt: vi.fn(),
    onCancelReceipt: vi.fn(),
    onRemoveExpense: vi.fn(),
  };
  render(
    <BudgetView
      summary={summary()}
      expenses={[]}
      scanning={false}
      pendingReceipt={null}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe('BudgetView — budget setup', () => {
  test('prompts for a budget when none is set', () => {
    renderView({ summary: summary({ hasLimit: false, monthlyLimit: 0, spent: 0, remaining: 0 }) });
    expect(screen.getByText('今月の予算を設定してください')).toBeInTheDocument();
  });

  test('calls onSetLimit with the entered amount', () => {
    // Arrange
    const { onSetLimit } = renderView({ summary: summary({ hasLimit: false, monthlyLimit: 0 }) });

    // Act
    fireEvent.change(screen.getByLabelText('今月の予算'), { target: { value: '30000' } });
    fireEvent.click(screen.getByRole('button', { name: '設定' }));

    // Assert
    expect(onSetLimit).toHaveBeenCalledWith(30000);
  });

  test('does not call onSetLimit for a blank or non-numeric amount', () => {
    // Arrange
    const { onSetLimit } = renderView({ summary: summary({ hasLimit: false, monthlyLimit: 0 }) });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '設定' }));
    fireEvent.change(screen.getByLabelText('今月の予算'), { target: { value: 'たくさん' } });
    fireEvent.click(screen.getByRole('button', { name: '設定' }));

    // Assert
    expect(onSetLimit).not.toHaveBeenCalled();
  });

  test('shows the spent, remaining and per-day figures', () => {
    renderView();
    expect(screen.getByText('¥20,000')).toBeInTheDocument();
    expect(screen.getByText('¥10,000')).toBeInTheDocument();
    expect(screen.getByText(/¥909/)).toBeInTheDocument();
    expect(screen.getByText(/残り11日/)).toBeInTheDocument();
  });

  test('warns when the month is overspent', () => {
    renderView({ summary: summary({ spent: 32000, remaining: -2000, isOver: true, dailyAllowance: 0 }) });
    expect(screen.getByText('予算を超えています')).toBeInTheDocument();
    expect(screen.getByText('-¥2,000')).toBeInTheDocument();
  });

  test('lets an existing budget be changed', () => {
    // Arrange
    const { onSetLimit } = renderView();

    // Act
    fireEvent.click(screen.getByRole('button', { name: '予算を変更' }));
    fireEvent.change(screen.getByLabelText('今月の予算'), { target: { value: '45000' } });
    fireEvent.click(screen.getByRole('button', { name: '設定' }));

    // Assert
    expect(onSetLimit).toHaveBeenCalledWith(45000);
  });
});

describe('BudgetView — receipt scanning', () => {
  test('shows a progress message while scanning', () => {
    renderView({ scanning: true });
    expect(screen.getByText('レシートを解析しています…')).toBeInTheDocument();
  });

  test('passes the chosen file to onScanReceipt', () => {
    // Arrange
    const { onScanReceipt } = renderView();
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });

    // Act
    fireEvent.change(screen.getByLabelText('レシートを読み取る'), { target: { files: [file] } });

    // Assert
    expect(onScanReceipt).toHaveBeenCalledWith(file);
  });

  test('shows the scanned receipt for confirmation', () => {
    renderView({ pendingReceipt: receipt() });
    expect(screen.getByText('スーパーA')).toBeInTheDocument();
    expect(screen.getByText('¥3,240')).toBeInTheDocument();
    expect(screen.getByText('牛乳')).toBeInTheDocument();
    expect(screen.getByText('洗剤')).toBeInTheDocument();
  });

  test('marks which scanned items will go to the fridge', () => {
    renderView({ pendingReceipt: receipt() });
    expect(screen.getByText('冷蔵庫に1品を登録します')).toBeInTheDocument();
  });

  test('confirms and cancels the pending receipt', () => {
    // Arrange
    const { onConfirmReceipt, onCancelReceipt } = renderView({ pendingReceipt: receipt() });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));

    // Assert
    expect(onConfirmReceipt).toHaveBeenCalled();
    expect(onCancelReceipt).toHaveBeenCalled();
  });
});

describe('BudgetView — expense history', () => {
  const expense = (overrides = {}) => ({
    id: 'e-1',
    date: '2026-08-10',
    store: 'スーパーA',
    total: 1500,
    items: [{ name: '牛乳', price: 198, isFood: true }],
    createdAt: 1,
    ...overrides,
  });

  test('shows an empty state when nothing has been recorded', () => {
    renderView();
    expect(screen.getByText('まだ記録がありません')).toBeInTheDocument();
  });

  test('lists recorded expenses newest first', () => {
    // Arrange
    renderView({
      expenses: [expense({ id: 'e-1', date: '2026-08-10' }), expense({ id: 'e-2', date: '2026-08-18', store: 'スーパーB' })],
    });

    // Act
    const stores = screen.getAllByTestId('expense-store').map((el) => el.textContent);

    // Assert
    expect(stores).toEqual(['スーパーB', 'スーパーA']);
  });

  test('calls onRemoveExpense with the expense id', () => {
    // Arrange
    const { onRemoveExpense } = renderView({ expenses: [expense()] });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '2026-08-10 スーパーA の記録を削除' }));

    // Assert
    expect(onRemoveExpense).toHaveBeenCalledWith('e-1');
  });
});
