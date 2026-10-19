import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildModel, computeAll, loadDataset } from './engine';

const root = join(__dirname, '..', '..');
const files = Object.fromEntries(readdirSync(join(root, 'data')).filter((f) => f.endsWith('.csv')).map((f) => [f, readFileSync(join(root, 'data', f), 'utf8')]));
const expected = JSON.parse(readFileSync(join(root, 'design', 'reference', 'expected_values.json'), 'utf8'));
const actual = computeAll(buildModel(loadDataset(files), expected.today));

/** Compare numbers with a rounding tolerance; everything else exactly. Returns a list of mismatching paths. */
function diff(a: unknown, e: unknown, path = ''): string[] {
  if (typeof e === 'number') {
    if (typeof a !== 'number') return [`${path}: expected ${e}, got ${String(a)}`];
    const tol = Math.max(Number.isInteger(e) ? 1 : 0.011, Math.abs(e) * 1e-6);
    return Math.abs(a - e) <= tol ? [] : [`${path}: expected ${e}, got ${a}`];
  }
  if (Array.isArray(e)) {
    if (!Array.isArray(a) || a.length !== e.length) return [`${path}: expected array of ${e.length}, got ${JSON.stringify(a)}`];
    return e.flatMap((x, i) => diff(a[i], x, `${path}[${i}]`));
  }
  if (e && typeof e === 'object') {
    if (!a || typeof a !== 'object') return [`${path}: missing`];
    return Object.keys(e).flatMap((k) => diff((a as Record<string, unknown>)[k], (e as Record<string, unknown>)[k], `${path}.${k}`));
  }
  return a === e ? [] : [`${path}: expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`];
}

describe('engine matches the reference calculations', () => {
  for (const section of Object.keys(expected).filter((k) => k !== 'today')) {
    it(section, () => {
      expect(diff(actual[section], expected[section], section)).toEqual([]);
    });
  }
  it('headline figures from the mockups', () => {
    const s = actual.summary as Record<string, unknown>;
    expect((actual.items as Record<string, { cover_weeks: number }>).I020.cover_weeks).toBe(1.9);
    expect(s.single_source_items).toBe(27);
    expect((actual.cost_per_protein_chf as Record<string, { material: number }>).BIND_BLI.material).toBeCloseTo(50.64, 2);
    expect((actual.cogs as { savings_recurring_chf: number }).savings_recurring_chf).toBe(1523726);
  });
});
