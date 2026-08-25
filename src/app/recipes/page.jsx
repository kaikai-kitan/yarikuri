import { Suspense } from 'react';
import RecipesPageClient from './client';

export const metadata = {
  title: 'レシピを探す',
  description: 'スーパーのチラシや冷蔵庫の食材からAIが節約レシピを提案します。',
};

export default function RecipesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center pt-32 text-sm">
          レシピ画面を読み込んでいます…
        </div>
      }
    >
      <RecipesPageClient />
    </Suspense>
  );
}
