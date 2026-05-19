'use client';
import { Loader2 } from 'lucide-react';
import FridgeView from '@/components/FridgeView';
import { useFridge } from '@/lib/hooks';
import { COLORS } from '@/theme';

export default function FridgePageClient() {
  const [fridge, setFridge, ready] = useFridge();

  const addFridgeItem = (name) => {
    const trimmed = name.trim();
    if (!trimmed || fridge.some((f) => f.name === trimmed)) return;
    setFridge([{ id: crypto.randomUUID(), name: trimmed, addedAt: Date.now() }, ...fridge]);
  };

  const removeFridgeItem = (id) => setFridge(fridge.filter((f) => f.id !== id));

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
    />
  );
}
