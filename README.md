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
- 🎁 **1日1回まで無料、リワード広告で追加検索可能**
- 💴 **Google AdSense**: ホームバナー・検索中・結果フィード・リワード枠に広告配置

## 利用回数の制限

API費用の暴走を防ぎつつ広告収益を確保するため、以下の制限があります:

| 区分 | 上限 | 備考 |
|---|---|---|
| 無料利用 | 1日1回 | localStorage + cookie で管理 |
| 追加利用 | 無制限 | 1回ごとに15秒のリワード広告視聴が必要 |
| サーバー側IP制限 | 1分10回 / 1時間60回 | Bot連打対策 |
| Anthropic月次予算 | 自分で設定 | 最終ストッパー |

### 制限の限界 (正直に開示)

ログイン機能なしの設計上、以下のケースでは「1日1回」を回避されます:
- プライベートブラウズ / シークレットモードの使用
- ブラウザのキャッシュ・データ削除
- 異なるブラウザ・デバイスの使用

これは認証なし設計の構造的限界であり、対策には Google ログイン等の導入が必要です。
ただし、サーバーIPレート制限と Anthropic 月次予算上限により、**金銭的な暴走は防止できます**。

## 収益モデル試算

10万 DAU を想定した場合:

| 広告位置 | 1人/日のインプレッション数 (推定) |
|---|---|
| ホームバナー | 1.0 |
| 検索中フルスクリーン | 1.5 |
| レシピ結果フィード内 | 1.5 |
| リワード広告 (50%が追加検索) | 0.5 |
| **合計** | **約4.5 imp/DAU** |

**月間インプレッション**: 100K × 30日 × 4.5 = **1,350万 imp/月**

**目標 ¥80,000 達成に必要なCPM**: ¥80,000 ÷ 13,500 = **¥5.9 RPM**

日本の食・節約系AdSenseの実勢CPMは ¥80〜300 のため、目標は十分達成圏内です。

---

## 技術スタック

| レイヤ | 採用技術 |
|---|---|
| フロントエンド | React 18 + Vite + Tailwind CSS |
| バックエンド | Vercel Serverless Functions (Node.js) |
| AI | Anthropic Claude Sonnet 4.5 (Vision + Text) |
| ストレージ | ブラウザの `localStorage` + cookie |
| 広告 | Google AdSense (ID: `ca-pub-3006458424365247`) |
| ホスティング | Vercel |

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

### 2. Anthropic API キー取得 + 月次予算設定

1. https://console.anthropic.com → API keys → Create Key
2. **重要**: Settings → Billing → **Monthly spend limit** を設定 (例: $20/月)
   - これが最終的なコスト暴走防止の砦になります

### 3. Vercel にデプロイ

1. https://vercel.com にGitHubアカウントでログイン
2. **Add New → Project** で対象リポジトリをImport
3. **Environment Variables** に追加:
   - `ANTHROPIC_API_KEY` = 取得したAPIキー
4. **Deploy** を押す

### 4. AdSense サイト承認

1. AdSense管理画面 → **サイト** にデプロイ済みVercelドメインを追加
2. 自動広告を有効化 (推奨)

### 5. (推奨) 個別広告ユニット作成

`src/App.jsx` の `AD_SLOTS` オブジェクトに、AdSenseで作成した各ユニットのスロットIDを設定すると、配置を最適化できます:

```js
const AD_SLOTS = {
  homeBanner: '1234567890',         // ホーム履歴下のバナー
  searchingFullscreen: '2345678901', // 検索中の全画面広告
  resultsFeed: '3456789012',        // レシピ結果のフィード内
  rewardModal: '4567890123',        // リワード広告モーダル
};
```

各ユニットは AdSense → 広告 → 広告ユニットごと → 新しいディスプレイ広告 で作成できます。

空文字のままだと自動広告に任せる動作になります（プレースホルダー枠のみ表示）。

---

## ローカル開発

```bash
npm install
cp .env.example .env
# .env を編集して ANTHROPIC_API_KEY=sk-ant-... を設定

npm install -g vercel
vercel dev
```

`http://localhost:3000` を開く（フロント + サーバーレス関数の両方が動きます）。

---

## ファイル構成

```
.
├── README.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── index.html              # AdSenseスクリプト埋め込み
├── .env.example
├── api/
│   ├── _ratelimit.js       # IPベースのレート制限ヘルパー
│   ├── ocr-flyer.js        # チラシ画像をClaude Visionで解析
│   └── suggest-recipes.js  # レシピ提案
└── src/
    ├── main.jsx
    ├── App.jsx             # メインオーケストレーション (クォータ管理含む)
    ├── index.css
    ├── theme.js
    ├── lib/
    │   ├── storage.js
    │   ├── api.js
    │   ├── image.js
    │   └── usage.js        # 1日1回 + リワードチケット管理
    └── components/
        ├── HomeView.jsx
        ├── FridgeView.jsx
        ├── RecipesView.jsx
        ├── RecipeDetail.jsx
        ├── SearchingScreen.jsx
        ├── RewardAdModal.jsx  # リワード広告モーダル (15秒視聴)
        ├── QuotaBanner.jsx    # 残り回数表示
        ├── AdSlot.jsx
        └── ui.jsx
```

---

## アーキテクチャの要点

### Anthropic APIキーの秘匿
ブラウザから直接Anthropic APIを呼ぶとAPIキーが露出するため、Vercelサーバーレス関数経由で呼び出しています。

### 二層防御のレート制限
1. **クライアント側**: localStorage + cookie で1日1回 + リワードチケット管理
2. **サーバー側**: IP単位で1分10回・1時間60回のハードリミット

サーバーレス関数のメモリは揮発性のため、IP制限は「同一warmコンテナ内でのバースト攻撃」のみ防げる best-effort 実装です。本格運用では Upstash Redis (`@upstash/ratelimit`) との連携を推奨。

### AdSenseポリシー準拠
リワード広告の報酬条件を「広告クリック」ではなく「経過時間（15秒）」にしています。これは AdSense ポリシーの "Encouraging clicks" 違反を避けるためです。

### チラシ画像はサーバーに保存されない
1. ブラウザでCanvas経由で画像を圧縮（最長辺1600px、JPEG品質85%）
2. base64でサーバーレス関数に送信
3. Anthropic APIにそのまま転送
4. レスポンス (JSON) を返したら破棄

---

## 拡張案

| 項目 | 実装方針 |
|---|---|
| **強固な利用制限** | Google / LINE ログイン導入 → ユーザーID単位で制限 |
| **本格的レート制限** | Upstash Redis `@upstash/ratelimit` を `_ratelimit.js` に統合 |
| **プライバシーポリシー** | AdSense審査必須。`/privacy` ページの追加 |
| **PWA化** | `vite-plugin-pwa` 導入でホーム画面追加・オフライン対応 |
| **本物のリワード動画広告** | Google Ad Manager の Web Rewarded Video へ移行 |

---

## ライセンス

MIT
