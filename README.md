# Supply Planner

Supply planning for an automated protein lab with two sites (Lausanne live, London opening 2027-01-11): demand → consumption, inventory policy, supplier risk, cost per protein, London go-live, COGS and savings.

**All data in `data/` is synthetic** (see `data/DATA_DICTIONARY.md`). Reference date: 2026-10-19.

## Layout

| Path | What |
|---|---|
| `data/` | Synthetic dataset (CSV) and its generator |
| `design/` | Mockups (`screens/*.dc.html`), tokens, calculation rules (`README.md`), reference script and expected values |
| `design/presentation-demo.html` | The mockups as a scaled, full-screen presentation |
| `src/engine/` | Calculation engine (TypeScript), tested against `design/reference/expected_values.json` |
| `src/views/`, `src/app/` | The app: 7 presentation views (Executive, Demand, Inventory, Suppliers, Cost, London, COGS), Orders and Scenarios admin screens, item and supplier panels |
| `demos/procurement-agent.html` | Procurement agent demo: how purchase orders, supplier e-mails, invoices and price lists could be handled by an agent with approval thresholds, exceptions and an audit log |

## Procurement agent demo

`demos/procurement-agent.html` is a standalone page (open it in a browser, no build needed). It walks through one day of the agent's work queue, built on the same synthetic data:

- orders below the approval threshold are sent automatically (EDI, e-mail) after a contract price check;
- larger orders wait for a person's approval;
- a supplier's split-shipment e-mail updates the open PO, reruns the projection and raises a stock-out exception with a draft reply;
- an invoice that does not match the PO price is blocked (3-way match);
- a new supplier price list is mapped and checked against the contract;
- a supplier portal that needs a one-time code is handed over to a person.

It is a scripted simulation: no supplier is contacted and no language model runs.

## Commands

```bash
npm install
npm test            # engine must reproduce the reference values
npm run reference   # regenerate expected values with the Python reference (needs python3)
npm run dev         # run the app locally (← → to change screen, F for full screen)
```
