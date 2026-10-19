import { useState } from 'react';
import { days } from '../engine/engine';
import { demandSeries, fmt, siteList } from '../engine/derived';
import { Header, LeadTimePattern, Mono, Strip, path } from '../ui/primitives';
import type { ViewProps } from './types';
import { UOM } from './Inventory';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const MONTHS: [string, string][] = [['2026-05-04', 'May 2026'], ['2026-07-06', 'Jul'], ['2026-09-07', 'Sep'], ['2026-11-02', 'Nov'], ['2027-01-04', 'Jan 2027'], ['2027-03-01', 'Mar'], ['2027-05-03', 'May'], ['2027-07-05', 'Jul'], ['2027-09-06', 'Sep']];

export function Demand({ a, site, onSite, nav, openItem }: ViewProps) {
  const { m, pol } = a;
  const sites = siteList(site);
  const S = demandSeries(m, sites);
  const N = S.length, ti = Math.max(0, S.findIndex((s) => !s.actual));
  const total = S.map((s) => s.bli + s.other + s.dev + s.comp);
  const ymax = Math.max(3000, Math.ceil(Math.max(...total) / 3000) * 3000);
  const x0 = 70, x1 = 1760, yb = 400, yt = 20;
  const X = (i: number) => x0 + ((x1 - x0) * i) / (N - 1);
  const XD = (d: string) => x0 + ((x1 - x0) * (days(S[0].week, d) / 7)) / (N - 1);
  const Y = (v: number) => yb - ((yb - yt) * v) / ymax;
  const keys = ['bli', 'other', 'dev', 'comp'] as const;
  const cum: number[][] = [S.map(() => 0)];
  for (const k of keys) cum.push(S.map((s, i) => cum[cum.length - 1][i] + s[k]));
  const band = (k: number, a0: number, b0: number) => {
    const pts: [number, number][] = [];
    for (let i = a0; i <= b0; i++) pts.push([X(i), Y(cum[k + 1][i])]);
    for (let i = b0; i >= a0; i--) pts.push([X(i), Y(cum[k][i])]);
    return path(pts) + 'Z';
  };
  const top = (a0: number, b0: number) => path(Array.from({ length: b0 - a0 + 1 }, (_, j) => [X(a0 + j), Y(cum[4][a0 + j])] as [number, number]));
  const cs = S.findIndex((s) => s.comp > 0), ce = S.length - 1 - [...S].reverse().findIndex((s) => s.comp > 0);
  const ctop = cs >= 0 ? Math.min(...S.slice(cs, ce + 1).map((_, j) => Y(cum[4][cs + j]))) : 0;
  const ticks = Array.from({ length: ymax / 3000 + 1 }, (_, i) => i * 3000);

  const active = a.active.filter((i) => (m.use(m.today, 'LSN').get(i) ?? 0) > 0);
  const [item, setItem] = useState('I020');
  const p = pol.policies.get(item)!;
  const need = S.map((s) => sum(sites.map((st) => m.use(s.week, st).get(item) ?? 0)));
  const nice = (v: number) => { const p = 10 ** Math.floor(Math.log10(v)); return [1, 1.5, 2, 3, 4, 5, 6, 8, 10].map((k) => k * p).find((x) => x >= v)!; };
  const smax = nice(Math.max(1, ...need) * 1.05);
  const sx0 = 70, sx1 = 1180, sb = 250, stp = 20;
  const SX = (i: number) => sx0 + ((sx1 - sx0) * i) / (N - 1);
  const SXD = (d: string) => sx0 + ((sx1 - sx0) * (days(S[0].week, d) / 7)) / (N - 1);
  const SY = (v: number) => sb - ((sb - stp) * v) / smax;
  const fut = m.future;
  const n6 = sum(fut.slice(0, 6).map((w) => sum(sites.map((st) => m.use(w, st).get(item) ?? 0))));
  const n26 = sum(fut.slice(0, 26).map((w) => sum(sites.map((st) => m.use(w, st).get(item) ?? 0))));
  const openQ = sum(p.openPos.map((r) => +r.qty));
  const uom = UOM[m.items.get(item)!.uom] ?? m.items.get(item)!.uom;
  const perBli = (m.bom.get('BIND_BLI')!.get(item) ?? 0);
  const sup = m.sups.get(p.supplier)!.supplier_name;
  const ld = XD('2027-01-11'), dv = XD('2027-02-01');
  const ldnJan = sum(m.weeks.filter((w) => w.startsWith('2027-01')).map((w) => m.proteins(w, 'LDN'))) / m.weeks.filter((w) => w.startsWith('2027-01')).length;

  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={2} eyebrow="Demand → supply" question="How many proteins will we produce, and what will they consume?" site={site} onSite={onSite} nav={nav} />
      <main style={{ flex: 1, padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
        <section className="card" aria-label="Proteins per week" style={{ height: 548, flex: 'none', boxSizing: 'border-box', padding: '18px 24px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}><h2 className="h2">Proteins per week, by assay</h2><span className="mut" style={{ fontSize: 14 }}>{site} · April 2026 – September 2027 · actual to W42, forecast after</span></div>
            <div style={{ display: 'flex', gap: 20 }}>
              <span className="lg"><span className="sw" style={{ background: '#22394A' }} />BLI binding</span>
              <span className="lg"><span className="sw" style={{ background: '#6F8796' }} />SPR, Expression, Thermo, Enzyme</span>
              <span className="lg"><span className="sw" style={{ background: '#B4C6D3' }} />DEVELOP (new)</span>
              <span className="lg"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" rx="2" fill="#FFFFFF" stroke="#22394A" /><path d="M0 14L14 0M-4 10L10 -4M4 18L18 4" stroke="#22394A" strokeWidth="1.3" /></svg>Competition (temporary)</span>
              <span className="lg" style={{ paddingLeft: 14, borderLeft: '1px solid #DCE5EC' }}><svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true"><path d="M0 5h14" stroke="#142933" strokeWidth="2" /><path d="M19 5h15" stroke="#142933" strokeWidth="2" strokeDasharray="4 3" /></svg>Actual / forecast</span>
            </div>
          </div>
          <svg width="1790" height="440" viewBox="0 0 1790 440" role="img" aria-label={`Stacked proteins per week for ${site}, ending at ${fmt(total[N - 1])} per week`} style={{ fontFamily: 'inherit' }}>
            <defs><pattern id="d2comp" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#FFFFFF" /><line x1="0" y1="0" x2="0" y2="7" stroke="#22394A" strokeWidth="1.6" /></pattern></defs>
            <g stroke="#E9F2F7">{ticks.slice(1).map((v) => <line key={v} x1={x0} y1={Y(v)} x2={x1} y2={Y(v)} />)}</g>
            <g fontSize="13" fill="#666666" textAnchor="end">{ticks.map((v) => <text key={v} x="60" y={Y(v) + 4}>{fmt(v)}</text>)}</g>
            <text x="0" y="0" fontSize="13" fill="#666666" transform="translate(14 210) rotate(-90)" textAnchor="middle">proteins/week</text>
            <path d={band(0, 0, ti)} fill="#22394A" /><path d={band(1, 0, ti)} fill="#6F8796" />
            <g opacity="0.42"><path d={band(0, ti, N - 1)} fill="#22394A" /><path d={band(1, ti, N - 1)} fill="#6F8796" /></g>
            <path d={band(2, ti, N - 1)} fill="#B4C6D3" />
            {cs >= 0 && <><path d={band(3, cs, Math.max(cs, ti))} fill="url(#d2comp)" stroke="#22394A" /><path d={band(3, ti, ce)} fill="url(#d2comp)" stroke="#22394A" strokeDasharray="4 3" opacity="0.8" /></>}
            <path d={top(0, ti)} fill="none" stroke="#142933" strokeWidth="2" /><path d={top(ti, N - 1)} fill="none" stroke="#142933" strokeWidth="2" strokeDasharray="6 4" />
            <line x1={x0} y1={yb} x2={x1} y2={yb} stroke="#9AA8B2" />
            <g fontSize="13" fill="#666666" textAnchor="middle">{MONTHS.map(([d, l]) => <text key={d} x={XD(d)} y="424">{l}</text>)}</g>
            {cs >= 0 && <g>
              <line x1={X(cs)} y1={ctop - 20} x2={X(ce)} y2={ctop - 20} stroke="#142933" /><line x1={X(cs)} y1={ctop - 26} x2={X(cs)} y2={ctop - 14} stroke="#142933" /><line x1={X(ce)} y1={ctop - 26} x2={X(ce)} y2={ctop - 14} stroke="#142933" />
              <text x={(X(cs) + X(ce)) / 2} y={ctop - 30} fontSize="14" fontWeight="600" fill="#142933" textAnchor="middle">Competition ≈ 350/week</text>
              <text x={(X(cs) + X(ce)) / 2} y={ctop - 48} fontSize="13" fill="#666666" textAnchor="middle">temporary · not customer demand</text></g>}
            <line x1={X(ti)} y1="20" x2={X(ti)} y2="400" stroke="#0A6FA6" strokeWidth="2" /><text x={X(ti) + 6} y="34" fontSize="13" fontWeight="600" fill="#0A6FA6">Today · W43</text>
            {site !== 'LSN' && <><line x1={ld} y1="150" x2={ld} y2="400" stroke="#0F8B8D" strokeWidth="1.5" strokeDasharray="3 3" /><circle cx={ld} cy="150" r="6" fill="#0F8B8D" /><text x={ld - 10} y="140" fontSize="13" fill="#142933" textAnchor="end">LDN opens · ≈ {fmt(Math.round(ldnJan / 10) * 10)}/week</text></>}
            {site !== 'LDN' && <><line x1={dv} y1="110" x2={dv} y2="400" stroke="#142933" strokeWidth="1.5" strokeDasharray="3 3" /><text x={dv + 8} y="114" fontSize="13" fill="#142933">DEVELOP launch (LSN)</text></>}
            <text x="1752" y={Y(total[N - 1]) - 10} fontSize="14" fontWeight="600" fill="#142933" textAnchor="end">{fmt(Math.round(total[N - 1] / 10) * 10)} /week</text>
          </svg>
        </section>
        <section style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 560px', gap: 24, minHeight: 0 }}>
          <div className="card" style={{ padding: '16px 24px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label htmlFor="d2item" style={{ fontSize: 18, fontWeight: 500 }}>Need for item</label>
                <select id="d2item" className="sel" style={{ minWidth: 360 }} value={item} onChange={(e) => setItem(e.target.value)}>
                  {active.map((i) => <option key={i} value={i}>{i} · {m.items.get(i)!.description}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <span className="lg"><svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true"><path d="M0 5h14" stroke="#0A6FA6" strokeWidth="2" /><path d="M19 5h15" stroke="#0A6FA6" strokeWidth="2" strokeDasharray="4 3" /></svg>{uom}/week needed, {site}</span>
                <span className="lg"><svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true"><defs><LeadTimePattern id="d2lgl" /></defs><rect width="18" height="14" fill="url(#d2lgl)" /></svg>Supplier lead time</span>
              </div>
            </div>
            <svg width="1210" height="272" viewBox="0 0 1210 272" role="img" aria-label={`Weekly need for ${item}`} style={{ fontFamily: 'inherit' }}>
              <defs><LeadTimePattern id="d2lt" /></defs>
              <rect x={SX(ti)} y="20" width={SX(ti + p.ltObserved) - SX(ti)} height="230" fill="url(#d2lt)" />
              <text x={SX(ti + p.ltObserved) + 6} y="34" fontSize="13" fill="#45525B">Lead time {fmt(p.ltObserved, 1)} wk (real)</text>
              <text x={SX(ti + p.ltObserved) + 6} y="50" fontSize="13" fill="#666666">already committed</text>
              <g stroke="#E9F2F7">{[1, 2, 3].map((k) => <line key={k} x1={sx0} y1={SY((smax * k) / 3)} x2={sx1} y2={SY((smax * k) / 3)} />)}</g>
              <g fontSize="13" fill="#666666" textAnchor="end">{[0, 1, 2, 3].map((k) => <text key={k} x="60" y={SY((smax * k) / 3) + 4}>{fmt((smax * k) / 3, smax < 30 ? 1 : 0)}</text>)}</g>
              <path d={path(need.slice(0, ti + 1).map((v, i) => [SX(i), SY(v)]))} fill="none" stroke="#0A6FA6" strokeWidth="2.2" />
              <path d={path(need.slice(ti).map((v, i) => [SX(ti + i), SY(v)]))} fill="none" stroke="#0A6FA6" strokeWidth="2.2" strokeDasharray="6 4" />
              <line x1={SX(ti)} y1="20" x2={SX(ti)} y2="250" stroke="#0A6FA6" strokeWidth="1.5" />
              <line x1={sx0} y1={sb} x2={sx1} y2={sb} stroke="#9AA8B2" />
              <g fontSize="13" fill="#666666" textAnchor="middle">{MONTHS.map(([d, l]) => <text key={d} x={SXD(d)} y="268">{l}</text>)}</g>
            </svg>
          </div>
          <aside className="card" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column' }} aria-label={`${item} consumption summary`}>
            <h2 className="h2" style={{ marginBottom: 4 }}>What <Mono>{item}</Mono> needs</h2>
            <span className="mut" style={{ fontSize: 14, marginBottom: 6 }}>{perBli ? `${fmt(perBli, 2)} ${uom} per BLI protein · ` : ''}{sup}</span>
            <div className="row"><span>Need now</span><span><b>{fmt(need[ti])}</b> <span className="mut">{uom}/week</span></span></div>
            <div className="row"><span>Need inside lead time (6 wk)</span><span><b>{fmt(n6)}</b> <span className="mut">{uom}</span></span></div>
            <div className="row"><span>Need next 26 weeks, {site}</span><span><b>{fmt(n26)}</b> <span className="mut">{uom}</span></span></div>
            <div className="row"><span>On hand + open orders (LSN)</span><span><b>{fmt(p.onHand)} + {fmt(openQ)}</b> <span className="mut">{uom}</span></span></div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12 }}>
              <button className="btn" onClick={() => openItem(item)}>Open item detail</button><button className="btn btn-p">Plan next order</button>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
