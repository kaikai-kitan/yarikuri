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
    onChangeItemCategory: vi.fn(),
    onAddExpense: vi.fn(),
    onUpdateExpense: vi.fn(),
  };
  render(
    <BudgetView
      summary={summary()}
      expenses={[]}
      scanning={false}
      pendingReceipt={null}
      projection={null}
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

describe('BudgetView — projected impact', () => {
  const projection = (overrides = {}) => ({
    applies: true,
    remaining: 6760,
    dailyAllowance: 614,
    isOver: false,
    ...overrides,
  });

  test('shows what the remaining budget becomes after recording', () => {
    // Arrange & Act
    renderView({ pendingReceipt: receipt(), projection: projection() });

    // Assert
    expect(screen.getByText('記録後の残り')).toBeInTheDocument();
    expect(screen.getByText('¥6,760')).toBeInTheDocument();
  });

  test('warns before recording a receipt that breaks the budget', () => {
    // Arrange & Act
    renderView({ pendingReceipt: receipt(), projection: projection({ remaining: -5000, isOver: true, dailyAllowance: 0 }) });

    // Assert
    expect(screen.getByText('この記録で今月の予算を超えます')).toBeInTheDocument();
    expect(screen.getByText('-¥5,000')).toBeInTheDocument();
  });

  test('explains when the receipt does not affect this month', () => {
    // Arrange & Act
    renderView({ pendingReceipt: receipt({ date: '2026-07-28' }), projection: projection({ applies: false }) });

    // Assert
    expect(screen.getByText('今月の予算には影響しません')).toBeInTheDocument();
    expect(screen.queryByText('記録後の残り')).not.toBeInTheDocument();
  });

  test('omits the projection entirely when none is available', () => {
    renderView({ pendingReceipt: receipt(), projection: null });
    expect(screen.queryByText('記録後の残り')).not.toBeInTheDocument();
    expect(screen.queryByText('今月の予算には影響しません')).not.toBeInTheDocument();
  });
});

describe('BudgetView — item categories', () => {
  const categorised = () => ({
    store: 'スーパーA',
    date: '2026-08-21',
    total: 3240,
    items: [
      { name: '牛乳', price: 198, category: 'food' },
      { name: '洗剤', price: 320, category: 'daily' },
      { name: '雑誌', price: 500, category: 'other' },
    ],
  });

  test('shows each item with its current category selected', () => {
    // Arrange & Act
    renderView({ pendingReceipt: categorised() });

    // Assert
    expect(screen.getByLabelText('牛乳 のカテゴリ')).toHaveValue('food');
    expect(screen.getByLabelText('洗剤 のカテゴリ')).toHaveValue('daily');
    expect(screen.getByLabelText('雑誌 のカテゴリ')).toHaveValue('other');
  });

  test('derives the category of legacy items from isFood', () => {
    renderView({ pendingReceipt: receipt() });
    expect(screen.getByLabelText('牛乳 のカテゴリ')).toHaveValue('food');
    expect(screen.getByLabelText('洗剤 のカテゴリ')).toHaveValue('other');
  });

  test('reports a category change with the item position', () => {
    // Arrange
    const { onChangeItemCategory } = renderView({ pendingReceipt: categorised() });

    // Act
    fireEvent.change(screen.getByLabelText('洗剤 のカテゴリ'), { target: { value: 'food' } });

    // Assert
    expect(onChangeItemCategory).toHaveBeenCalledWith(1, 'food');
  });

  test('counts only food items as going to the fridge', () => {
    renderView({ pendingReceipt: categorised() });
    expect(screen.getByText('冷蔵庫に1品を登録します')).toBeInTheDocument();
  });

  test('follows the categories it is given when they change', () => {
    // Arrange
    const receiptWithTwoFoods = categorised();
    receiptWithTwoFoods.items[1] = { name: '洗剤', price: 320, category: 'food' };

    // Act
    renderView({ pendingReceipt: receiptWithTwoFoods });

    // Assert
    expect(screen.getByText('冷蔵庫に2品を登録します')).toBeInTheDocument();
  });
});

describe('BudgetView — manual entry', () => {
  test('offers a way to record a spend without a receipt', () => {
    renderView();
    expect(screen.getByRole('button', { name: '手入力で追加' })).toBeInTheDocument();
  });

  test('opens the form when asked', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '手入力で追加' }));
    expect(screen.getByLabelText('金額')).toBeInTheDocument();
  });

  test('reports the entered spend and closes the form', () => {
    // Arrange
    const { onAddExpense } = renderView();
    fireEvent.click(screen.getByRole('button', { name: '手入力で追加' }));

    // Act
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: '記録する' }));

    // Assert
    expect(onAddExpense).toHaveBeenCalledWith(expect.objectContaining({ total: 1200 }));
    expect(screen.queryByLabelText('金額')).not.toBeInTheDocument();
  });

  test('closes the form without recording when cancelled', () => {
    // Arrange
    const { onAddExpense } = renderView();
    fireEvent.click(screen.getByRole('button', { name: '手入力で追加' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));

    // Assert
    expect(onAddExpense).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('金額')).not.toBeInTheDocument();
  });

  test('hides the manual entry button while a receipt is awaiting confirmation', () => {
    renderView({ pendingReceipt: receipt() });
    expect(screen.queryByRole('button', { name: '手入力で追加' })).not.toBeInTheDocument();
  });
});

