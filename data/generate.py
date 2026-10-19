"""Synthetic but credible dataset for a supply-planning beta (automated protein lab, 2 sites).
All suppliers, SKUs, prices and volumes are invented. Seeded -> reproducible.
Reference date ("today") = 2026-10-19 (Monday).
"""
import csv, os, random, math, sys
from datetime import date, timedelta

random.seed(42)
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(OUT, "vendor_exports"), exist_ok=True)
TODAY = date(2026, 10, 19)

def w(name, header, rows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f); wr.writerow(header); wr.writerows(rows)

# ---------------------------------------------------------------- sites
sites = [
    ["LSN", "Lausanne lab", "CH", "CHF", "2023-03-01", "live", "Adaptyv Biosystems Sàrl (fictional data)"],
    ["LDN", "London lab", "GB", "GBP", "2027-01-11", "planned", "Adaptyv UK Ltd (fictional data)"],
]
w("sites.csv", ["site_id", "site_name", "country", "currency", "go_live_date", "status", "legal_entity"], sites)

storage = [
    ["LSN", "-80C", 2400, 1650], ["LSN", "-20C", 1800, 900], ["LSN", "2-8C", 3000, 1400], ["LSN", "ambient", 40000, 22000],
    ["LDN", "-80C", 1200, 0], ["LDN", "-20C", 900, 0], ["LDN", "2-8C", 1500, 0], ["LDN", "ambient", 25000, 0],
]
w("storage_capacity.csv", ["site_id", "temp_zone", "capacity_liters", "used_liters_today"], storage)

# ---------------------------------------------------------------- suppliers
suppliers = [
    # id, name, country, currency, incoterm, cold_chain, ordering_channel, payment_terms_days, notes
    ["S01", "Helix Genomics", "US", "USD", "DAP", "Y", "api", 30, "Main gene-fragment vendor"],
    ["S02", "Codon Forge", "DE", "EUR", "DAP", "Y", "email", 30, "Gene fragments - second source in qualification"],
    ["S03", "Lysis Bio", "DE", "EUR", "DAP", "Y", "portal_upload", 30, "E. coli lysate cell-free kits"],
    ["S04", "Ribosyn Labs", "US", "USD", "EXW", "Y", "email", 45, "Reconstituted (PURE-type) cell-free system"],
    ["S05", "Octane Biosensors", "US", "USD", "DAP", "N", "portal_upload", 30, "BLI biosensors and plates"],
    ["S06", "Kinetiq Instruments", "FR", "EUR", "DAP", "Y", "portal_upload", 30, "SPR chips and buffers"],
    ["S07", "Proteo Catalog", "GB", "GBP", "DAP", "Y", "api", 30, "Catalog target proteins (biotinylated)"],
    ["S08", "Antigenix", "US", "USD", "DAP", "Y", "email", 30, "Catalog target proteins"],
    ["S09", "LabPlast Europa", "DE", "EUR", "DAP", "N", "edi", 60, "Plates, tips, seals"],
    ["S10", "Alpine Lab Supply", "CH", "CHF", "DDP", "Y", "webshop", 30, "Swiss distributor - general reagents"],
    ["S11", "Thames Scientific", "GB", "GBP", "DDP", "Y", "webshop", 30, "UK distributor - plastics and reagents"],
    ["S12", "Enzymatica", "DK", "EUR", "DAP", "Y", "email", 30, "Polymerases and assembly mixes"],
    ["S13", "Lumina Assays", "US", "USD", "DAP", "Y", "email", 30, "Detection reagents, dyes, substrates"],
    ["S14", "Chromalytix", "US", "USD", "EXW", "N", "email", 45, "SEC columns, CE-SDS cartridges (quote only)"],
    ["S15", "Cellfree Nordic", "SE", "EUR", "DAP", "Y", "email", 30, "Lysate cell-free - second source in qualification"],
]
w("suppliers.csv", ["supplier_id", "supplier_name", "country", "currency", "incoterm", "cold_chain_capable",
                    "ordering_channel", "payment_terms_days", "notes"], suppliers)
SUP = {s[0]: s for s in suppliers}

