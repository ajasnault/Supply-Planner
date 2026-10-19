/**
 * Supply Planner calculation engine.
 *
 * TypeScript port of design/reference/compute_reference.py. Every rule is documented in
 * design/README.md ("Calculation rules"); the test suite checks the output against
 * design/reference/expected_values.json.
 */
import { parseCSV } from './csv';

export type Row = Record<string, string>;
export type Site = 'LSN' | 'LDN';
export const SITES: Site[] = ['LSN', 'LDN'];

export interface Dataset {
  items: Row[]; suppliers: Row[]; supplierItems: Row[]; bom: Row[]; demand: Row[];
  purchaseOrders: Row[]; lots: Row[]; lanes: Row[]; regions: Row[]; fx: Row[];
  priceBreaks: Row[]; contracts: Row[]; storage: Row[]; cycleCounts: Row[]; sites: Row[]; assays: Row[];
}

export const DATA_FILES: Record<keyof Dataset, string> = {
  items: 'items.csv', suppliers: 'suppliers.csv', supplierItems: 'supplier_items.csv', bom: 'bom.csv',
  demand: 'demand_forecast.csv', purchaseOrders: 'purchase_orders.csv', lots: 'inventory_lots.csv',
  lanes: 'landed_cost_lanes.csv', regions: 'country_regions.csv', fx: 'fx_rates.csv', priceBreaks: 'price_breaks.csv',
  contracts: 'contracts.csv', storage: 'storage_capacity.csv', cycleCounts: 'cycle_counts.csv', sites: 'sites.csv',
  assays: 'assays.csv',
};

/** Build a Dataset from raw CSV text keyed by file name (e.g. "items.csv"). */
export function loadDataset(files: Record<string, string>): Dataset {
  const out = {} as Dataset;
  for (const [key, file] of Object.entries(DATA_FILES) as [keyof Dataset, string][]) {
    if (!(file in files)) throw new Error(`Missing data file ${file}`);
    out[key] = parseCSV(files[file]);
  }
  return out;
}

// ---------- dates (ISO strings, UTC arithmetic) ----------
const DAY = 86_400_000;
const ms = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const days = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY); // b - a
export const addDays = (d: string, n: number) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
/** Python-style round half to even, to match the reference output exactly. */
export function round(x: number, nd = 0): number {
  const f = 10 ** nd;
  const v = x * f;
  const r = Math.round(v);
  const half = Math.abs(v % 1) === 0.5;
  return (half && r % 2 !== 0 ? r - 1 : r) / f;
}

export interface Model {
  today: string;
  ds: Dataset;
  items: Map<string, Row>;
  sups: Map<string, Row>;
  bom: Map<string, Map<string, number>>; // assay -> item -> qty per protein incl. loss
  weeks: string[];
  future: string[];
  proteins: (week: string, site: Site, assay?: string) => number;
  competition: (week: string, site: Site) => number;
  use: (week: string, site: Site) => Map<string, number>;
  pref: Map<string, Row>;
  fx: (cur: string, month?: string) => number;
  fxMaybe: (cur: string, month: string) => number | undefined;
  unitPrice: (item: string) => number;
  priceChf: (item: string) => number;
  landedPct: (supplier: string, site: Site) => number;
  currency: (supplier: string) => string;
}