describe('BudgetView — editing a record', () => {
  const record = (overrides = {}) => ({
    id: 'e-1',
    date: '2026-08-10',
    store: 'スーパーA',
    total: 3240,
    category: 'food',
    items: [{ name: '牛乳', price: 198, category: 'food' }],
    createdAt: 1,
    ...overrides,
  });

  test('opens an edit form prefilled from the record', () => {
    // Arrange
    renderView({ expenses: [record()] });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '2026-08-10 スーパーA を編集' }));

    // Assert
    expect(screen.getByLabelText('金額')).toHaveValue('3240');
    expect(screen.getByLabelText('店名')).toHaveValue('スーパーA');
    expect(screen.getByLabelText('日付')).toHaveValue('2026-08-10');
  });

  test('reports the corrected values with the record id', () => {
    // Arrange
    const { onUpdateExpense } = renderView({ expenses: [record()] });
    fireEvent.click(screen.getByRole('button', { name: '2026-08-10 スーパーA を編集' }));

    // Act
    fireEvent.change(screen.getByLabelText('金額'), { target: { value: '2980' } });
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    // Assert
    expect(onUpdateExpense).toHaveBeenCalledWith('e-1', expect.objectContaining({ total: 2980 }));
    expect(screen.queryByLabelText('金額')).not.toBeInTheDocument();
  });

  test('leaves the record untouched when the edit is cancelled', () => {
    // Arrange
    const { onUpdateExpense } = renderView({ expenses: [record()] });
    fireEvent.click(screen.getByRole('button', { name: '2026-08-10 スーパーA を編集' }));

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));

    // Assert
    expect(onUpdateExpense).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '2026-08-10 スーパーA を編集' })).toBeInTheDocument();
  });

  test('edits only the record that was opened', () => {
    // Arrange
    renderView({ expenses: [record(), record({ id: 'e-2', store: 'スーパーB', total: 500 })] });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '2026-08-10 スーパーB を編集' }));

    // Assert
    expect(screen.getByLabelText('金額')).toHaveValue('500');
    expect(screen.getByRole('button', { name: '2026-08-10 スーパーA を編集' })).toBeInTheDocument();
  });

  test('still allows deleting a record that is not being edited', () => {
    const { onRemoveExpense } = renderView({ expenses: [record()] });
    fireEvent.click(screen.getByRole('button', { name: '2026-08-10 スーパーA の記録を削除' }));
    expect(onRemoveExpense).toHaveBeenCalledWith('e-1');
  });
});
