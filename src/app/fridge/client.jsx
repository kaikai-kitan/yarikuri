'use client';
import { Loader2 } from 'lucide-react';
import FridgeView from '@/components/FridgeView';
import { useFridge } from '@/lib/hooks';
import { newId } from '@/lib/id';
import { expiryState } from '@/lib/fridge';
import { COLORS } from '@/theme';

export default function FridgePageClient() {
  const [fridge, setFridge, ready] = useFridge();

  const addFridgeItem = (name) => {
    const trimmed = name.trim();
    if (!trimmed || fridge.some((f) => f.name === trimmed)) return;
    setFridge([{ id: newId(), name: trimmed, addedAt: Date.now() }, ...fridge]);
  };

  const removeFridgeItem = (id) => setFridge(fridge.filter((f) => f.id !== id));

  // 空文字が来たら期限を外す（日付欄をクリアした場合）。
  const setExpiry = (id, expiresAt) =>
    setFridge(
      fridge.map((f) => {
        if (f.id !== id) return f;
        const { expiresAt: _current, ...rest } = f;
        return expiresAt ? { ...rest, expiresAt } : rest;
      })
    );

  const removeExpired = () => setFridge(fridge.filter((f) => expiryState(f) !== 'expired'));

  if (!ready) {
    return (
      <div className="flex items-center justify-center pt-32" style={{ color: COLORS.inkSoft }}>
        <Loader2 className="spin-slow" size={20} />
      </div>
    );
  }

  return (
    <FridgeView
      items={fridge}
      onAdd={addFridgeItem}
      onRemove={removeFridgeItem}
      onSetExpiry={setExpiry}
      onRemoveExpired={removeExpired}
    />
  );
}
