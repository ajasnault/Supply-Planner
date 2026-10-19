import { days } from '../engine/engine';
import { fmt } from '../engine/derived';
import { Badge, Logo, Mono, SiteSelector, Strip } from '../ui/primitives';
import { UOM } from './Inventory';
import type { ViewProps } from './types';

const CH: Record<string, [string, 'auto' | 'manual']> = { api: ['API', 'auto'], edi: ['EDI', 'auto'], webshop: ['Webshop', 'auto'], email: ['E-mail', 'manual'], portal_upload: ['Portal upload', 'manual'] };
const COL: Record<string, string> = { api: '#0A6FA6', edi: '#36B7F6', webshop: '#9ED8F8', portal_upload: '#6F8796', email: '#B4C6D3' };

/** Admin screen (1440 wide): engine-proposed orders, exceptions queue, spend by ordering channel. */
export function Orders({ a, site, onSite, openItem, onBack }: ViewProps & { onBack: () => void }) {
  const { m, pol } = a;
  const horizon = new Date(new Date(m.today).getTime() + 14 * 864e5).toISOString().slice(0, 10);
  const proposals = [...pol.policies.keys()].map((it) => ({ it, ob: a.orderBy(it) })).filter((x) => x.ob && x.ob <= horizon).map(({ it, ob }) => {
    const p = pol.policies.get(it)!; const r = m.pref.get(it)!;
    const pack = +r.pack_size, moq = +r.moq_packs;
    const need = p.reorderPoint + 2 * p.use - p.onHand - p.openPos.reduce((s, o) => s + +o.qty, 0);
    const qty = Math.max(moq, Math.ceil(Math.max(need, 0) / pack)) * pack;
    return { it, ob: ob!, qty, value: qty * m.priceChf(it), sup: r.supplier_id, ch: CH[m.sups.get(r.supplier_id)!.ordering_channel] };
  }).sort((x, y) => (x.ob < y.ob ? -1 : 1));
  const frac = days('2026-01-01', m.today) / 365;
  const spend: Record<string, number> = {};
  for (const r of m.ds.purchaseOrders) { const ch = m.sups.get(r.supplier_id)!.ordering_channel; spend[ch] = (spend[ch] ?? 0) + (+r.qty * +r.unit_price * m.fx(r.currency, r.order_date.slice(0, 7))) / frac; }
  const tot = Object.values(spend).reduce((s, x) => s + x, 0);
  const auto = Object.entries(spend).filter(([k]) => CH[k][1] === 'auto').reduce((s, [, v]) => s + v, 0);
  const open = m.ds.purchaseOrders.filter((r) => !r.received_date);
  const late = open.filter((r) => r.promised_date < m.today);
  const rec30 = m.ds.purchaseOrders.filter((r) => r.received_date && days(r.received_date, m.today) <= 30).length;
  const exceptions = [
    ...late.map((r) => ({ kind: 'crit' as const, title: <><Mono>{r.po_id}</Mono> {days(r.promised_date, m.today)} days late</>, sub: `${m.sups.get(r.supplier_id)!.supplier_name} · ${fmt(+r.qty)} × ${r.item_id} · no ship date`, act: 'Chase supplier', on: () => openItem(r.item_id) })),
    ...a.expiredLots.map((l) => ({ kind: 'crit' as const, title: <>Lot <Mono>{l.lot_id}</Mono> expired, still {l.status}</>, sub: `${l.item_id} · ${fmt(+l.qty_on_hand)} ${UOM[m.items.get(l.item_id)!.uom]} · expired ${l.expiry_date}`, act: 'Quarantine', on: () => openItem(l.item_id) })),
    ...a.cycle.map((c) => ({ kind: 'warn' as const, title: <>Count gap <Mono>{c.item}</Mono> {fmt(c.gap * 100)} %</>, sub: `${fmt(c.counted, 1)} counted vs ${fmt(c.system, 1)} in system · ${fmt(c.value / 1000, 1)} k CHF`, act: 'Recount, then adjust', on: () => openItem(c.item) })),
    { kind: 'warn' as const, title: <>LabPlast price list 2027 to map</>, sub: '8 SKUs · German headers, decimal commas, working days · +4 to +6 %', act: 'Review mapping', on: undefined },
    ...m.ds.contracts.filter((c) => c.status === 'active' && c.end_date && c.end_date <= '2026-12-31').map((c) => ({ kind: 'warn' as const, title: <>{m.sups.get(c.supplier_id)!.supplier_name} contract ends {c.end_date}</>, sub: `${c.contract_id} · ${c.notes}`, act: 'Start renewal', on: undefined })),
    ...m.ds.contracts.filter((c) => c.type === 'none').map((c) => ({ kind: 'warn' as const, title: <>{m.sups.get(c.supplier_id)!.supplier_name} bought at list price</>, sub: `No contract · ${fmt((a.supplierRel[c.supplier_id]?.annual_spend_kchf ?? 0) / 1000, 2)} M CHF/year`, act: 'Open negotiation', on: undefined })),
  ];
  return (
    <div className="sp" style={{ width: 1440, height: 1000, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip px={28} />
      <header style={{ height: 64, flex: 'none', display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', background: '#FFFFFF', borderBottom: '1px solid #DCE5EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Logo /><span style={{ fontSize: 16, fontWeight: 600 }}>Supply Planner</span><span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', border: '1px solid #C8D3DC', borderRadius: 4, color: '#45525B' }}>ADMIN</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}><span className="eyebrow" style={{ fontSize: 12 }}>Orders &amp; automation</span><span style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' }}>What needs a human today?</span></div>
        <SiteSelector site={site} onSite={onSite} height={40} />
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ fontSize: 14 }}>Back to presentation</a>
      </header>
      <main style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }} aria-label="Order pipeline">
          <div className="card sc"><span className="pl">Proposed by the engine</span><span className="sv">{proposals.length}</span><span className="pl">order-by within 14 days · {fmt(proposals.reduce((s, p) => s + p.value, 0) / 1000)} k CHF</span></div>
          <div className="card sc"><span className="pl">Open POs</span><span className="sv">{open.length}</span><span className="pl">{fmt(open.reduce((s, r) => s + +r.qty * +r.unit_price * m.fx(r.currency), 0) / 1000)} k CHF</span></div>
          <div className="card sc" style={late.length ? { borderColor: '#F3B5B5' } : undefined}><span className="pl">Late</span><span className="sv" style={late.length ? { color: '#8E1B12' } : undefined}>{late.length}</span><span className="pl">{late.map((r) => r.po_id).join(', ') || 'none'}</span></div>
          <div className="card sc"><span className="pl">Received, last 30 days</span><span className="sv">{rec30}</span><span className="pl">PO lines</span></div>
          <div className="card sc"><span className="pl">Spend via automatic channels</span><span className="sv">{fmt((100 * auto) / tot)} %</span><span className="pl">API · EDI · webshop</span></div>
        </section>
        <section style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 470px', gap: 16, minHeight: 0 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}><h2 className="h2" style={{ fontSize: 16 }}>Proposed orders</h2><span className="mut" style={{ fontSize: 13 }}>qty = reorder point + 2 weeks − on hand − open, full packs, MOQ</span></div>
            <div style={{ overflow: 'auto' }}>
              <table className="t mt"><thead><tr><th style={{ paddingLeft: 16 }}>Item</th><th>Supplier</th><th>Channel</th><th className="r">Qty</th><th className="r">Value</th><th>Order by</th><th /></tr></thead>
                <tbody>{proposals.map((p) => <tr key={p.it}>
                  <td style={{ paddingLeft: 16 }}><a href="#" onClick={(e) => { e.preventDefault(); openItem(p.it); }} style={{ textDecoration: 'none' }}><span className="mono" style={{ fontWeight: 500 }}>{p.it}</span></a> <span className="mut" style={{ fontSize: 13 }}>{m.items.get(p.it)!.description.slice(0, 26)}</span></td>
                  <td>{m.sups.get(p.sup)!.supplier_name}</td><td><span className={`chan ${p.ch[1]}`}>{p.ch[0]}</span></td>
                  <td className="r">{fmt(p.qty)}<span className="u">{UOM[m.items.get(p.it)!.uom]}</span></td><td className="r">{fmt(p.value / 1000, 1)}<span className="u">k CHF</span></td>
                  <td>{p.ob < m.today ? <><span style={{ color: '#8E1B12', fontWeight: 600 }}>Overdue</span> <span className="mono mut" style={{ fontSize: 12 }}>{p.ob.slice(5)}</span></> : <span className="mono">{p.ob}</span>}</td>
                  <td className="r"><button className={`btn${p.ch[1] === 'auto' ? ' btn-p' : ''}`} style={{ height: 34 }}>{p.ch[1] === 'auto' ? 'Send' : 'Make PDF'}</button></td></tr>)}</tbody></table>
            </div>
            <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid #E9F2F7', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 15, fontWeight: 500 }}>Spend by ordering channel</span><span className="mut" style={{ fontSize: 13 }}>{fmt(tot / 1e6, 1)} M CHF/year · blue = can be sent automatically</span></div>
              <svg width="100%" height="26" viewBox="0 0 900 26" preserveAspectRatio="none" role="img" aria-label={Object.entries(spend).map(([k, v]) => `${CH[k][0]} ${fmt((100 * v) / tot)} %`).join(', ')}>
                {(() => { let x = 0; return ['api', 'edi', 'webshop', 'portal_upload', 'email'].map((k) => { const w = (900 * (spend[k] ?? 0)) / tot; const el = <g key={k}><rect x={x} y="0" width={Math.max(w - 2, 1)} height="26" fill={COL[k]} />{w > 70 && <text x={x + 8} y="18" fontSize="13" fontWeight="600" fill={k === 'api' || k === 'portal_upload' ? '#FFFFFF' : '#142933'}>{CH[k][0]} {fmt((100 * (spend[k] ?? 0)) / tot)} %</text>}</g>; x += w; return el; }); })()}
              </svg>
            </div>
          </div>
          <div className="card" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}><h2 className="h2" style={{ fontSize: 16 }}>Exceptions</h2><span className="mut" style={{ fontSize: 13 }}>{exceptions.length} open · everything else runs on its own</span></div>
            {exceptions.map((x, i) => <div className="ex" key={i}><Badge kind={x.kind} /><div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ fontSize: 15, fontWeight: 500 }}>{x.title}</span><span className="mut" style={{ fontSize: 13 }}>{x.sub}</span></div><a href="#" onClick={(e) => { e.preventDefault(); x.on?.(); }} style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{x.act}</a></div>)}
          </div>
        </section>
      </main>
    </div>
  );
}
