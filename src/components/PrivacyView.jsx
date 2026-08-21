import { COLORS } from '../theme';
import UserIdCard from './UserIdCard';
import { RETENTION_DAYS } from '../lib/userId';

export default function PrivacyView() {
  return (
    <div className="fade-up pb-8">
      <h1 className="display text-2xl font-bold mb-1" style={{ color: COLORS.ink }}>
        プライバシーポリシー
      </h1>
      <p className="text-xs mb-8" style={{ color: COLORS.inkSoft }}>最終更新: 2026年8月</p>

      <Section title="基本方針">
        <p>
          ヤリクリ（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の適切な取り扱いに努めます。
        </p>
      </Section>

      <Section title="収集する情報">
        <ul>
          <li><strong>冷蔵庫の食材・検索履歴</strong>：お使いの端末のlocalStorageにのみ保存されます。サーバーへは送信されません。</li>
          <li><strong>チラシ画像</strong>：AIによる解析のためサーバーへ一時的に送信されますが、解析後は即時破棄されます。保存・記録は一切行いません。</li>
          <li><strong>利用者ID</strong>：登録不要でご利用いただくため、端末ごとにランダムなIDを発行し、localStorageとCookieに保存します。個人情報は含みません。</li>
          <li><strong>アクセスログ</strong>：Cloudflare のインフラによりIPアドレスなどの標準的なアクセスログが記録される場合があります。</li>
        </ul>
      </Section>

      <Section title="利用者IDについて">
        <p>
          本サービスはユーザー登録を必要としません。かわりに、端末ごとにランダムな利用者IDを発行し、
          お使いの端末のlocalStorageとCookieに保存します。このIDは、登録なしで利用状況を引き継ぐためだけに使われます。
        </p>
        <p className="mt-2">
          IDは最終利用日から{RETENTION_DAYS}日間有効で、ご利用が続く限り自動的に延長されます。
          {RETENTION_DAYS}日間アクセスがない場合は失効し、次回アクセス時に新しいIDが発行されます。
          氏名・メールアドレスなどの個人情報は一切含まず、現時点でサーバーへ送信されることもありません。
        </p>
        <p className="mt-2">
          IDはいつでもリセットできます。リセットすると新しいIDが発行され、以前のIDに紐づく引き継ぎはできなくなります。
        </p>
        <div className="mt-3">
          <UserIdCard />
        </div>
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
          本サービスは、1日の利用回数の管理（<code>yarikuri_quota</code>）と利用者IDの保持（<code>yarikuri_uid</code>）のためにCookieを使用します。
          いずれも端末を識別するための値のみを保持し、氏名やメールアドレスなどの個人情報は含みません。
        </p>
        <p className="mt-2">
          あわせて、Google AdSenseが広告配信のためにCookieを使用します。
          ブラウザの設定からCookieを無効にすることができますが、利用回数の管理など一部の機能が正常に動作しない場合があります。
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
