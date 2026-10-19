"""Reference calculations behind the Supply Planner mockups.

Usage:  python3 compute_reference.py <dataset_dir> [out.json]
Reproduces every figure shown in design/screens from the synthetic dataset.
The app's engine should return the same values (tolerance: rounding).
Rules are deliberately simple and explicit; see design/README.md, section "Calculation rules".
"""
import csv, sys, json, math, statistics as st, collections
from datetime import date, timedelta
D = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else None
TODAY = date(2026, 10, 19); P = date.fromisoformat
def rd(f): return list(csv.DictReader(open(f"{D}/{f}", encoding="utf-8")))
items = {r['item_id']: r for r in rd('items.csv')}; sups = {r['supplier_id']: r for r in rd('suppliers.csv')}
si = rd('supplier_items.csv'); po = rd('purchase_orders.csv'); lots = rd('inventory_lots.csv')
lanes = {(r['origin_region'], r['dest_site']): r for r in rd('landed_cost_lanes.csv')}
region = {r['country']: r['region'] for r in rd('country_regions.csv')}
fx = {(r['month'], r['currency']): float(r['rate_to_chf']) for r in rd('fx_rates.csv')}
def FX(cur, month='2026-10'): return fx[(month, cur)]
BOM = collections.defaultdict(dict)  # qty per protein incl. loss factor
for r in rd('bom.csv'):
    BOM[r['assay_id']][r['item_id']] = BOM[r['assay_id']].get(r['item_id'], 0) + float(r['qty_per_protein']) * (1 + float(r['loss_factor']))
W = collections.defaultdict(float); WS = collections.defaultdict(float)
for r in rd('demand_forecast.csv'):
    W[(P(r['week_start']), r['site_id'], r['assay_id'])] += int(r['proteins'])
    WS[(P(r['week_start']), r['site_id'], r['source'])] += int(r['proteins'])
weeks = sorted({k[0] for k in W}); fut = [w for w in weeks if w >= TODAY]
def use(wk, site):
    out = collections.defaultdict(float)
    for (w, s, a), p in W.items():
        if w == wk and s == site:
            for it, q in BOM[a].items(): out[it] += p * q
    return out
U = {(w, s): use(w, s) for w in weeks for s in ('LSN', 'LDN')}
# preferred LSN source per item (I060/I061 only have a quote)
pref = {}
for r in si:
    if r['preferred'] == 'Y' and r['site_scope'] in ('ALL', 'LSN') and r['item_id'] not in pref: pref[r['item_id']] = r
for it in ('I060', 'I061'): pref[it] = next(r for r in si if r['item_id'] == it)
def cur_of(sup): return sups[sup]['currency']
LAST = {}  # last price actually paid at LSN (e.g. Helix tier 2 at 19.20 USD since July)
for r in sorted(po, key=lambda r: r['order_date']):
    if r['site_id'] == 'LSN': LAST[r['item_id']] = float(r['unit_price'])
def unit_price(it): return LAST.get(it, float(pref[it]['unit_price']))
def price_chf(it): r = pref[it]; return unit_price(it) * FX(cur_of(r['supplier_id']))
def landed_pct(sup, site):
    l = lanes[(region[sups[sup]['country']], site)]; return float(l['freight_pct_of_value']) + float(l['duty_pct'])
onhand = collections.defaultdict(float); expired = []
for l in lots:
    if l['site_id'] != 'LSN': continue
    if P(l['expiry_date']) < TODAY: expired.append(l)
    else: onhand[l['item_id']] += float(l['qty_on_hand'])
openpo = collections.defaultdict(list); obs = collections.defaultdict(list)
for r in po:
    if r['received_date']: obs[r['item_id']].append((P(r['received_date']) - P(r['order_date'])).days)
    else: openpo[r['item_id']].append(r)
SS_WEEKS = 2
res = {'today': TODAY.isoformat(), 'items': {}}
for it in sorted(pref):
    u = sum(U[(w, 'LSN')].get(it, 0) for w in fut[:4]) / 4
    ltq = int(pref[it]['quoted_lead_time_days']) / 7
    lto = st.mean(obs[it]) / 7 if obs[it] else ltq
    nq = len([r for r in si if r['item_id'] == it and r['qualification_status'] == 'qualified' and r['site_scope'] in ('ALL', 'LSN')])
    res['items'][it] = dict(supplier=pref[it]['supplier_id'], use_per_week=round(u, 1), on_hand=round(onhand[it], 1),
        cover_weeks=round(onhand[it] / u, 1) if u else None, lead_time_quoted_weeks=round(ltq, 1), lead_time_observed_weeks=round(lto, 1),
        safety_stock=round(SS_WEEKS * u), reorder_point=round((lto + SS_WEEKS) * u), qualified_sources_lsn=nq,
        open_pos=[r['po_id'] for r in openpo[it]])
