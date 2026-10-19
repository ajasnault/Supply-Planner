import { useMemo, useState } from 'react';
import { days } from '../engine/engine';
import { type Status, fmt } from '../engine/derived';
import { Badge, Header, Mono, StatusIcon, Strip } from '../ui/primitives';
import type { ViewProps } from './types';

export const UOM: Record<string, string> = { fragment: 'u', each: 'u', ug: 'µg', mL: 'mL', plate: 'plates', L: 'L', uL: 'µL', mg: 'mg', box: 'boxes' };

export function Inventory({ a, site, onSite, nav, openItem }: ViewProps) {
  const { m, pol } = a;
  const [filter, setFilter] = useState<'flagged' | 'all' | 'ok'>('flagged');
  const [q, setQ] = useState('');
  const rows = useMemo(() => [...pol.policies.keys()].map((it) => {
    const p = pol.policies.get(it)!;
    const ob = a.noQualified.includes(it) ? '2026-12-07' : a.orderBy(it);
    return { it, p, st: a.statusOf(it) as Status, ob };
  }), [a, pol]);
  const counts = { crit: rows.filter((r) => r.st === 'crit').length, warn: rows.filter((r) => r.st === 'warn').length, ok: rows.filter((r) => r.st === 'ok').length };
  const shown = rows
    .filter((r) => (filter === 'flagged' ? r.st !== 'ok' : filter === 'ok' ? r.st === 'ok' : true))
    .filter((r) => !q || `${r.it} ${m.items.get(r.it)!.description} ${m.sups.get(r.p.supplier)!.supplier_name} ${r.p.openPos.map((o) => o.po_id).join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => (x.ob ?? '9999') < (y.ob ?? '9999') ? -1 : (x.ob ?? '9999') > (y.ob ?? '9999') ? 1 : 0);
  const sub = (it: string) => {
    const p = pol.policies.get(it)!;
    const sup = m.sups.get(p.supplier)!.supplier_name;
    const lot = a.expiredLots.find((l) => l.item_id === it);
    if (lot) return <>{sup} · lot <Mono>{lot.lot_id}</Mono> expired {lot.expiry_date.slice(5)}</>;
    const c = a.cycle.find((x) => x.item === it);
    if (c) return <>{sup} · count {fmt(c.gap * 100)} % on {c.date.slice(5)}</>;
    if (a.exp[it]) return <>{sup} · {fmt(a.exp[it][0].qty)} {UOM[m.items.get(it)!.uom]} expire {a.exp[it][0].expiry.slice(5)}</>;
    if (a.noQualified.includes(it)) return <>{sup} · quote only</>;
    return <>{sup} · {p.qualifiedSources === 1 ? 'single source' : `${p.qualifiedSources} sources`}</>;
  };
  const chip = (key: typeof filter, label: React.ReactNode) => (
    <button className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)} style={filter === key ? { borderColor: '#0A6FA6', boxShadow: 'inset 0 0 0 1px #0A6FA6' } : undefined}>{label}</button>
  );
  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={3} eyebrow="Inventory health" question="Which items will run out or expire?" site={site} onSite={onSite} nav={nav} />
      <main style={{ flex: 1, minHeight: 0, padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label htmlFor="i3q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search items</label>
          <input id="i3q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, supplier, PO…" style={{ height: 40, width: 300, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #C8D3DC', borderRadius: 8, fontSize: 15 }} />
          {chip('all', `All ${rows.length}`)}
          {chip('flagged', <><StatusIcon kind="crit" size={12} />Critical {counts.crit} + <StatusIcon kind="warn" size={12} />Watch {counts.warn}</>)}
          {chip('ok', <><StatusIcon kind="ok" size={12} />OK {counts.ok}</>)}
          <span className="mut" style={{ marginLeft: 'auto', fontSize: 14 }}>{shown.length} items · LSN · cover in weeks of next-4-week use · click a row for detail</span>
        </div>
        <div className="card" style={{ flex: 1, overflow: 'auto' }}>
          <table className="t">
            <thead><tr><th style={{ paddingLeft: 16 }}>Status</th><th>Item</th><th>Cover vs real lead time</th><th className="r">Safety stock</th><th className="r">Reorder point</th><th>Open order</th><th aria-sort="ascending" style={{ color: '#0A6FA6' }}>Order by ↓</th></tr></thead>
            <tbody>
              {shown.map(({ it, p, st, ob }) => {
                const u = UOM[m.items.get(it)!.uom];
                const ops = [...p.openPos].sort((x, y) => (x.promised_date < y.promised_date ? -1 : 1));
                const late = ops[0] ? days(ops[0].promised_date, m.today) : 0;
                return (
                  <tr key={it} className="clickable" tabIndex={0} onClick={() => openItem(it)} onKeyDown={(e) => { if (e.key === 'Enter') openItem(it); }}>
                    <td style={{ paddingLeft: 16 }}><Badge kind={st} /></td>
                    <td><div style={{ display: 'flex', flexDirection: 'column' }}><span><span className="mono" style={{ fontWeight: 500 }}>{it}</span> {m.items.get(it)!.description.slice(0, 34)}</span><span className="mut" style={{ fontSize: 13 }}>{sub(it)}</span></div></td>
                    <td>{p.use > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 84 }}><b>{fmt(p.cover!, 1)}</b><span className="u">/ {fmt(p.ltObserved, 1)} wk</span></span>
                        <div className="bar"><i style={{ width: Math.min(110, p.cover! * 5.5), background: st === 'crit' && p.cover! < p.ltObserved ? '#EF4444' : undefined }} /><b style={{ left: Math.min(108, p.ltObserved * 5.5) }} /></div>
                      </div>) : <span className="mut">No use until launch</span>}</td>
                    <td className="r">{p.use ? <>{fmt(p.safetyStock)}<span className="u">{u}</span></> : <span className="mut">—</span>}</td>
                    <td className="r">{p.use ? <>{fmt(p.reorderPoint)}<span className="u">{u}</span></> : <span className="mut">—</span>}</td>
                    <td>{ops[0] ? <><span className="mono" style={{ fontSize: 14 }}>{ops[0].po_id}</span> {late > 0 ? <span style={{ color: '#8E1B12', fontWeight: 600, fontSize: 14 }}>· {late} d late</span> : <span className="mut" style={{ fontSize: 14 }}>· due {ops[0].promised_date.slice(5)}</span>}{ops.length > 1 && <span className="mut" style={{ fontSize: 13 }}> +{ops.length - 1}</span>}</> : <span className="mut">None</span>}</td>
                    <td>{!ob ? <span className="mut">—</span> : ob < m.today ? <><span style={{ color: '#8E1B12', fontWeight: 600 }}>Overdue</span> <span className="mono mut" style={{ fontSize: 13 }}>{ob.slice(5)}</span></> : <span className="mono">{ob}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