# ---------------------------------------------------------------- items
# id, description, category, uom, temp_zone, shelf_life_days, storage_l_per_uom
items = [
    ["I001", "Linear gene fragment, up to 500 bp, non-clonal", "DNA", "fragment", "-20C", 365, 0.0004],
    ["I002", "Oligo pool plate, 96 primers, 25 nmol", "DNA", "plate", "-20C", 540, 0.15],
    ["I003", "High-fidelity PCR master mix 2x", "DNA", "mL", "-20C", 365, 0.004],
    ["I004", "DNA assembly master mix 2x", "DNA", "mL", "-20C", 270, 0.004],
    ["I005", "DNA clean-up magnetic beads", "DNA", "mL", "2-8C", 365, 0.002],
    ["I010", "E. coli lysate cell-free expression kit", "EXPRESSION", "mL", "-80C", 270, 0.003],
    ["I011", "Cell-free energy solution + amino acids", "EXPRESSION", "mL", "-80C", 180, 0.003],
    ["I012", "Reconstituted (PURE-type) cell-free system", "EXPRESSION", "mL", "-80C", 365, 0.003],
    ["I013", "Disulfide bond enhancer", "EXPRESSION", "mL", "-80C", 365, 0.003],
    ["I020", "BLI biosensor, streptavidin (SA)", "BINDING", "each", "ambient", 365, 0.02],
    ["I021", "BLI biosensor, Ni-NTA", "BINDING", "each", "ambient", 365, 0.02],
    ["I022", "Kinetics buffer 10x", "BINDING", "mL", "2-8C", 365, 0.0012],
    ["I023", "384-well tilted-bottom plate (BLI)", "BINDING", "plate", "ambient", 1825, 0.3],
    ["I024", "Biotinylated target protein, standard panel", "TARGETS", "ug", "-80C", 365, 0.00005],
    ["I030", "SPR sensor chip, streptavidin", "BINDING", "each", "2-8C", 365, 0.05],
    ["I031", "SPR running buffer", "BINDING", "L", "ambient", 365, 1.1],
    ["I032", "Regeneration solution", "BINDING", "mL", "ambient", 730, 0.0012],
    ["I040", "Thermal shift dye 5000x", "THERMO", "uL", "-20C", 365, 0.00002],
    ["I041", "384-well qPCR plate", "THERMO", "plate", "ambient", 1825, 0.25],
    ["I042", "Optical adhesive seal", "THERMO", "each", "ambient", 1095, 0.01],
    ["I050", "Fluorogenic substrate panel", "ENZYME", "mg", "-20C", 365, 0.0005],
    ["I051", "384-well black assay plate", "ENZYME", "plate", "ambient", 1825, 0.25],
    ["I060", "UHPLC SEC column, 4.6 x 150 mm", "DEVELOP", "each", "ambient", 1095, 0.3],
    ["I061", "CE-SDS capillary cartridge", "DEVELOP", "each", "2-8C", 365, 0.4],
    ["I062", "SEC mobile phase buffer", "DEVELOP", "L", "ambient", 365, 1.1],
    ["I070", "384-well PCR plate, skirted", "CONSUMABLE", "plate", "ambient", 1825, 0.25],
    ["I071", "Liquid-handler tips 50 uL, filtered", "CONSUMABLE", "each", "ambient", 1825, 0.0006],
    ["I072", "Liquid-handler tips 200 uL, filtered", "CONSUMABLE", "each", "ambient", 1825, 0.0009],
    ["I073", "96 deep-well plate 2 mL", "CONSUMABLE", "plate", "ambient", 1825, 0.45],
    ["I074", "Foil plate seal", "CONSUMABLE", "each", "ambient", 1095, 0.01],
    ["I075", "Nitrile gloves, box of 100", "CONSUMABLE", "box", "ambient", 1825, 1.0],
    ["I080", "Microfluidic protein QC cartridge (384 samples)", "QC", "each", "2-8C", 365, 0.2],
    ["I081", "Tag-based luminescent expression detection reagent", "QC", "mL", "-20C", 270, 0.003],
]
w("items.csv", ["item_id", "description", "category", "uom", "temp_zone", "shelf_life_days", "storage_liters_per_uom"], items)
ITEM = {i[0]: i for i in items}