act = [i for i, d in res['items'].items() if d['use_per_week'] > 0]
res['summary'] = dict(
    active_items=len(act),
    below_reorder_point=[i for i in act if res['items'][i]['on_hand'] < res['items'][i]['reorder_point']],
    cover_below_lead_time=[i for i in act if res['items'][i]['cover_weeks'] < res['items'][i]['lead_time_observed_weeks']],
    single_source_items=len([i for i in act if res['items'][i]['qualified_sources_lsn'] == 1]),
    inventory_value_chf=round(sum(onhand[i] * price_chf(i) for i in onhand)),
    expired_lots=[dict(item=l['item_id'], lot=l['lot_id'], qty=float(l['qty_on_hand']), expiry=l['expiry_date'], status=l['status'],
                       value_chf=round(float(l['qty_on_hand']) * price_chf(l['item_id']))) for l in expired],
    lsn_throughput_4wk_avg=round(sum(sum(v for k, v in W.items() if k[0] == w and k[1] == 'LSN') for w in weeks if TODAY - timedelta(weeks=4) <= w < TODAY) / 4),
    competition_4wk_avg=round(sum(WS[(w, 'LSN', 'competition')] for w in weeks if TODAY - timedelta(weeks=4) <= w < TODAY) / 4))
# expiry risk: FEFO, a lot cannot be used from its expiry date on
risk = {}
for it in items:
    q = sorted([[P(l['expiry_date']), float(l['qty_on_hand']), l['lot_id']] for l in lots if l['item_id'] == it and l['site_id'] == 'LSN' and P(l['expiry_date']) >= TODAY])
    lost = []
    for w in fut[:26]:
        for x in q:
            if x[0] <= w and x[1] > 0: lost.append((x[2], x[1], x[0].isoformat())); x[1] = 0
        need = U[(w, 'LSN')].get(it, 0)
        for x in q:
            t = min(need, x[1]); x[1] -= t; need -= t
    if lost and it in pref: risk[it] = [dict(lot=a, qty=round(b), expiry=c, value_chf=round(b * price_chf(it))) for a, b, c in lost]
res['expiry_risk_26w'] = risk
# cost per protein (LSN, preferred, Oct FX); landed = freight% + duty% of value (VAT recoverable, per-shipment fees excluded)
cpp = {}
for a in BOM:
    cat = collections.defaultdict(float); land = {'LSN': 0, 'LDN': 0}
    for it, q in BOM[a].items():
        c = q * price_chf(it); cat[items[it]['category']] += c
        for s in land: land[s] += c * landed_pct(pref[it]['supplier_id'], s)
    m = sum(cat.values())
    cpp[a] = dict(by_category={k: round(v, 2) for k, v in cat.items()}, material=round(m, 2), landed_lsn=round(m + land['LSN'], 2),
                  landed_ldn_chf=round(m + land['LDN'], 2), landed_ldn_gbp=round((m + land['LDN']) / FX('GBP'), 2))
res['cost_per_protein_chf'] = cpp
# supplier reliability and spend (2026 run rate)
frac = (TODAY - date(2026, 1, 1)).days / 365; rel = {}
for s in sups:
    rs = [r for r in po if r['supplier_id'] == s and r['received_date']]
    spend = sum(float(r['qty']) * float(r['unit_price']) * FX(r['currency'], r['order_date'][:7]) for r in po if r['supplier_id'] == s)
    if not rs and not spend: continue
    rel[s] = dict(name=sups[s]['supplier_name'], annual_spend_kchf=round(spend / frac / 1000),
        quoted_weeks=round(st.mean((P(r['promised_date']) - P(r['order_date'])).days for r in rs) / 7, 1) if rs else None,
        actual_weeks=round(st.mean((P(r['received_date']) - P(r['order_date'])).days for r in rs) / 7, 1) if rs else None,
        on_time_pct=round(100 * sum(P(r['received_date']) <= P(r['promised_date']) for r in rs) / len(rs)) if rs else None, received_pos=len(rs))
