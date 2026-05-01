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
- 💴 **広告サポート型**: 検索ごとに15秒のリワード広告で運営

## マネタイズ設計の考え方

### なぜ「毎回広告必須」にしたのか

ログイン認証なしの設計上、「1日X回まで無料」のような制限はシークレットブラウザで容易に回避されます。そのため:

- **ログイン導入** → DBコスト・UX悪化のため不採用
- **回数制限** → 実質効かないため不採用
- **毎検索で必ず広告視聴 → 確実に1検索あたり利益確保** ← 採用

### 利益モデル (1検索あたり)

| 項目 | 金額 |
|---|---|
| 広告売上 (リワード+ローディング+フィード+アンカー) | 約 **¥2.20** |
| API コスト (Claude Haiku 4.5) | 約 **¥0.60** |
| 粗利 | ¥1.60 (粗利率 73%) |
| 各種税負担 (消費税+所得税想定) | 約 ¥0.50 |
| **手元残り** | **約 ¥1.10 (純利益率 50%)** |

### スケール時の月間収益試算

| DAU | 月間検索数 (1.5回/日想定) | 月間粗利 | 月間手取り |
|---|---|---|---|
| 1万 | 45万 | ¥72万 | ¥49.5万 |
| 10万 | 450万 | ¥720万 | ¥495万 |

※ 上記は理論値です。実際は離脱率、AdSenseのCPMの実勢、季節変動などで増減します。とくに「毎回広告必須」というUXのため離脱率が高く出やすい点に留意してください。

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フロントエンド | React 18 + Vite + Tailwind CSS |
| バックエンド | Vercel Serverless Functions |
| AI | **Claude Haiku 4.5** (Vision + Text) |
| ストレージ | ブラウザの localStorage |
| 広告 | Google AdSense (`ca-pub-3006458424365247`) |
| ホスティング | Vercel |
| ルーティング | History API (各タブが独立URL) |

---

## デプロイ手順 (GitHub → Vercel)

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

### 3. Vercel にデプロイ

1. https://vercel.com で対象GitHubリポジトリを Import
2. **Environment Variables** に追加:
   - `ANTHROPIC_API_KEY` = 取得したAPIキー
3. Deploy

### 4. AdSense 設定

1. AdSense管理画面 → サイトに `yarikuri-amber.vercel.app` を追加
2. 自動広告を有効化

### 5. (推奨) 個別広告ユニット作成

`src/App.jsx` の `AD_SLOTS` に各ユニットのスロットIDを設定:

```js
const AD_SLOTS = {
  homeBanner: '1234567890',
  searchingFullscreen: '2345678901',
  resultsFeed: '3456789012',
  rewardModal: '4567890123',  // ★最重要・収益の柱
};
```

特に `rewardModal` の広告ユニットは、収益の中核なので**インタースティシャル形式**または**大型レクタングル(300×250以上)**を作成してください。

---

## ローカル開発

```bash
npm install
cp .env.example .env  # ANTHROPIC_API_KEY を設定
npm install -g vercel
vercel dev
```

---

## ファイル構成

```
.
├── README.md
├── package.json
├── vite.config.js
├── vercel.json              # SPA rewrite + serverless設定
├── index.html               # AdSenseスクリプト埋め込み
├── api/
│   ├── _ratelimit.js        # IPベースレート制限 (Bot対策)
│   ├── ocr-flyer.js         # Haiku 4.5 Vision でチラシ解析
│   └── suggest-recipes.js   # Haiku 4.5 でレシピ提案
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
        ├── RewardAdModal.jsx  # 検索前のリワード広告 (15秒)
        ├── AdSlot.jsx
        └── ui.jsx
```

---

## アーキテクチャの要点

### モデル選定: Haiku 4.5

Sonnet 4.5 ($3/$15) より3倍安い Haiku 4.5 ($1/$5) を採用。構造化された情報抽出 (チラシOCR) と JSON 生成 (レシピ提案) のような定型タスクには Haiku の品質で十分です。

### 広告ファースト設計

検索ごとに15秒のリワード広告を視聴いただく形式。AdSenseポリシー準拠のため、報酬は**広告クリック**ではなく**経過時間**で渡しています。

### URL ルーティング (各タブ独立URL)

- `/` → ホーム
- `/fridge` → 冷蔵庫
- `/recipes` → レシピ

これにより、AdSense管理画面のプレビューで全タブを巡回でき、ページ別の広告最適化が可能です。

### サーバー側レート制限

`/api/*` に IP単位の制限 (1分10回 / 1時間60回)。ベストエフォートですが、Bot連打を防ぎます。本格運用時は Upstash Redis 等への移行を推奨。

### チラシ画像はサーバーに保存されない

ブラウザでCanvas圧縮 → base64でServerless Functionへ → Anthropic APIへ転送 → レスポンス後に破棄。永続ストレージはありません。

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

## ライセンス

MIT
