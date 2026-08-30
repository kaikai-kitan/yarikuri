'use client';
import { Minus, Plus, Users } from 'lucide-react';
import { COLORS } from '../theme';
import {
  MIN_SERVINGS,
  MAX_SERVINGS,
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_DESCRIPTIONS,
  withServings,
  withPriority,
} from '../lib/preferences';

/**
 * 提案の設定 — 何人分で作るか、何を優先するか。
 * ここで決めた内容がレシピ提案と1週間献立の両方に効く。
 */
export default function ProposalSettings({ preferences, onChange }) {
  const { servings, priority } = preferences;

  return (
    <section
      className="rounded-2xl p-4 mb-6"
      style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="flex items-center gap-1.5 text-xs font-bold"
          style={{ color: COLORS.inkSoft }}
        >
          <Users size={14} />
          何人分
        </span>
        <span className="flex items-center gap-3">
          <StepButton
            label="人数を減らす"
            icon={<Minus size={16} />}
            disabled={servings <= MIN_SERVINGS}
            onClick={() => onChange(withServings(preferences, servings - 1))}
          />
          <span
            className="display text-base font-bold tabular-nums"
            style={{ color: COLORS.ink, minWidth: 56, textAlign: 'center' }}
          >
            {servings}人分
          </span>
          <StepButton
            label="人数を増やす"
            icon={<Plus size={16} />}
            disabled={servings >= MAX_SERVINGS}
            onClick={() => onChange(withServings(preferences, servings + 1))}
          />
        </span>
      </div>

      <div className="text-xs font-bold mb-2" style={{ color: COLORS.inkSoft }}>
        優先すること
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PRIORITIES.map((key) => {
          const active = key === priority;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(withPriority(preferences, key))}
              className="text-[11px] font-bold rounded-full py-2 px-1 active:scale-95 transition-transform"
              style={
                active
                  ? { background: COLORS.tomato, color: COLORS.paper }
                  : { border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }
              }
            >
              {PRIORITY_LABELS[key]}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] mt-2" style={{ color: COLORS.inkSoft }}>
        {PRIORITY_DESCRIPTIONS[priority]}
      </p>
    </section>
  );
}

function StepButton({ label, icon, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
      style={{
        border: `1px solid ${COLORS.border}`,
        color: disabled ? COLORS.border : COLORS.tomato,
      }}
    >
      {icon}
    </button>
  );
}
