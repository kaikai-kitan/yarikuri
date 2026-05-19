import HomePageClient from './home-client';

export const metadata = {
  title: 'ヤリクリ｜特売×冷蔵庫の最安レシピ',
  description: 'チラシの特売品と冷蔵庫の在庫から、その日いちばん安く作れるレシピをAIが提案します。登録不要・スマホで完結。',
};

export default function HomePage() {
  return <HomePageClient />;
}
