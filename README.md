# ヤリクリ 🍳

> チラシの特売品 × 冷蔵庫の在庫から、その日いちばん安く作れるレシピを提案するスマホ向けWebアプリ。

**ユーザー登録不要・端末ローカル保存・スマホで完結**

---

## 機能

- 🥬 **冷蔵庫タブ**: 食材・調味料を登録／削除（端末ローカルに保存）
- 📋 **チラシ画像読み取り**: 画像をアップロードするとAIが特売品を抽出（**画像は保存されません**、テキストのみ使用）
- 🍳 **AIレシピ提案**: 冷蔵庫＋特売品の組合せから3件のレシピを提案、コスト計算付き
- 🔗 **外部レシピ検索**: クックパッド／楽天レシピ／Googleの検索ページへ自動リンク
- 📜 **履歴**: 直近3回分の検索結果をホームに保存
- 💴 **広告サポート型**: Google AdSense 自動広告 + 各ページの広告スロット

## マネタイズ設計の考え方

### 利益モデル (1検索あたり)

| 項目 | 金額 |
|---|---|
| 広告売上 (ローディング+フィード+アンカー) | 約 **¥2.20** |
| API コスト (Claude Haiku 4.5) | 約 **¥0.60** |
| 粗利 | ¥1.60 (粗利率 73%) |
| 各種税負担 (消費税+所得税想定) | 約 ¥0.50 |
| **手元残り** | **約 ¥1.10 (純利益率 50%)** |

### スケール時の月間収益試算

| DAU | 月間検索数 (1.5回/日想定) | 月間粗利 | 月間手取り |
|---|---|---|---|
| 1万 | 45万 | ¥72万 | ¥49.5万 |
| 10万 | 450万 | ¥720万 | ¥495万 |

※ 上記は理論値です。実際は離脱率、AdSenseのCPMの実勢、季節変動などで増減します。

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フロントエンド | React 18 + Vite + Tailwind CSS |
| バックエンド | Cloudflare Pages Functions |
| AI | **Claude Haiku 4.5** (Vision + Text) |
| ストレージ | ブラウザの localStorage |
| 広告 | Google AdSense (`ca-pub-3006458424365247`) |
| ホスティング | Cloudflare Pages（無料・商用利用可） |
| ルーティング | History API (各タブが独立URL) |

---

## デプロイ手順 (GitHub → Cloudflare Pages)

### 1. GitHubに公開

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<あなたのID>/tokubai-recipe-app.git
git push -u origin main
```

### 2. Anthropic API キー取得 + 月次予算設定 (必須)

1. https://console.anthropic.com → API keys → Create Key
2. **Settings → Billing → Monthly spend limit** を設定 (例: $50/月)

### 3. Cloudflare Pages にデプロイ

1. https://pages.cloudflare.com → 「Create a project」→「Connect to Git」
2. GitHubリポジトリを選択
3. ビルド設定:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment variables** に追加:
   - `ANTHROPIC_API_KEY` = 取得したAPIキー
5. 「Save and Deploy」

デプロイ後、`https://<project>.pages.dev` でアクセスできます。

### 4. AdSense 設定

1. AdSense管理画面 → サイトに `<project>.pages.dev` を追加
2. 自動広告を有効化

### 5. (任意) 独自ドメインの設定

Cloudflare Registrar (https://cloudflare.com/products/registrar/) で `.com` ドメインを取得（原価販売で約$10/年）。
Cloudflare Pages の「Custom domains」からワンクリックで設定できます。

### 6. (推奨) 個別広告ユニット作成

`src/App.jsx` の `AD_SLOTS` に各ユニットのスロットIDを設定:

```js
const AD_SLOTS = {
  homeBanner: '1234567890',
  resultsFeed: '3456789012',
};
```

---

## ローカル開発

```bash
npm install
npm install -g wrangler        # Cloudflare CLI
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars   # Cloudflare 用の環境変数ファイル
wrangler pages dev dist --compatibility-date=2024-01-01
# 別ターミナルで
npm run build -- --watch
```

---

## ファイル構成

```
.
├── README.md
├── package.json
├── vite.config.js
├── index.html               # AdSenseスクリプト埋め込み
├── public/
│   ├── ads.txt              # AdSense 認証ファイル
│   └── _redirects           # SPA ルーティング設定 (Cloudflare Pages)
├── functions/
│   └── api/
│       ├── _ratelimit.js    # IPベースレート制限 (Bot対策)
│       ├── ocr-flyer.js     # Haiku 4.5 Vision でチラシ解析
│       └── suggest-recipes.js  # Haiku 4.5 でレシピ提案
└── src/
    ├── App.jsx              # メインオーケストレーション + URLルーティング
    ├── theme.js
    ├── lib/
    │   ├── storage.js
    │   ├── api.js
    │   └── image.js         # クライアント側画像圧縮
    └── components/
        ├── HomeView.jsx
        ├── FridgeView.jsx
        ├── RecipesView.jsx
        ├── RecipeDetail.jsx
        ├── SearchingScreen.jsx
        ├── RewardAdModal.jsx  # 検索前の待機画面（料理の豆知識）
        ├── AdSlot.jsx
        └── ui.jsx
```

---

## アーキテクチャの要点

### モデル選定: Haiku 4.5

Sonnet 4.5 ($3/$15) より3倍安い Haiku 4.5 ($1/$5) を採用。構造化された情報抽出 (チラシOCR) と JSON 生成 (レシピ提案) のような定型タスクには Haiku の品質で十分です。

### Cloudflare Pages Functions

`functions/api/` 以下のファイルが自動的に `/api/*` のエンドポイントになります。Web 標準の `Request`/`Response` API を使用するため、Node.js ランタイム不要。環境変数は `context.env` から取得します。

### URL ルーティング (各タブ独立URL)

- `/` → ホーム
- `/fridge` → 冷蔵庫
- `/recipes` → レシピ

`public/_redirects` の `/* /index.html 200` により、Cloudflare Pages が全ルートを index.html にフォールバックします。

### サーバー側レート制限

`/api/*` に IP単位の制限 (1分10回 / 1時間60回)。ベストエフォートですが Bot連打を防ぎます。本格運用時は Upstash Redis 等への移行を推奨。

### チラシ画像はサーバーに保存されない

ブラウザでCanvas圧縮 → base64でCloudflare Functionへ → Anthropic APIへ転送 → レスポンス後に破棄。永続ストレージはありません。

---

## 拡張案

| 項目 | 実装方針 |
|---|---|
| プライバシーポリシー | AdSense審査必須。`/privacy` ルート追加 |
| PWA化 | `vite-plugin-pwa` でホーム画面追加対応 |
| Upstash Redis | `_ratelimit.js` を `@upstash/ratelimit` に置換 |
| 真のリワード動画広告 | Google Ad Manager の Web Rewarded Video へ移行 |
| プロンプトキャッシュ | システムプロンプトに `cache_control` を付加すれば入力コスト90%削減可能 |

---
