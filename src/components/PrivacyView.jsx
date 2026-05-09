import { COLORS } from '../theme';

export default function PrivacyView() {
  return (
    <div className="fade-up pb-8">
      <h1 className="display text-2xl font-bold mb-1" style={{ color: COLORS.ink }}>
        プライバシーポリシー
      </h1>
      <p className="text-xs mb-8" style={{ color: COLORS.inkSoft }}>最終更新: 2025年5月</p>

      <Section title="基本方針">
        <p>
          ヤリクリ（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の適切な取り扱いに努めます。
        </p>
      </Section>

      <Section title="収集する情報">
        <ul>
          <li><strong>冷蔵庫の食材・検索履歴</strong>：お使いの端末のlocalStorageにのみ保存されます。サーバーへは送信されません。</li>
          <li><strong>チラシ画像</strong>：AIによる解析のためサーバーへ一時的に送信されますが、解析後は即時破棄されます。保存・記録は一切行いません。</li>
          <li><strong>アクセスログ</strong>：Cloudflare のインフラによりIPアドレスなどの標準的なアクセスログが記録される場合があります。</li>
        </ul>
      </Section>

      <Section title="広告について">
        <p>
          本サービスはGoogle AdSense（Googleが提供する広告配信サービス）を利用しています。
          Googleはユーザーのウェブ閲覧履歴に基づいてパーソナライズ広告を表示するためにCookieを使用することがあります。
        </p>
        <p className="mt-2">
          Googleの広告Cookieの利用を無効にするには、
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: COLORS.tomato }}
          >
            Google 広告設定
          </a>
          をご覧ください。
        </p>
      </Section>

      <Section title="第三者へのデータ提供">
        <p>
          本サービスはチラシ画像のテキスト抽出およびレシピ提案のためにAnthropic社のAPIを利用しています。
          送信されるのは画像データ（チラシ解析時）および食材テキストのみです。個人を特定できる情報は含まれません。
        </p>
      </Section>

      <Section title="Cookieの使用">
        <p>
          本サービス自体はCookieを使用しません。ただし、Google AdSenseが広告配信のためにCookieを使用します。
          ブラウザの設定からCookieを無効にすることができますが、一部の機能が正常に動作しない場合があります。
        </p>
      </Section>

      <Section title="お問い合わせ">
        <p>
          プライバシーポリシーに関するご質問は、サービス内のフィードバック機能またはGitHubのIssueよりお問い合わせください。
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2
        className="display text-base font-bold mb-2 pb-1"
        style={{ color: COLORS.ink, borderBottom: `1px solid ${COLORS.border}` }}
      >
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-1" style={{ color: COLORS.inkSoft }}>
        {children}
      </div>
    </section>
  );
}
