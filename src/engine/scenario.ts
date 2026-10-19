/**
 * Scenario engine. A scenario never modifies the base data: it builds a transformed copy of the
 * demand table and a new model, then runs the same analysis on it.
 */
import { type Dataset, type Model, type Site, addDays, buildModel, cogsWeek } from './engine';
import { type Analysis, analyze } from './derived';

export interface ScenarioParams {
  name: string;
  multiplier: Record<Site, number>; // applied to future demand of each site
  londonShiftWeeks: number;         // London opening (and all its demand) moves by N weeks
  developLaunch: string;            // DEVELOP launch date at LSN (base 2027-02-01)
  leadTime: { supplier: string; weeks: number } | null; // forced lead time for one supplier
}

export const BASE_GO_LIVE = '2027-01-11';
export const BASE_DEVELOP = '2027-02-01';
export const baseParams = (): ScenarioParams => ({ name: 'Base', multiplier: { LSN: 1, LDN: 1 }, londonShiftWeeks: 0, developLaunch: BASE_DEVELOP, leadTime: null });

const weeksBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (7 * 864e5));

export function scenarioDataset(ds: Dataset, p: ScenarioParams, today: string): Dataset {
  const devShift = weeksBetween(BASE_DEVELOP, p.developLaunch);
  const demand = ds.demand.map((r) => {
    let week = r.week_start;
    let proteins = +r.proteins;
    if (week >= today) proteins *= p.multiplier[r.site_id as Site] ?? 1;
    if (r.site_id === 'LDN') week = addDays(week, 7 * p.londonShiftWeeks);
    if (r.assay_id === 'DEVELOP') week = addDays(week, 7 * devShift);
    return { ...r, week_start: week, proteins: String(proteins) };
  });
  return { ...ds, demand };
}

export function runScenario(base: Model, p: ScenarioParams): Analysis {
  const ds = scenarioDataset(base.ds, p, base.today);
  const lt = new Map<string, number>(p.leadTime ? [[p.leadTime.supplier, p.leadTime.weeks]] : []);
  return analyze(buildModel(ds, base.today, lt), addDays(BASE_GO_LIVE, 7 * p.londonShiftWeeks));
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/** Headline results used to compare base and scenario. */
export function summarize(a: Analysis, p: ScenarioParams) {
  const { m, pol } = a;
  const items = [...pol.policies.keys()];
  const status = Object.fromEntries(items.map((i) => [i, a.statusOf(i)]));
  const policyCash = sum(items.map((i) => pol.policies.get(i)!.reorderPoint * m.priceChf(i)));
  const y27 = m.weeks.filter((w) => w.startsWith('2027'));
  const cogs27 = sum(y27.flatMap((w) => (['LSN', 'LDN'] as Site[]).map((s) => cogsWeek(m, w, s))));
  const prot27 = sum(y27.flatMap((w) => [m.proteins(w, 'LSN'), m.proteins(w, 'LDN')]));
  // projected stock value over 26 weeks, open orders at realistic dates, no new orders
  const value = m.future.slice(0, 26).map((_, k) => sum(items.map((i) => {
    const pr = a.project(i, 26); return Math.max(0, pr[k]?.start ?? 0) * m.priceChf(i);
  })));
  const firstLondon = Object.values(a.london.orders).map((o) => o.order_by).sort()[0];
  return {
    status, crit: Object.values(status).filter((s) => s === 'crit').length, watch: Object.values(status).filter((s) => s === 'warn').length,
    policyCash, cogs27, prot27, costPerProtein: cogs27 / prot27, value,
    londonCash: a.london.total_chf, firstLondon, goLive: addDays(BASE_GO_LIVE, 7 * p.londonShiftWeeks),
    developOrderBy: addDays(p.developLaunch, -56), developLaunch: p.developLaunch,
  };
}
export type Summary = ReturnType<typeof summarize>;
