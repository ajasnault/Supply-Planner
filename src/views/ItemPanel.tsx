import { addDays } from '../engine/engine';
import { type Analysis, fmt } from '../engine/derived';
import { Badge, LeadTimePattern, Mono, Panel, path } from '../ui/primitives';
import { UOM } from './Inventory';

const COLORS = ['#22394A', '#6F8796', '#B4C6D3', '#D3DEE6', '#E9F2F7', '#F3F8FC'];

export function ItemPanel({ a, item, onClose, openSupplier }: { a: Analysis; item: string; onClose: () => void; openSupplier: (s: string) => void }) {
  const { m, pol } = a;
  const p = pol.policies.get(item)!;
  const it = m.items.get(item)!;
  const sup = m.sups.get(p.supplier)!;
  const u = UOM[it.uom];
  const st = a.statusOf(item);
  const quoteOnly = a.noQualified.includes(item);
  const lots = m.ds.lots.filter((l) => l.site_id === 'LSN' && l.item_id === item).sort((x, y) => (x.expiry_date < y.expiry_date ? -1 : 1));
  const ops = [...p.openPos].sort((x, y) => (x.promised_date < y.promised_date ? -1 : 1));
  const ob = a.orderBy(item);
  // layered projection: usable lots first (FEFO), then open POs in arrival order; consumption takes from the first layer
  const NW = 26;
  const layers = [
    ...lots.filter((l) => l.expiry_date >= m.today).map((l) => ({ name: l.lot_id, qty: +l.qty_on_hand, date: null as string | null })),
    ...ops.map((r) => ({ name: r.po_id, qty: +r.qty, date: a.realistic(r) })).sort((x, y) => (x.date! < y.date! ? -1 : 1)),
  ].slice(0, 6);
  const q = layers.map((l) => (l.date ? 0 : l.qty));
  const lev = layers.map(() => [] as number[]);
  for (let i = 0; i <= NW; i++) {
    const w = addDays(m.today, 7 * i);
    layers.forEach((l, j) => { if (l.date && l.date >= addDays(w, -7) && l.date < w) q[j] += l.qty; });
    layers.forEach((_, j) => lev[j].push(q[j]));
    let need = m.use(w, 'LSN').get(item) ?? 0;
    for (let j = 0; j < q.length; j++) { const t = Math.min(need, q[j]); q[j] -= t; need -= t; }
  }
  const tot = Array.from({ length: NW + 1 }, (_, i) => layers.reduce((s, _l, j) => s + lev[j][i], 0));
  const ym = Math.max(p.reorderPoint * 1.15, ...tot, 1);
  const x0 = 50, x1 = 600, yb = 230, yt = 20;
  const X = (i: number) => x0 + ((x1 - x0) * i) / NW;
  const Y = (v: number) => yb - ((yb - yt) * v) / ym;
  const cum: number[][] = [tot.map(() => 0)];
  layers.forEach((_, j) => cum.push(tot.map((_, i) => cum[j][i] + lev[j][i])));
  const wk = (i: number) => { const d = new Date(addDays(m.today, 7 * i) + 'T00:00:00Z'); const t = new Date(d); t.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); return Math.ceil(((+t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
  const outDays = p.use ? (p.onHand / p.use) * 7 : 0;
  const nextQty = p.use ? Math.ceil((8 * p.use) / +m.pref.get(item)!.pack_size) * +m.pref.get(item)!.pack_size : 0;
  const XD = (d: string) => x0 + ((x1 - x0) * ((new Date(d).getTime() - new Date(m.today).getTime()) / 864e5 / 7)) / NW;

  return (
    <Panel label={`Item detail ${item}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 56 }}>
        <span className="eyebrow">Item</span>
        <h2 style={{ margin: 0, fontSize: 24 }}><Mono>{item}</Mono> {it.description}</h2>
        <span className="mut" style={{ fontSize: 14 }}><a href="#" onClick={(e) => { e.preventDefault(); openSupplier(p.supplier); }}>{sup.supplier_name}</a> · {quoteOnly ? 'quote only' : p.qualifiedSources === 1 ? 'single source' : `${p.qualifiedSources} sources`} · <Mono>{m.pref.get(item)!.supplier_sku}</Mono> · {it.temp_zone} · {fmt(m.unitPrice(item), 2)} {sup.currency}/{u}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <div className="ps" style={st === 'crit' ? { borderColor: '#F3B5B5', background: '#FEF4F4' } : undefined}><span className="pl">Cover</span><span className="pv" style={st === 'crit' ? { color: '#8E1B12' } : undefined}>{p.cover !== null ? fmt(p.cover, 1) : '—'} <span style={{ fontSize: 14 }}>wk</span></span></div>
        <div className="ps"><span className="pl">Lead time</span><span className="pv">{fmt(p.ltObserved, 1)} <span style={{ fontSize: 14 }}>wk</span></span><span className="pl">quoted {fmt(p.ltQuoted, 1)}</span></div>
        <div className="ps"><span className="pl">Use</span><span className="pv">{fmt(p.use, p.use < 10 ? 1 : 0)} <span style={{ fontSize: 14 }}>{u}/wk</span></span></div>
        <div className="ps"><span className="pl">On hand</span><span className="pv">{fmt(p.onHand)} <span style={{ fontSize: 14 }}>{u}</span></span><span className="pl">{lots.length} lots</span></div>
      </div>
      {p.use > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Stock projection, 26 weeks</h3><span className="mut" style={{ fontSize: 13 }}>{u} · by lot and order, at realistic arrival dates</span></div>
          <svg width="624" height="262" viewBox="0 0 624 262" role="img" aria-label={`${item} projected stock over 26 weeks`} style={{ fontFamily: 'inherit' }}>
            <defs><LeadTimePattern id="ipLt" /></defs>
            <rect x={x0} y="30" width={X(p.ltObserved) - x0} height="200" fill="url(#ipLt)" />
            {[1, 2, 3].map((k) => <line key={k} x1={x0} y1={Y((ym * k) / 3)} x2={x1} y2={Y((ym * k) / 3)} stroke="#E9F2F7" />)}
            {[0, 1, 2, 3].map((k) => <text key={k} x="44" y={Y((ym * k) / 3) + 4} fontSize="12" fill="#666666" textAnchor="end">{fmt((ym * k) / 3)}</text>)}
            {layers.map((l, j) => {
              const pts: [number, number][] = [...tot.map((_, i) => [X(i), Y(cum[j + 1][i])] as [number, number]), ...tot.map((_, i) => [X(NW - i), Y(cum[j][NW - i])] as [number, number])];
              return <path key={l.name} d={path(pts) + 'Z'} fill={COLORS[j]} stroke={j > 1 ? '#9AA8B2' : undefined} strokeWidth="0.8" />;
            })}
            <line x1={x0} y1={Y(p.reorderPoint)} x2={x1} y2={Y(p.reorderPoint)} stroke="#142933" strokeWidth="1.2" strokeDasharray="2 3" />
            <text x={x1 - 2} y={Y(p.reorderPoint) - 5} fontSize="12" fill="#142933" textAnchor="end">Reorder point {fmt(p.reorderPoint)}</text>
            <line x1={x0} y1={Y(p.safetyStock)} x2={x1} y2={Y(p.safetyStock)} stroke="#142933" strokeWidth="1.2" strokeDasharray="8 4" />
            <text x={x1 - 2} y={Y(p.safetyStock) - 5} fontSize="12" fill="#142933" textAnchor="end">Safety stock {fmt(p.safetyStock)}</text>
            {ops.length > 0 && outDays < 7 * NW && <>
              <line x1={x0} y1={Y(p.onHand)} x2={x0 + ((x1 - x0) * (outDays / 7)) / NW} y2={yb} stroke="#EF4444" strokeWidth="2" strokeDasharray="4 3" />
              <text x={x0 + ((x1 - x0) * (outDays / 7)) / NW + 4} y="222" fontSize="12" fontWeight="600" fill="#8E1B12">out ≈ {addDays(m.today, Math.floor(outDays)).slice(5)} if open orders slip</text></>}
            {ops.map((r) => <g key={r.po_id}><path d={`M${Math.max(x0, XD(r.promised_date))} 12 l5 7 -5 7 -5 -7z`} fill="#FFFFFF" stroke="#142933" strokeWidth="1.3" /><path d={`M${XD(a.realistic(r))} 12 l5 7 -5 7 -5 -7z`} fill="#142933" /></g>)}
            <line x1={x0} y1={yb} x2={x1} y2={yb} stroke="#9AA8B2" />
            {[0, 4, 8, 12, 16, 20, 24].map((i) => <text key={i} x={X(i)} y="248" fontSize="12" fill="#666666" textAnchor="middle">W{String(wk(i)).padStart(2, '0')}</text>)}
          </svg>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 13, color: '#45525B' }}>
            {layers.map((l, j) => <span key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: COLORS[j], border: '1px solid #9AA8B2', boxSizing: 'border-box' }} /><Mono>{l.name}</Mono></span>)}
            <span>◇ promised · ◆ realistic (supplier history)</span>
          </div>
        </div>
      ) : (
        <div className="ps" style={{ borderStyle: 'dashed' }}><span style={{ fontSize: 15 }}>No consumption before {quoteOnly ? 'the DEVELOP launch on 2027-02-01' : 'the forecast horizon'}; no projection to draw.</span></div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Lots and open orders</h3>
        <table className="t mt"><thead><tr><th>Reference</th><th className="r">Qty</th><th>Promised</th><th>Realistic</th><th>Expires</th></tr></thead>
          <tbody>
            {lots.map((l) => <tr key={l.lot_id}><td className="mono">{l.lot_id}</td><td className="r">{fmt(+l.qty_on_hand)}<span className="u">{u}</span></td><td className="mut">on hand</td><td className="mut">—</td><td className="mono" style={l.expiry_date < m.today ? { color: '#8E1B12', fontWeight: 600 } : undefined}>{l.expiry_date}{l.expiry_date < m.today ? ' · expired' : ''}</td></tr>)}
            {ops.map((r) => <tr key={r.po_id}><td className="mono">{r.po_id}</td><td className="r">{fmt(+r.qty)}<span className="u">{u}</span></td><td className="mono">{r.promised_date}</td><td className="mono" style={r.promised_date < m.today ? { color: '#8E1B12', fontWeight: 500 } : undefined}>{r.promised_date < m.today ? '≥ ' : ''}{a.realistic(r)}</td><td className="mut">—</td></tr>)}
            {!lots.length && !ops.length && <tr><td colSpan={5} className="mut">No stock and no open order.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="act">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ flex: 'none' }}><Badge kind={st}>{st === 'crit' ? 'Act now' : st === 'warn' ? 'Watch' : 'OK'}</Badge></span>
          <span style={{ fontSize: 15, lineHeight: 1.4 }}>
            {quoteOnly ? <>Only a quote exists. Order test units and qualify the supplier; first order by 2026-12-07 to launch on 2027-02-01.</>
              : a.expiredLots.some((l) => l.item_id === item) ? <>Quarantine the expired lot now, then check whether any run used it since {a.expiredLots.find((l) => l.item_id === item)!.expiry_date}.</>
              : ob ? <>Next order ≈ {fmt(nextQty)} {u} (8 weeks, ≈ {fmt((nextQty * m.priceChf(item)) / 1000)} k CHF) by <b>{ob < m.today ? `now (was ${ob})` : ob}</b>.{ops.some((r) => r.promised_date < m.today) && <> Chase <Mono>{ops.find((r) => r.promised_date < m.today)!.po_id}</Mono> first.</>}</>
              : <>Covered on the 30-week horizon with open orders.</>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn">Draft next order</button><button className="btn btn-p">{quoteOnly ? 'Start qualification' : ops.some((r) => r.promised_date < m.today) ? `Escalate with ${sup.supplier_name.split(' ')[0]}` : 'Plan order'}</button></div>
      </div>
    </Panel>
  );
}