export function buildModel(ds: Dataset, today = '2026-10-19'): Model {
  const items = new Map(ds.items.map((r) => [r.item_id, r]));
  const sups = new Map(ds.suppliers.map((r) => [r.supplier_id, r]));
  const fxMap = new Map(ds.fx.map((r) => [`${r.month}|${r.currency}`, +r.rate_to_chf]));
  const fxMaybe = (cur: string, month: string) => fxMap.get(`${month}|${cur}`);
  const fx = (cur: string, month = '2026-10') => {
    const v = fxMaybe(cur, month);
    if (v === undefined) throw new Error(`No FX for ${cur} ${month}`);
    return v;
  };
  const bom = new Map<string, Map<string, number>>();
  for (const r of ds.bom) {
    if (!bom.has(r.assay_id)) bom.set(r.assay_id, new Map());
    const m = bom.get(r.assay_id)!;
    m.set(r.item_id, (m.get(r.item_id) ?? 0) + +r.qty_per_protein * (1 + +r.loss_factor));
  }
  const W = new Map<string, number>();
  const WS = new Map<string, number>();
  const wk = new Set<string>();
  for (const r of ds.demand) {
    const k = `${r.week_start}|${r.site_id}|${r.assay_id}`;
    W.set(k, (W.get(k) ?? 0) + +r.proteins);
    const ks = `${r.week_start}|${r.site_id}|${r.source}`;
    WS.set(ks, (WS.get(ks) ?? 0) + +r.proteins);
    wk.add(r.week_start);
  }
  const weeks = [...wk].sort();
  const assays = [...bom.keys()];
  const proteins = (week: string, site: Site, assay?: string) =>
    assay ? W.get(`${week}|${site}|${assay}`) ?? 0 : sum(assays.map((a) => W.get(`${week}|${site}|${a}`) ?? 0));
  const competition = (week: string, site: Site) => WS.get(`${week}|${site}|competition`) ?? 0;
  const useCache = new Map<string, Map<string, number>>();
  const use = (week: string, site: Site) => {
    const key = `${week}|${site}`;
    let out = useCache.get(key);
    if (!out) {
      out = new Map();
      for (const [a, m] of bom) {
        const p = W.get(`${week}|${site}|${a}`) ?? 0;
        if (!p) continue;
        for (const [it, q] of m) out.set(it, (out.get(it) ?? 0) + p * q);
      }
      useCache.set(key, out);
    }
    return out;
  };
  const pref = new Map<string, Row>();
  for (const r of ds.supplierItems)
    if (r.preferred === 'Y' && (r.site_scope === 'ALL' || r.site_scope === 'LSN') && !pref.has(r.item_id)) pref.set(r.item_id, r);
  for (const it of ['I060', 'I061']) {
    const r = ds.supplierItems.find((x) => x.item_id === it);
    if (r) pref.set(it, r);
  }
  const last = new Map<string, number>();
  for (const r of [...ds.purchaseOrders].sort((a, b) => (a.order_date < b.order_date ? -1 : a.order_date > b.order_date ? 1 : 0)))
    if (r.site_id === 'LSN') last.set(r.item_id, +r.unit_price);
  const currency = (s: string) => sups.get(s)!.currency;
  const unitPrice = (it: string) => last.get(it) ?? +pref.get(it)!.unit_price;
  const priceChf = (it: string) => unitPrice(it) * fx(currency(pref.get(it)!.supplier_id));
  const region = new Map(ds.regions.map((r) => [r.country, r.region]));
  const lanes = new Map(ds.lanes.map((r) => [`${r.origin_region}|${r.dest_site}`, r]));
  const landedPct = (s: string, site: Site) => {
    const l = lanes.get(`${region.get(sups.get(s)!.country)}|${site}`)!;
    return +l.freight_pct_of_value + +l.duty_pct;
  };
  return {
    today, ds, items, sups, bom, weeks, future: weeks.filter((w) => w >= today), proteins, competition, use, pref,
    fx, fxMaybe, unitPrice, priceChf, landedPct, currency,
  };
}

export const SS_WEEKS = 2;

export interface ItemPolicy {
  supplier: string; use_per_week: number; on_hand: number; cover_weeks: number | null;
  lead_time_quoted_weeks: number; lead_time_observed_weeks: number; safety_stock: number; reorder_point: number;
  qualified_sources_lsn: number; open_pos: string[];
}

