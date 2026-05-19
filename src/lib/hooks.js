'use client';
import { useState, useEffect } from 'react';
import { loadList, saveList } from './storage';

export function useFridge() {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadList('fridge:items').then((f) => {
      setItems(f);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveList('fridge:items', items);
  }, [items, ready]);

  return [items, setItems, ready];
}

export function useHistory(limit = 3) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadList('history:searches').then((h) => {
      setItems(h);
      setReady(true);
    });
  }, []);

  const push = (entry) => {
    const next = [entry, ...items].slice(0, limit);
    setItems(next);
    saveList('history:searches', next);
  };

  useEffect(() => {
    if (ready) saveList('history:searches', items);
  }, [items, ready]);

  return [items, push, ready];
}
