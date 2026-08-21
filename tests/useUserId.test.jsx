import { describe, test, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useUserId } from '@/lib/hooks';
import { getUserId, RETENTION_DAYS } from '@/lib/userId';

const DAY = 86400 * 1000;

describe('useUserId', () => {
  test('issues an id on mount and reports ready', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useUserId());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].id.startsWith('u_')).toBe(true);
  });

  test('reuses an id that was already issued', async () => {
    // Arrange
    const existing = getUserId();

    // Act
    const { result } = renderHook(() => useUserId());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0].id).toBe(existing);
  });

  test('reports when the current id expires', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useUserId());

    // Assert
    await waitFor(() => expect(result.current[2]).toBe(true));
    const { lastSeenAt, expiresAt } = result.current[0];
    expect(expiresAt).toBe(lastSeenAt + RETENTION_DAYS * DAY);
  });

  test('issues a different id when reset', async () => {
    // Arrange
    const { result } = renderHook(() => useUserId());
    await waitFor(() => expect(result.current[2]).toBe(true));
    const before = result.current[0].id;

    // Act
    act(() => result.current[1]());

    // Assert
    await waitFor(() => expect(result.current[0].id).not.toBe(before));
    expect(result.current[0].id.startsWith('u_')).toBe(true);
  });
});