# ---------------------------------------------------------------- sourcing
# supplier, item, sku, unit_price (supplier currency, per uom), pack_size (uom per pack), moq_packs,
# quoted_lead_time_days, qualification_status, preferred, site_scope
sourcing = [
    ["S01", "I001", "HX-GF500", 21.00, 96, 1, 10, "qualified", "Y", "ALL"],
    ["S02", "I001", "CF-LIN-500", 18.40, 96, 10, 14, "in_qualification", "N", "ALL"],
    ["S01", "I002", "HX-OP96", 380.00, 1, 1, 7, "qualified", "Y", "ALL"],
    ["S12", "I003", "ENZ-HF2X-5", 42.00, 5, 2, 9, "qualified", "Y", "ALL"],
    ["S10", "I003", "ALP-44510", 51.50, 5, 1, 3, "qualified", "N", "LSN"],
    ["S12", "I004", "ENZ-ASM-1", 640.00, 1, 1, 9, "qualified", "Y", "ALL"],
    ["S10", "I005", "ALP-BEAD60", 1.90, 60, 1, 3, "qualified", "Y", "LSN"],
    ["S11", "I005", "TS-MAGB-50", 1.70, 50, 1, 3, "qualified", "Y", "LDN"],
    ["S03", "I010", "LB-ECX-10", 290.00, 10, 5, 21, "qualified", "Y", "ALL"],
    ["S15", "I010", "CFN-LYS-25", 248.00, 25, 4, 28, "in_qualification", "N", "ALL"],
    ["S03", "I011", "LB-ENS-10", 85.00, 10, 5, 21, "qualified", "Y", "ALL"],
    ["S04", "I012", "RS-PURE-1", 1400.00, 1, 2, 35, "qualified", "Y", "ALL"],
    ["S04", "I013", "RS-DSB-1", 300.00, 1, 1, 35, "qualified", "Y", "ALL"],
    ["S05", "I020", "OB-SA-96", 11.50, 96, 10, 42, "qualified", "Y", "ALL"],
    ["S05", "I021", "OB-NTA-96", 12.20, 96, 5, 42, "qualified", "Y", "ALL"],
    ["S10", "I022", "ALP-KB10-500", 0.60, 500, 1, 3, "qualified", "Y", "LSN"],
    ["S11", "I022", "TS-KB10-500", 0.55, 500, 1, 3, "not_started", "N", "LDN"],
    ["S05", "I023", "OB-P384T-10", 18.00, 10, 5, 42, "qualified", "Y", "ALL"],
    ["S07", "I024", "PC-BTP-100", 3.20, 100, 1, 10, "qualified", "Y", "ALL"],
    ["S08", "I024", "AG-BIO-100", 3.80, 100, 1, 14, "qualified", "N", "ALL"],
    ["S06", "I030", "KQ-SA-CHIP", 420.00, 1, 3, 28, "qualified", "Y", "ALL"],
    ["S06", "I031", "KQ-RB-1L", 45.00, 1, 10, 28, "qualified", "Y", "ALL"],
    ["S10", "I032", "ALP-REGEN-1L", 0.20, 1000, 1, 3, "qualified", "Y", "LSN"],
    ["S13", "I040", "LA-TSD-500", 0.68, 500, 1, 14, "qualified", "Y", "ALL"],
    ["S09", "I041", "LP-Q384-50", 6.50, 50, 4, 12, "qualified", "Y", "ALL"],
    ["S09", "I042", "LP-OS-100", 1.20, 100, 2, 12, "qualified", "Y", "ALL"],
    ["S13", "I050", "LA-FSP-10", 95.00, 10, 1, 14, "qualified", "Y", "ALL"],
    ["S09", "I051", "LP-B384-50", 7.80, 50, 2, 12, "qualified", "Y", "ALL"],
    ["S14", "I060", "CX-SEC-46150", 1250.00, 1, 1, 56, "quoted", "N", "ALL"],
    ["S14", "I061", "CX-CESDS-C", 620.00, 1, 2, 56, "quoted", "N", "ALL"],
    ["S10", "I062", "ALP-SECMP-1L", 38.00, 1, 4, 5, "qualified", "Y", "LSN"],
    ["S09", "I070", "LP-PCR384-50", 4.90, 50, 10, 12, "qualified", "Y", "ALL"],
    ["S11", "I070", "TS-PCR384-50", 4.60, 50, 4, 5, "in_qualification", "N", "ALL"],
    ["S09", "I071", "LP-T50F-3840", 0.045, 3840, 5, 12, "qualified", "Y", "ALL"],
    ["S11", "I071", "TS-T50F-3840", 0.049, 3840, 2, 5, "qualified", "N", "ALL"],
    ["S09", "I072", "LP-T200F-3840", 0.060, 3840, 3, 12, "qualified", "Y", "ALL"],
    ["S09", "I073", "LP-DW96-50", 3.40, 50, 4, 12, "qualified", "Y", "ALL"],
    ["S09", "I074", "LP-FS-100", 0.90, 100, 5, 12, "qualified", "Y", "ALL"],
    ["S10", "I075", "ALP-GLV-M", 9.50, 10, 5, 3, "qualified", "Y", "LSN"],
    ["S11", "I075", "TS-GLV-M", 8.20, 10, 5, 3, "qualified", "Y", "LDN"],
    ["S13", "I080", "LA-QC384", 260.00, 1, 5, 21, "qualified", "Y", "ALL"],
    ["S13", "I081", "LA-TLD-10", 160.00, 10, 1, 21, "qualified", "Y", "ALL"],
]
w("supplier_items.csv", ["supplier_id", "item_id", "supplier_sku", "unit_price", "pack_size", "moq_packs",
                         "quoted_lead_time_days", "qualification_status", "preferred", "site_scope"], sourcing)
