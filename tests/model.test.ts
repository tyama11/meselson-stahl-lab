import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACTUAL_MESELSON_STAHL } from '../src/config.ts';
import { BiologyModel } from '../src/model.ts';
import type {
  ConservativeSlot,
  DispersiveSlot,
  SemiconservativeSlot
} from '../src/types.ts';

describe('BiologyModel: density & band position mapping', () => {
  it('computes linear band top percentages from heavyRatio', () => {
    assert.equal(BiologyModel.computeBandTopPct(0), 24);
    assert.equal(BiologyModel.computeBandTopPct(0.25), 38);
    assert.equal(BiologyModel.computeBandTopPct(0.5), 52);
    assert.equal(BiologyModel.computeBandTopPct(1), 80);
  });

  it('maps heavyRatio thresholds to density tiers', () => {
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(1), 'heavy');
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(0.875), 'heavy');
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(0.5), 'mid');
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(0.375), 'mid');
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(0.25), 'light-mid');
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(0.125), 'light-mid');
    assert.equal(BiologyModel.tierKeyFromHeavyRatio(0), 'light');
  });
});

describe('BiologyModel: conservative replication', () => {
  it('completes Gen 1 (1:1 light:heavy) and Gen 2 (3:1 light:heavy)', () => {
    const g1 = BiologyModel.createGen1Slots('conservative') as ConservativeSlot[];
    assert.equal(g1.length, 2);
    assert.equal(BiologyModel.isGenerationComplete(g1, 'conservative'), false);
    assert.equal(BiologyModel.findNextActionSlotId(g1, 'conservative'), 1);

    // Original slot 0 is already built; duplicate build returns false
    assert.equal(BiologyModel.applySlotAction(g1, 'conservative', 1, 0, 'build'), false);
    assert.equal(BiologyModel.applySlotAction(g1, 'conservative', 1, 1, 'build'), true);
    assert.equal(g1[1].justBuilt, true);
    assert.equal(BiologyModel.isGenerationComplete(g1, 'conservative'), true);
    assert.equal(BiologyModel.findNextActionSlotId(g1, 'conservative'), null);

    const m1 = BiologyModel.getMoleculesFromSlots(g1, 'conservative');
    const s1 = BiologyModel.aggregateBands(m1);
    assert.equal(s1.ratioStr, '1 : 1');
    assert.equal(s1.bands.length, 2);
    assert.deepEqual(
      s1.bands.map((b) => ({ key: b.key, percent: b.percent, topPct: b.topPct })),
      [
        { key: 'light', percent: 50, topPct: 24 },
        { key: 'heavy', percent: 50, topPct: 80 }
      ]
    );

    const g2 = BiologyModel.createGen2Slots('conservative', g1) as ConservativeSlot[];
    assert.equal(g2.length, 4);
    assert.equal(BiologyModel.findNextActionSlotId(g2, 'conservative'), 2);
    assert.equal(BiologyModel.applySlotAction(g2, 'conservative', 2, 2, 'build'), true);
    assert.equal(BiologyModel.findNextActionSlotId(g2, 'conservative'), 3);
    assert.equal(BiologyModel.applySlotAction(g2, 'conservative', 2, 3, 'build'), true);
    assert.equal(BiologyModel.isGenerationComplete(g2, 'conservative'), true);

    const m2 = BiologyModel.getMoleculesFromSlots(g2, 'conservative');
    const s2 = BiologyModel.aggregateBands(m2);
    assert.equal(s2.ratioStr, '3 : 1');
    assert.equal(s2.detailText, '上と下にバンド2本（比 3 : 1）');
    assert.deepEqual(
      s2.bands.map((b) => ({ key: b.key, count: b.count, percent: b.percent })),
      [
        { key: 'light', count: 3, percent: 75 },
        { key: 'heavy', count: 1, percent: 25 }
      ]
    );
  });
});

