'use client';
import { useEffect, useRef } from 'react';
import { COLORS } from '../theme';

const ADSENSE_CLIENT = 'ca-pub-3006458424365247';

/**
 * Google AdSense 広告スロット。
 * AdSenseで広告ユニットを作成し、そのスロットIDを `slot` prop に渡してください。
 * （未設定の場合は枠だけのプレースホルダーを表示）
 *
 * 自動広告(Auto Ads)を有効にしている場合は、このコンポーネントが無くても
 * AdSenseが適切な位置に広告を自動挿入します。
 */
export default function AdSlot({
  slot,
  format = 'auto',
  responsive = true,
  label = '広告',
  minHeight = 100,
}) {
  const insRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot || pushedRef.current) return;
    try {
      // AdSense scriptはindex.htmlで読み込み済み
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (e) {
      console.error('AdSense push failed:', e);
    }
  }, [slot]);

  // スロット未設定時はプレースホルダー
  if (!slot) {
    return (
      <div
        className="my-4 flex flex-col items-center justify-center rounded-xl py-6 px-4 text-center"
        style={{
          border: `1px dashed ${COLORS.border}`,
          background: 'rgba(232, 219, 196, 0.25)',
          color: COLORS.inkSoft,
          minHeight,
        }}
      >
        <div className="text-xs tracking-widest mb-1 uppercase">Sponsored</div>
        <div className="text-sm">{label}</div>
        <div className="text-[10px] mt-1 opacity-60">
          AdSense自動広告 / または広告ユニット作成後にスロットIDを設定
        </div>
      </div>
    );
  }

  return (
    <div className="my-4" style={{ minHeight }}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
