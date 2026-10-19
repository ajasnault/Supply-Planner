/** View-level analytics built on the engine model: projections, alerts, chart series, proposals. */
import {
  type Model, type Row, type Site, SITES, addDays, costPerProtein, costPerProteinAt, cogsWeek, days, expiryRisk,
  itemPolicies, londonInitialStock, supplierStats, computeAll,
} from './engine';

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;

export type Status = 'crit' | 'warn' | 'ok';

export function analyze(m: Model) {
  const pol = itemPolicies(m);
  const ref = computeAll(m) as ReturnType<typeof computeAll> & Record<string, any>;
  // supplier delay history (received - promised), days
  const delays = new Map<string, number[]>();
  for (const r of m.ds.purchaseOrders)
    if (r.received_date) {
      if (!delays.has(r.supplier_id)) delays.set(r.supplier_id, []);
      delays.get(r.supplier_id)!.push(days(r.promised_date, r.received_date));
    }
  /** Realistic arrival of an open PO: promised + mean supplier delay; already late → promised + worst delay seen. */
  const realistic = (po: Row) => {
    const d = delays.get(po.supplier_id) ?? [0];
    const late = po.promised_date < m.today;
    const r = addDays(po.promised_date, Math.max(0, Math.round(late ? Math.max(...d) : mean(d))));
    return r < m.today ? m.today : r;
  };
  /** Weekly projected stock (start of week) for an LSN item, open POs at realistic dates. */
  const project = (item: string, weeks = 30, extra: { qty: number; date: string }[] = []) => {
    const p = pol.policies.get(item)!;
    const arrivals = [...p.openPos.map((r) => ({ qty: +r.qty, date: realistic(r) })), ...extra];
    let stock = p.onHand;
    const out: { week: string; start: number }[] = [];
    for (const w of m.future.slice(0, weeks)) {
      stock += sum(arrivals.filter((a) => a.date >= addDays(w, -7) && a.date < w).map((a) => a.qty));
      out.push({ week: w, start: stock });
      stock -= m.use(w, 'LSN').get(item) ?? 0;
    }
    return out;
  };
  /** Order-by date: first week the end-of-week stock falls below safety stock, minus observed lead time. */
  const orderBy = (item: string) => {
    const p = pol.policies.get(item)!;
    if (!p.use) return null;
    const pr = project(item);
    for (let i = 0; i < pr.length; i++) {
      const end = pr[i].start - (m.use(pr[i].week, 'LSN').get(item) ?? 0);
      if (end < p.safetyStock) return addDays(pr[i].week, -Math.round(p.ltObserved * 7));
    }
    return null;
  };
  const exp = expiryRisk(m);
  const expiredLots = pol.expired;
  const noQualified = [...m.pref.keys()].filter((it) => !m.ds.supplierItems.some((r) => r.item_id === it && r.qualification_status === 'qualified'));
  const cycle = m.ds.cycleCounts.map((r) => ({ item: r.item_id, gap: (+r.counted_qty - +r.system_qty) / +r.system_qty, value: (+r.counted_qty - +r.system_qty) * m.priceChf(r.item_id), counted: +r.counted_qty, system: +r.system_qty, date: r.count_date }))
    .filter((c) => Math.abs(c.gap) > 0.05);

  /** Status per item: critical when cover < lead time, an expired lot is available, or no qualified source. */
  const statusOf = (it: string): Status => {
    const p = pol.policies.get(it)!;
    if (noQualified.includes(it)) return 'crit';
    if (expiredLots.some((l) => l.item_id === it)) return 'crit';
    if (p.use && p.cover !== null && p.cover < p.ltObserved) return 'crit';
    if (exp[it] || cycle.some((c) => c.item === it)) return 'warn';
    if (p.use && p.onHand < p.reorderPoint) return 'warn';
    if (p.use && p.cover !== null && p.cover > 20) return 'warn';
    return 'ok';
  };

  const supplierRel = supplierStats(m);
  const cpp = costPerProtein(m);
  const london = londonInitialStock(m);

  // exposure: current LSN proteins/week of assays using an item single-sourced from the supplier
  const cur = Object.fromEntries([...m.bom.keys()].map((a) => [a, m.proteins(m.today, 'LSN', a)]));
  const active = [...pol.policies].filter(([, p]) => p.use > 0).map(([i]) => i);
  const exposure = (s: string) => {
    const single = active.filter((i) => pol.policies.get(i)!.supplier === s && pol.policies.get(i)!.qualifiedSources === 1);
    return sum(Object.entries(cur).filter(([a]) => single.some((i) => m.bom.get(a)!.has(i))).map(([, p]) => p));
  };

  return { m, pol, ref, realistic, project, orderBy, exp, expiredLots, noQualified, cycle, statusOf, supplierRel, cpp, london, exposure, active, delays };
}
export type Analysis = ReturnType<typeof analyze>;

/** Weekly proteins by assay group for a site selection. */
export function demandSeries(m: Model, sites: Site[], from = '2026-04-06', to = '2027-09-27') {
  return m.weeks.filter((w) => w >= from && w <= to).map((w) => {
    const comp = sum(sites.map((s) => m.competition(w, s)));
    const bli = sum(sites.map((s) => m.proteins(w, s, 'BIND_BLI'))) - comp;
    const dev = sum(sites.map((s) => m.proteins(w, s, 'DEVELOP')));
    const all = sum(sites.map((s) => m.proteins(w, s)));
    return { week: w, bli, other: all - bli - dev - comp, dev, comp, actual: w < m.today };
  });
}

export const siteList = (s: 'LSN' | 'LDN' | 'Group'): Site[] => (s === 'Group' ? SITES : [s]);

export function quarterlyCogs(m: Model) {
  const qs: { label: string; lsn: number; ldn: number; actual: boolean }[] = [];
  for (const y of [2026, 2027]) for (let q = 1; q <= 4; q++) {
    const ws = m.weeks.filter((w) => +w.slice(0, 4) === y && Math.floor((+w.slice(5, 7) - 1) / 3) + 1 === q);
    qs.push({ label: `Q${q} ${String(y).slice(2)}`, lsn: sum(ws.map((w) => cogsWeek(m, w, 'LSN'))), ldn: sum(ws.map((w) => cogsWeek(m, w, 'LDN'))), actual: ws.every((w) => w < m.today) });
  }
  return qs;
}

export function monthlyBliCost(m: Model) {
  const months = [...new Set(m.weeks.map((w) => w.slice(0, 7)))].sort();
  return months.map((mo) => ({ month: mo, cost: costPerProteinAt(m, 'BIND_BLI', mo), actual: mo < m.today.slice(0, 7) }));
}

export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, ' ');
export const fmtK = (chf: number, d = 0) => `${fmt(chf / 1000, d)} k`;
export const fmtM = (chf: number, d = 2) => `${fmt(chf / 1e6, d)} M`;
