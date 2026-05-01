# ヤリクリ 🍳

> チラシの特売品 × 冷蔵庫の在庫から、その日いちばん安く作れるレシピを提案するスマホ向けWebアプリ。

**ユーザー登録不要・端末ローカル保存・スマホで完結**

---

## 機能

- 🥬 **冷蔵庫タブ**: 食材・調味料を登録／削除（端末ローカルに保存）
- 📋 **チラシ画像読み取り**: 画像をアップロードするとAIが特売品を抽出（**画像は保存されません**、テキストのみ使用）
- 🍳 **AIレシピ提案**: 冷蔵庫＋特売品の組合せから3件のレシピを提案、コスト計算付き
- 🔗 **外部レシピ検索**: クックパッド／楽天レシピ／Googleの検索ページへ自動リンク
- 📜 **履歴**: 直近3回分の検索結果をホームに保存（古いものは自動削除）
- 💴 **Google AdSense**: ホーム下部・レシピフィード内・検索中ローディング画面に配置

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フロントエンド | React 18 + Vite + Tailwind CSS |
| バックエンド | Vercel Serverless Functions (Node.js) |
| AI | Anthropic Claude API (Vision + Text) |
| ストレージ | ブラウザの `localStorage`（端末ローカル）|
| 広告 | Google AdSense |
| ホスティング | Vercel |

> 設計要件書ではSvelteKit + Supabase案でしたが、**ユーザー登録不要**という方針に基づき、ユーザーごとのDB保存は不要となるため、より軽量な「React + localStorage + Vercelサーバーレス」構成で実装しています。冷蔵庫の在庫はユーザー本人の端末にのみ保存され、サーバー側にユーザーデータは一切残りません。

---

## デプロイ手順（GitHub → Vercel）

### 1. GitHubに公開

```bash
# プロジェクトのルートで
git init
git add .
git commit -m "Initial commit: ヤリクリ"

# GitHubで新しいリポジトリ（例: tokubai-recipe-app）を作成後
git branch -M main
git remote add origin https://github.com/<あなたのID>/tokubai-recipe-app.git
git push -u origin main
```

### 2. Anthropic API キーの取得

https://console.anthropic.com にログイン → **API keys** → **Create Key**
発行されたキー（`sk-ant-...`）をコピーしておく。

### 3. Vercelにデプロイ

1. https://vercel.com にGitHubアカウントでログイン
2. **Add New → Project** を押す
3. 上で作成したGitHubリポジトリを **Import**
4. **Framework Preset** は自動で「Vite」が選択される（そのままでOK）
5. **Environment Variables** に以下を追加:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: 取得したAPIキー
   - **Environment**: Production / Preview / Development すべてチェック
6. **Deploy** を押す

数分で `https://<プロジェクト名>.vercel.app` のURLが発行され、誰でもアクセスできます。

### 4. カスタムドメイン（任意）

Vercelの **Settings → Domains** から独自ドメインを接続できます。

---

## Google AdSense 設定

`index.html` には既にあなたのパブリッシャーID `ca-pub-3006458424365247` が埋め込まれており、本番URLにアクセスがあれば自動的にAdSenseに認識されます。

### サイト審査を通す

1. AdSense管理画面 → **サイト** にデプロイ済みのVercelドメインを追加
2. 審査が通るまで広告は表示されません（通常数日〜2週間）

### 広告ユニットの個別配置（推奨）

現状は **AdSense自動広告** 任せの実装で、`<AdSlot>` コンポーネントは枠だけのプレースホルダーとして機能します。個別ユニットでより正確な配置をしたい場合:

1. AdSense管理画面 → **広告 → 広告ユニットごと → 新しいディスプレイ広告**
2. 名前を付けて作成（例: `recipe_feed_ad`、`searching_screen_ad`、`home_banner_ad`）
3. 表示される **データ広告スロットID**（10桁の数字）をコピー
4. 各 `<AdSlot>` コンポーネント呼び出しに `slot="1234567890"` を追加

