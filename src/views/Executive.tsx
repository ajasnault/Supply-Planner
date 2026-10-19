import { addDays, days } from '../engine/engine';
import { fmt } from '../engine/derived';
import { Badge, Header, Kpi, Mono, Strip } from '../ui/primitives';
import type { ViewProps } from './types';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

export function Executive({ a, site, onSite, nav, openItem, openSupplier }: ViewProps) {
  const { m, ref, pol } = a;
  const s = ref.summary as any;
  const cpp = a.cpp.BIND_BLI;
  const i020 = pol.policies.get('I020')!;
  const late = i020.openPos.filter((r) => r.promised_date < m.today).sort((x, y) => (x.promised_date < y.promised_date ? -1 : 1))[0];
  const runOut = addDays(m.today, Math.floor((i020.onHand / i020.use) * 7));
  const exp = a.exp.I010?.[0];
  const neg = ref.negotiation as any;
  const lysis = a.supplierRel.S03;
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const spark = months.map((mo) => { const ws = m.weeks.filter((w) => w.startsWith(mo) && w < m.today); return sum(ws.map((w) => m.proteins(w, 'LSN'))) / Math.max(1, ws.length); });
  const mx = Math.max(...spark), mn = Math.min(...spark);
  const sp = spark.map((v, i) => `${i ? 'L' : 'M'}${(2 + i * 18.4).toFixed(1)},${(20 - ((v - mn) / (mx - mn)) * 16).toFixed(1)}`).join(' ');
  const lateDays = late ? days(late.promised_date, m.today) : 0;

  const alerts = [
    { kind: 'crit' as const, obj: <><Mono>I020</Mono> BLI biosensor, SA</>, sub: 'Octane Biosensors · single source', onOpen: () => openItem('I020'),
      issue: <>{fmt(i020.cover!, 1)} weeks of cover vs {fmt(i020.ltObserved, 1)}-week real lead time{late && <>; <Mono>{late.po_id}</Mono> is {lateDays} days late</>}.</>,
      impact: `Runs out ≈ ${runOut} if open orders slip · ${fmt(m.proteins(m.today, 'LSN', 'BIND_BLI'), 0)} BLI proteins/week`, act: 'Today', overdue: true, actions: ['Open I020', 'Escalate with Octane'] },
    ...a.expiredLots.map((l) => ({ kind: 'crit' as const, obj: <><Mono>{l.item_id}</Mono> {m.items.get(l.item_id)!.description.split(',')[0]}</>, sub: <>lot <Mono>{l.lot_id}</Mono></>, onOpen: () => openItem(l.item_id),
      issue: <>Lot expired {l.expiry_date} but is still “{l.status}” ({fmt(+l.qty_on_hand)} {m.items.get(l.item_id)!.uom === 'ug' ? 'µg' : m.items.get(l.item_id)!.uom}).</>, impact: 'Expired material could enter customer runs', act: 'Today', overdue: true, actions: ['Quarantine lot'] })),
    { kind: 'crit' as const, obj: <><Mono>{a.noQualified.join(' · ')}</Mono> DEVELOP</>, sub: 'Chromalytix · quote only, 56-day lead time', onOpen: () => openItem('I060'),
      issue: <>No qualified supplier for the SEC column and CE-SDS cartridge.</>, impact: 'DEVELOP launch at LSN on 2027-02-01 · order by 2026-12-07', act: '2026-11-09', overdue: false, actions: ['Find 2nd quote', 'Start qualification'] },
    ...(exp ? [{ kind: 'warn' as const, obj: <><Mono>I010</Mono> Lysate expression kit</>, sub: <>Lysis Bio · lot <Mono>{exp.lot}</Mono></>, onOpen: () => openItem('I010'),
      issue: <>≈ {fmt(exp.qty)} mL expire unused on {exp.expiry} with first-expiry-first-out use.</>, impact: `Projected write-off ≈ ${fmt(exp.value_chf / 1000)} k CHF`, act: addDays(m.today, 7), overdue: false, actions: ['Ask for exchange', 'Use lot first'] }] : []),
    { kind: 'warn' as const, obj: <>Lysis Bio</>, sub: <><Mono>I010 · I011</Mono> · no contract</>, onOpen: () => openSupplier('S03'),
      issue: <>Largest reagent spend ({fmt(lysis.annual_spend_kchf / 1000, 2)} M CHF/year) bought at list price, no agreement.</>, impact: `2027 volume reaches the 12 000 mL tier · ≈ ${fmt(neg.S03_I010.saving_chf / 1000)} k CHF/year`, act: '2026-12-01', overdue: false, actions: ['Prepare negotiation'] },
  ].slice(0, 5);

  const X = (d: string) => 40 + (days(m.today, d) * 1720) / 119;
  const ev: [string, 'crit' | 'warn', string, boolean][] = [[m.today, 'crit', 'I020 escalation', false], [addDays(m.today, 7), 'warn', 'I010 lot plan', true], ['2026-11-09', 'crit', 'DEVELOP qualification', false], ['2026-11-23', 'warn', 'First LDN orders', false], ['2026-12-07', 'crit', 'I060/I061 order-by', true], ['2026-12-31', 'warn', 'Helix contract ends', false]];
  const xl = X('2027-01-11'), xd = X('2027-02-01'), xc = X('2026-12-14');

  return (
    <div className="sp" style={{ width: 1920, height: 1080, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip />
      <Header num={1} eyebrow="Executive summary" question="Where do we stand, and what needs a decision this month?" site={site} onSite={onSite} nav={nav} />
      <main style={{ flex: 1, padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
        <section aria-label="Key indicators" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16 }}>
          <Kpi label="Material cost / protein" value={fmt(cpp.material, 2)} unit="CHF" ctx="BLI assay · LSN · prices paid" foot={<span>+{fmt(cpp.landed_lsn - cpp.material, 2)} landed → <b>{fmt(cpp.landed_lsn, 2)}</b></span>} />
          <Kpi label="Inventory value" value={fmt(s.inventory_value_chf / 1e6, 2)} unit="M CHF" ctx="On hand at LSN, purchase price" foot={<span>+ {fmt(sum(s.expired_lots.map((l: any) => l.value_chf)) / 1000, 1)} k CHF in an expired lot</span>} />
          <Kpi label="Stock at expiry risk" value={fmt(sum(Object.values(a.exp).flat().map((x) => x.value_chf)) / 1000)} unit="k CHF" ctx={exp ? <><Mono>I010</Mono> lot <Mono>{exp.lot}</Mono> · {exp.expiry}</> : 'Next 26 weeks'} foot={<Badge kind="warn">Watch · ≈ {fmt(exp?.qty ?? 0)} mL</Badge>} />
          <Kpi label="Items below reorder point" value={s.below_reorder_point.length} unit={`of ${s.active_items} items`} ctx={`${s.cover_below_lead_time.length} with cover shorter than lead time`} foot={<Badge kind="crit">{s.cover_below_lead_time.length} critical</Badge>} />
          <Kpi label="Single-source items" value={s.single_source_items} unit={`of ${s.active_items} items`} ctx="10 suppliers, 1 with a qualified alternate" foot={<span>3 second sources in qualification</span>} />
          <Kpi label="Throughput" value={fmt(Math.round(s.lsn_throughput_4wk_avg / 10) * 10)} unit="proteins/week" ctx="LSN · 4-week average"
            foot={<><span>incl. ≈ {fmt(Math.round(s.competition_4wk_avg / 10) * 10)} competition</span><svg width="96" height="24" viewBox="0 0 96 24" aria-hidden="true"><path d={sp} fill="none" stroke="#8855FF" strokeWidth="1.6" /><rect x="91.5" y="1.5" width="5" height="5" fill="#8855FF" /></svg></>} />
        </section>

        <section className="card" aria-label="Decisions this month" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}><h2 className="h2">Decisions this month</h2><span className="mut" style={{ fontSize: 14 }}>5 most severe open alerts · severity, then act-by date</span></div>
          </div>
          {alerts.map((al, i) => (
            <div className="al" key={i}>
              <Badge kind={al.kind} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); al.onOpen(); }} style={{ fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>{al.obj}</a>
                <span className="mut" style={{ fontSize: 14 }}>{al.sub}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontSize: 16 }}>{al.issue}</span><span className="mut" style={{ fontSize: 14 }}>{al.impact}</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span className="mut" style={{ fontSize: 13 }}>Act by</span>
                {al.overdue ? <span style={{ fontSize: 16, fontWeight: 600, color: '#8E1B12' }}>{al.act}</span> : <span className="mono" style={{ fontSize: 16, fontWeight: 500 }}>{al.act}</span>}</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {al.actions.map((t, j) => <button key={t} className={`btn${j === al.actions.length - 1 ? ' btn-p' : ''}`} onClick={j === 0 && t.startsWith('Open') ? al.onOpen : undefined}>{t}</button>)}
              </div>
            </div>
          ))}
        </section>

        <section className="card" aria-label="Upcoming milestones" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px 8px', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><h2 className="h2">Next 17 weeks</h2><span className="mut" style={{ fontSize: 14 }}>Today → London opening → DEVELOP launch</span></div>
          <svg width="1790" height="150" viewBox="0 0 1790 150" role="img" aria-label="Timeline to London opening on 2027-01-11 and DEVELOP launch on 2027-02-01" style={{ fontFamily: 'inherit' }}>
            <rect x="40" y="56" width={xc - 40} height="8" fill="#22394A" opacity="0.2" />
            <text x="48" y="48" fontSize="13" fill="#666666">Competition peak, ≈ 350 extra BLI proteins/week, until 2026-12-14</text>
            <line x1="40" y1="90" x2="1760" y2="90" stroke="#9AA8B2" />
            <g fontSize="13" fill="#666666">{[['2026-11-01', 'Nov'], ['2026-12-01', 'Dec'], ['2027-01-01', 'Jan 2027'], ['2027-02-01', 'Feb']].map(([d, l]) => (
              <g key={d}><line x1={X(d)} y1="86" x2={X(d)} y2="94" stroke="#9AA8B2" /><text x={X(d)} y="142" textAnchor="middle">{l}</text></g>))}</g>
            <line x1="40" y1="20" x2="40" y2="104" stroke="#0A6FA6" strokeWidth="2" /><text x="46" y="20" fontSize="13" fontWeight="600" fill="#0A6FA6">Today</text>
            {ev.map(([d, k, l, up]) => (
              <g key={l}>{k === 'crit' ? <path d={`M${X(d) - 6} 83 h4 l4 0 l2 2 v8 l-2 2 h-8 l-2 -2 v-8z`} fill="#EF4444" /> : <path d={`M${X(d)} 83 l7 12 h-14z`} fill="#FFBB00" />}
                <text x={X(d)} y={up ? 76 : 118} fontSize="13" fill="#142933" textAnchor={d === m.today || (up && d !== '2026-12-07') ? 'start' : 'middle'}>{l}</text></g>))}
            <line x1={xl} y1="30" x2={xl} y2="90" stroke="#0F8B8D" strokeWidth="2" /><circle cx={xl} cy="90" r="8" fill="#0F8B8D" />
            <text x={xl + 10} y="36" fontSize="15" fontWeight="600" fill="#142933">London opens</text><text x={xl + 10} y="54" fontSize="13" fill="#666666">2027-01-11</text>
            <line x1={xd} y1="30" x2={xd} y2="90" stroke="#142933" strokeWidth="2" /><rect x={xd - 7} y="83" width="14" height="14" fill="#142933" />
            <text x={xd + 10} y="36" fontSize="15" fontWeight="600" fill="#142933">DEVELOP launch</text><text x={xd + 10} y="54" fontSize="13" fill="#666666">2027-02-01 · LSN</text>
          </svg>
        </section>
      </main>
    </div>
  );
}