/** Inventory policy per item at LSN (unrounded values; round for display). */
export function itemPolicies(m: Model) {
  const { ds, today } = m;
  const onHand = new Map<string, number>();
  const expired: Row[] = [];
  for (const l of ds.lots) {
    if (l.site_id !== 'LSN') continue;
    if (l.expiry_date < today) expired.push(l);
    else onHand.set(l.item_id, (onHand.get(l.item_id) ?? 0) + +l.qty_on_hand);
  }
  const openPo = new Map<string, Row[]>();
  const observed = new Map<string, number[]>();
  for (const r of ds.purchaseOrders) {
    if (r.received_date) {
      if (!observed.has(r.item_id)) observed.set(r.item_id, []);
      observed.get(r.item_id)!.push(days(r.order_date, r.received_date));
    } else {
      if (!openPo.has(r.item_id)) openPo.set(r.item_id, []);
      openPo.get(r.item_id)!.push(r);
    }
  }
  const policies = new Map<string, {
    supplier: string; use: number; onHand: number; cover: number | null; ltQuoted: number; ltObserved: number;
    safetyStock: number; reorderPoint: number; qualifiedSources: number; openPos: Row[];
  }>();
  for (const it of [...m.pref.keys()].sort()) {
    const u = sum(m.future.slice(0, 4).map((w) => m.use(w, 'LSN').get(it) ?? 0)) / 4;
    const ltq = +m.pref.get(it)!.quoted_lead_time_days / 7;
    const obs = observed.get(it);
    const lto = obs ? mean(obs) / 7 : ltq;
    const oh = onHand.get(it) ?? 0;
    const nq = ds.supplierItems.filter((r) => r.item_id === it && r.qualification_status === 'qualified' && (r.site_scope === 'ALL' || r.site_scope === 'LSN')).length;
    policies.set(it, {
      supplier: m.pref.get(it)!.supplier_id, use: u, onHand: oh, cover: u ? oh / u : null, ltQuoted: ltq, ltObserved: lto,
      safetyStock: SS_WEEKS * u, reorderPoint: (lto + SS_WEEKS) * u, qualifiedSources: nq, openPos: openPo.get(it) ?? [],
    });
  }
  return { policies, onHand, expired, openPo };
}

/** Everything the reference script outputs, in the same shape as expected_values.json. */
export function computeAll(m: Model) {
  const { today } = m;
  const { policies, onHand, expired } = itemPolicies(m);
  const res: Record<string, unknown> = { today };
  const items: Record<string, ItemPolicy> = {};
  for (const [it, p] of policies)
    items[it] = {
      supplier: p.supplier, use_per_week: round(p.use, 1), on_hand: round(p.onHand, 1), cover_weeks: p.use ? round(p.onHand / p.use, 1) : null,
      lead_time_quoted_weeks: round(p.ltQuoted, 1), lead_time_observed_weeks: round(p.ltObserved, 1), safety_stock: round(SS_WEEKS * p.use),
      reorder_point: round((p.ltObserved + SS_WEEKS) * p.use), qualified_sources_lsn: p.qualifiedSources, open_pos: p.openPos.map((r) => r.po_id),
    };
  res.items = items;
  const act = Object.keys(items).filter((i) => items[i].use_per_week > 0);
  const last4 = m.weeks.filter((w) => w >= addDays(today, -28) && w < today);
  res.summary = {
    active_items: act.length,
    below_reorder_point: act.filter((i) => items[i].on_hand < items[i].reorder_point),
    cover_below_lead_time: act.filter((i) => (items[i].cover_weeks ?? 0) < items[i].lead_time_observed_weeks),
    single_source_items: act.filter((i) => items[i].qualified_sources_lsn === 1).length,
    inventory_value_chf: round(sum([...onHand].map(([i, q]) => q * m.priceChf(i)))),
    expired_lots: expired.map((l) => ({ item: l.item_id, lot: l.lot_id, qty: +l.qty_on_hand, expiry: l.expiry_date, status: l.status, value_chf: round(+l.qty_on_hand * m.priceChf(l.item_id)) })),
    lsn_throughput_4wk_avg: round(sum(last4.map((w) => m.proteins(w, 'LSN'))) / 4),
    competition_4wk_avg: round(sum(last4.map((w) => m.competition(w, 'LSN'))) / 4),
  };
  res.expiry_risk_26w = expiryRisk(m);
  res.cost_per_protein_chf = costPerProtein(m);
  res.suppliers = supplierStats(m);
  const vol = (it: string, s: Site) => round(sum(m.weeks.filter((w) => w.startsWith('2027')).map((w) => m.proteins(w, s) && sum([...m.bom].map(([a, b]) => m.proteins(w, s, a) * (b.get(it) ?? 0))))));
  const volumes: Record<string, Record<Site, number>> = {};
  for (const it of ['I001', 'I010', 'I020']) volumes[it] = { LSN: vol(it, 'LSN'), LDN: vol(it, 'LDN') };
  res.volumes_2027 = volumes;
  const v010 = volumes.I010.LSN + volumes.I010.LDN, v001 = volumes.I001.LSN + volumes.I001.LDN, v020 = volumes.I020.LSN + volumes.I020.LDN;
  const negotiation = {
    S03_I010: { volume_ml: v010, list_eur: 290, top_tier_eur: 245, saving_chf: round(45 * v010 * m.fx('EUR')), saving_per_protein_chf: round(45 * (m.bom.get('BIND_BLI')!.get('I010') ?? 0) * m.fx('EUR'), 2) },
    S01_I001: { volume: v001, current_usd: 19.2, tier_usd: 17.6, next_tier_at: 600000, saving_chf: round(1.6 * v001 * m.fx('USD')) },
    S05_I020: { volume: v020, list_usd: 11.5, tier_usd: 10.4, saving_chf: round(1.1 * v020 * m.fx('USD')) },
  };
  res.negotiation = negotiation;
  res.london = londonInitialStock(m);
  const p27 = sum(m.weeks.filter((w) => w.startsWith('2027')).flatMap((w) => SITES.map((s) => m.proteins(w, s))));
  const rec = negotiation.S03_I010.saving_chf + negotiation.S01_I001.saving_chf + negotiation.S05_I020.saving_chf;
  const months = [...new Set(m.weeks.map((w) => w.slice(0, 7)))].sort();
  res.cogs = {
    ytd_2026_chf: round(sum(m.weeks.filter((w) => w.startsWith('2026') && w < today).flatMap((w) => SITES.map((s) => cogsWeek(m, w, s))))),
    forecast_2027_chf: round(sum(m.weeks.filter((w) => w.startsWith('2027')).flatMap((w) => SITES.map((s) => cogsWeek(m, w, s))))),
    proteins_2027: round(p27),
    bli_cost_per_protein_by_month: Object.fromEntries(months.map((mo) => [mo, round(costPerProteinAt(m, 'BIND_BLI', mo), 2)])),
    savings_recurring_chf: rec,
    savings_per_protein_chf: round(rec / p27, 2),
  };
  return res;
}

