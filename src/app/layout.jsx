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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3006458424365247"
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ paddingBottom: 88 }}>
        <AppHeader />
        <main className="px-5 pt-5">
          {children}
        </main>
        <AppNav />
      </body>
    </html>
  );
}
