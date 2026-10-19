import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze } from './derived';
import { addDays, buildModel, loadDataset } from './engine';
import { baseParams, runScenario, summarize } from './scenario';

const root = join(__dirname, '..', '..');
const files = Object.fromEntries(readdirSync(join(root, 'data')).filter((f) => f.endsWith('.csv')).map((f) => [f, readFileSync(join(root, 'data', f), 'utf8')]));
const base = buildModel(loadDataset(files));
const b = summarize(analyze(base), baseParams());

describe('scenario engine', () => {
  it('neutral parameters reproduce the base exactly', () => {
    const s = summarize(runScenario(base, baseParams()), baseParams());
    expect(s.status).toEqual(b.status);
    expect(s.policyCash).toBeCloseTo(b.policyCash, 6);
    expect(s.cogs27).toBeCloseTo(b.cogs27, 6);
    expect(s.londonCash).toBe(b.londonCash);
  });
  it('never modifies the base data', () => {
    const before = JSON.stringify(base.ds.demand);
    runScenario(base, { ...baseParams(), multiplier: { LSN: 1.5, LDN: 2 }, londonShiftWeeks: 4 });
    expect(JSON.stringify(base.ds.demand)).toBe(before);
  });
  it('higher LSN throughput raises stock needs and COGS', () => {
    const p = { ...baseParams(), multiplier: { LSN: 1.3, LDN: 1 } };
    const s = summarize(runScenario(base, p), p);
    expect(s.policyCash).toBeGreaterThan(b.policyCash * 1.2);
    expect(s.cogs27).toBeGreaterThan(b.cogs27 * 1.2);
  });
  it('shifting London moves its first order date by the same number of weeks', () => {
    const p = { ...baseParams(), londonShiftWeeks: 4 };
    const s = summarize(runScenario(base, p), p);
    expect(s.firstLondon).toBe(addDays(b.firstLondon, 28));
    expect(s.goLive).toBe('2027-02-08');
  });
  it('a forced Octane lead time raises the I020 reorder point', () => {
    const p = { ...baseParams(), leadTime: { supplier: 'S05', weeks: 9 } };
    const a = runScenario(base, p);
    expect(a.pol.policies.get('I020')!.reorderPoint).toBeGreaterThan(analyze(base).pol.policies.get('I020')!.reorderPoint);
  });
});