w("price_breaks.csv", ["supplier_id", "item_id", "min_annual_qty", "unit_price"], [
    ["S01", "I001", 0, 21.00], ["S01", "I001", 150000, 19.20], ["S01", "I001", 300000, 17.60], ["S01", "I001", 600000, 15.90],
    ["S03", "I010", 0, 290.00], ["S03", "I010", 6000, 268.00], ["S03", "I010", 12000, 245.00],
    ["S05", "I020", 0, 11.50], ["S05", "I020", 60000, 10.40], ["S05", "I020", 120000, 9.60],
    ["S07", "I024", 0, 3.20], ["S07", "I024", 400000, 2.85],
    ["S09", "I071", 0, 0.045], ["S09", "I071", 5000000, 0.039],
])
w("contracts.csv", ["contract_id", "supplier_id", "type", "start_date", "end_date", "annual_commitment_value",
                    "currency", "scope_items", "status", "notes"], [
    ["C-2026-01", "S01", "frame_agreement", "2026-01-01", "2026-12-31", 2400000, "USD", "I001;I002", "active",
     "Tiered pricing on annual fragment volume; renewal to negotiate before 2027"],
    ["C-2026-02", "S09", "frame_agreement", "2026-04-01", "2027-03-31", 420000, "EUR", "I041;I042;I051;I070;I071;I072;I073;I074", "active",
     "EDI ordering; 60-day payment terms"],
    ["C-2026-03", "S03", "none", "", "", 0, "EUR", "I010;I011", "spot",
     "No agreement despite largest reagent spend; portal upload ordering"],
])

# ---------------------------------------------------------------- assays & BOM
assays = [
    ["BIND_BLI", "Binding affinity (BLI)", "live", "Default binding assay, 2 replicates"],
    ["BIND_SPR", "Binding kinetics (SPR)", "live", "Premium kinetics"],
    ["EXPR", "Expression only", "live", "Expression + QC"],
    ["THERMO", "Thermostability", "live", "Thermal shift"],
    ["ENZ_ACT", "Enzyme activity", "live", "Launched 2026-06"],
    ["DEVELOP", "Developability panel", "in_development", "SEC + CE-SDS; LSN launch planned 2027-02-01"],
]
w("assays.csv", ["assay_id", "assay_name", "status", "notes"], assays)
assay_sites = [
    ["BIND_BLI", "LSN", "2024-06-01"], ["BIND_SPR", "LSN", "2025-04-01"], ["EXPR", "LSN", "2024-06-01"],
    ["THERMO", "LSN", "2025-01-15"], ["ENZ_ACT", "LSN", "2026-06-01"], ["DEVELOP", "LSN", "2027-02-01"],
    ["BIND_BLI", "LDN", "2027-01-11"], ["EXPR", "LDN", "2027-01-11"], ["THERMO", "LDN", "2027-03-01"],
    ["ENZ_ACT", "LDN", "2027-06-01"], ["BIND_SPR", "LDN", "2027-07-01"],
]
w("assay_sites.csv", ["assay_id", "site_id", "available_from"], assay_sites)

