'use client';
import { useState } from 'react';
import { Wallet, Receipt, Loader2, X, Refrigerator } from 'lucide-react';
import { COLORS, FONT_BODY } from '../theme';
import { SectionHeader, EmptyState } from './ui';
import { CATEGORIES, CATEGORY_LABELS, categoryOf } from '../lib/budget';
import ExpenseForm from './ExpenseForm';

const yen = (n) => `${n < 0 ? '-' : ''}¥${Math.abs(Math.round(n)).toLocaleString('ja-JP')}`;

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export default function BudgetView({
  summary,
  expenses,
  scanning,
  pendingReceipt,
  projection,
  onSetLimit,
  onScanReceipt,
  onConfirmReceipt,
  onCancelReceipt,
  onRemoveExpense,
  onChangeItemCategory,
  onAddExpense,
  onUpdateExpense,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const showForm = !summary.hasLimit || editing;

  const submitLimit = () => {
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) return;
    onSetLimit(value);
    setDraft('');
    setEditing(false);
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onScanReceipt(file);
    e.target.value = '';
  };

  return (
    <div className="fade-up">
      <SectionHeader
        eyebrow="HOUSEHOLD"
        title="家計簿"
        sub="レシートを読み取ると、食材は冷蔵庫へ、金額は今月の予算から引かれます。"
      />

      {/* 予算サマリー */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}
      >
        {showForm ? (
          <div>
            <div className="flex items-center gap-2 mb-2" style={{ color: COLORS.inkSoft }}>
              <Wallet size={14} />
              <span className="text-[10px] tracking-[0.2em]">MONTHLY BUDGET</span>
            </div>
            {!summary.hasLimit && (
              <p className="text-sm mb-3" style={{ color: COLORS.ink }}>
                今月の予算を設定してください
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                id="budget-limit"
                aria-label="今月の予算"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitLimit()}
                placeholder="例：30000"
                className="flex-1 px-3 py-2.5 text-sm rounded-xl outline-none"
                style={{
                  background: COLORS.cream,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.ink,
                  fontFamily: FONT_BODY,
                }}
              />
              <button
                onClick={submitLimit}
                className="rounded-xl px-4 py-2.5 text-sm font-bold active:scale-95 transition-transform"
                style={{ background: COLORS.tomato, color: COLORS.paper }}
              >
                設定
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2" style={{ color: COLORS.inkSoft }}>
                <Wallet size={14} />
                <span className="text-[10px] tracking-[0.2em]">MONTHLY BUDGET</span>
              </div>
              <button
                onClick={() => {
                  setDraft(String(summary.monthlyLimit));
                  setEditing(true);
                }}
                className="text-[11px] underline"
                style={{ color: COLORS.inkSoft }}
              >
                予算を変更
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <Figure label="予算" value={yen(summary.monthlyLimit)} />
              <Figure label="使った" value={yen(summary.spent)} />
              <Figure
                label="残り"
                value={yen(summary.remaining)}
                tone={summary.isOver ? COLORS.tomatoDeep : COLORS.matcha}
              />
            </div>

            {summary.isOver ? (
              <p className="text-xs font-bold" style={{ color: COLORS.tomatoDeep }}>
                予算を超えています
              </p>
            ) : (
              <p className="text-xs" style={{ color: COLORS.inkSoft }}>
                1日あたり {yen(summary.dailyAllowance)}（残り{summary.daysLeft}日）
              </p>
            )}
          </div>
        )}
      </div>

      {/* レシート読み取り */}
      {scanning ? (
        <div
          className="rounded-2xl p-4 mb-6 flex items-center gap-2 text-sm"
          style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
        >
          <Loader2 className="spin-slow" size={16} />
          レシートを解析しています…
        </div>
      ) : (
        !pendingReceipt && (
          <label
            className="rounded-2xl p-4 mb-3 flex items-center justify-center gap-2 text-sm font-bold cursor-pointer active:scale-95 transition-transform"
            style={{ background: COLORS.tomato, color: COLORS.paper }}
          >
            <Receipt size={16} />
            レシートを読み取る
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="レシートを読み取る"
              onChange={pickFile}
              className="hidden"
            />
          </label>
        )
      )}

      {!scanning && !pendingReceipt && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl px-4 py-3 mb-6 text-sm active:scale-95 transition-transform"
          style={{
            background: 'transparent',
            border: `1px dashed ${COLORS.border}`,
            color: COLORS.inkSoft,
          }}
        >
          手入力で追加
        </button>
      )}

      {/* 手入力 */}
      {adding && (
        <ExpenseForm
          onSubmit={(values) => {
            onAddExpense(values);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* 読み取り結果の確認 */}
      {pendingReceipt && (
        <PendingReceipt
          receipt={pendingReceipt}
          projection={projection}
          onChangeItemCategory={onChangeItemCategory}
          onConfirm={onConfirmReceipt}
          onCancel={onCancelReceipt}
        />
      )}

      {/* 支出履歴 */}
      <h3 className="text-[10px] tracking-[0.3em] mb-3" style={{ color: COLORS.gold }}>
        HISTORY
      </h3>
      {expenses.length === 0 ? (
        <EmptyState
          icon={<Receipt size={32} />}
          title="まだ記録がありません"
          desc="レシートを読み取ると、ここに記録されます"
        />
      ) : (
        <ul className="space-y-2">
          {[...expenses].sort(byDateDesc).map((e) =>
            editingId === e.id ? (
              <li key={e.id}>
                <ExpenseForm
                  initial={{ total: e.total, store: e.store, date: e.date, category: categoryOf(e) }}
                  submitLabel="保存する"
                  onSubmit={(values) => {
                    onUpdateExpense(e.id, values);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={e.id}
                className="rounded-xl flex items-center gap-3 px-4 py-3 fade-up"
                style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}
              >
                <button
                  onClick={() => setEditingId(e.id)}
                  className="flex-1 min-w-0 text-left"
                  aria-label={`${e.date} ${e.store || '店名なし'} を編集`}
                >
                  <div className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>
                    <span data-testid="expense-store">{e.store || '店名なし'}</span>
                  </div>
                  <div className="text-[11px]" style={{ color: COLORS.inkSoft }}>
                    {e.date}・{e.items.length}品
                  </div>
                </button>
                <span className="text-sm font-bold" style={{ color: COLORS.ink }}>
                  {yen(e.total)}
                </span>
                <button
                  onClick={() => onRemoveExpense(e.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ color: COLORS.inkSoft }}
                  aria-label={`${e.date} ${e.store || '店名なし'} の記録を削除`}
                >
                  <X size={16} />
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function Figure({ label, value, tone }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: COLORS.cream }}>
      <div className="text-[10px] mb-0.5" style={{ color: COLORS.inkSoft }}>
        {label}
      </div>
      <div className="text-sm font-bold" style={{ color: tone || COLORS.ink }}>
        {value}
      </div>
    </div>
  );
}

function PendingReceipt({ receipt, projection, onChangeItemCategory, onConfirm, onCancel }) {
  const foodCount = receipt.items.filter((i) => categoryOf(i) === 'food').length;

  return (
    <div
      className="rounded-2xl p-4 mb-6 fade-up"
      style={{ background: COLORS.paper, border: `1px solid ${COLORS.tomato}` }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-bold" style={{ color: COLORS.ink }}>
          {receipt.store || '店名なし'}
        </span>
        <span className="text-base font-bold" style={{ color: COLORS.tomatoDeep }}>
          {yen(receipt.total)}
        </span>
      </div>
      <div className="text-[11px] mb-3" style={{ color: COLORS.inkSoft }}>
        {receipt.date}
      </div>

      <ul className="mb-3 space-y-1.5">
        {receipt.items.map((item, i) => {
          const category = categoryOf(item);
          const isFood = category === 'food';
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-2 text-xs">
              {isFood ? (
                <Refrigerator size={12} style={{ color: COLORS.matcha }} />
              ) : (
                <span className="w-3 shrink-0" />
              )}
              <span
                className="flex-1 min-w-0 truncate"
                style={{ color: isFood ? COLORS.ink : COLORS.inkSoft }}
              >
                {item.name}
              </span>
              <span style={{ color: COLORS.inkSoft }}>{yen(item.price)}</span>
              <select
                aria-label={`${item.name} のカテゴリ`}
                value={category}
                onChange={(e) => onChangeItemCategory(i, e.target.value)}
                className="text-[11px] rounded-lg px-1.5 py-1 outline-none"
                style={{
                  background: COLORS.cream,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.inkSoft,
                  fontFamily: FONT_BODY,
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] mb-3" style={{ color: COLORS.matcha }}>
        冷蔵庫に{foodCount}品を登録します
      </p>

      {projection && <Projection projection={projection} />}

      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold active:scale-95 transition-transform"
          style={{ background: COLORS.tomato, color: COLORS.paper }}
        >
          記録する
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

// 記録する前に家計への影響を見せる。
function Projection({ projection }) {
  if (!projection.applies) {
    return (
      <p className="text-[11px] mb-3" style={{ color: COLORS.inkSoft }}>
        今月の予算には影響しません
      </p>
    );
  }

  return (
    <div
      className="rounded-xl px-3 py-2 mb-3"
      style={{ background: COLORS.cream }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>
          記録後の残り
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: projection.isOver ? COLORS.tomatoDeep : COLORS.matcha }}
        >
          {yen(projection.remaining)}
        </span>
      </div>
      {projection.isOver ? (
        <p className="text-[11px] mt-1 font-bold" style={{ color: COLORS.tomatoDeep }}>
          この記録で今月の予算を超えます
        </p>
      ) : (
        <p className="text-[11px] mt-1" style={{ color: COLORS.inkSoft }}>
          1日あたり {yen(projection.dailyAllowance)} になります
        </p>
      )}
    </div>
  );
}
