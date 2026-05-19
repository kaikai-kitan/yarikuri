'use client';
import { useState, useRef } from 'react';
import { Refrigerator, Plus, X } from 'lucide-react';
import { COLORS, FONT_BODY } from '../theme';
import { SectionHeader, EmptyState } from './ui';

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

export default function FridgeView({ items, onAdd, onRemove }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text);
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
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="例：玉ねぎ、しょうゆ"
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
      {items.length === 0 ? (
        <EmptyState
          icon={<Refrigerator size={32} />}
          title="まだ登録がありません"
          desc="家にある食材や調味料を追加してください"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-xl flex items-center gap-3 px-4 py-3 fade-up"
              style={{
                background: COLORS.paper,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: COLORS.matcha }}
              />
              <span
                className="flex-1 text-sm font-medium"
                style={{ color: COLORS.ink }}
              >
                {it.name}
              </span>
              <button
                onClick={() => onRemove(it.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ color: COLORS.inkSoft }}
                aria-label="削除"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
