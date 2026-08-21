'use client';
import { useState, useEffect } from 'react';
import { loadList, saveList, loadValue, saveValue } from './storage';

const passThrough = (list) => list;

// localStorage に配列を永続化する共通フック。
//
// - 初回ロードが終わるまで(ready=false)は保存しない。
//   ロード前の空配列で既存データを上書きしてしまうのを防ぐため。
// - sanitize は境界での検証。devtools での手編集や旧スキーマが混ざっても
//   壊れた要素が画面まで流れないよう、ロード直後に取り除く。
//   呼び出し側はモジュールスコープの定数を渡す想定のため依存配列には含めない。
export function usePersistentList(key, sanitize = passThrough) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadList(key).then((stored) => {
      setItems(sanitize(stored));
      setReady(true);
    });
  }, [key]);

  useEffect(() => {
    if (ready) saveList(key, items);
  }, [key, items, ready]);

  return [items, setItems, ready];
}

// usePersistentList の単一値版。保存が無ければ fallback を使う。
export function usePersistentValue(key, fallback, sanitize = passThrough) {
  const [value, setValue] = useState(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadValue(key).then((stored) => {
      setValue(stored === null ? fallback : sanitize(stored));
      setReady(true);
    });
  }, [key]);

  useEffect(() => {
    if (ready) saveValue(key, value);
  }, [key, value, ready]);

  return [value, setValue, ready];
}
