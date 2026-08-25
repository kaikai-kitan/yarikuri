import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FridgeView from '@/components/FridgeView';

const NOW = new Date(2026, 7, 24); // 2026-08-24

const renderView = (props = {}) => {
  const handlers = {
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onSetExpiry: vi.fn(),
    onRemoveExpired: vi.fn(),
  };
  render(<FridgeView items={[]} now={NOW} {...handlers} {...props} />);
  return handlers;
};

const item = (overrides = {}) => ({ id: 'f-1', name: '牛乳', addedAt: 1, ...overrides });

describe('FridgeView', () => {
  test('calls onAdd with the typed text when the add button is clicked', () => {
    // Arrange
    const { onAdd } = renderView();

    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '玉ねぎ' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    // Assert
    expect(onAdd).toHaveBeenCalledWith('玉ねぎ', 'ingredient');
  });

  test('does not call onAdd when Enter confirms an IME conversion', () => {
    // Arrange
    const { onAdd } = renderView();

    // Act
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'たまねぎ' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    // Assert
    expect(onAdd).not.toHaveBeenCalled();
  });

  test('calls onAdd on the Enter pressed after the IME conversion is committed', () => {
    // Arrange
    const { onAdd } = renderView();

    // Act
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'たまねぎ' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.change(input, { target: { value: '玉ねぎ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Assert
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('玉ねぎ', 'ingredient');
  });

  test('adds a suggestion when its chip is clicked', () => {
    // Arrange
    const { onAdd } = renderView();

    // Act
    fireEvent.click(screen.getByRole('button', { name: '+ 卵' }));

    // Assert
    expect(onAdd).toHaveBeenCalledWith('卵');
  });

  test('calls onRemove with the item id when the delete button is clicked', () => {
    // Arrange
    const { onRemove } = renderView({ items: [{ id: 'id-1', name: '玉ねぎ', addedAt: 1 }] });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '玉ねぎ を削除' }));

    // Assert
    expect(onRemove).toHaveBeenCalledWith('id-1');
  });
});

describe('FridgeView — expiry dates', () => {
  test('lists the soonest expiry first', () => {
    // Arrange & Act
    renderView({
      items: [
        item({ id: 'a', name: 'キャベツ', expiresAt: '2026-08-30' }),
        item({ id: 'b', name: '豚こま', expiresAt: '2026-08-25' }),
        item({ id: 'c', name: '牛乳', expiresAt: '2026-08-27' }),
      ],
    });

    // Assert
    const names = screen.getAllByTestId('fridge-name').map((el) => el.textContent);
    expect(names).toEqual(['豚こま', '牛乳', 'キャベツ']);
  });

  test('puts ingredients with no expiry at the end', () => {
    renderView({
      items: [item({ id: 'a', name: 'しょうゆ' }), item({ id: 'b', name: '豚こま', expiresAt: '2026-08-25' })],
    });
    expect(screen.getAllByTestId('fridge-name').map((el) => el.textContent)).toEqual(['豚こま', 'しょうゆ']);
  });

  test('calls an expired ingredient expired', () => {
    renderView({ items: [item({ expiresAt: '2026-08-23' })] });
    expect(screen.getByText('期限切れ')).toBeInTheDocument();
  });

  test('says today for an ingredient that expires today', () => {
    renderView({ items: [item({ expiresAt: '2026-08-24' })] });
    expect(screen.getByText('今日まで')).toBeInTheDocument();
  });

  test('counts down the last few days', () => {
    renderView({ items: [item({ expiresAt: '2026-08-26' })] });
    expect(screen.getByText('あと2日')).toBeInTheDocument();
  });

  test('shows the plain date when the expiry is still far off', () => {
    renderView({ items: [item({ expiresAt: '2026-08-31' })] });
    expect(screen.getByText('8/31まで')).toBeInTheDocument();
  });

  test('says an ingredient has no expiry when none is set', () => {
    renderView({ items: [item()] });
    expect(screen.getByText('期限なし')).toBeInTheDocument();
  });
});

describe('FridgeView — changing an expiry', () => {
  test('opens a date field for the ingredient', () => {
    // Arrange
    renderView({ items: [item({ expiresAt: '2026-08-27' })] });

    // Act
    fireEvent.click(screen.getByRole('button', { name: '牛乳 の賞味期限を変更' }));

    // Assert
    expect(screen.getByLabelText('牛乳 の賞味期限')).toHaveValue('2026-08-27');
  });

  test('reports the new expiry with the ingredient id', () => {
    // Arrange
    const { onSetExpiry } = renderView({ items: [item()] });
    fireEvent.click(screen.getByRole('button', { name: '牛乳 の賞味期限を変更' }));

    // Act
    fireEvent.change(screen.getByLabelText('牛乳 の賞味期限'), { target: { value: '2026-09-05' } });

    // Assert
    expect(onSetExpiry).toHaveBeenCalledWith('f-1', '2026-09-05');
  });

  test('closes the date field once the expiry is set', () => {
    renderView({ items: [item()] });
    fireEvent.click(screen.getByRole('button', { name: '牛乳 の賞味期限を変更' }));
    fireEvent.change(screen.getByLabelText('牛乳 の賞味期限'), { target: { value: '2026-09-05' } });
    expect(screen.queryByLabelText('牛乳 の賞味期限')).not.toBeInTheDocument();
  });

  test('opens the field for one ingredient at a time', () => {
    renderView({
      items: [item({ id: 'a', name: '牛乳' }), item({ id: 'b', name: '豚こま' })],
    });
    fireEvent.click(screen.getByRole('button', { name: '豚こま の賞味期限を変更' }));
    expect(screen.getByLabelText('豚こま の賞味期限')).toBeInTheDocument();
    expect(screen.queryByLabelText('牛乳 の賞味期限')).not.toBeInTheDocument();
  });
});

describe('FridgeView — clearing expired ingredients', () => {
  test('offers to clear them when something has expired', () => {
    renderView({ items: [item({ expiresAt: '2026-08-20' })] });
    expect(screen.getByRole('button', { name: '期限切れを削除' })).toBeInTheDocument();
  });

  test('offers nothing when everything is still good', () => {
    renderView({ items: [item({ expiresAt: '2026-08-30' }), item({ id: 'b', name: 'しょうゆ' })] });
    expect(screen.queryByRole('button', { name: '期限切れを削除' })).not.toBeInTheDocument();
  });

  test('reports the request to clear them', () => {
    const { onRemoveExpired } = renderView({ items: [item({ expiresAt: '2026-08-20' })] });
    fireEvent.click(screen.getByRole('button', { name: '期限切れを削除' }));
    expect(onRemoveExpired).toHaveBeenCalled();
  });
});
