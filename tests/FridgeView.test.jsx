import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FridgeView from '@/components/FridgeView';

const renderView = (props = {}) => {
  const handlers = { onAdd: vi.fn(), onRemove: vi.fn() };
  render(<FridgeView items={[]} {...handlers} {...props} />);
  return handlers;
};

describe('FridgeView', () => {
  test('calls onAdd with the typed text when the add button is clicked', () => {
    // Arrange
    const { onAdd } = renderView();

    // Act
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '玉ねぎ' } });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    // Assert
    expect(onAdd).toHaveBeenCalledWith('玉ねぎ');
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
    expect(onAdd).toHaveBeenCalledWith('玉ねぎ');
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
    fireEvent.click(screen.getByRole('button', { name: '削除' }));

    // Assert
    expect(onRemove).toHaveBeenCalledWith('id-1');
  });
});
