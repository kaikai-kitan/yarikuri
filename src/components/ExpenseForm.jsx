'use client';
import { useState } from 'react';
import { COLORS, FONT_BODY } from '../theme';
import { CATEGORIES, CATEGORY_LABELS } from '../lib/budget';

const todayIso = () => new Date().toISOString().slice(0, 10);

// 入力値の検証。問題があればエラーメッセージ、無ければ null を返す。
function validate({ amount, date }) {
  if (!amount.trim()) return '金額を入力してください';
  const value = Number(amount);
  if (!Number.isFinite(value)) return '金額は数字で入力してください';
  if (value < 1) return '金額は1円以上で入力してください';
  if (date > todayIso()) return '未来の日付は記録できません';
  return null;
}

// レシートを撮らない支出の入力。新規追加と既存記録の編集の両方で使う。
export default function ExpenseForm({ initial, onSubmit, onCancel, submitLabel = '記録する' }) {
  const [amount, setAmount] = useState(initial ? String(initial.total) : '');
  const [store, setStore] = useState(initial?.store ?? '');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [category, setCategory] = useState(initial?.category ?? 'food');
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    const problem = validate({ amount, date });
    setError(problem);
    if (problem) return;
    onSubmit({ total: Number(amount), store: store.trim(), date, category });
  };

  const fieldStyle = {
    background: COLORS.cream,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.ink,
    fontFamily: FONT_BODY,
  };

  return (
    <div
      className="rounded-2xl p-4 mb-6 fade-up"
      style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}
    >
      <div className="grid gap-2.5 mb-3">
        <Field label="金額" htmlFor="expense-amount">
          <input
            id="expense-amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例：1200"
            className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
            style={fieldStyle}
          />
        </Field>

        <Field label="店名" htmlFor="expense-store">
          <input
            id="expense-store"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="例：コンビニA（任意）"
            className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
            style={fieldStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="日付" htmlFor="expense-date">
            <input
              id="expense-date"
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
              style={fieldStyle}
            />
          </Field>

          <Field label="カテゴリ" htmlFor="expense-category">
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl outline-none"
              style={fieldStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {error && (
        <p className="text-[11px] mb-3" style={{ color: COLORS.tomatoDeep }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold active:scale-95 transition-transform"
          style={{ background: COLORS.tomato, color: COLORS.paper }}
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm active:scale-95 transition-transform"
          style={{ background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
        >
          やめる
        </button>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[10px] mb-1" style={{ color: COLORS.inkSoft }}>
        {label}
      </label>
      {children}
    </div>
  );
}