# common workflow steps (every protein): DNA -> expression -> QC
COMMON = [
    ("DNA", "I001", 1.05), ("DNA", "I002", 1 / 96 * 1.1), ("DNA", "I003", 0.025), ("DNA", "I004", 0.004), ("DNA", "I005", 0.02),
    ("EXPRESSION", "I010", 0.040), ("EXPRESSION", "I011", 0.020), ("EXPRESSION", "I012", 0.004), ("EXPRESSION", "I013", 0.003),
    ("QC", "I080", 1 / 384 * 1.15), ("QC", "I081", 0.005),
    ("CONSUMABLES", "I070", 0.016), ("CONSUMABLES", "I071", 6), ("CONSUMABLES", "I072", 2), ("CONSUMABLES", "I073", 0.0104),
    ("CONSUMABLES", "I074", 0.02), ("CONSUMABLES", "I075", 0.003),
]
SPECIFIC = {
    "BIND_BLI": [("BLI", "I020", 0.40), ("BLI", "I021", 0.15), ("BLI", "I022", 0.30), ("BLI", "I023", 1 / 96), ("BLI", "I024", 0.50)],
    "BIND_SPR": [("SPR", "I030", 1 / 200), ("SPR", "I031", 0.005), ("SPR", "I032", 0.5), ("SPR", "I024", 0.30)],
    "EXPR": [],
    "THERMO": [("THERMO", "I040", 0.02), ("THERMO", "I041", 1 / 96), ("THERMO", "I042", 1 / 96)],
    "ENZ_ACT": [("ENZYME", "I050", 0.02), ("ENZYME", "I051", 1 / 96)],
    "DEVELOP": [("DEVELOP", "I060", 1 / 1500), ("DEVELOP", "I061", 1 / 400), ("DEVELOP", "I062", 0.01)],
}
bom = []
BOM = {}
for a, *_ in assays:
    lines = COMMON + SPECIFIC[a]
    BOM[a] = {}
    for step, it, q in lines:
        BOM[a][it] = BOM[a].get(it, 0) + q
        bom.append([a, step, it, round(q, 6), 0.0 if step != "EXPRESSION" else 0.05])
w("bom.csv", ["assay_id", "step", "item_id", "qty_per_protein", "loss_factor"], bom)
LOSS = {r[2]: r[4] for r in bom}

# ---------------------------------------------------------------- demand
def mondays(start, end):
    d = start
    while d <= end:
        yield d; d += timedelta(days=7)

HIST_START, HORIZON_END = date(2026, 1, 5), date(2027, 12, 27)

def lsn_total(d):
    t = (d - date(2026, 1, 5)).days / 7
    if d < TODAY:
        base = 1450 * math.exp(math.log(3250 / 1450) * t / 40)
    elif d <= date(2027, 3, 29):
        t2 = (d - TODAY).days / 7; T = (date(2027, 3, 29) - TODAY).days / 7
        base = 3300 + (6800 - 3300) * (t2 / T) ** 1.2
    else:
        t3 = (d - date(2027, 3, 29)).days / 7; T = (HORIZON_END - date(2027, 3, 29)).days / 7
        base = 6800 + (8200 - 6800) * t3 / T
    return base

def ldn_total(d):
    golive = date(2027, 1, 11)
    if d < golive: return 0
    t = (d - golive).days / 7
    return 250 + 3350 / (1 + math.exp(-(t - 22) / 6))

