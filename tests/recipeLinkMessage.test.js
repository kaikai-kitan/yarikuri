import { describe, test, expect } from 'vitest';
import { recipeLinkErrorMessage } from '../src/lib/recipeLink.js';

describe('recipeLinkErrorMessage', () => {
  test('stays silent when the lookup simply found nothing', () => {
    // 献立は使えるので、見つからないことをエラー扱いしない
    expect(recipeLinkErrorMessage(null)).toBe('');
    expect(recipeLinkErrorMessage('no_match')).toBe('');
    expect(recipeLinkErrorMessage('no_recipe')).toBe('');
  });

  test('tells the user the integration is misconfigured', () => {
    expect(recipeLinkErrorMessage('auth_failed')).toContain('楽天');
  });

  test('distinguishes being rate limited', () => {
    const message = recipeLinkErrorMessage('rate_limited');
    expect(message).toContain('待って');
  });

  test('falls back to a generic message for an unknown reason', () => {
    expect(recipeLinkErrorMessage('upstream_error')).toBeTruthy();
    expect(recipeLinkErrorMessage('bad_request')).toBeTruthy();
    expect(recipeLinkErrorMessage('なにこれ')).toBeTruthy();
  });
});
