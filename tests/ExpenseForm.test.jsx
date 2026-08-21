import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpenseForm from '@/components/ExpenseForm';

const today = () => new Date().toISOString().slice(0, 10);

const renderForm = (props = {}) => {
  const handlers = { onSubmit: vi.fn(), onCancel: vi.fn() };
  render(<ExpenseForm {...handlers} {...props} />);
  return handlers;
};

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole('button', { name: '記録する' }));

describe('ExpenseForm — defaults', () => {
  test('defaults the date to today', () => {
    renderForm();
    expect(screen.getByLabelText('日付')).toHaveValue(today());
  });

  test('defaults the category to food', () => {
    renderForm();
    expect(screen.getByLabelText('カテゴリ')).toHaveValue('food');
  });

  test('starts with an empty amount', () => {
    renderForm();
    expect(screen.getByLabelText('金額')).toHaveValue('');
  });
});

describe('ExpenseForm — submitting', () => {
  test('reports the entered values', () => {
    // Arrange
    const { onSubmit } = renderForm();

    // Act
    fill('金額', '1200');
    fill('店名', 'コンビニA');
    fill('日付', '2026-08-20');
    fill('カテゴリ', 'daily');
    submit();

    // Assert
    expect(onSubmit).toHaveBeenCalledWith({
      total: 1200,
      store: 'コンビニA',
      date: '2026-08-20',
      category: 'daily',
    });
  });

  test('allows an empty store name', () => {
    // Arrange
    const { onSubmit } = renderForm();

    // Act
    fill('金額', '500');
    submit();

    // Assert
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ store: '', total: 500 }));
  });

  test('trims the store name', () => {
    const { onSubmit } = renderForm();
    fill('金額', '500');
    fill('店名', '  コンビニA  ');
    submit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ store: 'コンビニA' }));
  });

  test('calls onCancel without submitting', () => {
    const { onSubmit, onCancel } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ExpenseForm — validation', () => {
  test('refuses a blank amount', () => {
    const { onSubmit } = renderForm();
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('金額を入力してください')).toBeInTheDocument();
  });

  test('refuses a non-numeric amount', () => {
    const { onSubmit } = renderForm();
    fill('金額', 'たくさん');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('金額は数字で入力してください')).toBeInTheDocument();
  });

  test('refuses zero or a negative amount', () => {
    const { onSubmit } = renderForm();
    fill('金額', '0');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    fill('金額', '-500');
    submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('金額は1円以上で入力してください')).toBeInTheDocument();
  });

  test('refuses a date in the future', () => {
    // Arrange
    const { onSubmit } = renderForm();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    // Act
    fill('金額', '500');
    fill('日付', tomorrow);
    submit();

    // Assert
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('未来の日付は記録できません')).toBeInTheDocument();
  });

  test('clears the error once the amount is corrected', () => {
    // Arrange
    const { onSubmit } = renderForm();
    submit();
    expect(screen.getByText('金額を入力してください')).toBeInTheDocument();

    // Act
    fill('金額', '500');
    submit();

    // Assert
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.queryByText('金額を入力してください')).not.toBeInTheDocument();
  });
});

describe('ExpenseForm — editing an existing record', () => {
  const initial = { total: 3240, store: 'スーパーA', date: '2026-08-10', category: 'daily' };

  test('prefills the fields from the given record', () => {
    renderForm({ initial, submitLabel: '保存する' });
    expect(screen.getByLabelText('金額')).toHaveValue('3240');
    expect(screen.getByLabelText('店名')).toHaveValue('スーパーA');
    expect(screen.getByLabelText('日付')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('カテゴリ')).toHaveValue('daily');
  });

  test('uses the given submit label', () => {
    // Arrange
    const { onSubmit } = renderForm({ initial, submitLabel: '保存する' });

    // Act
    fill('金額', '3000');
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    // Assert
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ total: 3000, store: 'スーパーA' }));
  });
});
