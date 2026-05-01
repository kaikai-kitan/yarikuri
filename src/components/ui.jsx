import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { COLORS, FONT_BODY } from '../theme';

export function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div className="mb-5">
      <div
        className="text-[10px] tracking-[0.4em] mb-1"
        style={{ color: COLORS.gold }}
      >
        {eyebrow}
      </div>
      <h2
        className="display text-2xl font-bold leading-tight"
        style={{ color: COLORS.ink }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: COLORS.inkSoft }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, desc }) {
  return (
    <div
      className="rounded-2xl py-12 px-6 text-center"
      style={{
        background: COLORS.paper,
        border: `1px dashed ${COLORS.border}`,
      }}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3"
        style={{ background: COLORS.cream, color: COLORS.inkSoft }}
      >
        {icon}
      </div>
      <div
        className="display text-base font-bold mb-1"
        style={{ color: COLORS.ink }}
      >
        {title}
      </div>
      <div className="text-xs" style={{ color: COLORS.inkSoft }}>
        {desc}
      </div>
    </div>
  );
}

export function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'error' ? COLORS.tomatoDeep : COLORS.ink;
  return (
    <div
      className="fixed left-1/2 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg"
      style={{
        bottom: 96,
        transform: 'translateX(-50%)',
        background: bg,
        color: COLORS.paper,
        fontFamily: FONT_BODY,
        fontSize: 14,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {type === 'error' && <AlertCircle size={16} />}
      <span>{message}</span>
    </div>
  );
}
