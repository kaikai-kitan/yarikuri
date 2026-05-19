'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Refrigerator, ChefHat } from 'lucide-react';
import { COLORS } from '../theme';

const TABS = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/fridge/', label: '冷蔵庫', icon: Refrigerator },
  { href: '/recipes/', label: 'レシピ', icon: ChefHat },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: COLORS.paper,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="grid grid-cols-3">
        {TABS.map(({ href, label, icon: Icon }) => {
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
  );
}
