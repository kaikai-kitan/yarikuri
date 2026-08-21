import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserIdCard from '@/components/UserIdCard';
import { getUserId, peekUserId, RETENTION_DAYS } from '@/lib/userId';

const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

describe('UserIdCard', () => {
  test('shows the issued id', async () => {
    // Arrange
    const existing = getUserId();

    // Act
    render(<UserIdCard />);

    // Assert
    expect(await screen.findByText(existing)).toBeInTheDocument();
  });

  test('issues an id when the visitor has none yet', async () => {
    // Arrange & Act
    render(<UserIdCard />);

    // Assert
    await waitFor(() => expect(peekUserId()).not.toBeNull());
    expect(await screen.findByText(peekUserId().id)).toBeInTheDocument();
  });

  test('shows the date the id expires if unused', async () => {
    // Arrange & Act
    render(<UserIdCard />);
    await screen.findByRole('button', { name: 'IDをリセット' });

    // Assert
    const expected = formatDate(peekUserId().expiresAt);
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
  });

  test('states the retention period', async () => {
    // Arrange & Act
    render(<UserIdCard />);

    // Assert
    await screen.findByRole('button', { name: 'IDをリセット' });
    expect(screen.getByText(new RegExp(`${RETENTION_DAYS}日`))).toBeInTheDocument();
  });

  test('asks for confirmation before resetting', async () => {
    // Arrange
    render(<UserIdCard />);

    // Act
    fireEvent.click(await screen.findByRole('button', { name: 'IDをリセット' }));

    // Assert
    expect(screen.getByText('本当にリセットしますか？履歴の引き継ぎはできなくなります。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセットする' })).toBeInTheDocument();
  });

  test('replaces the id once the reset is confirmed', async () => {
    // Arrange
    render(<UserIdCard />);
    const before = (await screen.findByRole('button', { name: 'IDをリセット' }), peekUserId().id);

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'IDをリセット' }));
    fireEvent.click(screen.getByRole('button', { name: 'リセットする' }));

    // Assert
    await waitFor(() => expect(peekUserId().id).not.toBe(before));
    expect(await screen.findByText(peekUserId().id)).toBeInTheDocument();
  });

  test('keeps the id when the reset is cancelled', async () => {
    // Arrange
    render(<UserIdCard />);
    await screen.findByRole('button', { name: 'IDをリセット' });
    const before = peekUserId().id;

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'IDをリセット' }));
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));

    // Assert
    expect(peekUserId().id).toBe(before);
    expect(screen.getByText(before)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'IDをリセット' })).toBeInTheDocument();
  });
});
