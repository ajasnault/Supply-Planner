import type { ReactNode } from 'react';
import type { Status } from '../engine/derived';

export type SiteSel = 'LSN' | 'LDN' | 'Group';

const ICON = {
  crit: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><path d="M4.1 1h5.8L13 4.1v5.8L9.9 13H4.1L1 9.9V4.1z" fill="#EF4444" /><path d="M7 4v3.6M7 9.6v.2" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" /></svg>
  ),
  warn: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.2L13.3 12.5H.7z" fill="#FFBB00" /><path d="M7 5.2v3.4M7 10.3v.2" stroke="#142933" strokeWidth="1.5" strokeLinecap="round" /></svg>
  ),
  ok: (s = 14) => (
    <svg width={s} height={s} viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="#16A34A" /><path d="M4.2 7.2l1.9 1.9 3.8-4" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
};
export const StatusIcon = ({ kind, size }: { kind: Status; size?: number }) => ICON[kind](size);
const LABEL: Record<Status, string> = { crit: 'Critical', warn: 'Watch', ok: 'OK' };
export function Badge({ kind, children }: { kind: Status; children?: ReactNode }) {
  return <span className={`st ${kind}`}><StatusIcon kind={kind} />{children ?? LABEL[kind]}</span>;
}
export const Mono = ({ children }: { children: ReactNode }) => <span className="mono">{children}</span>;
export const SiteDot = ({ site }: { site: 'LSN' | 'LDN' }) => <span className={site.toLowerCase()} />;

export function Strip({ right, px = 40 }: { right?: ReactNode; px?: number }) {
  return (
    <div style={{ height: 28, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${px}px`, background: '#EEF5FB', color: '#45525B', fontSize: 13, borderBottom: '1px solid #DCE5EC' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeDasharray="2 2" /></svg>
        Synthetic data · generated for design reference, not company records
      </span>
      {right ?? <span className="mono">Data as of 2026-10-19 · dataset v1 · validated</span>}
    </div>
  );
}

export function SiteSelector({ site, onSite, height = 44 }: { site: SiteSel; onSite: (s: SiteSel) => void; height?: number }) {
  return (
    <div className="seg" role="group" aria-label="Site">
      {(['LSN', 'LDN', 'Group'] as SiteSel[]).map((s) => (
        <button key={s} aria-pressed={site === s} onClick={() => onSite(s)} style={{ height }}>
          {s !== 'Group' && <SiteDot site={s} />}{s}
        </button>
      ))}
    </div>
  );
}

export const Logo = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" rx="4" fill="#142933" /><path d="M6 15V9M11 15V6M16 15v-4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" /></svg>
);

export interface NavProps { pos: number; total: number; onPrev: () => void; onNext: () => void }
export function Header({ num, eyebrow, question, site, onSite, nav, extra }: { num: number; eyebrow: string; question: string; site: SiteSel; onSite: (s: SiteSel) => void; nav: NavProps; extra?: ReactNode }) {
  return (
    <header style={{ height: 76, flex: 'none', display: 'flex', alignItems: 'center', gap: 28, padding: '0 40px', background: '#FFFFFF', borderBottom: '1px solid #DCE5EC' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 190 }}><Logo /><span style={{ fontSize: 17, fontWeight: 600 }}>Supply Planner</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <span className="eyebrow">{num} · {eyebrow}</span>
        <span style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.03em' }}>{question}</span>
      </div>
      {extra}
      <SiteSelector site={site} onSite={onSite} />
      <nav aria-label="Views" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="ib" aria-label="Previous view" onClick={nav.onPrev}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 4L6 9l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <span className="mono" style={{ fontSize: 15, minWidth: 44, textAlign: 'center' }}>{nav.pos} / {nav.total}</span>
        <button className="ib" aria-label="Next view" onClick={nav.onNext}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 4l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </nav>
    </header>
  );
}

export function Kpi({ label, value, unit, ctx, foot, style }: { label: string; value: ReactNode; unit: string; ctx: ReactNode; foot?: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card kpi" style={style}>
      <span className="kl">{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><span className="kv">{value}</span><span className="ku">{unit}</span></div>
      <span className="mut" style={{ fontSize: 14 }}>{ctx}</span>
      {foot && <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>{foot}</div>}
    </div>
  );
}

export const LeadTimePattern = ({ id }: { id: string }) => (
  <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#EAF1F7" /><line x1="0" y1="0" x2="0" y2="8" stroke="#C8D3DC" strokeWidth="2" /></pattern>
);

export const path = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');

export function Panel({ label, onClose, children, width = 680 }: { label: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <aside className="sp" aria-label={label} style={{ position: 'absolute', top: 104, right: 0, bottom: 0, width, boxSizing: 'border-box', background: '#FFFFFF', borderLeft: '1px solid #C8D3DC', boxShadow: '-12px 0 32px rgba(20, 41, 51, 0.10)', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', zIndex: 5 }}>
      <button className="ib" aria-label="Close panel" onClick={onClose} style={{ position: 'absolute', right: 28, top: 20 }}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {children}
    </aside>
  );
}
