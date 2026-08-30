'use client';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Refrigerator,
  ChefHat,
  Wallet,
  Wand2,
  X,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { COLORS } from '../theme';

const TABS = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/fridge/', label: '冷蔵庫', icon: Refrigerator },
  { isAction: true },
  { href: '/recipes/', label: 'レシピ', icon: ChefHat },
  { href: '/budget/', label: '家計簿', icon: Wallet },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showBranches, setShowBranches] = useState(false);
  const triggerRef = useRef(null);
  const firstChoiceRef = useRef(null);

  const closeBranches = useCallback((restoreFocus = false) => {
    setShowBranches(false);
    if (restoreFocus) {
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }, []);

  useEffect(() => {
    if (!showBranches) return undefined;

    const focusTimer = window.setTimeout(
      () => firstChoiceRef.current?.focus(),
      0
    );
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeBranches(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBranches, closeBranches]);

  useEffect(() => {
    setShowBranches(false);
  }, [pathname]);

  const chooseProposal = (url) => {
    setShowBranches(false);
    router.push(url);
  };

  return (
    <>
      <nav
        aria-label="メインナビゲーション"
        className="shrink-0 relative z-40"
        style={{
          background: COLORS.paper,
          borderTop: `1px solid ${COLORS.border}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid grid-cols-5 relative">
          {TABS.map((tab) => {
            if (tab.isAction) {
              return (
                <div key="action" className="flex flex-col items-center justify-start relative">
                  <button
                    ref={triggerRef}
                    type="button"
                    aria-label="レシピ提案"
                    aria-expanded={showBranches}
                    aria-controls="recipe-proposal-branches"
                    onClick={() => setShowBranches((current) => !current)}
                    className="absolute -top-6 flex items-center justify-center rounded-full shadow-md active:scale-95 transition-transform"
                    style={{
                      width: 56,
                      height: 56,
                      background: `linear-gradient(135deg, ${COLORS.tomato} 0%, ${COLORS.tomatoDeep} 100%)`,
                      border: `4px solid ${COLORS.paper}`,
                      color: COLORS.paper,
                      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    {showBranches ? <X size={24} /> : <Wand2 size={24} />}
                  </button>
                  <span
                    aria-hidden="true"
                    className="text-[10px] absolute bottom-3 tracking-widest"
                    style={{ color: COLORS.tomatoDeep, fontWeight: 700 }}
                  >
                    レシピ提案
                  </span>
                </div>
              );
            }

            const { href, label, icon: Icon } = tab;
            const active = pathname === href || pathname === href.replace(/\/$/, '');
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center pt-2 pb-3 transition-colors"
                style={{ color: active ? COLORS.tomato : COLORS.inkSoft }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.8}
                  fill={active && href === '/' ? COLORS.tomato : 'none'}
                />
                <span
                  className="text-[10px] mt-1 tracking-widest"
                  style={{ fontWeight: active ? 700 : 500 }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
        <div
          className="text-center py-1"
          style={{ borderTop: `1px solid ${COLORS.border}` }}
        >
          <Link
            href="/column/"
            className="text-[10px] mr-4"
            style={{ color: COLORS.inkSoft }}
          >
            コラム
          </Link>
          <Link
            href="/privacy/"
            className="text-[10px]"
            style={{ color: COLORS.inkSoft }}
          >
            プライバシーポリシー
          </Link>
        </div>
      </nav>

      {showBranches && (
        <>
          <button
            type="button"
            aria-label="レシピ提案メニューを閉じる"
            onClick={() => closeBranches(true)}
            className="absolute inset-0 z-30 h-full w-full"
            style={{ background: 'rgba(34, 26, 20, 0.14)' }}
          />
          <div
            id="recipe-proposal-branches"
            role="group"
            aria-label="レシピ提案の種類"
            className="absolute left-1/2 z-50 -translate-x-1/2"
            style={{
              width: 'min(320px, calc(100vw - 24px))',
              height: 180,
              bottom: 'calc(110px + env(safe-area-inset-bottom))',
            }}
          >
            <svg
              data-testid="proposal-v-lines"
              aria-hidden="true"
              viewBox="0 0 320 180"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <path
                className="proposal-branch-line"
                d="M160 176 L67 42"
                pathLength="1"
                fill="none"
                stroke={COLORS.gold}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                className="proposal-branch-line proposal-branch-line-delayed"
                d="M160 176 L253 42"
                pathLength="1"
                fill="none"
                stroke={COLORS.gold}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            <ProposalChoice
              ref={firstChoiceRef}
              className="left-0"
              label="1回だけレシピ提案"
              icon={<Sparkles size={24} />}
              onClick={() => chooseProposal('/recipes/?auto=combined')}
            />
            <ProposalChoice
              className="right-0 proposal-choice-delayed"
              label="1週間分レシピ提案"
              icon={<CalendarDays size={24} />}
              onClick={() => chooseProposal('/recipes/?auto=week')}
            />
          </div>
        </>
      )}
    </>
  );
}

const ProposalChoice = forwardRef(function ProposalChoice(
  { className, label, icon, onClick },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`proposal-choice absolute top-0 flex flex-col items-center gap-2 ${className}`}
      style={{ width: '42%', color: COLORS.ink }}
    >
      <span
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: COLORS.paper,
          border: `2px solid ${COLORS.gold}`,
          color: COLORS.tomatoDeep,
          boxShadow: '0 4px 16px rgba(34, 26, 20, 0.18)',
        }}
      >
        {icon}
      </span>
      <span
        className="text-[11px] leading-tight font-bold rounded-full px-2.5 py-1.5"
        style={{
          background: COLORS.paper,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {label}
      </span>
    </button>
  );
});
