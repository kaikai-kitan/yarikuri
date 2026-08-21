import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BudgetPage, { metadata } from '@/app/budget/page';

describe('BudgetPage', () => {
  test('exposes SSG metadata for the budget route', () => {
    expect(metadata.title).toBe('家計簿');
    expect(metadata.description).toBeTruthy();
  });

  test('renders the budget client view', async () => {
    render(<BudgetPage />);
    expect(await screen.findByLabelText('今月の予算')).toBeInTheDocument();
  });
});