describe('BiologyModel: semiconservative replication', () => {
  it('completes Gen 1 (100% mid) and Gen 2 (1:1 light:mid) matching actual 1958 data', () => {
    const g1 = BiologyModel.createGen1Slots('semiconservative') as SemiconservativeSlot[];
    assert.equal(BiologyModel.findNextActionSlotId(g1, 'semiconservative'), 0);

    // Cannot build before splitting
    assert.equal(BiologyModel.applySlotAction(g1, 'semiconservative', 1, 0, 'build'), false);
    assert.equal(BiologyModel.applySlotAction(g1, 'semiconservative', 1, 0, 'split'), true);
    // Cannot split again
    assert.equal(BiologyModel.applySlotAction(g1, 'semiconservative', 1, 0, 'split'), false);

    assert.equal(g1[0].left, 'red');
    assert.equal(g1[0].right, null);
    assert.equal(g1[1].exists, true);
    assert.equal(g1[1].right, 'red');

    assert.equal(BiologyModel.applySlotAction(g1, 'semiconservative', 1, 0, 'build'), true);
    assert.equal(BiologyModel.applySlotAction(g1, 'semiconservative', 1, 1, 'build'), true);
    assert.equal(BiologyModel.isGenerationComplete(g1, 'semiconservative'), true);

    const m1 = BiologyModel.getMoleculesFromSlots(g1, 'semiconservative');
    const s1 = BiologyModel.aggregateBands(m1);
    assert.equal(s1.ratioStr, '100%');
    assert.equal(s1.bands[0].key, 'mid');
    assert.equal(s1.bands[0].topPct, 52);

    const g2 = BiologyModel.createGen2Slots('semiconservative', g1) as SemiconservativeSlot[];
    assert.equal(BiologyModel.applySlotAction(g2, 'semiconservative', 2, 0, 'split'), true);
    assert.equal(BiologyModel.applySlotAction(g2, 'semiconservative', 2, 2, 'split'), true);
    for (const id of [0, 1, 2, 3]) {
      assert.equal(BiologyModel.applySlotAction(g2, 'semiconservative', 2, id, 'build'), true);
    }
    assert.equal(BiologyModel.isGenerationComplete(g2, 'semiconservative'), true);

    const m2 = BiologyModel.getMoleculesFromSlots(g2, 'semiconservative');
    const s2 = BiologyModel.aggregateBands(m2);
    assert.equal(s2.ratioStr, '1 : 1');
    assert.deepEqual(
      s2.bands.map((b) => ({ key: b.key, percent: b.percent, topPct: b.topPct })),
      [
        { key: 'light', percent: 50, topPct: 24 },
        { key: 'mid', percent: 50, topPct: 52 }
      ]
    );

    // Matches actual Meselson-Stahl 1958 experimental results
    const actualGen1 = BiologyModel.aggregateBands(ACTUAL_MESELSON_STAHL.gen1);
    const actualGen2 = BiologyModel.aggregateBands(ACTUAL_MESELSON_STAHL.gen2);
    assert.equal(s1.detailText, actualGen1.detailText);
    assert.equal(s2.detailText, actualGen2.detailText);
  });
});

describe('BiologyModel: dispersive replication', () => {
  it('completes Gen 1 (100% mid) and Gen 2 (100% light-mid at 38%)', () => {
    const g1 = BiologyModel.createGen1Slots('dispersive') as DispersiveSlot[];
    assert.equal(BiologyModel.applySlotAction(g1, 'dispersive', 1, 0, 'mix'), false);
    assert.equal(BiologyModel.applySlotAction(g1, 'dispersive', 1, 0, 'cut'), true);
    assert.equal(BiologyModel.applySlotAction(g1, 'dispersive', 1, 0, 'cut'), false);

    assert.equal(BiologyModel.applySlotAction(g1, 'dispersive', 1, 0, 'mix'), true);
    assert.equal(BiologyModel.applySlotAction(g1, 'dispersive', 1, 1, 'mix'), true);
    assert.equal(BiologyModel.isGenerationComplete(g1, 'dispersive'), true);

    const m1 = BiologyModel.getMoleculesFromSlots(g1, 'dispersive');
    assert.equal(m1.every((m) => m.segmented && m.heavyRatio === 0.5), true);
    const s1 = BiologyModel.aggregateBands(m1);
    assert.equal(s1.bands[0].key, 'mid');

    const g2 = BiologyModel.createGen2Slots('dispersive', g1) as DispersiveSlot[];
    assert.equal(BiologyModel.applySlotAction(g2, 'dispersive', 2, 0, 'cut'), true);
    assert.equal(BiologyModel.applySlotAction(g2, 'dispersive', 2, 2, 'cut'), true);
    for (const id of [0, 1, 2, 3]) {
      assert.equal(BiologyModel.applySlotAction(g2, 'dispersive', 2, id, 'mix'), true);
    }
    assert.equal(BiologyModel.isGenerationComplete(g2, 'dispersive'), true);

    const m2 = BiologyModel.getMoleculesFromSlots(g2, 'dispersive');
    assert.equal(m2.every((m) => m.segmented && m.heavyRatio === 0.25), true);
    const s2 = BiologyModel.aggregateBands(m2);
    assert.equal(s2.bands.length, 1);
    assert.equal(s2.bands[0].key, 'light-mid');
    assert.equal(s2.bands[0].topPct, 38);
    assert.equal(s2.bands[0].percent, 100);
  });

  it('supports fallback Gen 2 creation when gen1Slots is omitted', () => {
    const g2Fallback = BiologyModel.createGen2Slots('dispersive');
    assert.equal(g2Fallback.length, 4);
  });
});