def holiday(d):
    if d.month == 12 and d.day >= 21: return 0.35
    if d.month == 1 and d.day <= 4: return 0.35
    if d.month == 8 and d.day <= 14: return 0.8
    return 1.0

def mix(d, site):
    t = (d - HIST_START).days / 365
    enz = 0.0 if d < date(2026, 6, 1) else min(0.04 + 0.05 * t, 0.10)
    dev = 0.0
    if site == "LSN" and d >= date(2027, 2, 1):
        dev = min(0.06, 0.01 + 0.005 * (d - date(2027, 2, 1)).days / 7)
    spr = 0.07 if site == "LSN" or d >= date(2027, 7, 1) else 0.0
    thermo = 0.12 if site == "LSN" or d >= date(2027, 3, 1) else 0.0
    if site == "LDN" and d < date(2027, 6, 1): enz = 0.0
    expr = 0.12
    bli = 1 - enz - dev - spr - thermo - expr
    return {"BIND_BLI": bli, "BIND_SPR": spr, "EXPR": expr, "THERMO": thermo, "ENZ_ACT": enz, "DEVELOP": dev}

demand = []
ACT = {}  # (week, site, assay) -> actual proteins
for d in mondays(HIST_START, HORIZON_END):
    for site, fn in (("LSN", lsn_total), ("LDN", ldn_total)):
        tot = fn(d) * holiday(d)
        if tot <= 0: continue
        m = mix(d, site)
        for a, share in m.items():
            if share <= 0: continue
            noise = random.gauss(1, 0.06 if d < TODAY else 0.03)
            q = int(round(tot * share * noise))
            if d < TODAY: status = "actual"
            elif d < TODAY + timedelta(weeks=4): status = "committed"
            else: status = "forecast"
            demand.append([d.isoformat(), site, a, q, status, "customer"])
            if d < TODAY: ACT[(d, site, a)] = q
    # design competition: Sep 7 -> Dec 14 2026, ~5,000 proteins on BLI at LSN
    if date(2026, 9, 7) <= d <= date(2026, 12, 14):
        q = int(round(random.gauss(345, 25) * holiday(d)))
        status = "actual" if d < TODAY else ("committed" if d < TODAY + timedelta(weeks=4) else "forecast")
        demand.append([d.isoformat(), "LSN", "BIND_BLI", q, status, "competition"])
        if d < TODAY: ACT[(d, "LSN", "BIND_BLI")] = ACT.get((d, "LSN", "BIND_BLI"), 0) + q
w("demand_forecast.csv", ["week_start", "site_id", "assay_id", "proteins", "status", "source"], demand)

# ---------------------------------------------------------------- weekly theoretical consumption (LSN, history)
def consumption(week, site="LSN"):
    out = {}
    for a in BOM:
        p = ACT.get((week, site, a), 0)
        for it, q in BOM[a].items():
            out[it] = out.get(it, 0) + p * q * (1 + LOSS.get(it, 0))
    return out
weeks_hist = list(mondays(HIST_START, TODAY - timedelta(days=7)))
WEEKLY = {wk: consumption(wk) for wk in weeks_hist}
recent = weeks_hist[-6:]
AVG = {it: sum(WEEKLY[wk].get(it, 0) for wk in recent) / len(recent) for it in ITEM}

# ---------------------------------------------------------------- purchase orders (LSN history + open)
pref = {}
for s in sourcing:
    if s[8] == "Y" and s[9] in ("ALL", "LSN") and s[1] not in pref:
        pref[s[1]] = s
CADENCE = {"I001": 1, "I002": 2, "I010": 3, "I011": 3, "I012": 6, "I013": 8, "I020": 4, "I021": 6, "I023": 6,
           "I024": 3, "I030": 8, "I031": 8, "I080": 4}
