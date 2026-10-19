import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildModel, loadDataset } from '../engine/engine';
import { analyze } from '../engine/derived';
import type { SiteSel } from '../ui/primitives';
import { Cogs } from '../views/Cogs';
import { Cost } from '../views/Cost';
import { Demand } from '../views/Demand';
import { Executive } from '../views/Executive';
import { Inventory } from '../views/Inventory';
import { ItemPanel } from '../views/ItemPanel';
import { London } from '../views/London';
import { Orders } from '../views/Orders';
import { SupplierPanel, Suppliers } from '../views/Suppliers';
import type { ViewProps } from '../views/types';

const raw = import.meta.glob('/data/*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const files = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.split('/').pop()!, v]));

const VIEWS: { name: string; C: (p: ViewProps) => JSX.Element; site: SiteSel }[] = [
  { name: 'Executive summary', C: Executive, site: 'LSN' },
  { name: 'Demand → supply', C: Demand, site: 'Group' },
  { name: 'Inventory health', C: Inventory, site: 'LSN' },
  { name: 'Supplier risk', C: Suppliers, site: 'Group' },
  { name: 'Cost per protein', C: Cost, site: 'LSN' },
  { name: 'London go-live', C: London, site: 'LDN' },
  { name: 'COGS & savings', C: Cogs, site: 'Group' },
];

function readHash(): number | 'orders' {
  const h = location.hash.slice(1);
  if (h === 'orders') return 'orders';
  const n = parseInt(h, 10);
  return n >= 1 && n <= VIEWS.length ? n - 1 : 0;
}

export function App() {
  const a = useMemo(() => analyze(buildModel(loadDataset(files))), []);
  const [view, setView] = useState<number | 'orders'>(readHash);
  const [site, setSite] = useState<SiteSel>(typeof view === 'number' ? VIEWS[view].site : 'LSN');
  const [panel, setPanel] = useState<{ kind: 'item' | 'supplier'; id: string } | null>(null);
  const go = useCallback((v: number | 'orders') => {
    const nv = typeof v === 'number' ? Math.max(0, Math.min(VIEWS.length - 1, v)) : v;
    setView(nv); setPanel(null);
    if (typeof nv === 'number') setSite(VIEWS[nv].site);
    try { history.replaceState(null, '', '#' + (typeof nv === 'number' ? nv + 1 : nv)); } catch { /* sandboxed */ }
  }, []);
  const idx = typeof view === 'number' ? view : -1;
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const W = view === 'orders' ? 1440 : 1920, H = view === 'orders' ? 1000 : 1080;
  useLayoutEffect(() => {
    const fit = () => { const el = box.current; if (el) setScale(Math.min(el.clientWidth / W, el.clientHeight / H)); };
    fit(); const ro = new ResizeObserver(fit); if (box.current) ro.observe(box.current); return () => ro.disconnect();
  }, [W, H]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'Escape') setPanel(null);
      else if (idx >= 0 && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) { e.preventDefault(); go(idx + 1); }
      else if (idx >= 0 && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); go(idx - 1); }
      else if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen?.(); else stage.current?.requestFullscreen?.().catch(() => undefined); }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [idx, go]);
  const props: ViewProps = {
    a, site, onSite: setSite,
    nav: { pos: idx + 1, total: VIEWS.length, onPrev: () => go(idx - 1), onNext: () => go(idx + 1) },
    openItem: (id) => setPanel({ kind: 'item', id }), openSupplier: (id) => setPanel({ kind: 'supplier', id }),
  };
  const Current = idx >= 0 ? VIEWS[idx].C : null;
  return (
    <div className="stage" ref={stage}>
      <div className="stage-view" ref={box}>
        <div className="stage-slide" style={{ width: W * scale, height: H * scale }}>
          <div className="scaler" style={{ width: W, height: H, transform: `scale(${scale})` }}>
            {Current ? <Current {...props} /> : <Orders {...props} onBack={() => go(0)} />}
            {panel?.kind === 'item' && a.pol.policies.has(panel.id) && <ItemPanel a={a} item={panel.id} onClose={() => setPanel(null)} openSupplier={props.openSupplier} />}
            {panel?.kind === 'supplier' && <SupplierPanel a={a} supplier={panel.id} onClose={() => setPanel(null)} openItem={props.openItem} />}
          </div>
        </div>
      </div>
      <nav className="stage-bar" aria-label="Screens">
        {VIEWS.map((v, i) => <button key={v.name} aria-current={i === idx ? 'page' : undefined} onClick={() => go(i)}>{i + 1}</button>)}
        <button aria-current={view === 'orders' ? 'page' : undefined} onClick={() => go('orders')}>Orders</button>
        <span style={{ marginLeft: 8, color: '#E9F2F7' }}>{idx >= 0 ? VIEWS[idx].name : 'Admin · Orders & automation'}</span>
        <span style={{ marginLeft: 'auto' }}>← → to navigate · Esc closes a panel · F full screen</span>
      </nav>
    </div>
  );
}
