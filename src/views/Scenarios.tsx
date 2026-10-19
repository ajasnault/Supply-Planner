import { useMemo, useState } from 'react';
import type { Site } from '../engine/engine';
import { type Analysis, type Status, fmt } from '../engine/derived';
import { BASE_DEVELOP, type ScenarioParams, baseParams, runScenario, summarize } from '../engine/scenario';
import { Badge, Logo, Mono, SiteDot, SiteSelector, type SiteSel, Strip, path } from '../ui/primitives';

const RANK: Record<Status, number> = { ok: 0, warn: 1, crit: 2 };

/** Admin screen (1440 wide): what-if on throughput, London opening, DEVELOP launch and one supplier's lead time. */
export function Scenarios({ a, site, onSite, onBack, openItem }: { a: Analysis; site: SiteSel; onSite: (s: SiteSel) => void; onBack: () => void; openItem: (i: string) => void }) {
  const { m } = a;
  const base = useMemo(() => summarize(a, baseParams()), [a]);
  const [draft, setDraft] = useState<ScenarioParams>({ ...baseParams(), name: 'S-01 · Octane slip, LSN ×1.3, LDN +4 wk', multiplier: { LSN: 1.3, LDN: 1 }, londonShiftWeeks: 4, developLaunch: '2027-03-01', leadTime: { supplier: 'S05', weeks: 9 } });
  const [ran, setRan] = useState<{ p: ScenarioParams; s: ReturnType<typeof summarize>; at: string } | null>(null);
  const run = () => { const s = summarize(runScenario(m, draft), draft); setRan({ p: { ...draft }, s, at: new Date().toTimeString().slice(0, 5) }); };
  const sc = ran?.s;
  const suppliers = [...new Set([...a.pol.policies.values()].map((p) => p.supplier))].sort();
  const obsLt = (s: string) => a.supplierRel[s]?.actual_weeks ?? null;
  const set = (patch: Partial<ScenarioParams>) => setDraft({ ...draft, ...patch });

  const changes = sc ? Object.keys(base.status).filter((i) => base.status[i] !== sc.status[i]).map((i) => ({ i, from: base.status[i], to: sc.status[i] }))
    .sort((x, y) => RANK[y.to] - RANK[x.to] || (x.i < y.i ? -1 : 1)) : [];
  const newCrit = changes.filter((c) => RANK[c.to] > RANK[c.from]).length;
  const better = changes.filter((c) => RANK[c.to] < RANK[c.from]).length;

  // chart: projected stock value, 26 weeks
  const vals = [...base.value, ...(sc?.value ?? [])];
  const vmin = Math.floor((Math.min(...vals) / 1e6) * 10) / 10, vmax = Math.ceil((Math.max(...vals) / 1e6) * 10) / 10 + 0.1;
  const X = (k: number) => 60 + (k * 890) / 25, Y = (v: number) => 170 - ((v / 1e6 - vmin) * 150) / (vmax - vmin);
  const ticks = [vmin, (vmin + vmax) / 2, vmax];
  const wkLabel = (k: number) => m.future[k]?.slice(5) ?? '';

  const card = (label: string, b: React.ReactNode, s: React.ReactNode, foot: React.ReactNode) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px' }}>
      <span style={{ fontSize: 14, color: '#45525B', fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="eyebrow" style={{ fontSize: 12 }}>Base</span><span style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{b}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="eyebrow" style={{ fontSize: 12, color: '#0A6FA6' }}>Scenario</span><span style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{sc ? s : <span className="mut">—</span>}</span></div>
      </div>
      <span style={{ fontSize: 14 }}>{sc ? foot : <span className="mut">Run the scenario to compare</span>}</span>
    </div>
  );
  const sub = (s: string) => <span style={{ fontSize: 15, color: '#666666' }}>{s}</span>;
  const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: '#666666' };
  const inp: React.CSSProperties = { height: 38, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #C8D3DC', borderRadius: 8, background: '#FFFFFF', fontSize: 14, color: '#142933' };
  const sec: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 0', borderTop: '1px solid #E9F2F7' };

  return (
    <div className="sp" style={{ width: 1440, height: 1000, background: '#F7FBFE', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Strip px={28} right={<span className="mono">Base: dataset of 2026-10-19 · scenarios run on a copy</span>} />
      <header style={{ height: 64, flex: 'none', display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', background: '#FFFFFF', borderBottom: '1px solid #DCE5EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Logo /><span style={{ fontSize: 16, fontWeight: 600 }}>Supply Planner</span><span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', border: '1px solid #C8D3DC', borderRadius: 4, color: '#45525B' }}>ADMIN</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}><span className="eyebrow" style={{ fontSize: 12 }}>Scenarios</span><span style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' }}>What if…?</span></div>
        <SiteSelector site={site} onSite={onSite} height={40} />
        <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }} style={{ fontSize: 14 }}>Back to presentation</a>
      </header>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px minmax(0, 1fr)', minHeight: 0 }}>
        <aside aria-label="Scenario parameters" style={{ background: '#FFFFFF', borderRight: '1px solid #DCE5EC', padding: '20px 24px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <label style={{ ...lbl, paddingBottom: 16 }} htmlFor="scName">Scenario name<input id="scName" style={inp} value={draft.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <div style={sec}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Throughput multiplier, from today</span>
            {(['LSN', 'LDN'] as Site[]).map((s) => (
              <div key={s} style={{ display: 'grid', gridTemplateColumns: '70px minmax(0, 1fr) 64px', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <label htmlFor={`mul${s}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SiteDot site={s} />{s}</label>
                <input id={`mul${s}`} type="range" min="0.5" max="2" step="0.05" value={draft.multiplier[s]} onChange={(e) => set({ multiplier: { ...draft.multiplier, [s]: +e.target.value } })} style={{ accentColor: '#0A6FA6', width: '100%' }} />
                <span className="mono" style={{ textAlign: 'right', fontWeight: 500 }}>{draft.multiplier[s].toFixed(2)}×</span>
              </div>))}
          </div>
          <div style={sec}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>London opening</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', border: '1px solid #C8D3DC', borderRadius: 8, overflow: 'hidden' }}>
                <button aria-label="One week earlier" onClick={() => set({ londonShiftWeeks: draft.londonShiftWeeks - 1 })} style={{ width: 40, height: 38, border: 0, background: '#FFFFFF', fontSize: 18 }}>−</button>
                <span className="mono" style={{ width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #C8D3DC', borderRight: '1px solid #C8D3DC', fontSize: 14, fontWeight: 500 }}>{draft.londonShiftWeeks >= 0 ? '+' : ''}{draft.londonShiftWeeks} wk</span>
                <button aria-label="One week later" onClick={() => set({ londonShiftWeeks: draft.londonShiftWeeks + 1 })} style={{ width: 40, height: 38, border: 0, background: '#FFFFFF', fontSize: 18 }}>+</button>
              </div>
              <span style={{ fontSize: 14 }}>→ <Mono>{new Date(Date.parse('2027-01-11') + draft.londonShiftWeeks * 7 * 864e5).toISOString().slice(0, 10)}</Mono> <span className="mut">(base 01-11)</span></span>
            </div>
          </div>
          <div style={sec}>
            <label htmlFor="scDev" style={{ fontSize: 14, fontWeight: 600 }}>DEVELOP launch (LSN)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input id="scDev" type="date" className="mono" style={{ ...inp, width: 170 }} value={draft.developLaunch} onChange={(e) => e.target.value && set({ developLaunch: e.target.value })} /><span className="mut" style={{ fontSize: 14 }}>base <Mono>{BASE_DEVELOP}</Mono></span></div>
          </div>
          <div style={sec}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Forced supplier lead time</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 100px', gap: 10 }}>
              <label style={lbl}>Supplier<select style={inp} value={draft.leadTime?.supplier ?? ''} onChange={(e) => set({ leadTime: e.target.value ? { supplier: e.target.value, weeks: draft.leadTime?.weeks ?? Math.ceil((obsLt(e.target.value) ?? 4) + 2) } : null })}>
                <option value="">None</option>{suppliers.map((s) => <option key={s} value={s}>{m.sups.get(s)!.supplier_name}</option>)}</select></label>
              <label style={lbl}>Weeks<input type="number" min="0.5" max="26" step="0.5" style={inp} disabled={!draft.leadTime} value={draft.leadTime?.weeks ?? ''} onChange={(e) => draft.leadTime && set({ leadTime: { ...draft.leadTime, weeks: +e.target.value } })} /></label>
            </div>
            {draft.leadTime && <span className="mut" style={{ fontSize: 13 }}>Base: {fmt(obsLt(draft.leadTime.supplier) ?? 0, 1)} wk actual · {fmt(a.supplierRel[draft.leadTime.supplier]?.quoted_weeks ?? 0, 1)} wk quoted</span>}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#45525B', background: '#F7FBFE', padding: '10px 12px', borderRadius: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              <span>Runs on a copy. Base data is never modified.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}><button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setDraft(baseParams()); setRan(null); }}>Reset to base</button><button className="btn btn-p" style={{ flex: 1, justifyContent: 'center' }} onClick={run}>Run scenario</button></div>
          </div>
        </aside>
        <main style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}><h2 className="h2">Base vs {ran ? ran.p.name : 'scenario'}</h2><span className="mut" style={{ fontSize: 13 }}>{ran ? `Last run ${ran.at} · 26-week horizon · LSN policy, both sites for COGS` : 'Set parameters, then run'}</span></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {card('Critical items', base.crit, sc?.crit, sc && <>{sc.crit - base.crit >= 0 ? '+' : ''}{sc.crit - base.crit} · watch {base.watch} → {sc.watch}</>)}
            {card('Cash at reorder point', <>{fmt(base.policyCash / 1e6, 2)} {sub('M CHF')}</>, sc && <>{fmt(sc.policyCash / 1e6, 2)} {sub('M CHF')}</>, sc && <>{sc.policyCash >= base.policyCash ? '+' : ''}{fmt((sc.policyCash - base.policyCash) / 1000)} k CHF of stock to hold</>)}
            {card('Material cost / protein, 2027 · all assays', <>{fmt(base.costPerProtein, 2)} {sub('CHF')}</>, sc && <>{fmt(sc.costPerProtein, 2)} {sub('CHF')}</>, sc && <>{fmt(sc.prot27)} proteins · COGS {fmt(sc.cogs27 / 1e6, 1)} M CHF (base {fmt(base.cogs27 / 1e6, 1)})</>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: '12px 18px', display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}><SiteDot site="LDN" /><span>London go-live <Mono>{sc?.goLive ?? base.goLive}</Mono> · first order by <Mono>{sc?.firstLondon ?? base.firstLondon}</Mono> · initial stock {fmt((sc?.londonCash ?? base.londonCash) / 1000)} k CHF</span></div>
            <div className="card" style={{ padding: '12px 18px', display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}><SiteDot site="LSN" /><span>DEVELOP launch <Mono>{sc?.developLaunch ?? base.developLaunch}</Mono> · SEC/CE-SDS order by <Mono>{sc?.developOrderBy ?? base.developOrderBy}</Mono></span></div>
          </div>
          <div className="card" style={{ padding: '14px 18px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Projected stock value, 26 weeks, no new orders</h3>
              <span style={{ display: 'flex', gap: 16, fontSize: 13, color: '#45525B' }}><span>━ Base</span><span style={{ color: '#0A6FA6' }}>╍ Scenario</span></span></div>
            <svg width="960" height="200" viewBox="0 0 960 200" role="img" aria-label="Projected stock value over 26 weeks, base and scenario" style={{ fontFamily: 'inherit' }}>
              {ticks.map((t) => <g key={t}><line x1="60" y1={Y(t * 1e6)} x2="950" y2={Y(t * 1e6)} stroke="#E9F2F7" /><text x="52" y={Y(t * 1e6) + 4} fontSize="12" fill="#666666" textAnchor="end">{t.toFixed(1)}{t === vmax ? ' M' : ''}</text></g>)}
              <path d={path(base.value.map((v, k) => [X(k), Y(v)]))} fill="none" stroke="#142933" strokeWidth="2" />
              {sc && <path d={path(sc.value.map((v, k) => [X(k), Y(v)]))} fill="none" stroke="#0A6FA6" strokeWidth="2.5" strokeDasharray="6 4" />}
              <line x1="60" y1="170" x2="950" y2="170" stroke="#9AA8B2" />
              {[0, 4, 8, 12, 16, 20, 24].map((k) => <text key={k} x={X(k)} y="188" fontSize="12" fill="#666666" textAnchor="middle">{wkLabel(k)}</text>)}
            </svg>
          </div>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Items whose status changes</h3><span className="mut" style={{ fontSize: 13 }}>{sc ? `${newCrit} worse · ${better} better` : '—'}</span></div>
            <div style={{ overflow: 'auto' }}>
              {sc && changes.length === 0 && <div className="mut" style={{ padding: '0 18px 12px', fontSize: 14 }}>No item changes status in this scenario.</div>}
              {changes.map((c) => { const p = a.pol.policies.get(c.i)!; return (
                <div key={c.i} style={{ display: 'grid', gridTemplateColumns: '110px 260px minmax(0,1fr) 120px', alignItems: 'center', gap: 12, height: 46, borderTop: '1px solid #E9F2F7', fontSize: 14, padding: '0 18px' }}>
                  <Badge kind={c.to}>{RANK[c.to] > RANK[c.from] ? (c.to === 'crit' ? 'New critical' : 'New watch') : 'Better'}</Badge>
                  <span><Mono>{c.i}</Mono> {m.items.get(c.i)!.description.slice(0, 28)}</span>
                  <span className="mut">{m.sups.get(p.supplier)!.supplier_name} · base {c.from === 'crit' ? 'critical' : c.from === 'warn' ? 'watch' : 'OK'}</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); openItem(c.i); }} style={{ textAlign: 'right' }}>Open base detail</a>
                </div>); })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