LT_NOISE = {"S05": (6, 9), "S03": (2, 5), "S04": (4, 7), "S01": (0, 2), "S14": (0, 0)}  # (bias, sd) days
po_rows, po_n = [], 1000
open_late = None
for it, s in sorted(pref.items()):
    if it in ("I060", "I061", "I062"): continue
    sup, cad = s[0], CADENCE.get(it, 4)
    pack = s[4] * s[5]
    bias, sd = LT_NOISE.get(sup, (1, 2))
    wk_i = 0
    while wk_i < len(weeks_hist) + 4:
        od = HIST_START + timedelta(weeks=wk_i, days=random.randint(0, 3))
        if od > TODAY: break
        horizon = [HIST_START + timedelta(weeks=wk_i + k + 1) for k in range(cad)]
        need = sum(WEEKLY.get(h, {}).get(it, AVG[it]) for h in horizon) * 1.05
        if need <= 0: wk_i += cad; continue
        qty = max(pack, math.ceil(need / s[4]) * s[4])
        lt_q = s[6]
        promised = od + timedelta(days=lt_q)
        actual_lt = max(2, int(round(random.gauss(lt_q + bias, sd))))
        recv = od + timedelta(days=actual_lt)
        price = s[3]
        if it == "I001" and od >= date(2026, 7, 1): price = 19.20  # tier 2 reached mid-year
        po_n += 1
        po_id = f"PO-26-{po_n}"
        if recv <= TODAY:
            row = [po_id, 1, "LSN", sup, it, qty, price, SUP[sup][3], od.isoformat(), promised.isoformat(), recv.isoformat(), "received"]
        else:
            row = [po_id, 1, "LSN", sup, it, qty, price, SUP[sup][3], od.isoformat(), promised.isoformat(), "", "open"]
        po_rows.append(row)
        wk_i += cad
# planted: late open PO for SA biosensors (promised 2026-10-12, not received)
cands = [r for r in po_rows if r[4] == "I020" and r[8] <= "2026-09-05"]
r = cands[-1]
r[10], r[11], r[9], r[8] = "", "open", "2026-10-12", "2026-08-31"; open_late = r[0]
w("purchase_orders.csv", ["po_id", "line", "site_id", "supplier_id", "item_id", "qty", "unit_price", "currency",
                          "order_date", "promised_date", "received_date", "status"], po_rows)

# ---------------------------------------------------------------- inventory lots (LSN today; LDN empty)
COVER_WEEKS = {"I020": 2.1, "I021": 5, "I070": 30, "I010": 9.5, "I011": 4.5, "I012": 7, "I001": 2.5, "I024": 4}
lots = []
lot_n = 0
for it in ITEM:
    if it in ("I060", "I061"): continue
    avg = AVG[it] if AVG[it] > 0 else 0
    if it == "I062": continue
    cover = COVER_WEEKS.get(it, random.uniform(4, 10))
    total = avg * cover
    if total <= 0: continue
    shelf = ITEM[it][5]
    n_lots = 1 if total < 50 else random.choice([2, 3])
    remaining = total
    for k in range(n_lots):
        lot_n += 1
        q = remaining if k == n_lots - 1 else remaining * random.uniform(0.3, 0.6)
        remaining -= q
        recv = TODAY - timedelta(days=random.randint(5, 70) + 20 * k)
        exp = recv + timedelta(days=shelf)
        lots.append(["LSN", it, f"L{it[1:]}-{lot_n:04d}", round(q, 3), recv.isoformat(), exp.isoformat(),
                     "available", f"{ITEM[it][4]}-{random.randint(1, 6)}"])
# planted: lysate lot expiring in 3 weeks with excess quantity
lot_n += 1
lots.append(["LSN", "I010", f"L010-{lot_n:04d}", 900.0, "2026-02-12", "2026-11-09", "available", "-80C-2"])
# planted: expired target protein lot still on shelf
lot_n += 1
lots.append(["LSN", "I024", f"L024-{lot_n:04d}", 2600.0, "2025-10-01", "2026-10-02", "available", "-80C-4"])
# make sure planted lysate does not inflate cover weirdly: keep it, it's the point
w("inventory_lots.csv", ["site_id", "item_id", "lot_id", "qty_on_hand", "received_date", "expiry_date", "status", "location"], lots)

# cycle counts
cc = []
for it in random.sample(list(AVG.keys()), 10):
    if AVG[it] <= 0: continue
    sys_q = round(AVG[it] * random.uniform(2, 6), 2)
    cc.append(["2026-10-15", "LSN", it, sys_q, round(sys_q * random.uniform(0.97, 1.02), 2)])
