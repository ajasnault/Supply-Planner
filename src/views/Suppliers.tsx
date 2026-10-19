import { days } from '../engine/engine';
import { type Analysis, fmt } from '../engine/derived';
import { Badge, Header, Mono, Panel, StatusIcon, Strip, path } from '../ui/primitives';
import type { ViewProps } from './types';

const LBL: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  S01: [0, -34, 'middle'], S03: [0, 46, 'middle'], S04: [0, -30, 'middle'], S12: [0, 40, 'middle'], S05: [0, 38, 'middle'],
  S13: [0, -28, 'middle'], S09: [0, 40, 'middle'], S10: [0, -28, 'middle'], S06: [18, 5, 'start'], S07: [18, -14, 'start'],
};

export function Suppliers({ a, site, onSite, nav, openSupplier }: ViewProps) {
  const { m } = a;
  const rel = a.supplierRel;
  const sups = Object.keys(rel).filter((s) => rel[s].annual_spend_kchf > 0);
  const nItems = (s: string) => m.ds.supplierItems.filter((r) => r.supplier_id === s).length;
  const curTotal = m.proteins(m.today, 'LSN');
  const x0 = 80, x1 = 960, lo = Math.log10(20), hi = Math.log10(4000);
  const X = (v: number) => x0 + ((Math.log10(Math.max(v, 20)) - lo) / (hi - lo)) * (x1 - x0);
  const Y = (v: number) => 720 - (v * 690) / 4000;
  const relRows = Object.entries(rel).filter(([, r]) => r.received_pos > 0)
    .map(([s, r]) => ({ s, ...r, delay: (r.actual_weeks ?? 0) - (r.quoted_weeks ?? 0) }))
    .sort((x, y) => y.delay - x.delay).slice(0, 7);
  const pc = (title: React.ReactNode, sub: React.ReactNode, link?: string, crit?: string) => (
    <div className="pc" style={crit ? { borderColor: '#F3B5B5' } : undefined}>
      <span className="pt">{title}</span><span className="mut">{sub}</span>
      {crit && <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8E1B12', fontWeight: 600 }}><StatusIcon kind="crit" size={12} />{crit}</span>}
      {link && <a href="#" onClick={(e) => e.preventDefault()}>{link}</a>}
    </div>
  );
  const pipe = (status: string) => m.ds.supplierItems.filter((r) => r.preferred === 'N' && r.qualification_status === status);
  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={4} eyebrow="Supplier risk" question="Who do we depend on too much?" site={site} onSite={onSite} nav={nav} />
      <main style={{ flex: 1, padding: '28px 40px', display: 'grid', gridTemplateColumns: '1040px minmax(0, 1fr)', gap: 24, minHeight: 0 }}>
        <section className="card" aria-label="Supplier dependence matrix" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">Dependence matrix</h2><span className="mut" style={{ fontSize: 14 }}>Bubble size = items supplied · click a supplier for detail</span></div>
          <div style={{ display: 'flex', gap: 20, fontSize: 14, color: '#45525B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="#22394A" /></svg>Single source for ≥ 1 item</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="#FFFFFF" stroke="#22394A" strokeWidth="1.5" /></svg>Every item has a qualified alternate</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true"><path d="M0 4h22" stroke="#142933" strokeDasharray="2 3" /></svg>All current LSN throughput · {fmt(curTotal)}/week</span>
          </div>
          <svg width="990" height="800" viewBox="0 0 990 800" role="img" aria-label="Annual spend versus LSN proteins per week stopped if the supplier fails" style={{ fontFamily: 'inherit' }}>
            <rect x={X(300)} y="30" width={960 - X(300)} height="345" fill="#EEF5FB" pointerEvents="none" />
            <text x="950" y={Y(2700)} fontSize="14" fontWeight="600" fill="#45525B" textAnchor="end">Concentrated dependence</text>
            <text x="950" y={Y(2700) + 18} fontSize="13" fill="#666666" textAnchor="end">&gt; 300 k CHF/year and &gt; 2 000 proteins/week</text>
            <g stroke="#E9F2F7">{[50, 100, 250, 500, 1000, 2500].map((v) => <line key={v} x1={X(v)} y1="30" x2={X(v)} y2="720" />)}{[1000, 2000, 3000, 4000].map((v) => <line key={v} x1="80" y1={Y(v)} x2="960" y2={Y(v)} />)}</g>
            <line x1="80" y1="720" x2="960" y2="720" stroke="#9AA8B2" /><line x1="80" y1="30" x2="80" y2="720" stroke="#9AA8B2" />
            <g fontSize="13" fill="#666666" textAnchor="end">{[0, 1000, 2000, 3000, 4000].map((v) => <text key={v} x="72" y={Y(v) + 4}>{fmt(v)}</text>)}</g>
            <g fontSize="13" fill="#666666" textAnchor="middle">{[20, 50, 100, 250, 500, 1000, 2500].map((v) => <text key={v} x={X(v)} y="742">{fmt(v)}</text>)}</g>
            <text x="520" y="772" fontSize="14" fill="#45525B" textAnchor="middle">Annual spend, k CHF (log scale, 2026 run rate)</text>
            <text x="0" y="0" fontSize="14" fill="#45525B" textAnchor="middle" transform="translate(22 375) rotate(-90)">LSN proteins/week stopped if the supplier fails</text>
            <line x1="80" y1={Y(curTotal)} x2="960" y2={Y(curTotal)} stroke="#142933" strokeDasharray="2 4" />
            {sups.sort((x, y) => rel[y].annual_spend_kchf - rel[x].annual_spend_kchf).map((s) => {
              const x = X(rel[s].annual_spend_kchf), y = Y(a.exposure(s)), r = 6 + 5 * Math.sqrt(nItems(s));
              const [dx, dy, an] = LBL[s] ?? [0, -24, 'middle'];
              const single = a.exposure(s) > 0;
              return (
                <g key={s} className="clickable" role="button" tabIndex={0} aria-label={`Open ${rel[s].name}`} onClick={() => openSupplier(s)} onKeyDown={(e) => { if (e.key === 'Enter') openSupplier(s); }}>
                  <circle cx={x} cy={y} r={r} fill={single ? '#22394A' : '#FFFFFF'} stroke="#22394A" strokeWidth="2" />
                  <text x={x + dx} y={y + dy} fontSize="14" fontWeight="600" fill="#142933" textAnchor={an}>{rel[s].name}</text>
                  <text x={x + dx} y={y + dy + 16} fontSize="12" fill="#666666" textAnchor={an}>{fmt(rel[s].annual_spend_kchf)} k · {nItems(s)} items</text>
                </g>
              );
            })}
          </svg>
        </section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
          <section className="card" aria-label="Second-source pipeline" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">Second-source pipeline</h2><span className="mut" style={{ fontSize: 14 }}>{(a.ref.summary as any).single_source_items} of {(a.ref.summary as any).active_items} active items single-source</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <div className="col"><div className="colh"><span>Not started</span><span>{2 + pipe('not_started').length}</span></div>
                {pc(<><Mono>I020 · I021 · I023</Mono> biosensors</>, 'Alternative to Octane · no candidate', 'Source candidates', `${fmt(m.proteins(m.today, 'LSN', 'BIND_BLI'))} proteins/week exposed`)}
                {pc(<><Mono>{a.noQualified.join(' · ')}</Mono> DEVELOP</>, 'Only a quote from Chromalytix', 'Request 2nd quote')}
                {pipe('not_started').map((r) => pc(<><Mono>{r.item_id}</Mono> {m.items.get(r.item_id)!.description.split(' ').slice(0, 2).join(' ')}{r.site_scope === 'LDN' ? ', LDN' : ''}</>, `${m.sups.get(r.supplier_id)!.supplier_name} · not started`, 'Start qualification'))}
              </div>
              <div className="col"><div className="colh"><span>In qualification</span><span>{pipe('in_qualification').length}</span></div>
                {pipe('in_qualification').map((r) => pc(<>{m.sups.get(r.supplier_id)!.supplier_name} → <Mono>{r.item_id}</Mono></>, `${m.items.get(r.item_id)!.description.split(',')[0]} · ${fmt(+r.unit_price, 2)} ${m.sups.get(r.supplier_id)!.currency}/${m.items.get(r.item_id)!.uom}`, 'View runs'))}
              </div>
              <div className="col"><div className="colh"><span>Qualified alternate</span><span>{pipe('qualified').length}</span></div>
                {pipe('qualified').map((r) => pc(<>{m.sups.get(r.supplier_id)!.supplier_name} → <Mono>{r.item_id}</Mono></>, `${m.items.get(r.item_id)!.description.split(',')[0]}${r.site_scope !== 'ALL' ? ` · ${r.site_scope} only` : ''}`))}
              </div>
            </div>
          </section>
          <section className="card" aria-label="Lead-time reliability" style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}><h2 className="h2">Lead-time reliability</h2><span className="mut" style={{ fontSize: 13 }}>○ quoted · ● actual, 2026 POs</span></div>
            <div className="dr" style={{ height: 30, fontSize: 13, color: '#666666' }}><span>Supplier, by delay</span><span>weeks (0 – 8)</span><span style={{ textAlign: 'right' }}>On time</span></div>
            {relRows.map((r) => {
              const xs = (v: number) => 10 + v * 40;
              return (
                <div className="dr" key={r.s} style={r.s === 'S05' ? { background: '#E9F2F7' } : undefined}>
                  <a href="#" onClick={(e) => { e.preventDefault(); openSupplier(r.s); }} style={{ color: '#142933', textDecoration: 'none', fontWeight: r.s === 'S05' ? 600 : 400 }}>{r.name}</a>
                  <svg width="360" height="28" viewBox="0 0 360 28" role="img" aria-label={`quoted ${r.quoted_weeks}, actual ${r.actual_weeks} weeks`}>
                    <line x1="10" y1="14" x2="330" y2="14" stroke="#E9F2F7" />
                    <line x1={xs(r.quoted_weeks!)} y1="14" x2={xs(r.actual_weeks!)} y2="14" stroke={r.delay >= 0.5 ? '#EF4444' : '#FFBB00'} strokeWidth="3" />
                    <circle cx={xs(r.quoted_weeks!)} cy="14" r="6" fill="#FFFFFF" stroke="#142933" strokeWidth="1.5" /><circle cx={xs(r.actual_weeks!)} cy="14" r="6" fill="#142933" />
                    <text x={xs(r.actual_weeks!) + 12} y="19" fontSize="13" fill="#45525B">+{fmt(r.delay, 1)} wk</text>
                  </svg>
                  <span style={{ textAlign: 'right', ...(r.on_time_pct! < 35 ? { color: '#8E1B12', fontWeight: 600 } : {}) }}>{r.on_time_pct} %</span>
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}

export function SupplierPanel({ a, supplier, onClose, openItem }: { a: Analysis; supplier: string; onClose: () => void; openItem: (i: string) => void }) {
  const { m, pol } = a;
  const s = m.sups.get(supplier)!;
  const rel = a.supplierRel[supplier];
  const contract = m.ds.contracts.find((c) => c.supplier_id === supplier);
  const its = [...pol.policies].filter(([, p]) => p.supplier === supplier).map(([i]) => i);
  const recv = m.ds.purchaseOrders.filter((r) => r.supplier_id === supplier && r.received_date).sort((x, y) => (x.order_date < y.order_date ? -1 : 1)).slice(-12);
  const act = recv.map((r) => days(r.order_date, r.received_date) / 7);
  const quoted = rel?.quoted_weeks ?? 0;
  const ymax = Math.max(quoted, ...act, 1) * 1.15;
  const X = (i: number) => 60 + i * 48, Y = (v: number) => 180 - (v * 160) / ymax;
  const open = m.ds.purchaseOrders.filter((r) => r.supplier_id === supplier && !r.received_date).sort((x, y) => (x.promised_date < y.promised_date ? -1 : 1));
  const tiers = m.ds.priceBreaks.filter((r) => r.supplier_id === supplier);
  const second = m.ds.supplierItems.filter((r) => its.includes(r.item_id) && r.supplier_id !== supplier);
  const exposure = a.exposure(supplier);
  return (
    <Panel label={`Supplier detail ${s.supplier_name}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 56 }}>
        <span className="eyebrow">Supplier · {supplier}</span>
        <h2 style={{ margin: 0, fontSize: 26 }}>{s.supplier_name}</h2>
        <span className="mut" style={{ fontSize: 14 }}>{s.notes} · {s.country} · {s.currency} · {s.incoterm} · {s.ordering_channel.replace('_', ' ')} · {s.payment_terms_days} days · {contract ? (contract.type === 'none' ? 'no contract' : contract.contract_id) : 'no contract'}</span>
      </div>
      {exposure > 0 && <span style={{ alignSelf: 'flex-start' }}><Badge kind="crit">Single source for {its.filter((i) => pol.policies.get(i)!.qualifiedSources === 1).length} items</Badge></span>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <div className="ps"><span className="pl">Annual spend</span><span className="pv">{fmt(rel?.annual_spend_kchf ?? 0)} <span style={{ fontSize: 14 }}>k CHF</span></span><span className="pl">2026 run rate</span></div>
        <div className="ps"><span className="pl">Exposed</span><span className="pv">{fmt(exposure)} <span style={{ fontSize: 14 }}>p/wk</span></span><span className="pl">LSN proteins</span></div>
        <div className="ps"><span className="pl">Lead time</span><span className="pv">{fmt(rel?.actual_weeks ?? 0, 1)} <span style={{ fontSize: 14 }}>wk</span></span><span className="pl">quoted {fmt(quoted, 1)}</span></div>
        <div className="ps" style={(rel?.on_time_pct ?? 100) < 50 ? { borderColor: '#F3B5B5', background: '#FEF4F4' } : undefined}><span className="pl">On time</span><span className="pv">{rel?.on_time_pct ?? '—'} %</span><span className="pl">{rel?.received_pos ?? 0} POs received</span></div>
      </div>
      {act.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Lead time, quoted vs actual · last {act.length} POs</h3>
        <svg width="624" height="210" viewBox="0 0 624 210" role="img" aria-label="Actual lead time per order against quoted" style={{ fontFamily: 'inherit' }}>
          {[1, 2, 3].map((k) => <line key={k} x1="40" y1={Y((ymax * k) / 3)} x2="610" y2={Y((ymax * k) / 3)} stroke="#E9F2F7" />)}
          {[0, 1, 2, 3].map((k) => <text key={k} x="32" y={Y((ymax * k) / 3) + 4} fontSize="12" fill="#666666" textAnchor="end">{fmt((ymax * k) / 3, 1)}</text>)}
          <line x1="40" y1={Y(quoted)} x2="610" y2={Y(quoted)} stroke="#142933" strokeWidth="1.5" strokeDasharray="6 4" />
          <text x="606" y={Y(quoted) + 16} fontSize="12" fill="#142933" textAnchor="end">quoted {fmt(quoted, 1)} wk</text>
          <path d={path(act.map((v, i) => [X(i), Y(v)]))} fill="none" stroke="#6F8796" strokeWidth="1.2" />
          {act.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="4.5" fill="#142933" />)}
          <line x1="40" y1="180" x2="610" y2="180" stroke="#9AA8B2" />
          {recv.map((r, i) => (i % 3 === 0 || i === recv.length - 1) && <text key={r.po_id} x={X(i)} y="198" fontSize="12" fill="#666666" textAnchor="middle">{r.order_date.slice(5)}</text>)}
        </svg>
      </div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Items supplied</h3>
        <table className="t mt"><thead><tr><th>Item</th><th className="r">Cover / lead time</th><th>Status</th></tr></thead>
          <tbody>{its.map((i) => { const p = pol.policies.get(i)!; return (
            <tr key={i} className="clickable" onClick={() => openItem(i)}><td><Mono>{i}</Mono> {m.items.get(i)!.description.slice(0, 32)}</td><td className="r">{p.use ? <><b>{fmt(p.cover!, 1)}</b> <span className="mut">/ {fmt(p.ltObserved, 1)} wk</span></> : <span className="mut">no use yet</span>}</td><td><Badge kind={a.statusOf(i)} /></td></tr>); })}</tbody>
        </table>
      </div>
      {open.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Open orders</h3>
        <table className="t mt"><thead><tr><th>PO</th><th>Item</th><th className="r">Qty</th><th>Promised</th><th>Realistic</th></tr></thead>
          <tbody>{open.map((r) => <tr key={r.po_id}><td className="mono">{r.po_id}</td><td className="mono">{r.item_id}</td><td className="r">{fmt(+r.qty)}</td><td className="mono" style={r.promised_date < m.today ? { color: '#8E1B12' } : undefined}>{r.promised_date}</td><td className="mono">{a.realistic(r)}</td></tr>)}</tbody>
        </table>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, fontSize: 14 }}>
        <div className="ps"><span className="pl">Price tiers</span>{tiers.length ? tiers.map((t) => <span key={t.min_annual_qty}><Mono>{t.item_id}</Mono> ≥ {fmt(+t.min_annual_qty)}: {t.unit_price} {s.currency}</span>) : <span className="mut">None on file</span>}</div>
        <div className="ps"><span className="pl">Second sources</span>{second.length ? second.map((r) => <span key={r.supplier_id + r.item_id}><Mono>{r.item_id}</Mono> {m.sups.get(r.supplier_id)!.supplier_name} · {r.qualification_status.replace('_', ' ')}</span>) : <span style={{ color: '#8E1B12', fontWeight: 500 }}>None identified</span>}</div>
      </div>
    </Panel>
  );
}
