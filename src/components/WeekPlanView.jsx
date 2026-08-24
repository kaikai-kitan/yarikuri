'use client';
import { useState } from 'react';
import { CalendarDays, ShoppingBasket, ArrowDown, Plus, Check } from 'lucide-react';
import { COLORS } from '../theme';
import { planDayDate, currentDayIndex, cookedCount } from '../lib/plan';

const yen = (n) => `¥${Math.round(n).toLocaleString('ja-JP')}`;

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const parseIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const shortDate = (iso) => {
  const d = parseIso(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const weekday = (iso) => WEEKDAYS[parseIso(iso).getDay()];

export default function WeekPlanView({ plan, now = new Date(), onClearPlan, onToggleCooked }) {
  const [confirming, setConfirming] = useState(false);

  const todayIndex = currentDayIndex(plan, now);
  const lastIndex = plan.days.length - 1;
  const shoppingTotal = plan.shoppingList.reduce((sum, s) => sum + (s.estimatedPrice || 0), 0);
  const cooked = cookedCount(plan);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2" style={{ color: COLORS.gold }}>
          <CalendarDays size={14} />
          <span className="text-[10px] tracking-[0.3em]">WEEK PLAN</span>
          <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>
            {shortDate(plan.startDate)} 〜 {shortDate(planDayDate(plan.startDate, lastIndex))}
          </span>
        </div>
        {!confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="text-[11px] underline"
            style={{ color: COLORS.inkSoft }}
          >
            献立を消す
          </button>
        )}
      </div>

      {confirming && (
        <div
          className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3"
          style={{ background: COLORS.blush }}
        >
          <span className="text-xs" style={{ color: COLORS.tomatoDeep }}>
            この献立を消しますか？
          </span>
          <span className="flex gap-2 shrink-0">
            <button
              onClick={onClearPlan}
              className="rounded-lg px-3 py-1.5 text-xs font-bold"
              style={{ background: COLORS.tomato, color: COLORS.paper }}
            >
              消す
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3 py-1.5 text-xs"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}
            >
              やめる
            </button>
          </span>
        </div>
      )}

      {cooked > 0 && (
        <p className="text-[11px] mb-3" style={{ color: COLORS.matcha }}>
          {plan.days.length}日中{cooked}日ぶん作りました
        </p>
      )}

      {todayIndex === null && (
        <p className="text-xs mb-3" style={{ color: COLORS.inkSoft }}>
          この献立は終わりました
        </p>
      )}

      {/* 初日のまとめ買い */}
      <div
        className="rounded-2xl p-4 mb-3"
        style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-2 mb-2" style={{ color: COLORS.inkSoft }}>
          <ShoppingBasket size={14} />
          <span className="text-[10px] tracking-[0.2em]">SHOPPING LIST</span>
        </div>
        {plan.shoppingList.length === 0 ? (
          <p className="text-xs" style={{ color: COLORS.inkSoft }}>
            買い足しは不要です
          </p>
        ) : (
          <>
            <ul className="space-y-1 mb-2">
              {plan.shoppingList.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex items-baseline justify-between text-xs">
                  <span style={{ color: COLORS.ink }}>{s.name}</span>
                  <span style={{ color: COLORS.inkSoft }}>{yen(s.estimatedPrice)}</span>
                </li>
              ))}
            </ul>
            <div
              className="flex items-baseline justify-between text-xs font-bold pt-2"
              style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.ink }}
            >
              <span>合計</span>
              <span>{yen(shoppingTotal)}</span>
            </div>
          </>
        )}
      </div>

      {/* 7日分 */}
      <ul className="space-y-2">
        {plan.days.map((d, i) => {
          const date = planDayDate(plan.startDate, i);
          const isToday = i === todayIndex;
          const carried = i > 0 ? plan.days[i - 1].carryOver : [];

          return (
            <li
              key={d.day}
              data-testid="plan-day"
              className="rounded-2xl p-4"
              style={{
                background: COLORS.paper,
                border: `1px solid ${isToday ? COLORS.tomato : COLORS.border}`,
                opacity: d.cookedAt ? 0.65 : 1,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold" style={{ color: COLORS.gold }}>
                  {d.day}日目
                </span>
                <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>
                  {shortDate(date)}（{weekday(date)}）
                </span>
                {isToday && (
                  <span
                    className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: COLORS.tomato, color: COLORS.paper }}
                  >
                    今日
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl">{d.emoji}</span>
                <span className="display text-base font-bold" style={{ color: COLORS.ink }}>
                  {d.name}
                </span>
              </div>

              {d.reason && (
                <p className="text-[11px] mb-2" style={{ color: COLORS.matcha }}>
                  {d.reason}
                </p>
              )}

              {carried.length > 0 && (
                <p
                  className="text-[11px] flex items-center gap-1 mb-1"
                  style={{ color: COLORS.inkSoft }}
                >
                  <ArrowDown size={11} />
                  前日から {carried.join('、')}
                </p>
              )}

              {d.addOns.length > 0 && (
                <p
                  className="text-[11px] flex items-center gap-1 mb-1"
                  style={{ color: COLORS.tomatoDeep }}
                >
                  <Plus size={11} />
                  買い足し {d.addOns.map((a) => `${a.name} ${yen(a.estimatedPrice)}`).join('、')}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span className="text-[11px]" style={{ color: COLORS.inkSoft }}>
                  1人前 {yen(d.totalCost)}・{d.cookingTime}
                </span>
                <button
                  onClick={() => onToggleCooked(i)}
                  aria-label={d.cookedAt ? `${d.name} を作っていないことにする` : `${d.name} を作った`}
                  className="flex items-center gap-1 text-[11px] font-bold rounded-full px-3 py-1.5 shrink-0 active:scale-95 transition-transform"
                  style={
                    d.cookedAt
                      ? { background: COLORS.matcha, color: COLORS.paper }
                      : { border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }
                  }
                >
                  <Check size={12} />
                  {d.cookedAt ? '作りました' : '作った'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