/** Quantity left in each lot on its expiry date, first-expiry-first-out use, next 26 weeks (LSN). */
export function expiryRisk(m: Model) {
  const out: Record<string, { lot: string; qty: number; expiry: string; value_chf: number }[]> = {};
  for (const it of m.items.keys()) {
    const q = m.ds.lots
      .filter((l) => l.item_id === it && l.site_id === 'LSN' && l.expiry_date >= m.today)
      .map((l) => ({ exp: l.expiry_date, qty: +l.qty_on_hand, lot: l.lot_id }))
      .sort((a, b) => (a.exp < b.exp ? -1 : a.exp > b.exp ? 1 : a.qty - b.qty || (a.lot < b.lot ? -1 : 1)));
    const lost: { lot: string; qty: number; exp: string }[] = [];
    for (const w of m.future.slice(0, 26)) {
      for (const x of q) if (x.exp <= w && x.qty > 0) { lost.push({ lot: x.lot, qty: x.qty, exp: x.exp }); x.qty = 0; }
      let need = m.use(w, 'LSN').get(it) ?? 0;
      for (const x of q) { const t = Math.min(need, x.qty); x.qty -= t; need -= t; }
    }
    if (lost.length && m.pref.has(it)) out[it] = lost.map((l) => ({ lot: l.lot, qty: round(l.qty), expiry: l.exp, value_chf: round(l.qty * m.priceChf(it)) }));
  }
  return out;
}

export function costPerProtein(m: Model) {
  const out: Record<string, { by_category: Record<string, number>; material: number; landed_lsn: number; landed_ldn_chf: number; landed_ldn_gbp: number }> = {};
  for (const [a, b] of m.bom) {
    const cat: Record<string, number> = {};
    const land = { LSN: 0, LDN: 0 };
    for (const [it, q] of b) {
      const c = q * m.priceChf(it);
      const k = m.items.get(it)!.category;
      cat[k] = (cat[k] ?? 0) + c;
      for (const s of SITES) land[s] += c * m.landedPct(m.pref.get(it)!.supplier_id, s);
    }
    const mat = sum(Object.values(cat));
    out[a] = {
      by_category: Object.fromEntries(Object.entries(cat).map(([k, v]) => [k, round(v, 2)])), material: round(mat, 2),
      landed_lsn: round(mat + land.LSN, 2), landed_ldn_chf: round(mat + land.LDN, 2), landed_ldn_gbp: round((mat + land.LDN) / m.fx('GBP'), 2),
    };
  }
  return out;
}

