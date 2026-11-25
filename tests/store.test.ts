import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ACTUAL_MESELSON_STAHL } from '../src/config.ts';
import { BiologyModel } from '../src/model.ts';
import { store } from '../src/store.ts';

describe('store state & timer management', () => {
  beforeEach(() => {
    store.clearAllTimers();
    store.hypothesis = 'semiconservative';
    store.currentGen = 1;
    store.centrifugePhase = 'idle';
    store.gen1Slots = BiologyModel.createGen1Slots('semiconservative');
    store.gen2Slots = [];
    store.recordedResults = {
      conservative: { gen1: null, gen2: null },
      semiconservative: { gen1: null, gen2: null },
      dispersive: { gen1: null, gen2: null }
    };
  });

  afterEach(() => {
    store.clearAllTimers();
  });

  it('reports isBusy() accurately across centrifuge phases', () => {
    assert.equal(store.isBusy(), false);
    store.centrifugePhase = 'loading';
    assert.equal(store.isBusy(), true);
    store.centrifugePhase = 'spinning';
    assert.equal(store.isBusy(), true);
    store.centrifugePhase = 'settling';
    assert.equal(store.isBusy(), true);
    store.centrifugePhase = 'idle';
    assert.equal(store.isBusy(), false);
  });

  it('returns gen1Slots or gen2Slots based on currentGen', () => {
    store.gen2Slots = BiologyModel.createGen2Slots('semiconservative');
    store.currentGen = 1;
    assert.equal(store.getCurrentSlots(), store.gen1Slots);
    store.currentGen = 2;
    assert.equal(store.getCurrentSlots(), store.gen2Slots);
  });

  it('counts only hypotheses with both gen1 and gen2 recorded', () => {
    assert.equal(store.countCompletedHypotheses(), 0);
    store.recordedResults.conservative.gen1 = ACTUAL_MESELSON_STAHL.gen1;
    assert.equal(store.countCompletedHypotheses(), 0);
    store.recordedResults.conservative.gen2 = ACTUAL_MESELSON_STAHL.gen2;
    assert.equal(store.countCompletedHypotheses(), 1);
    store.recordedResults.semiconservative = {
      gen1: ACTUAL_MESELSON_STAHL.gen1,
      gen2: ACTUAL_MESELSON_STAHL.gen2
    };
    store.recordedResults.dispersive = {
      gen1: ACTUAL_MESELSON_STAHL.gen1,
      gen2: ACTUAL_MESELSON_STAHL.gen2
    };
    assert.equal(store.countCompletedHypotheses(), 3);
  });

  it('overwrites, clears, and fires timers cleanly', async () => {
    let firstFired = false;
    let secondFired = false;
    store.setTimer('k1', () => { firstFired = true; }, 15);
    store.setTimer('k1', () => { secondFired = true; }, 20);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(firstFired, false);
    assert.equal(secondFired, true);
    assert.equal(store.timers.size, 0);

    let clearedFired = false;
    store.setTimer('k2', () => { clearedFired = true; }, 15);
    store.clearTimer('k2');
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(clearedFired, false);
  });
});
