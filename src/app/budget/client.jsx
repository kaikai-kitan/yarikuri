'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import BudgetView from '@/components/BudgetView';
import { Toast } from '@/components/ui';
import { useMonthlyLimit, useExpenses, useFridge } from '@/lib/hooks';
import { budgetSummary, foodItemsOf, projectExpense } from '@/lib/budget';
import { defaultExpiryFor } from '@/lib/fridge';
import { ocrReceipt } from '@/lib/api';
import { compressImage } from '@/lib/image';
import { newId } from '@/lib/id';
import { COLORS } from '@/theme';

export default function BudgetPageClient() {
  const [monthlyLimit, setMonthlyLimit, limitReady] = useMonthlyLimit();
  const [expenses, setExpenses, expensesReady] = useExpenses();
  const [fridge, setFridge, fridgeReady] = useFridge();

  const [scanning, setScanning] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState(null);
  const [toast, setToast] = useState(null);

  const ready = limitReady && expensesReady && fridgeReady;

  const scanReceipt = async (fileToRead) => {
    setScanning(true);
    try {
      const { base64, mediaType } = await compressImage(fileToRead);
      setPendingReceipt(await ocrReceipt(base64, mediaType));
    } catch (e) {
      setToast({ message: e?.message || 'レシートを読み取れませんでした', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  // レシートを家計に記録し、食材だけを冷蔵庫へ移す。
  const confirmReceipt = () => {
    if (!pendingReceipt) return;
    const now = Date.now();

    setExpenses([
      {
        id: newId(),
        date: pendingReceipt.date,
        store: pendingReceipt.store,
        total: pendingReceipt.total,
        items: pendingReceipt.items,
        createdAt: now,
      },
      ...expenses,
    ]);

    // 冷蔵庫にある名前とレシート内の重複の両方を除く
    const known = new Set(fridge.map((f) => f.name));
    const additions = [];
    for (const item of foodItemsOf(pendingReceipt)) {
      if (known.has(item.name)) continue;
      known.add(item.name);
      additions.push({
        id: newId(),
        name: item.name,
        addedAt: now,
        expiresAt: defaultExpiryFor(item.kind),
      });
    }
    if (additions.length) setFridge([...additions, ...fridge]);

    setPendingReceipt(null);
    setToast({
      message: additions.length
        ? `記録しました。冷蔵庫に${additions.length}品を追加しました`
        : '記録しました',
    });
  };

  // レシートを撮らない支出。品目を持たないため、記録自体のカテゴリで集計される。
  const addExpense = ({ total, store, date, category }) => {
    setExpenses([
      { id: newId(), date, store, total, category, items: [], createdAt: Date.now() },
      ...expenses,
    ]);
    setToast({ message: '記録しました' });
  };

  // 確認画面でのカテゴリ訂正。冷蔵庫に入る品目もこの時点で決まる。
  const changeItemCategory = (index, category) =>
    setPendingReceipt({
      ...pendingReceipt,
      items: pendingReceipt.items.map((item, i) =>
        i === index ? { ...item, category, isFood: category === 'food' } : item
      ),
    });

  // 訂正。品目（レシートの読み取り結果）はそのまま残す。
  const updateExpense = (id, { total, store, date, category }) =>
    setExpenses(
      expenses.map((e) => (e.id === id ? { ...e, total, store, date, category } : e))
    );

  const removeExpense = (id) => setExpenses(expenses.filter((e) => e.id !== id));

  if (!ready) {
    return (
      <div className="flex items-center justify-center pt-32" style={{ color: COLORS.inkSoft }}>
        <Loader2 className="spin-slow" size={20} />
      </div>
    );
  }

  const summary = budgetSummary({ monthlyLimit, expenses });

  return (
    <>
      <BudgetView
        summary={summary}
        expenses={expenses}
        scanning={scanning}
        pendingReceipt={pendingReceipt}
        projection={
          pendingReceipt
            ? projectExpense({
                summary,
                amount: pendingReceipt.total,
                date: pendingReceipt.date,
              })
            : null
        }
        onSetLimit={setMonthlyLimit}
        onScanReceipt={scanReceipt}
        onConfirmReceipt={confirmReceipt}
        onCancelReceipt={() => setPendingReceipt(null)}
        onRemoveExpense={removeExpense}
        onChangeItemCategory={changeItemCategory}
        onAddExpense={addExpense}
        onUpdateExpense={updateExpense}
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