例（`src/components/HomeView.jsx`）:
```jsx
<AdSlot slot="1234567890" label="ホームバナー" minHeight={100} />
```

### プライバシーポリシー（AdSense必須）

AdSense審査通過のため、プライバシーポリシーページの公開が推奨されます。後述の「拡張案」も参照してください。

---

## ローカル開発

```bash
# 依存をインストール
npm install

# .envファイルを作成
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY=sk-ant-... を設定

# Vercel CLI（サーバーレス関数のローカル実行に必要）をインストール
npm install -g vercel

# ローカル起動（フロント + サーバーレス関数）
vercel dev
```

ブラウザで `http://localhost:3000` を開く。
（`npm run dev` だとViteは起動するが`/api`が動かないため、必ず `vercel dev` を使用）

---

## ファイル構成

```
.
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                # サーバーレス関数の最大実行時間など
├── index.html                 # AdSenseスクリプト埋め込み
├── .env.example
├── api/                       # Vercel Serverless Functions
│   ├── ocr-flyer.js           # チラシ画像をClaude Visionで解析
│   └── suggest-recipes.js     # レシピ提案
└── src/
    ├── main.jsx
    ├── App.jsx                # メインオーケストレーション
    ├── index.css
    ├── theme.js               # 配色・フォント
    ├── lib/
    │   ├── storage.js         # localStorageラッパー
    │   ├── api.js             # サーバーレス関数の呼び出し
    │   └── image.js           # クライアント側画像圧縮
    └── components/
        ├── HomeView.jsx       # ホーム（履歴一覧）
        ├── FridgeView.jsx     # 冷蔵庫管理
        ├── RecipesView.jsx    # レシピ検索＋結果表示
        ├── RecipeDetail.jsx   # レシピ詳細モーダル
        ├── SearchingScreen.jsx# 検索中の全画面ローディング
        ├── AdSlot.jsx         # AdSense広告スロット
        └── ui.jsx             # 共通UI部品
```

---

## アーキテクチャの要点

### Anthropic APIキーの秘匿

ブラウザから直接Anthropic APIを呼ぶとAPIキーが露出してしまうため、Vercelのサーバーレス関数（`/api/*`）経由で呼び出します。フロントは `/api/ocr-flyer` と `/api/suggest-recipes` を叩くだけで、APIキーはVercel環境変数として保管されます。

### チラシ画像はサーバーに保存されない

1. ブラウザでCanvas経由で画像を圧縮（最長辺1600px、JPEG品質85%）
2. base64でサーバーレス関数に送信
3. Anthropic APIにそのまま転送
4. レスポンス（特売品のテキストJSON）を返したら、画像データはメモリから消える

サーバー側にはストレージを設けていないため、画像は**一切保存されません**。

### 履歴管理

検索が成功すると、結果を `localStorage` の `history:searches` キーに保存（最大3件、FIFO）。ホーム画面で過去の提案を再表示できます。

---

## 拡張案

| 項目 | 実装方針 |
|---|---|
| プライバシーポリシーページ | `src/components/PrivacyView.jsx` を追加してフッターからリンク |
| 利用規約ページ | 同上 |
| LINE Bot連携 | `api/line-webhook.js` を追加し、LINE Messaging APIでチラシ画像受信→Webアプリと連動 |
| Supabase切替 | `src/lib/storage.js` をSupabaseクライアント呼び出しに差し替え（インターフェースは互換）|
| PWA化 | `vite-plugin-pwa` 導入でホーム画面追加・オフライン対応 |
| クラウドDB履歴同期 | Supabase接続後に履歴をユーザー紐付けで同期 |

---

## モデル設定

`api/ocr-flyer.js` と `api/suggest-recipes.js` の冒頭の `const MODEL = 'claude-sonnet-4-5';` を変更すればモデルを切り替えられます。

---

## ライセンス

MIT
