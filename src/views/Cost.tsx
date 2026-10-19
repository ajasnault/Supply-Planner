import { useState } from 'react';
import type { Site } from '../engine/engine';
import { fmt } from '../engine/derived';
import { Header, Strip } from '../ui/primitives';
import type { ViewProps } from './types';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const CATS: [string, string][] = [['DNA', 'DNA'], ['EXPRESSION', 'Expression'], ['BINDING', 'Measurement'], ['TARGETS', 'Targets'], ['QC', 'QC'], ['CONSUMABLE', 'Consumables'], ['THERMO', 'Thermo'], ['ENZYME', 'Enzyme'], ['DEVELOP', 'DEVELOP']];
const ASSAYS: [string, string][] = [['BIND_BLI', 'Binding affinity (BLI)'], ['BIND_SPR', 'Binding kinetics (SPR)'], ['EXPR', 'Expression only'], ['THERMO', 'Thermostability'], ['ENZ_ACT', 'Enzyme activity'], ['DEVELOP', 'DEVELOP (from 2027-02)']];

export function Cost({ a, site, onSite, nav }: ViewProps) {
  const { m } = a;
  const [assay, setAssay] = useState('BIND_BLI');
  const c = a.cpp[assay];
  const vals = CATS.filter(([k]) => c.by_category[k]).map(([k, l]) => [l, c.by_category[k]] as [string, number]);
  vals.push(['Landed cost', c.landed_lsn - c.material]);
  const tot = c.landed_lsn;
  const yb = 540, ymax = 60, Y = (v: number) => yb - (500 * v) / ymax;
  const step = Math.min(120, 900 / (vals.length + 1));
  let run = 0;
  const bars = vals.map(([l, v], i) => { const b = { l, v, x: 90 + i * step, y0: run }; run += v; return b; });
  const xt = 90 + vals.length * step;

  // simulator over the price-break table
  const pairs = [...new Set(m.ds.priceBreaks.map((r) => `${r.supplier_id}|${r.item_id}`))];
  const [pair, setPair] = useState('S03|I010');
  const [sites, setSites] = useState<Record<Site, boolean>>({ LSN: true, LDN: true });
  const [sup, item] = pair.split('|');
  const tiers = m.ds.priceBreaks.filter((r) => r.supplier_id === sup && r.item_id === item).map((r) => ({ min: +r.min_annual_qty, price: +r.unit_price })).sort((x, y) => x.min - y.min);
  const vol = (s: Site) => sum(m.weeks.filter((w) => w.startsWith('2027')).map((w) => sum([...m.bom].map(([as, b]) => m.proteins(w, s, as) * (b.get(item) ?? 0)))));
  const vL = vol('LSN'), vD = vol('LDN'), v = (sites.LSN ? vL : 0) + (sites.LDN ? vD : 0);
  const cur = m.unitPrice(item);
  const tier = [...tiers].reverse().find((t) => v >= t.min) ?? tiers[0];
  const next = tiers.find((t) => t.min > v);
  const fx = m.fx(m.currency(sup));
  const save = Math.max(0, (cur - tier.price) * v * fx);
  const p27 = sum(m.weeks.filter((w) => w.startsWith('2027')).map((w) => m.proteins(w, 'LSN') + m.proteins(w, 'LDN')));
  const vmax = Math.max(tiers[tiers.length - 1].min * 1.6, vL + vD) * 1.05;
  const SX = (x: number) => 20 + (620 * x) / vmax;
  const uom = m.items.get(item)!.uom;
  const contract = m.ds.contracts.find((k) => k.supplier_id === sup);
  const alt = m.ds.supplierItems.find((r) => r.item_id === item && r.supplier_id !== sup);

  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={5} eyebrow="Cost per protein" question="Where are the francs to recover?" site={site} onSite={onSite} nav={nav} />
      <main style={{ flex: 1, padding: '28px 40px', display: 'grid', gridTemplateColumns: '1100px minmax(0, 1fr)', gap: 24, minHeight: 0 }}>
        <section className="card" aria-label="Cost waterfall" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><h2 className="h2">Cost of one protein</h2><span className="mut" style={{ fontSize: 14 }}>CHF per protein · LSN · prices paid · October FX · landed = freight + duty</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><label htmlFor="c5assay" style={{ fontSize: 14, color: '#666666', fontWeight: 500 }}>Assay</label>
              <select id="c5assay" className="sel" style={{ minWidth: 240 }} value={assay} onChange={(e) => setAssay(e.target.value)}>{ASSAYS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <svg width="1050" height="600" viewBox="0 0 1050 600" role="img" aria-label={`Waterfall: ${vals.map(([l, x]) => `${l} ${fmt(x, 2)}`).join(', ')}, total ${fmt(tot, 2)} CHF`} style={{ fontFamily: 'inherit' }}>
            <g stroke="#E9F2F7">{[10, 20, 30, 40, 50, 60].map((v) => <line key={v} x1="70" y1={Y(v)} x2="1040" y2={Y(v)} />)}</g>
            <g fontSize="13" fill="#666666" textAnchor="end">{[0, 10, 20, 30, 40, 50, 60].map((v) => <text key={v} x="58" y={Y(v) + 4}>{v}{v === 60 ? ' CHF' : ''}</text>)}</g>
            {bars.map((b, i) => <g key={b.l}>
              <rect x={b.x} y={Y(b.y0 + b.v)} width={step * 0.75} height={Math.max(1, Y(b.y0) - Y(b.y0 + b.v))} fill="#45525B" />
              <text x={b.x + step * 0.375} y={Y(b.y0 + b.v) - 8} fontSize="16" fontWeight="600" fill="#142933" textAnchor="middle">{fmt(b.v, 2)}</text>
              <text x={b.x + step * 0.375} y="562" fontSize="14" fill="#142933" textAnchor="middle">{b.l}</text>
              <text x={b.x + step * 0.375} y="580" fontSize="13" fill="#666666" textAnchor="middle">{fmt((100 * b.v) / tot)} %</text>
              {i > 0 && <line x1={bars[i - 1].x + step * 0.75} y1={Y(b.y0)} x2={b.x} y2={Y(b.y0)} stroke="#9AA8B2" strokeDasharray="3 3" />}
            </g>)}
            <rect x={xt} y={Y(tot)} width={step * 0.75} height={Y(0) - Y(tot)} fill="#142933" />
            <text x={xt + step * 0.375} y={Y(tot) - 10} fontSize="20" fontWeight="600" fill="#142933" textAnchor="middle">{fmt(tot, 2)}</text>
            <text x={xt + step * 0.375} y="562" fontSize="14" fontWeight="600" fill="#142933" textAnchor="middle">Total</text>
            <line x1="70" y1="540" x2="1040" y2="540" stroke="#9AA8B2" />
          </svg>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', paddingTop: 12, borderTop: '1px solid #E9F2F7', fontSize: 15 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="lsn" />LSN <b>{fmt(c.landed_lsn, 2)} CHF</b></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ldn" />LDN planned <b>{fmt(c.landed_ldn_chf, 2)} CHF</b> <span className="mut">({fmt(c.landed_ldn_gbp, 2)} GBP)</span></span>
            <span className="mut">LDN +{fmt(c.landed_ldn_chf - c.landed_lsn, 2)}: UK duty on US goods, higher freight</span>
          </div>
        </section>
        <section className="card" aria-label="Negotiation simulator" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><h2 className="h2">Negotiation simulator</h2><span className="mut" style={{ fontSize: 14 }}>Which price tier does the volume of both sites reach?</span></div>
          <label className="fl">Supplier and item
            <select className="sel" value={pair} onChange={(e) => setPair(e.target.value)}>
              {pairs.map((p) => { const [s, i] = p.split('|'); return <option key={p} value={p}>{m.sups.get(s)!.supplier_name} · {i} {m.items.get(i)!.description.split(',')[0]}</option>; })}
            </select></label>
          <div style={{ display: 'flex', gap: 20, fontSize: 15 }}>
            {(['LSN', 'LDN'] as Site[]).map((s) => <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={sites[s]} onChange={(e) => setSites({ ...sites, [s]: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#0A6FA6' }} />{s} 2027 <span className="mut">{fmt(s === 'LSN' ? vL : vD)} {uom}</span></label>)}
          </div>
          <svg width="660" height="150" viewBox="0 0 660 150" role="img" aria-label="Price tiers and forecast volume" style={{ fontFamily: 'inherit' }}>
            {tiers.map((t, i) => { const a0 = SX(t.min), b0 = i + 1 < tiers.length ? SX(tiers[i + 1].min) : 640; const fill = ['#E9F2F7', '#B4C6D3', '#6F8796', '#47606F'][i] ?? '#47606F'; return <g key={t.min}>
              <rect x={a0} y="50" width={b0 - a0} height="36" fill={fill} /><text x={(a0 + b0) / 2} y="73" fontSize="13" fontWeight="600" textAnchor="middle" fill={i >= 2 ? '#FFFFFF' : '#142933'}>{t.price}</text>
              <text x={(a0 + b0) / 2} y="104" fontSize="12" fill="#666666" textAnchor="middle">T{i}</text><text x={a0} y="122" fontSize="12" fill="#666666" textAnchor="middle">{fmt(t.min)}</text></g>; })}
            <line x1={SX(v)} y1="40" x2={SX(v)} y2="92" stroke="#142933" strokeWidth="2.5" /><path d={`M${SX(v)} 28 l7 7 -7 7 -7 -7z`} fill="#142933" />
            <text x={Math.min(SX(v) + 10, 520)} y="24" fontSize="13" fontWeight="600" fill="#142933">{fmt(v)} {uom}/year</text>
            <text x="20" y="144" fontSize="12" fill="#666666">{m.currency(sup)} per {uom} · paid today {cur} · {contract ? (contract.type === 'none' ? 'no contract' : `contract ${contract.contract_id} ends ${contract.end_date}`) : 'no contract'}</text>
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div className="res"><span className="rl">Price per {uom}</span><span className="rv">{tier.price} <span className="ru">{m.currency(sup)}</span></span><span className="rl">from {cur} today · tier {tiers.indexOf(tier)}</span></div>
            <div className="res" style={{ borderColor: '#36B7F6', background: '#F0F9FE' }}><span className="rl">Annual saving</span><span className="rv">{fmt(save / 1000)} <span className="ru">k CHF</span></span><span className="rl">{fmt(v)} {uom} × {fmt(cur - tier.price, 2)}</span></div>
            <div className="res"><span className="rl">Saving per protein</span><span className="rv">{fmt(save / p27, 2)} <span className="ru">CHF</span></span><span className="rl">over {fmt(p27)} proteins in 2027</span></div>
            <div className="res"><span className="rl">{next ? 'Next tier' : 'Also on the table'}</span><span className="rv">{next ? `+${fmt(next.min - v)}` : alt ? '2nd source' : '—'} <span className="ru">{next ? uom : ''}</span></span><span className="rl">{next ? `would cut the price to ${next.price}` : alt ? `${m.sups.get(alt.supplier_id)!.supplier_name} quotes ${fmt(+alt.unit_price, 2)} ${m.sups.get(alt.supplier_id)!.currency}` : 'top tier reached'}</span></div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn">Add to scenario</button><button className="btn btn-p">Prepare negotiation brief</button></div>
        </section>
      </main>
    </div>
  );
}
