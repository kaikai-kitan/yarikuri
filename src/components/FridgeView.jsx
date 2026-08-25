'use client';
import { useState, useRef } from 'react';
import { Refrigerator, Plus, X, CalendarClock } from 'lucide-react';
import { COLORS, FONT_BODY } from '../theme';
import { SectionHeader, EmptyState } from './ui';
import { daysUntilExpiry, expiryState, sortByExpiry } from '../lib/fridge';
import { isSubmitKey } from '../lib/keyboard';

const SUGGESTIONS = [
  '卵',
  '玉ねぎ',
  'にんじん',
  '豚こま',
  '牛乳',
  '豆腐',
  'キャベツ',
  'ご飯',
  'しょうゆ',
  '味噌',
  'みりん',
  '砂糖',
];

// 期限の見せ方は残り日数で変える。日付より「今日まで」のほうが判断が早い。
function expiryLabel(item, now) {
  const days = daysUntilExpiry(item, now);
  if (days === null) return '期限なし';
  if (days < 0) return '期限切れ';
  if (days === 0) return '今日まで';
  if (days <= 3) return `あと${days}日`;

  const [, month, day] = item.expiresAt.split('-').map(Number);
  return `${month}/${day}まで`;
}

const EXPIRY_TONE = {
  expired: COLORS.tomatoDeep,
  soon: COLORS.tomato,
  fresh: COLORS.inkSoft,
};

export default function FridgeView({ items, now = new Date(), onAdd, onRemove, onSetExpiry, onRemoveExpired }) {
  const [tab, setTab] = useState('ingredient');
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const inputRef = useRef(null);

  const filteredItems = items.filter((it) => (it.type || 'ingredient') === tab);
  const sorted = sortByExpiry(filteredItems, now);
  const hasExpired = filteredItems.some((it) => expiryState(it, now) === 'expired');

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text, tab);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="fade-up">
      <SectionHeader
        eyebrow="MY FRIDGE"
        title="冷蔵庫の在庫"
        sub="家にある食材・調味料をサクッと登録。"
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ id: 'ingredient', label: '食材' }, { id: 'condiment', label: '調味料' }].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-bold flex-1 transition-colors"
            style={{
              background: tab === t.id ? COLORS.ink : COLORS.paper,
              color: tab === t.id ? COLORS.paper : COLORS.inkSoft,
              border: `1px solid ${tab === t.id ? COLORS.ink : COLORS.border}`
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div
        className="rounded-2xl p-2 flex items-center gap-1 mb-3"
        style={{
          background: COLORS.paper,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => isSubmitKey(e) && submit()}
          placeholder={tab === 'ingredient' ? "例：玉ねぎ、豚肉" : "例：しょうゆ、マヨネーズ"}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
          style={{ color: COLORS.ink, fontFamily: FONT_BODY }}
        />
        <button
          onClick={submit}
          className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-1 active:scale-95 transition-transform"
          style={{
            background: text.trim() ? COLORS.tomato : COLORS.border,
            color: text.trim() ? COLORS.paper : COLORS.inkSoft,
          }}
        >
          <Plus size={16} />
          追加
        </button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onAdd(s)}
            className="px-3 py-1.5 rounded-full text-xs"
            style={{
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.inkSoft,
            }}
          >
            + {s}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Refrigerator size={32} />}
          title={tab === 'ingredient' ? "食材がありません" : "調味料がありません"}
          desc={tab === 'ingredient' ? "家にある食材を追加してください" : "家にある調味料を追加してください"}
        />
      ) : (
        <>
          {hasExpired && (
            <button
              onClick={onRemoveExpired}
              className="w-full rounded-xl px-4 py-2.5 mb-3 text-xs font-bold active:scale-95 transition-transform"
              style={{ background: COLORS.blush, color: COLORS.tomatoDeep }}
            >
              期限切れを削除
            </button>
          )}

          <ul className="space-y-2">
            {sorted.map((it) => {
              const state = expiryState(it, now);
              return (
                <li
                  key={it.id}
                  className="rounded-xl px-4 py-3 fade-up"
                  style={{
                    background: COLORS.paper,
                    border: `1px solid ${state === 'expired' ? COLORS.tomato : COLORS.border}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: state === 'fresh' ? COLORS.matcha : EXPIRY_TONE[state] }}
                    />
                    <span
                      data-testid="fridge-name"
                      className="flex-1 min-w-0 truncate text-sm font-medium"
                      style={{ color: state === 'expired' ? COLORS.inkSoft : COLORS.ink }}
                    >
                      {it.name}
                    </span>
                    <button
                      onClick={() => setEditingId(editingId === it.id ? null : it.id)}
                      aria-label={`${it.name} の賞味期限を変更`}
                      className="flex items-center gap-1 text-[11px] rounded-full px-2 py-1 shrink-0"
                      style={{
                        color: EXPIRY_TONE[state],
                        fontWeight: state === 'fresh' ? 400 : 700,
                      }}
                    >
                      <CalendarClock size={12} />
                      {expiryLabel(it, now)}
                    </button>
                    <button
                      onClick={() => onRemove(it.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
                      style={{ color: COLORS.inkSoft }}
                      aria-label={`${it.name} を削除`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {editingId === it.id && (
                    <input
                      type="date"
                      aria-label={`${it.name} の賞味期限`}
                      value={it.expiresAt ?? ''}
                      onChange={(e) => {
                        onSetExpiry(it.id, e.target.value);
                        setEditingId(null);
                      }}
                      className="w-full mt-2 px-3 py-2 text-sm rounded-xl outline-none"
                      style={{
                        background: COLORS.cream,
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.ink,
                        fontFamily: FONT_BODY,
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
