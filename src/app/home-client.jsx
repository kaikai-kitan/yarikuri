'use client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import HomeView from '@/components/HomeView';
import { useFridge, useHistory } from '@/lib/hooks';
import { COLORS } from '@/theme';

export default function HomePageClient() {
  const router = useRouter();
  const [fridge, , fridgeReady] = useFridge();
  const [history, , historyReady] = useHistory();

  const ready = fridgeReady && historyReady;

  const handleGo = (tab) => {
    const paths = { home: '/', fridge: '/fridge/', recipes: '/recipes/', privacy: '/privacy/' };
    router.push(paths[tab] || '/');
  };

  const handleOpenHistory = (entry) => {
    try {
      sessionStorage.setItem('yarikuri:open-entry', JSON.stringify({
        recipes: entry.recipes,
        meta: {
          source: entry.source,
          flyerCount: entry.flyerItems?.length || 0,
          fridgeCount: entry.fridgeUsed?.length || 0,
        },
      }));
    } catch { /* ignore */ }
    router.push('/recipes/');
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center pt-32" style={{ color: COLORS.inkSoft }}>
        <Loader2 className="spin-slow" size={20} />
      </div>
    );
  }

  return (
    <HomeView
      history={history}
      fridgeCount={fridge.length}
      onGo={handleGo}
      onOpenHistory={handleOpenHistory}
      adSlot=""
    />
  );
}
