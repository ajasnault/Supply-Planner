import { fmt, monthlyBliCost, quarterlyCogs } from '../engine/derived';
import { Badge, Header, Kpi, Mono, Strip, path } from '../ui/primitives';
import type { ViewProps } from './types';

export function Cogs({ a, site, onSite, nav, openSupplier }: ViewProps) {
  const { m, ref } = a;
  const cogs = ref.cogs as any, neg = ref.negotiation as any, s = ref.summary as any;
  const qs = quarterlyCogs(m);
  const months = monthlyBliCost(m);
  const cpp = a.cpp.BIND_BLI;
  const p27 = cogs.proteins_2027, rec = cogs.savings_recurring_chf;
  const exp = a.exp.I010?.[0];
  const levers = [
    { sup: 'S03', title: 'Lysis Bio contract at top tier', sub: <><Mono>I010</Mono> lysate kit · 290 → 245 EUR/mL</>, save: neg.S03_I010.saving_chf, status: 'No contract today', next: 'Prepare negotiation', by: '2026-12-01' },
    { sup: 'S01', title: 'Helix renewal at tier 3', sub: <><Mono>I001</Mono> fragments · 19.20 → 17.60 USD</>, save: neg.S01_I001.saving_chf, status: 'Contract ends 12-31', next: 'Renew C-2026-01', by: '2026-12-01' },
    { sup: 'S05', title: 'Octane 2027 agreement', sub: <><Mono>I020</Mono> biosensor · 11.50 → 10.40 USD</>, save: neg.S05_I020.saving_chf, status: 'Spot buys today', next: 'Propose agreement', by: '2026-11-23' },
  ];
  const wk4 = m.weeks.filter((w) => w < m.today).slice(-4);
  const weeklyCogs = qs.length ? (cogs.ytd_2026_chf / m.weeks.filter((w) => w.startsWith('2026') && w < m.today).length) : 1;
  void wk4;
  const x0 = 80, x1 = 1020, yb = 330, yt = 20;
  const ymax = Math.ceil(Math.max(...qs.map((q) => q.lsn + q.ldn)) / 2e6) * 2e6;
  const Y = (v: number) => yb - ((yb - yt) * v) / ymax;
  const bw = ((x1 - x0) / qs.length) * 0.62;
  const ti = qs.findIndex((q) => !q.actual);
  const lx0 = 60, lx1 = 640, lyb = 200, lyt = 20;
  const cs = months.map((x) => x.cost);
  const lmin = Math.floor(Math.min(...cs) - 1.5 - rec / p27), lmax = Math.ceil(Math.max(...cs) + 0.5);
  const LX = (i: number) => lx0 + ((lx1 - lx0) * i) / (months.length - 1), LY = (v: number) => lyb - ((lyb - lyt) * (v - lmin)) / (lmax - lmin);
  const mi = months.findIndex((x) => !x.actual);
  const j27 = months.findIndex((x) => x.month === '2027-01');
  const jul = months.findIndex((x) => x.month === '2026-07');

  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={7} eyebrow="COGS & savings" question="What does a protein cost us, and how much can we take out?" site={site} onSite={onSite} nav={nav} />
      <main style={{ flex: 1, padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
        <section aria-label="Key indicators" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16 }}>
          <Kpi label="Material COGS, 2026 to date" value={fmt(cogs.ytd_2026_chf / 1e6, 2)} unit="M CHF" ctx="January → last week, LSN, at prices paid" />
          <Kpi label="BLI cost / protein, now" value={fmt(cs[months.findIndex((x) => x.month === m.today.slice(0, 7))], 2)} unit="CHF" ctx={`${fmt((100 * (cs[months.findIndex((x) => x.month === m.today.slice(0, 7))] - cs[0])) / cs[0], 1)} % since January · landed ${fmt(cpp.landed_lsn, 2)}`} />
          <Kpi label="Material COGS, 2027 forecast" value={fmt(cogs.forecast_2027_chf / 1e6, 1)} unit="M CHF" ctx={`${fmt(p27)} proteins, both sites, current prices`} />
          <Kpi label="Cash in stock" value={fmt(s.inventory_value_chf / 1e6, 2)} unit="M CHF" ctx={`≈ ${fmt(s.inventory_value_chf / weeklyCogs, 1)} weeks of 2026 average material COGS`} />
          <Kpi label="Savings identified" value={fmt(rec / 1e6, 2)} unit="M CHF/year" ctx={`${fmt(rec / p27, 2)} CHF/protein · ${fmt((100 * rec) / cogs.forecast_2027_chf, 1)} % of 2027 COGS`} foot={<Badge kind="warn">0 of 3 signed</Badge>} />
        </section>
        <section style={{ flex: 1, display: 'grid', gridTemplateColumns: '1110px minmax(0, 1fr)', gap: 20, minHeight: 0 }}>
          <div className="card" style={{ padding: '16px 24px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">Material COGS per quarter</h2>
              <span style={{ display: 'flex', gap: 18 }}><span className="lg"><span className="lsn" />LSN</span><span className="lg"><span className="ldn" />LDN</span><span className="lg">solid = actual · light = forecast at current prices</span></span></div>
            <svg width="1060" height="360" viewBox="0 0 1060 360" role="img" aria-label={`Material COGS per quarter: ${qs.map((q) => `${q.label} ${fmt((q.lsn + q.ldn) / 1e6, 1)} M`).join(', ')}`} style={{ fontFamily: 'inherit' }}>
              {[0.25, 0.5, 0.75, 1].map((k) => <line key={k} x1={x0} y1={Y(ymax * k)} x2={x1} y2={Y(ymax * k)} stroke="#E9F2F7" />)}
              {[0, 0.25, 0.5, 0.75, 1].map((k) => <text key={k} x={x0 - 10} y={Y(ymax * k) + 4} fontSize="13" fill="#666666" textAnchor="end">{fmt((ymax * k) / 1e6, 1)}{k === 1 ? ' M CHF' : ''}</text>)}
              {qs.map((q, i) => { const cx = x0 + ((x1 - x0) * (i + 0.5)) / qs.length; const op = q.actual || i === ti ? 1 : 0.45; return <g key={q.label}>
                <rect x={cx - bw / 2} y={Y(q.lsn)} width={bw} height={yb - Y(q.lsn)} fill="#8855FF" fillOpacity={op} />
                {q.ldn > 0 && <rect x={cx - bw / 2} y={Y(q.lsn + q.ldn)} width={bw} height={Y(q.lsn) - Y(q.lsn + q.ldn)} fill="#0F8B8D" fillOpacity={op} />}
                <text x={cx} y={Y(q.lsn + q.ldn) - 8} textAnchor="middle" fontSize="14" fontWeight="600" fill="#142933">{fmt((q.lsn + q.ldn) / 1e6, 1)}</text>
                <text x={cx} y={yb + 20} textAnchor="middle" fontSize="13" fill="#666666">{q.label}</text></g>; })}
              <line x1={x0} y1={yb} x2={x1} y2={yb} stroke="#9AA8B2" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
            <div className="card" style={{ padding: '16px 20px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">BLI cost per protein, monthly</h2><span className="mut" style={{ fontSize: 13 }}>CHF · actual FX to Sep, budget FX after</span></div>
              <svg width="680" height="230" viewBox="0 0 680 230" role="img" aria-label="BLI material cost per protein by month" style={{ fontFamily: 'inherit' }}>
                {[lmin + 1, Math.round((lmin + lmax) / 2), lmax - 1].map((v) => <g key={v}><line x1={lx0} y1={LY(v)} x2={lx1} y2={LY(v)} stroke="#E9F2F7" /><text x={lx0 - 8} y={LY(v) + 4} fontSize="12" fill="#666666" textAnchor="end">{v}</text></g>)}
                <path d={path(cs.slice(0, mi).map((v, i) => [LX(i), LY(v)]))} fill="none" stroke="#142933" strokeWidth="2.2" />
                <path d={path(cs.slice(mi - 1).map((v, i) => [LX(mi - 1 + i), LY(v)]))} fill="none" stroke="#142933" strokeWidth="2.2" strokeDasharray="6 4" />
                <path d={path(cs.slice(j27).map((v, i) => [LX(j27 + i), LY(v - rec / p27)]))} fill="none" stroke="#0A6FA6" strokeWidth="2.2" strokeDasharray="2 3" />
                <text x={LX(cs.length - 1)} y={LY(cs[cs.length - 1] - rec / p27) + 18} fontSize="12" fill="#0A6FA6" textAnchor="end">with the 3 levers signed: {fmt(cs[cs.length - 1] - rec / p27, 2)}</text>
                {jul >= 0 && <><circle cx={LX(jul)} cy={LY(cs[jul])} r="4" fill="#142933" /><text x={LX(jul)} y={LY(cs[jul]) + 22} fontSize="12" fill="#45525B" textAnchor="middle">Helix tier 2 from July</text></>}
                <line x1={lx0} y1={lyb} x2={lx1} y2={lyb} stroke="#9AA8B2" />
                {[0, 6, 12, 18, cs.length - 1].map((i) => <text key={i} x={LX(i)} y={lyb + 18} fontSize="12" fill="#666666" textAnchor="middle">{months[i].month.slice(5) === '01' ? `Jan ${months[i].month.slice(2, 4)}` : new Date(months[i].month + '-01T00:00:00Z').toLocaleString('en', { month: 'short', timeZone: 'UTC' })}</text>)}
              </svg>
            </div>
            <div className="card" style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="h2">Gross margin with Finance</h2><span className="tag">Needs Finance input</span></div>
              <span style={{ fontSize: 15, lineHeight: 1.5 }}>Margin per protein = price − material COGS. Landed material COGS: <b>{fmt(cpp.landed_lsn, 2)} CHF</b> BLI at LSN. Revenue per protein comes from Finance: <Mono>[price per assay]</Mono>.</span>
            </div>
          </div>
        </section>
        <section className="card" aria-label="Savings pipeline" style={{ flex: 'none' }}>
          <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}><h2 className="h2">Savings pipeline</h2><span className="mut" style={{ fontSize: 14 }}>k CHF per year on 2027 volumes · CHF per protein over {fmt(p27)} proteins</span></div>
          <table className="t mt" style={{ tableLayout: 'fixed' }}>
            <thead><tr><th style={{ width: '40%', paddingLeft: 20 }}>Lever</th><th className="r" style={{ width: '12%' }}>Saving</th><th className="r" style={{ width: '10%' }}>CHF/protein</th><th style={{ width: '16%' }}>Status</th><th>Next step</th></tr></thead>
            <tbody>
              {levers.map((l) => <tr key={l.sup} className="clickable" onClick={() => openSupplier(l.sup)}>
                <td style={{ paddingLeft: 20 }}><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 500 }}>{l.title}</span><span className="mut" style={{ fontSize: 13 }}>{l.sub}</span></div></td>
                <td className="r"><b>{fmt(l.save / 1000)}</b><span className="u">k CHF</span></td><td className="r">{fmt(l.save / p27, 2)}</td><td><Badge kind="warn">{l.status}</Badge></td>
                <td><a href="#" onClick={(e) => e.preventDefault()}>{l.next}</a> <span className="mono mut" style={{ fontSize: 13 }}>by {l.by.slice(5)}</span></td></tr>)}
              <tr style={{ background: '#F7FBFE' }}><td style={{ fontWeight: 600, paddingLeft: 20 }}>Recurring total</td><td className="r"><b>{fmt(rec / 1000)}</b><span className="u">k CHF</span></td><td className="r"><b>{fmt(rec / p27, 2)}</b></td><td colSpan={2} className="mut">per year on 2027 volumes</td></tr>
              {exp && <tr><td style={{ paddingLeft: 20 }}><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 500 }}>Avoid I010 write-off</span><span className="mut" style={{ fontSize: 13 }}>lot <Mono>{exp.lot}</Mono>, one-off</span></div></td><td className="r"><b>{fmt(exp.value_chf / 1000)}</b><span className="u">k CHF</span></td><td className="r mut">—</td><td><Badge kind="crit">Expires {exp.expiry.slice(5)}</Badge></td><td><a href="#" onClick={(e) => e.preventDefault()}>Use lot first</a></td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
