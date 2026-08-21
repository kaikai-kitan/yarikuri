'use client';
import { useState } from 'react';
import { Fingerprint, RotateCcw } from 'lucide-react';
import { COLORS, FONT_BODY } from '../theme';
import { useUserId } from '../lib/hooks';
import { RETENTION_DAYS } from '../lib/userId';

const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

export default function UserIdCard() {
  const [state, reset, ready] = useUserId();
  const [confirming, setConfirming] = useState(false);

  const confirmReset = () => {
    reset();
    setConfirming(false);
  };

  if (!ready || !state) {
    return (
      <div
        className="rounded-xl px-4 py-5 text-xs"
        style={{
          background: COLORS.paper,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.inkSoft,
        }}
      >
        利用者IDを読み込んでいます…
      </div>
    );
  }

  return (
    <div
      className="rounded-xl px-4 py-4"
      style={{ background: COLORS.paper, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: COLORS.inkSoft }}>
        <Fingerprint size={14} />
        <span className="text-[10px] tracking-[0.2em]">YOUR ID</span>
      </div>

      <p
        className="text-xs mb-3"
        style={{ color: COLORS.ink, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-all' }}
      >
        {state.id}
      </p>

      <dl className="text-[11px] grid grid-cols-[5rem_1fr] gap-y-1 mb-4" style={{ color: COLORS.inkSoft }}>
        <dt>発行日</dt>
        <dd>{formatDate(state.issuedAt)}</dd>
        <dt>有効期限</dt>
        <dd>
          {formatDate(state.expiresAt)}
          <span className="ml-1">（最終利用から{RETENTION_DAYS}日）</span>
        </dd>
      </dl>

      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px]" style={{ color: COLORS.tomatoDeep }}>
            本当にリセットしますか？履歴の引き継ぎはできなくなります。
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmReset}
              className="rounded-lg px-3 py-2 text-xs font-bold active:scale-95 transition-transform"
              style={{ background: COLORS.tomato, color: COLORS.paper, fontFamily: FONT_BODY }}
            >
              リセットする
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3 py-2 text-xs active:scale-95 transition-transform"
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.inkSoft,
                fontFamily: FONT_BODY,
              }}
            >
              やめる
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5 active:scale-95 transition-transform"
          style={{
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            color: COLORS.inkSoft,
            fontFamily: FONT_BODY,
          }}
        >
          <RotateCcw size={13} />
          IDをリセット
        </button>
      )}
    </div>
  );
}