export function supplierStats(m: Model) {
  const frac = days('2026-01-01', m.today) / 365;
  const out: Record<string, { name: string; annual_spend_kchf: number; quoted_weeks: number | null; actual_weeks: number | null; on_time_pct: number | null; received_pos: number }> = {};
  for (const s of m.sups.keys()) {
    const pos = m.ds.purchaseOrders.filter((r) => r.supplier_id === s);
    const rs = pos.filter((r) => r.received_date);
    const spend = sum(pos.map((r) => +r.qty * +r.unit_price * m.fx(r.currency, r.order_date.slice(0, 7))));
    if (!rs.length && !spend) continue;
    out[s] = {
      name: m.sups.get(s)!.supplier_name, annual_spend_kchf: round(spend / frac / 1000),
      quoted_weeks: rs.length ? round(mean(rs.map((r) => days(r.order_date, r.promised_date))) / 7, 1) : null,
      actual_weeks: rs.length ? round(mean(rs.map((r) => days(r.order_date, r.received_date))) / 7, 1) : null,
      on_time_pct: rs.length ? round((100 * rs.filter((r) => r.received_date <= r.promised_date).length) / rs.length) : null,
      received_pos: rs.length,
    };
  }
  return out;
}

export function londonInitialStock(m: Model, goLive = '2027-01-11', needBy = '2027-01-04', weeksOfStock = 6) {
  const lw = m.weeks.filter((w) => w >= goLive && w < addDays(goLive, 7 * weeksOfStock));
  const grp = new Map<string, { items: string[]; cost: number; lead: number }>();
  const noSource: { item: string; qty: number }[] = [];
  for (const it of [...m.items.keys()].sort()) {
    const q = sum(lw.map((w) => m.use(w, 'LDN').get(it) ?? 0));
    if (q <= 0) continue;
    const src = m.ds.supplierItems
      .filter((r) => r.item_id === it && (r.site_scope === 'ALL' || r.site_scope === 'LDN') && r.qualification_status === 'qualified')
      .sort((a, b) => (a.preferred === b.preferred ? 0 : a.preferred === 'Y' ? -1 : 1));
    if (!src.length) { noSource.push({ item: it, qty: round(q) }); continue; }
    const s = src[0];
    const up = m.pref.get(it)?.supplier_id === s.supplier_id ? m.unitPrice(it) : +s.unit_price;
    const g = grp.get(s.supplier_id) ?? { items: [], cost: 0, lead: 0 };
    g.items.push(it);
    g.cost += q * up * m.fx(m.currency(s.supplier_id)) * (1 + m.landedPct(s.supplier_id, 'LDN'));
    g.lead = Math.max(g.lead, +s.quoted_lead_time_days);
    grp.set(s.supplier_id, g);
  }
  const orders = Object.fromEntries([...grp].map(([k, g]) => [k, { items: g.items, cost_chf: round(g.cost), lead_days: g.lead, order_by: addDays(needBy, -g.lead) }]));
  return { orders, total_chf: round(sum([...grp.values()].map((g) => g.cost))), no_qualified_source: noSource };
}

/** BOM cost of one protein of an assay at a month's FX, at prices paid (Helix list price before July 2026). */
export function costPerProteinAt(m: Model, assay: string, month: string) {
  return sum([...m.bom.get(assay)!].map(([it, q]) => {
    const p = it === 'I001' && month < '2026-07' ? +m.pref.get(it)!.unit_price : m.unitPrice(it);
    const c = m.currency(m.pref.get(it)!.supplier_id);
    return q * p * (m.fxMaybe(c, month) ?? m.fx(c));
  }));
}

export function cogsWeek(m: Model, week: string, site: Site) {
  const mo = week.slice(0, 7);
  return sum([...m.bom.keys()].map((a) => { const p = m.proteins(week, site, a); return p ? p * costPerProteinAt(m, a, mo) : 0; }));
}
