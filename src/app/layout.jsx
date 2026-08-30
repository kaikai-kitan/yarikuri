import './globals.css';
import AppHeader from '@/components/AppHeader';
import AppNav from '@/components/AppNav';

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://yarikuri.pages.dev'
  ),
  title: {
    default: 'ヤリクリ｜特売×冷蔵庫の最安レシピ',
    template: '%s ｜ ヤリクリ',
  },
  description:
    'チラシの特売品と冷蔵庫の在庫から、その日いちばん安く作れるレシピをAIが提案します。登録不要・スマホで完結。',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'ヤリクリ',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ヤリクリ',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta name="theme-color" content="#FBF6EC" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="bg-gray-100 flex justify-center h-full overflow-hidden">
        {/* 画面の高さに固定した殻。ヘッダーとボトムバーは動かず、main だけがスクロールする。 */}
        <div
          className="w-full max-w-md bg-[#fbf6ec] relative shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '100dvh' }}
        >
          <AppHeader />
          <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 pb-8">
            {children}
          </main>
          <AppNav />
        </div>
      </body>
    </html>
  );
}
