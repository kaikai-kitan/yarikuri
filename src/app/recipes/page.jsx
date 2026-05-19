import RecipesPageClient from './client';

export const metadata = {
  title: 'レシピを探す',
  description: 'スーパーのチラシや冷蔵庫の食材からAIが節約レシピを提案します。',
};

export default function RecipesPage() {
  return <RecipesPageClient />;
}