sys_q = round(AVG["I011"] * 4.5, 2)
cc.append(["2026-10-15", "LSN", "I011", sys_q, round(sys_q * 0.82, 2)])  # planted -18%
w("cycle_counts.csv", ["count_date", "site_id", "item_id", "system_qty", "counted_qty"], cc)

# ---------------------------------------------------------------- landed cost & fx
lanes = []
FEES = {  # (origin_region, dest) -> freight_pct, cold_fee_frozen, cold_fee_chilled, broker_fee, duty_pct
    ("US", "LSN"): (0.04, 480, 260, 85, 0.0), ("EU", "LSN"): (0.025, 210, 120, 60, 0.0), ("CH", "LSN"): (0.0, 0, 0, 0, 0.0),
    ("GB", "LSN"): (0.03, 260, 150, 70, 0.0), ("US", "LDN"): (0.04, 450, 240, 75, 0.02), ("EU", "LDN"): (0.025, 190, 110, 65, 0.0),
    ("CH", "LDN"): (0.03, 240, 140, 70, 0.0), ("GB", "LDN"): (0.0, 0, 0, 0, 0.0),
}
for (o, dsite), (fp, cf, cc_, bf, duty) in FEES.items():
    vat = 0.081 if dsite == "LSN" else 0.20
    dom = (o == "CH" and dsite == "LSN") or (o == "GB" and dsite == "LDN")
    lanes.append([o, dsite, fp, cf, cc_, bf, duty, vat, "Y", "CHF" if dsite == "LSN" else "GBP",
                  "domestic" if dom else "import - assumptions to verify (rates, origin rules, broker)"])
w("landed_cost_lanes.csv", ["origin_region", "dest_site", "freight_pct_of_value", "cold_chain_fee_frozen_per_shipment",
                            "cold_chain_fee_chilled_per_shipment", "customs_broker_fee_per_shipment", "duty_pct",
                            "import_vat_pct", "vat_recoverable", "fee_currency", "notes"], lanes)
w("country_regions.csv", ["country", "region"], [[c, "EU" if c in ("DE", "FR", "DK", "SE") else c] for c in
                                                ("US", "DE", "FR", "DK", "SE", "CH", "GB")])
fx = []
for m in range(1, 13):
    for y in (2026, 2027):
        fx.append([f"{y}-{m:02d}", "USD", round(0.80 + random.uniform(-0.015, 0.015), 4), "actual" if (y, m) < (2026, 10) else "budget"])
        fx.append([f"{y}-{m:02d}", "EUR", round(0.935 + random.uniform(-0.01, 0.01), 4), "actual" if (y, m) < (2026, 10) else "budget"])
        fx.append([f"{y}-{m:02d}", "GBP", round(1.07 + random.uniform(-0.015, 0.015), 4), "actual" if (y, m) < (2026, 10) else "budget"])
        fx.append([f"{y}-{m:02d}", "CHF", 1.0, "actual" if (y, m) < (2026, 10) else "budget"])
fx.sort()
w("fx_rates.csv", ["month", "currency", "rate_to_chf", "type"], fx)

# ---------------------------------------------------------------- messy vendor export (mapping test)
with open(os.path.join(OUT, "vendor_exports", "labplast_preisliste_2027.csv"), "w", newline="", encoding="utf-8") as f:
    wr = csv.writer(f, delimiter=";")
    wr.writerow(["Art.-Nr.", "Bezeichnung", "VE (Stk)", "Preis/Stk (EUR)", "Mindestmenge (VE)", "Lieferzeit (AT)", "gültig ab"])
    for s in sourcing:
        if s[0] == "S09":
            new = s[3] * random.uniform(1.03, 1.06)
            wr.writerow([s[2], ITEM[s[1]][1], s[4], f"{new:.3f}".replace(".", ","), s[5], round(s[6] * 5 / 7), "01.01.2027"])
print("open late PO:", open_late)
print("lines demand", len(demand), "po", len(po_rows), "lots", len(lots))
