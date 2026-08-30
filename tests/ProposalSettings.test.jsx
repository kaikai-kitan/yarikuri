import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProposalSettings from '@/components/ProposalSettings';
import { DEFAULT_PREFERENCES, MIN_SERVINGS, MAX_SERVINGS } from '@/lib/preferences';

const renderIt = (props = {}) => {
  const onChange = vi.fn();
  render(
    <ProposalSettings preferences={DEFAULT_PREFERENCES} onChange={onChange} {...props} />
  );
  return onChange;
};

describe('ProposalSettings — 人数', () => {
  test('shows how many people it is cooking for', () => {
    renderIt();
    expect(screen.getByText('2人分')).toBeInTheDocument();
  });

  test('adds a person', () => {
    // Arrange
    const onChange = renderIt();

    // Act
    fireEvent.click(screen.getByRole('button', { name: '人数を増やす' }));

    // Assert
    expect(onChange).toHaveBeenCalledWith({ servings: 3, priority: 'cost' });
  });

  test('removes a person', () => {
    const onChange = renderIt();
    fireEvent.click(screen.getByRole('button', { name: '人数を減らす' }));
    expect(onChange).toHaveBeenCalledWith({ servings: 1, priority: 'cost' });
  });

  test('cannot go below one person', () => {
    renderIt({ preferences: { servings: MIN_SERVINGS, priority: 'cost' } });
    expect(screen.getByRole('button', { name: '人数を減らす' })).toBeDisabled();
  });

  test('cannot go past the upper limit', () => {
    renderIt({ preferences: { servings: MAX_SERVINGS, priority: 'cost' } });
    expect(screen.getByRole('button', { name: '人数を増やす' })).toBeDisabled();
  });
});

describe('ProposalSettings — 優先する条件', () => {
  test('offers all three axes', () => {
    renderIt();
    expect(screen.getByRole('button', { name: /安さ/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /カロリー控えめ/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /時短/ })).toBeInTheDocument();
  });

  test('marks the axis in use', () => {
    renderIt({ preferences: { servings: 2, priority: 'calorie' } });

    expect(screen.getByRole('button', { name: /カロリー控えめ/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /安さ/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('switches the axis without changing the servings', () => {
    // Arrange
    const onChange = renderIt({ preferences: { servings: 5, priority: 'cost' } });

    // Act
    fireEvent.click(screen.getByRole('button', { name: /カロリー控えめ/ }));

    // Assert
    expect(onChange).toHaveBeenCalledWith({ servings: 5, priority: 'calorie' });
  });

  test('explains what the chosen axis does', () => {
    renderIt({ preferences: { servings: 2, priority: 'time' } });
    expect(screen.getByText('調理時間の短いものから')).toBeInTheDocument();
  });
});
