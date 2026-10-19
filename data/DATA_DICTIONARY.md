# Synthetic dataset — supply planning beta (automated protein lab, 2 sites)

**Everything here is invented.** Supplier names, SKUs, prices, lead times and volumes are
plausible orders of magnitude for a high-throughput cell-free protein lab, not real data from
Adaptyv or any vendor. Reference date ("today"): **2026-10-19**. Regenerate with
`python3 generate.py <out_dir>` (seeded, reproducible).

## Files and keys

| File | Grain | Key / foreign keys |
|---|---|---|
| `sites.csv` | site | `site_id` (LSN live, LDN go-live 2027-01-11) |
| `storage_capacity.csv` | site × temperature zone | `site_id` → sites |
| `suppliers.csv` | supplier | `supplier_id`; `ordering_channel` = api / edi / webshop / email / portal_upload |
| `items.csv` | item (item master, shared by both sites) | `item_id`; `uom`, `temp_zone`, `shelf_life_days`, `storage_liters_per_uom` |
| `supplier_items.csv` | sourcing option | (`supplier_id`, `item_id`); price in supplier currency **per uom**; `pack_size` in uom; `moq_packs`; `qualification_status` = qualified / in_qualification / not_started / quoted; `site_scope` = ALL / LSN / LDN |
| `price_breaks.csv` | volume tier | (`supplier_id`, `item_id`, `min_annual_qty`) |
| `contracts.csv` | agreement | `contract_id`; `scope_items` is `;`-separated item_ids |
| `assays.csv` | assay | `assay_id` |
| `assay_sites.csv` | assay availability per site | (`assay_id`, `site_id`, `available_from`) |
| `bom.csv` | assay × item | consumption **per protein** (replicates included); `loss_factor` = extra % (dead volume, failed reactions) |
| `demand_forecast.csv` | week × site × assay × source | `week_start` (Monday); `status` = actual / committed (next 4 weeks) / forecast; `source` = customer / competition |
| `purchase_orders.csv` | PO line (LSN only, Jan 2026 → today) | `po_id`; `received_date` empty when open — use it to measure real lead times vs `promised_date` |
| `inventory_lots.csv` | lot on hand today | (`site_id`, `item_id`, `lot_id`); `expiry_date` |
| `cycle_counts.csv` | physical count | system vs counted quantity |
| `landed_cost_lanes.csv` | origin region × destination site | freight %, cold-chain fee per shipment (frozen / chilled), broker fee, duty %, import VAT % |
| `country_regions.csv` | country → region | maps supplier country to lane origin |
| `fx_rates.csv` | month × currency | `rate_to_chf`; `actual` before Oct 2026, `budget` after |
| `vendor_exports/labplast_preisliste_2027.csv` | messy vendor price list | German headers, `;` separator, decimal commas, lead time in working days — **mapping test**, maps to `supplier_items` |

## Orders of magnitude (to sanity-check the engine)

- Material cost per protein (preferred suppliers, before landed cost): **≈ CHF 45–52** depending on assay; gene fragment + lysate kit ≈ 60% of it.
- LSN volume: ≈ 6k proteins/month (Jan 2026) → ≈ 14k (Oct 2026) → ≈ 27k (mid-2027). LDN ramps from ≈ 1k (Jan 2027) to ≈ 12k/month (Dec 2027).
- Design competition: ≈ 345 extra BLI proteins/week at LSN, 7 Sep → 14 Dec 2026.

## Planted scenarios (the beta should surface all of them)

1. **Stockout risk, single source** — `I020` BLI streptavidin biosensor: ≈ 2 weeks of cover, quoted lead time 42 days (observed is longer and noisier), only one supplier (`S05`), and PO `PO-26-1145` promised 2026-10-12 is still open.
2. **Expiry risk** — `I010` lysate kit lot `L010-…` of 900 mL expires 2026-11-09; with FEFO consumption, ≈ 430 mL (≈ CHF 115k) will expire unused.
3. **Expired lot still available** — `I024` target-protein lot expired 2026-10-02 but status is `available`.
4. **Overstock / cash tied up** — `I070` PCR plates: ≈ 30 weeks of cover.
5. **New assay without qualified supply** — `DEVELOP` launches at LSN on 2027-02-01; `I060`/`I061` only have a quote from a single supplier (`S14`, 56-day lead time) → order-by dates fall in Nov–Dec 2026, after a qualification step.
6. **London go-live** — LDN has demand from 2027-01-11 but zero stock, zero POs, and some LSN-only sourcing (`site_scope`); lanes CH→GB and EU→GB differ from EU→CH.
7. **Negotiation lever** — `S01` gene fragments: 2027 volume (both sites) crosses higher price tiers in `price_breaks.csv`; `S02` is cheaper but still in qualification. `S03` (largest reagent spend) has no contract.
8. **Inventory accuracy** — `I011` cycle count is 18% below the system quantity.
9. **Second sources in progress** — `S15` for lysate, `S02` for fragments, `S11` for plastics (UK).
