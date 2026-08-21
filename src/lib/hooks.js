'use client';
import { useState, useEffect } from 'react';
import { usePersistentList } from './persist';
import { getUserId, peekUserId, resetUserId } from './userId';

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

// 保存済みデータの検証ルール。壊れた要素は捨て、欠けたフラグだけ補う。
const sanitizeFridgeItems = (list) =>
  list.filter((f) => isFilledString(f?.id) && isFilledString(f?.name));

const sanitizeSearches = (list) =>
  list.filter((h) => isFilledString(h?.id) && Array.isArray(h?.recipes));

export function useFridge() {
  return usePersistentList('fridge:items', sanitizeFridgeItems);
}

export function useHistory(limit = 3) {
  const [items, setItems, ready] = usePersistentList('history:searches', sanitizeSearches);

  const push = (entry) => setItems([entry, ...items].slice(0, limit));

  return [items, push, ready];
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
