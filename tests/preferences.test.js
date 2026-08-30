import { describe, test, expect } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  MIN_SERVINGS,
  MAX_SERVINGS,
  PRIORITIES,
  PRIORITY_LABELS,
  normalizePreferences,
  withServings,
  withPriority,
} from '../src/lib/preferences.js';

describe('defaults', () => {
  test('starts at two servings and prioritises cost', () => {
    // 元々このアプリは「安く作る」ためのものなので、既定は据え置く
    expect(DEFAULT_PREFERENCES).toEqual({ servings: 2, priority: 'cost' });
  });

  test('offers cost, calories and time as the axes', () => {
    expect(PRIORITIES).toEqual(['cost', 'calorie', 'time']);
    PRIORITIES.forEach((p) => expect(PRIORITY_LABELS[p]).toBeTruthy());
  });
});

describe('normalizePreferences', () => {
  test('keeps a valid pair as it is', () => {
    expect(normalizePreferences({ servings: 4, priority: 'calorie' })).toEqual({
      servings: 4,
      priority: 'calorie',
    });
  });

  test('falls back when nothing was saved', () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences('4人')).toEqual(DEFAULT_PREFERENCES);
  });

  test('drops an unknown priority rather than passing it to the prompt', () => {
    expect(normalizePreferences({ servings: 3, priority: 'protein' }).priority).toBe('cost');
  });

  test('clamps servings into a range a household actually cooks for', () => {
    expect(normalizePreferences({ servings: 0 }).servings).toBe(MIN_SERVINGS);
    expect(normalizePreferences({ servings: -3 }).servings).toBe(MIN_SERVINGS);
    expect(normalizePreferences({ servings: 99 }).servings).toBe(MAX_SERVINGS);
  });

  test('rounds a fractional serving count', () => {
    expect(normalizePreferences({ servings: 2.6 }).servings).toBe(3);
  });

  test('ignores servings that are not numbers', () => {
    expect(normalizePreferences({ servings: '4' }).servings).toBe(DEFAULT_PREFERENCES.servings);
    expect(normalizePreferences({ servings: NaN }).servings).toBe(DEFAULT_PREFERENCES.servings);
  });
});

describe('withServings', () => {
  test('returns a new object rather than editing the old one', () => {
    // Arrange
    const before = DEFAULT_PREFERENCES;

    // Act
    const after = withServings(before, 4);

    // Assert
    expect(after).not.toBe(before);
    expect(before.servings).toBe(2);
    expect(after.servings).toBe(4);
  });

  test('refuses to go outside the range', () => {
    expect(withServings(DEFAULT_PREFERENCES, MAX_SERVINGS + 1).servings).toBe(MAX_SERVINGS);
    expect(withServings(DEFAULT_PREFERENCES, 0).servings).toBe(MIN_SERVINGS);
  });
});

describe('withPriority', () => {
  test('switches the axis without touching the servings', () => {
    const after = withPriority({ servings: 5, priority: 'cost' }, 'time');
    expect(after).toEqual({ servings: 5, priority: 'time' });
  });

  test('ignores an axis it does not know', () => {
    expect(withPriority(DEFAULT_PREFERENCES, 'protein').priority).toBe('cost');
  });
});
