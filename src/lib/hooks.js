'use client';
import { usePersistentList } from './persist';

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
