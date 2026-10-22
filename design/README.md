# Supply Planner — design reference

Mockups and rules for building the Supply Planner beta. Every figure in the mockups comes from the synthetic dataset (`data/`, reference date **2026-10-19**) and is reproduced by `reference/compute_reference.py`. When the app's engine runs on the same dataset, it must return the values in `reference/expected_values.json`.

## Contents

| Path | What it is |
|---|---|
| `screens/V01…V06-*.dc.html`, `V08-COGS.dc.html` | The 7 presentation views, 1920 × 1080 (V08 is view 7) |
| `screens/V07-Scenarios.dc.html`, `V09-Orders.dc.html` | Admin screens, 1440 wide: scenarios; orders & automation |
| `screens/Panel-Octane.dc.html` | Supplier side panel (680 wide) |
| `screens/V03-Inventory.dc.html` | Also shows the item side panel (I020) |
| `screens/Panel-I060.dc.html` | Item panel, state: no qualified supplier |
| `screens/State-*.dc.html` | States: London before opening, import awaiting mapping, live update |
| `screens/Components.dc.html` | Component sheet: KPI card, alert row, badges, site selector and legend, lead-time zone |
| `screens/canvas.json` | Canvas layout (positions and titles of the artboards) |
| `tokens.json` | Colours, type scale, radii, sizes |
| `reference/compute_reference.py` | Reference calculations (Python, no dependencies) |
| `reference/expected_values.json` | Its output on the dataset: the numbers the engine must match |

The `.dc.html` files are self-contained HTML: open the source for exact sizes, spacing and colours (inline styles). For pictures, export PNGs from the canvas (Share › Export) into `screens/png/`.

## Product rules

- **Every view answers one question and ends on an action.** An alert without a proposed action is a defect.
- **Navigation:** ← → between the 7 views, position indicator (n / 7), site selector **LSN / LDN / Group** always top right. Clicking an item or supplier opens a side panel (680 px) without leaving the view.
- **Status:** critical / watch / OK, always icon + label (octagon / triangle / circle-check), never colour alone.
- **Sites:** LSN purple square, LDN teal circle, same in every chart.
- **Lead-time zone:** hatched band starting today, as wide as the supplier's *observed* lead time.
- **Actual vs forecast:** solid vs dashed / lighter. Competition demand is hatched and labelled "temporary".
- **"Synthetic data" band** on every view (remove for production data).
- **Units always visible** (CHF, GBP, weeks, mL, proteins/week). Identifiers (I020, PO-26-1145, L020-0021) in Geist Mono.
- If aesthetics and the legibility of a number conflict, legibility wins.
- **Screen sizes.** The mockups are drawn at 1920 × 1080 as a reference, not as a fixed size. In the app, *presentation mode* renders each view on a 1920 × 1080 stage scaled to fit the window (letterboxed), so it works the same on a 13" laptop (≈ 0.75×) and a 1080p projector (1×); keep every text ≥ 13 px at reference size so it stays ≥ 10 px on a laptop. *Working mode* (admin, inventory table, panels) is a normal responsive layout: the side panel overlays below 1600 px wide, tables scroll horizontally inside their card, KPI rows wrap to 3 then 2 columns.

## Screens

| # | View | Question | Main content | Action |
|---|---|---|---|---|
| 1 | Executive summary | Where do we stand, what needs a decision this month? | 6 KPIs, top 5 alerts, 17-week timeline to London opening and DEVELOP launch | One button per alert |
| 2 | Demand → supply | How many proteins, what do they consume? | Stacked proteins/week by assay, 18 months; item need with lead-time zone | Plan next order |
| 3 | Inventory health | What will run out or expire? | Table sorted by order-by date; item panel: 26-week projection by lot and order, promised vs realistic arrivals | Escalate / draft order |
| 4 | Supplier risk | Who do we depend on too much? | Spend × exposure matrix (log x), second-source pipeline, quoted vs actual lead times | Source / qualify |
| 5 | Cost per protein | Where are the francs to recover? | Waterfall by category incl. landed cost; negotiation simulator on price tiers | Prepare negotiation brief |
| 6 | London go-live | What to order, for how much, to open on 11 January? | Order Gantt by supplier at latest order date, cash, storage, items without UK source | Draft POs |
| 7 | COGS & savings | What does a protein cost us, and how much can we take out? | Quarterly material COGS by site, BLI cost per protein by month, savings pipeline, margin card (needs Finance price) | Next step per lever |
| Admin | Scenarios | What if…? | Parameters; base vs scenario (alerts, cash, cost/protein). **A scenario never modifies base data.** | Save / export |
| Admin | Orders & automation | What needs a human today? | Engine-proposed orders with channel (auto vs manual), exceptions queue, spend by ordering channel | Send / make PDF / resolve |

## Calculation rules (as used in the mockups)

