'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import HomeView from '@/components/HomeView';
import { useFridge, useHistory, useWeekPlan } from '@/lib/hooks';
import { toggleCooked } from '@/lib/plan';
import { fetchRecipeLink } from '@/lib/api';
import { recipeLinkErrorMessage } from '@/lib/recipeLink';
import { COLORS } from '@/theme';

export default function HomePageClient() {
  const router = useRouter();
  const [fridge, setFridge, fridgeReady] = useFridge();
  const [history, , historyReady] = useHistory();
  const [weekPlan, setWeekPlan, planReady] = useWeekPlan();
  const [recipeLinks, setRecipeLinks] = useState({});
  const [linkingAvailable, setLinkingAvailable] = useState(true);
  const [toast, setToast] = useState(null);

  const ready = fridgeReady && historyReady && planReady;

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

  const showToast = (message, type = 'info') => setToast({ message, type });

  const fetchLinkFor = async (index) => {
    const target = weekPlan?.days?.[index];
    if (!target) return;
    setRecipeLinks((prev) => ({ ...prev, [index]: 'loading' }));
    const { configured, link, reason } = await fetchRecipeLink(target.name);
    if (!configured) {
      setLinkingAvailable(false);
      setRecipeLinks((prev) => { const { [index]: _dropped, ...rest } = prev; return rest; });
      return;
    }
    const message = recipeLinkErrorMessage(reason);
    if (message) showToast(message, 'error');
    setRecipeLinks((prev) => ({ ...prev, [index]: link }));
  };

  const toggleCookedDay = (index) => {
    const target = weekPlan?.days?.[index];
    if (!target) return;
    const wasCooked = Boolean(target.cookedAt);
    setWeekPlan(toggleCooked(weekPlan, index));
    if (wasCooked) return;

    const usedTexts = target.usedFromFridge || [];
    const isConsumed = (f) => usedTexts.some(text => text.includes(f.name) || f.name.includes(text));
    const consumed = fridge.filter(isConsumed);
    if (!consumed.length) return;

    setFridge(fridge.filter((f) => !isConsumed(f)));
    showToast(`${consumed.map((f) => f.name).join('、')}を冷蔵庫から減らしました`);
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center pt-32" style={{ color: COLORS.inkSoft }}>
        <Loader2 className="spin-slow" size={20} />
      </div>
    );
  }

  return (
    <>
      <HomeView
        history={history}
        onOpenHistory={handleOpenHistory}
        weekPlan={weekPlan}
        onClearPlan={() => { setWeekPlan(null); setRecipeLinks({}); }}
        onToggleCooked={toggleCookedDay}
        recipeLinks={recipeLinks}
        linkingAvailable={linkingAvailable}
        onFetchLink={fetchLinkFor}
        adSlot=""
      />
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-xs">
          {toast.message}
        </div>
      )}
    </>
  );
}
