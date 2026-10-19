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

## Commands

```bash
npm install
npm test            # engine must reproduce the reference values
npm run reference   # regenerate expected values with the Python reference (needs python3)
npm run dev         # app (in progress)
```