These are first-version rules, deliberately simple. Change them in one place in the engine and in `compute_reference.py`.

- **Weekly use** of an item at a site = Σ over assays (proteins/week × BOM qty per protein × (1 + loss_factor)).
- **Cover (weeks)** = on-hand (non-expired lots) ÷ average use over the next 4 weeks.
- **Observed lead time** = mean (received − ordered) over received POs for the item; falls back to the quoted lead time.
- **Safety stock** = 2 weeks of use. **Reorder point** = (observed lead time + 2 weeks) × use.
- **Order-by date** = first week the projected stock (on hand + open POs at realistic dates − use) falls below safety stock, minus the observed lead time.
- **Realistic arrival** of an open PO = promised date + the supplier's mean delay (Octane: +5 days; a PO already late uses the worst observed delay, +17 days).
- **Expiry risk** = quantity left in a lot on its expiry date under first-expiry-first-out use, over 26 weeks, at purchase price.
- **Single source** = item with exactly one *qualified* supplier for the site.
- **Exposure** of a supplier = current proteins/week of the assays that use at least one item single-sourced from it.
- **Unit price** = last price actually paid at LSN (PO history), else the supplier's list price. Helix I001 is 19.20 USD since July (tier 2), not the 21.00 list.
- **Cost per protein** = Σ BOM qty × unit price × FX of the month. **Landed** adds freight % + duty % of the lane (origin region → site). Import VAT is recoverable and excluded; per-shipment cold-chain and broker fees are not yet allocated.
- **Annual spend** = 2026 PO value annualised (Jan 1 → today).
- **Material COGS** = Σ weekly proteins × cost per protein of the assay at that month's FX (actual to Sep 2026, budget after).
- **Proposed orders** = items whose order-by date is within 14 days; qty = reorder point + 2 weeks − on hand − open POs, rounded up to full packs, at least the MOQ. Channels API, EDI and webshop can be sent automatically; e-mail and portal upload need a PDF or manual upload.
- **London initial stock** = 6 weeks of LDN demand from go-live, on site by 2027-01-04; order-by = 2027-01-04 − quoted lead time of the qualified UK-capable source.

## Key expected values (dataset of 2026-10-19)

| Figure | Value |
|---|---|
| BLI material cost / protein, LSN | 50.64 CHF (landed 52.39; LDN 52.98 CHF = 49.01 GBP) |
| Inventory value, LSN | 1.18 M CHF + 9.0 k CHF in expired lot I024 L024-0066 |
| Expiry risk | I010 lot L010-0065: 429 mL, ≈ 117 k CHF on 2026-11-09 |
| Items below reorder point | 9 of 30 active; cover < lead time: I013, I020, I021 |
| Single-source items | 27 of 30 |
| I020 | cover 1.9 wk, observed lead time 6.3 wk, PO-26-1145 open since promised 2026-10-12 |
| Throughput LSN | 3 419 proteins/week (4-week avg), incl. 352 competition |
| Lysis Bio I010 top tier | 19 297 mL in 2027 → 245 EUR vs 290 list → ≈ 815 k CHF/year, 1.77 CHF/protein |
| Helix I001 tier 3 | 482 424 fragments in 2027 → 17.60 vs 19.20 USD → ≈ 619 k CHF/year |
| Octane I020 tier | 102 301 u in 2027 → 10.40 vs 11.50 USD → ≈ 90 k CHF/year |
| London initial stock | 118 k CHF landed, 9 supplier orders, first by 2026-11-23 (Octane); I022 has no qualified UK source |
| Material COGS | 4.58 M CHF in 2026 to date; 22.0 M CHF forecast 2027 (459 452 proteins) |
| Savings pipeline | 1.52 M CHF/year recurring = 3.32 CHF/protein, plus 117 k one-off (I010 lot) |

Full detail: `reference/expected_values.json`.

## Dataset notes found while designing

- `S02` Codon Forge (18.40 EUR) is **not** cheaper than Helix (19.20 USD) at October FX: 17.27 vs 15.39 CHF per fragment. The dictionary says it is.
- Helix tier 3 (300 k fragments) is reached by LSN alone in 2027; London only brings tier 4 (600 k) closer.
- `S14` Chromalytix is not cold-chain capable but quotes I061, a 2–8 °C item.
- The 2-week safety-stock rule puts five items' order-by dates in the past; tune per item class before trusting "Overdue".

## Not yet designed (from the role scope)

Views 1–7 and the two admin screens cover the role scope except:

1. **Requests and receiving:** internal purchase requests from the lab, goods receipt at the dock, invoice three-way match, vendor onboarding (documents, quality agreement).
2. **Landed cost in full:** per-shipment cold-chain and broker fees, VAT recoverability, consolidation by lane.
3. **Second sources "kept warm":** volume share allocated to each qualified alternate, and its trend.
4. **Margin:** revenue per protein from Finance (the COGS view has a placeholder for it).
