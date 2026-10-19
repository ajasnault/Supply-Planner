import { addDays, days } from '../engine/engine';
import { fmt } from '../engine/derived';
import { Badge, Header, LeadTimePattern, Mono, StatusIcon, Strip } from '../ui/primitives';
import type { ViewProps } from './types';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const GO = '2027-01-11', NEED = '2027-01-04';

export function London({ a, site, onSite, nav, openSupplier, openItem }: ViewProps) {
  const { m } = a;
  const L = a.london;
  const orders = Object.entries(L.orders).sort((x, y) => (x[1].order_by < y[1].order_by ? -1 : 1));
  const x0 = 330, x1 = 1760, span = days(m.today, '2027-01-18');
  const X = (d: string) => x0 + ((x1 - x0) * days(m.today, d)) / span;
  const rowH = 37;
  const H = 30 + rowH * (orders.length + L.no_qualified_source.length) + 40;
  const yEnd = H - 40;
  // storage at go-live: 6 weeks of LDN use, litres per zone
  const lw = m.weeks.filter((w) => w >= GO && w < addDays(GO, 42));
  const liters: Record<string, number> = {};
  for (const [it, row] of m.items) liters[row.temp_zone] = (liters[row.temp_zone] ?? 0) + sum(lw.map((w) => m.use(w, 'LDN').get(it) ?? 0)) * +row.storage_liters_per_uom;
  const cap = Object.fromEntries(m.ds.storage.filter((r) => r.site_id === 'LDN').map((r) => [r.temp_zone, +r.capacity_liters]));
  const lsn80 = m.ds.storage.find((r) => r.site_id === 'LSN' && r.temp_zone === '-80C')!;
  const byMonth: Record<string, number> = {};
  for (const [, o] of orders) { const k = new Date(o.order_by + 'T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' }); byMonth[k] = (byMonth[k] ?? 0) + o.cost_chf; }
  const gbp = m.fx('GBP');
  const countdown = days(m.today, GO);
  const ldnOnly = m.ds.supplierItems.filter((r) => r.site_scope === 'LSN' && !m.ds.supplierItems.some((x) => x.item_id === r.item_id && x.site_scope !== 'LSN' && x.qualification_status === 'qualified'));
  const later = ldnOnly.filter((r) => !L.no_qualified_source.some((n) => n.item === r.item_id) && m.weeks.some((w) => (m.use(w, 'LDN').get(r.item_id) ?? 0) > 0));

  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={6} eyebrow="London go-live" question="What must we order, and for how much, to open London on 11 January?" site={site} onSite={onSite} nav={nav}
        extra={<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 8 }}><span style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>{countdown} days</span><span className="mut" style={{ fontSize: 13 }}>to go-live · <Mono>{GO}</Mono></span></div>} />
      <main style={{ flex: 1, padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
        <section className="card" aria-label="Orders to place before go-live" style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}><h2 className="h2">Orders to place, at their latest order date</h2><span className="mut" style={{ fontSize: 14 }}>{orders.length} supplier orders · 0 placed · 6 weeks of demand on site by {NEED}</span></div>
            <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#45525B' }}><span>◆ order by</span><span>▨ quoted lead time</span><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StatusIcon kind="crit" size={12} />No qualified source</span></div>
          </div>
          <svg width="1790" height={H} viewBox={`0 0 1790 ${H}`} role="img" aria-label="Orders to place for London, one bar per supplier" style={{ fontFamily: 'inherit' }}>
            <defs><LeadTimePattern id="l6lt" /><pattern id="l6no" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#FBE7E4" /><line x1="0" y1="0" x2="0" y2="6" stroke="#EF4444" strokeWidth="1.2" /></pattern></defs>
            <rect x={X('2026-12-21')} y="18" width={X(NEED) - X('2026-12-21')} height={yEnd - 18} fill="#FFBB00" fillOpacity="0.10" />
            <text x={(X('2026-12-21') + X(NEED)) / 2} y="14" fontSize="12" fill="#6B4700" textAnchor="middle">holidays · ≈ 35 % capacity</text>
            {[['2026-11-01', 'Nov'], ['2026-12-01', 'Dec'], ['2027-01-01', 'Jan 2027']].map(([d, l]) => <g key={d}><line x1={X(d)} y1="18" x2={X(d)} y2={yEnd} stroke="#E9F2F7" /><text x={X(d)} y={yEnd + 24} fontSize="13" fill="#666666" textAnchor="middle">{l}</text></g>)}
            <line x1={X(NEED)} y1="18" x2={X(NEED)} y2={yEnd} stroke="#0F8B8D" strokeDasharray="4 3" />
            <line x1={X(GO)} y1="8" x2={X(GO)} y2={yEnd} stroke="#0F8B8D" strokeWidth="2.5" /><text x={X(GO) + 6} y={yEnd + 24} fontSize="13" fontWeight="600" fill="#142933">Go-live 01-11</text>
            <line x1={x0} y1="8" x2={x0} y2={yEnd} stroke="#0A6FA6" strokeWidth="2" /><text x={x0 + 6} y="14" fontSize="13" fontWeight="600" fill="#0A6FA6">Today</text>
            {orders.map(([s, o], i) => { const y = 30 + i * rowH; const xa = X(o.order_by); const hol = o.order_by >= '2026-12-21'; return (
              <g key={s} className="clickable" onClick={() => openSupplier(s)}>
                <text x="0" y={y + 15} fontSize="14" fill="#142933" fontWeight="500">{m.sups.get(s)!.supplier_name}</text>
                <text x="0" y={y + 31} fontSize="12" fill="#666666" fontFamily="Geist Mono, monospace">{o.items.length <= 3 ? o.items.join(' · ') : `${o.items.length} items`}</text>
                <rect x={xa} y={y + 6} width={X(NEED) - xa} height="20" fill="url(#l6lt)" /><path d={`M${xa} ${y + 5} l8 11 -8 11 -8 -11z`} fill="#142933" />
                <text x={xa - 12} y={y + 21} fontSize="13" fill={hol ? '#6B4700' : '#45525B'} fontWeight={hol ? 600 : 400} textAnchor="end">by {o.order_by.slice(5)} · {o.lead_days} d · {fmt(o.cost_chf / 1000, 1)} k CHF{hol ? ' · in holiday window' : ''}</text>
              </g>); })}
            {L.no_qualified_source.map((n, j) => { const y = 30 + (orders.length + j) * rowH; return (
              <g key={n.item} className="clickable" onClick={() => openItem(n.item)}>
                <text x="0" y={y + 15} fontSize="14" fill="#142933" fontWeight="500"><tspan fontFamily="Geist Mono, monospace">{n.item}</tspan> {m.items.get(n.item)!.description.slice(0, 22)}</text>
                <text x="0" y={y + 31} fontSize="12" fill="#8E1B12">no qualified UK source</text>
                <rect x={x0} y={y + 6} width={X('2026-12-28') - x0} height="20" fill="url(#l6no)" />
                <text x={X('2026-12-28') + 14} y={y + 21} fontSize="13" fontWeight="600" fill="#8E1B12">qualify a UK source or ship from LSN</text>
              </g>); })}
            <line x1={x0} y1={yEnd} x2="1760" y2={yEnd} stroke="#9AA8B2" />
          </svg>
        </section>
        <section style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20, minHeight: 0 }}>
          <div className="card" style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="h2">Cash tied up in initial stock</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.04em' }}>{fmt(L.total_chf / 1000)} k CHF</span><span className="mut" style={{ fontSize: 16 }}>≈ {fmt(L.total_chf / gbp / 1000)} k GBP · landed · 0 committed</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}><span style={{ fontSize: 14, fontWeight: 500, color: '#45525B' }}>Orders by month</span>
              {Object.entries(byMonth).map(([mo, v]) => <div key={mo} className="cb" style={{ gridTemplateColumns: '80px minmax(0, 1fr) 70px' }}><span>{mo}</span><div className="trk"><i style={{ width: `${(100 * v) / Math.max(...Object.values(byMonth))}%`, background: '#45525B' }} /></div><span style={{ textAlign: 'right' }}>{fmt(v / 1000, 1)} k</span></div>)}</div>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}><button className="btn">Send to finance review</button></div>
          </div>
          <div className="card" style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">Storage at go-live</h2><Badge kind="ok">No constraint</Badge></div>
            {[['-80C', '−80 °C'], ['-20C', '−20 °C'], ['2-8C', '2–8 °C'], ['ambient', 'Ambient']].map(([z, l]) => <div key={z}>
              <div className="cb"><span>{l}</span><div className="trk"><i style={{ width: `${Math.max(0.6, (100 * (liters[z] ?? 0)) / cap[z])}%` }} /></div><span style={{ textAlign: 'right' }}>{fmt((100 * (liters[z] ?? 0)) / cap[z], 1)} %</span></div>
              <span className="mut" style={{ fontSize: 13, marginLeft: 132 }}>{fmt(liters[z] ?? 0, 1)} of {fmt(cap[z])} L</span></div>)}
            <span className="mut" style={{ fontSize: 13, marginTop: 'auto' }}>LSN −80 °C is at {fmt((100 * +lsn80.used_liters_today) / +lsn80.capacity_liters)} % today ({fmt(+lsn80.used_liters_today)} of {fmt(+lsn80.capacity_liters)} L) while its volume doubles by mid-2027.</span>
          </div>
          <div className="card" style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8 }}><h2 className="h2">Not covered for London</h2><Badge kind="crit">{L.no_qualified_source.length + later.length} items</Badge></div>
            {L.no_qualified_source.map((n) => <div className="nc" key={n.item}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 16, fontWeight: 600 }}><Mono>{n.item}</Mono> {m.items.get(n.item)!.description}</span><span className="mono mut" style={{ fontSize: 13 }}>needed 01-11</span></div>
              <span className="mut" style={{ fontSize: 14 }}>Needed from day one · current source ships to LSN only</span>
              <div style={{ display: 'flex', gap: 8 }}><button className="btn" style={{ height: 36 }}>Ship from LSN (CH→GB)</button><button className="btn btn-p" style={{ height: 36 }}>Qualify a UK source</button></div></div>)}
            {later.map((r) => <div className="nc" key={r.item_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 16, fontWeight: 600 }}><Mono>{r.item_id}</Mono> {m.items.get(r.item_id)!.description}</span><span className="mono mut" style={{ fontSize: 13 }}>needed {m.weeks.find((w) => (m.use(w, 'LDN').get(r.item_id) ?? 0) > 0)}</span></div>
              <span className="mut" style={{ fontSize: 14 }}>Only source: {m.sups.get(r.supplier_id)!.supplier_name}, LSN only</span></div>)}
            <div className="nc"><span style={{ fontSize: 14, fontWeight: 600 }}>Landed cost to London</span><span className="mut" style={{ fontSize: 14 }}>US→GB adds 2 % duty and 4 % freight; import VAT 20 % is recoverable.</span></div>
          </div>
        </section>
      </main>
    </div>
  );
}
