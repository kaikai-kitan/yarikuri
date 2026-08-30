'use client';
import { useState, useEffect } from 'react';
import { usePersistentList, usePersistentValue } from './persist';
import { normalizeLimit } from './budget';
import { sanitizePlan } from './plan';
import { getUserId, peekUserId, resetUserId } from './userId';
import { newId } from './id';
import { recipeFavoriteKey, sanitizeFavorites } from './favorites';
import { DEFAULT_PREFERENCES, normalizePreferences } from './preferences';

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

// 保存済みデータの検証ルール。壊れた要素は捨て、欠けたフラグだけ補う。
// 期限は 'YYYY-MM-DD' のみ受け付ける。不正な値は食材ごと捨てず、期限だけ落とす。
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const sanitizeFridgeItems = (list) =>
  list
    .filter((f) => isFilledString(f?.id) && isFilledString(f?.name))
    .map(({ expiresAt, ...rest }) =>
      typeof expiresAt === 'string' && ISO_DATE.test(expiresAt) ? { ...rest, expiresAt } : rest
    );

const sanitizeSearches = (list) =>
  list.filter((h) => isFilledString(h?.id) && Array.isArray(h?.recipes));

// 支出レコード。id・date・total が揃っていないものは画面へ流さない。
const sanitizeExpenses = (list) =>
  list
    .filter(
      (e) =>
        isFilledString(e?.id) &&
        isFilledString(e?.date) &&
        Number.isFinite(Number(e?.total))
    )
    .map((e) => ({
      ...e,
      total: Number(e.total),
      items: Array.isArray(e.items) ? e.items : [],
    }));

// 月予算は { total, food, daily } のカテゴリ配分。
// total が 0 なら「未設定」。配分導入前の数値形式からは normalizeLimit が移行する。
const UNSET_LIMIT = { total: 0, food: 0, daily: 0 };

export function useMonthlyLimit() {
  return usePersistentValue('budget:limit', UNSET_LIMIT, normalizeLimit);
}

export function useExpenses() {
  return usePersistentList('budget:expenses', sanitizeExpenses);
}

// 一週間の献立。壊れた保存データは null（献立なし）として扱う。
export function useWeekPlan() {
  return usePersistentValue('plan:week', null, sanitizePlan);
}

export function useFridge() {
  return usePersistentList('fridge:items', sanitizeFridgeItems);
}

export function useHistory(limit = 3) {
  const [items, setItems, ready] = usePersistentList('history:searches', sanitizeSearches);

  const push = (entry) => setItems([entry, ...items].slice(0, limit));

  return [items, push, ready];
}

// お気に入りは検索履歴（最大3件）と分離し、レシピ全体のスナップショットを保存する。
// 返り値は [favorites, toggle, ready]。
export function useFavorites() {
  const [favorites, setFavorites, ready] = usePersistentList(
    'recipes:favorites',
    sanitizeFavorites
  );

  const toggle = (recipe) => {
    const targetKey = recipeFavoriteKey(recipe);
    if (!targetKey) return;

    setFavorites((current) => {
      const exists = current.some(
        (favorite) => recipeFavoriteKey(favorite.recipe) === targetKey
      );
      return exists
        ? current.filter(
            (favorite) => recipeFavoriteKey(favorite.recipe) !== targetKey
          )
        : [
            {
              id: newId(),
              savedAt: Date.now(),
              recipe: { ...recipe },
            },
            ...current,
          ];
    });
  };

  return [favorites, toggle, ready];
}

// 提案の設定（何人分・何を優先するか）。提案と献立の両方に効く。
export function usePreferences() {
  return usePersistentValue('recipes:preferences', DEFAULT_PREFERENCES, normalizePreferences);
}

// 登録不要の匿名利用者ID。マウント時に発行または期限を先送りする。
// 返り値は [state, reset, ready]。state は表示用の { id, issuedAt, lastSeenAt, expiresAt }。
export function useUserId() {
  const [state, setState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getUserId();
    setState(peekUserId());
    setReady(true);
  }, []);

  const reset = () => {
    resetUserId();
    setState(peekUserId());
  };

  return [state, reset, ready];
}
