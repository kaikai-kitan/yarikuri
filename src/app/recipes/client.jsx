'use client';
import { useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import RecipesView from '@/components/RecipesView';
import RecipeDetail from '@/components/RecipeDetail';
import SearchingScreen from '@/components/SearchingScreen';
import RewardAdModal from '@/components/RewardAdModal';
import { Toast } from '@/components/ui';
import { useFridge, useHistory } from '@/lib/hooks';
import { ocrFlyer, suggestRecipes } from '@/lib/api';
import { compressImage } from '@/lib/image';
import { COLORS } from '@/theme';

export default function RecipesPageClient() {
  const [fridge, , fridgeReady] = useFridge();
  const [, pushHistory, historyReady] = useHistory();

  const [currentRecipes, setCurrentRecipes] = useState([]);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [searching, setSearching] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [recipeOpen, setRecipeOpen] = useState(null);
  const [toast, setToast] = useState(null);

  const ready = fridgeReady && historyReady;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('yarikuri:open-entry');
      if (raw) {
        const { recipes, meta } = JSON.parse(raw);
        setCurrentRecipes(recipes);
        setCurrentMeta(meta);
        sessionStorage.removeItem('yarikuri:open-entry');
      }
    } catch { /* ignore */ }
  }, []);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const gateBehindAd = (actionFn) => {
    setPendingAction(() => actionFn);
    setShowReward(true);
  };

  const handleRewardClaim = () => {
    setShowReward(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  const handleRewardCancel = () => {
    setShowReward(false);
    setPendingAction(null);
  };

  const searchFromFlyer = useCallback((file) => {
    if (!file) return;
    gateBehindAd(async () => {
      setSearching('flyer');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      try {
        const { base64, mediaType } = await compressImage(file);
        const flyerItems = await ocrFlyer(base64, mediaType);
        if (!flyerItems.length) { showToast('特売品を検出できませんでした', 'error'); setSearching(null); return; }
        const fridgeNames = fridge.map((f) => f.name);
        const recipes = await suggestRecipes(fridgeNames, flyerItems);
        if (!recipes.length) { showToast('作れるレシピが見つかりませんでした', 'error'); setSearching(null); return; }
        const entry = { id: crypto.randomUUID(), searchedAt: Date.now(), source: 'flyer', fridgeUsed: fridgeNames, flyerItems, recipes };
        pushHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({ source: 'flyer', flyerCount: flyerItems.length, fridgeCount: fridgeNames.length });
        showToast(`チラシから${flyerItems.length}件読取り、レシピを提案しました`);
      } catch (e) {
        showToast(e.message || '検索に失敗しました', 'error');
      } finally { setSearching(null); }
    });
  }, [fridge, pushHistory]);

  const searchFromFridge = useCallback(() => {
    if (fridge.length === 0) { showToast('冷蔵庫タブで食材を追加してください', 'error'); return; }
    gateBehindAd(async () => {
      setSearching('fridge');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      try {
        const fridgeNames = fridge.map((f) => f.name);
        const recipes = await suggestRecipes(fridgeNames, []);
        if (!recipes.length) { showToast('作れるレシピが見つかりませんでした', 'error'); setSearching(null); return; }
        const entry = { id: crypto.randomUUID(), searchedAt: Date.now(), source: 'fridge', fridgeUsed: fridgeNames, flyerItems: null, recipes };
        pushHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({ source: 'fridge', flyerCount: 0, fridgeCount: fridgeNames.length });
        showToast('冷蔵庫からレシピを提案しました');
      } catch (e) {
        showToast(e.message || '検索に失敗しました', 'error');
      } finally { setSearching(null); }
    });
  }, [fridge, pushHistory]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center pt-32" style={{ color: COLORS.inkSoft }}>
        <Loader2 className="spin-slow" size={20} />
      </div>
    );
  }

  return (
    <>
      <RecipesView
        currentRecipes={currentRecipes}
        currentMeta={currentMeta}
        onSearchFromFlyer={searchFromFlyer}
        onSearchFromFridge={searchFromFridge}
        onOpenRecipe={setRecipeOpen}
        fridgeCount={fridge.length}
        adSlot=""
      />
      {searching && <SearchingScreen source={searching} />}
      {showReward && <RewardAdModal onClaim={handleRewardClaim} onCancel={handleRewardCancel} />}
      {recipeOpen && <RecipeDetail recipe={recipeOpen} onClose={() => setRecipeOpen(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