res['suppliers'] = rel
# 2027 volumes and price tiers
vol = lambda it, s: round(sum(p * BOM[a].get(it, 0) for (w, ss, a), p in W.items() if ss == s and w.year == 2027))
res['volumes_2027'] = {it: {s: vol(it, s) for s in ('LSN', 'LDN')} for it in ('I001', 'I010', 'I020')}
v = sum(res['volumes_2027']['I010'].values())
res['negotiation'] = dict(
    S03_I010=dict(volume_ml=v, list_eur=290, top_tier_eur=245, saving_chf=round(45 * v * FX('EUR')),
                  saving_per_protein_chf=round(45 * BOM['BIND_BLI']['I010'] * FX('EUR'), 2)),
    S01_I001=dict(volume=sum(res['volumes_2027']['I001'].values()), current_usd=19.2, tier_usd=17.6, next_tier_at=600000,
                  saving_chf=round(1.6 * sum(res['volumes_2027']['I001'].values()) * FX('USD'))),
    S05_I020=dict(volume=sum(res['volumes_2027']['I020'].values()), list_usd=11.5, tier_usd=10.4,
                  saving_chf=round(1.1 * sum(res['volumes_2027']['I020'].values()) * FX('USD'))))
# London initial stock: 6 weeks of LDN demand from go-live, on site by 2027-01-04
lw = [w for w in weeks if date(2027, 1, 11) <= w < date(2027, 2, 22)]; need_by = date(2027, 1, 4)
grp = collections.defaultdict(lambda: dict(items=[], cost_chf=0, lead_days=0)); nosrc = []
for it in sorted(items):
    q = sum(U[(w, 'LDN')].get(it, 0) for w in lw)
    if q <= 0: continue
    src = sorted([r for r in si if r['item_id'] == it and r['site_scope'] in ('ALL', 'LDN') and r['qualification_status'] == 'qualified'], key=lambda r: r['preferred'], reverse=True)
    if not src: nosrc.append(dict(item=it, qty=round(q))); continue
    s = src[0]; g = grp[s['supplier_id']]
    up = unit_price(it) if it in pref and pref[it]['supplier_id'] == s['supplier_id'] else float(s['unit_price'])
    g['items'].append(it); g['cost_chf'] += q * up * FX(cur_of(s['supplier_id'])) * (1 + landed_pct(s['supplier_id'], 'LDN'))
    g['lead_days'] = max(g['lead_days'], int(s['quoted_lead_time_days']))
res['london'] = dict(orders={k: dict(items=g['items'], cost_chf=round(g['cost_chf']), lead_days=g['lead_days'],
                     order_by=(need_by - timedelta(days=g['lead_days'])).isoformat()) for k, g in grp.items()},
                     total_chf=round(sum(g['cost_chf'] for g in grp.values())), no_qualified_source=nosrc)

# material COGS (prices paid; FX actual to Sep 2026, budget after) and savings pipeline
def price_m(it, m):
    p = unit_price(it) if not (it == 'I001' and m < '2026-07') else float(pref[it]['unit_price'])
    c = cur_of(pref[it]['supplier_id']); return p * fx.get((m, c), FX(c))
def cogs_week(w, s): m = w.isoformat()[:7]; return sum(W[(w, s, a)] * sum(q * price_m(it, m) for it, q in BOM[a].items()) for a in BOM if W[(w, s, a)])
p27 = sum(v for (w, s, a), v in W.items() if w.year == 2027)
rec = sum(res['negotiation'][k]['saving_chf'] for k in res['negotiation'])
res['cogs'] = dict(ytd_2026_chf=round(sum(cogs_week(w, s) for w in weeks if w.year == 2026 and w < TODAY for s in ('LSN', 'LDN'))),
    forecast_2027_chf=round(sum(cogs_week(w, s) for w in weeks if w.year == 2027 for s in ('LSN', 'LDN'))), proteins_2027=round(p27),
    bli_cost_per_protein_by_month={m: round(sum(q * price_m(it, m) for it, q in BOM['BIND_BLI'].items()), 2) for m in sorted({w.isoformat()[:7] for w in weeks})},
    savings_recurring_chf=rec, savings_per_protein_chf=round(rec / p27, 2))
txt = json.dumps(res, indent=1, ensure_ascii=False)
open(OUT, 'w').write(txt) if OUT else print(txt)
