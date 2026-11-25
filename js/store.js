import { HYPOTHESIS_ORDER } from './config.js';

// =========================================================================
// 状態管理ストア (Single State Tree + Timer Management)
// =========================================================================
export const store = {
  hypothesis: 'semiconservative'                ,
  currentGen: 1              ,
  gen0Phase: 'idle'             ,
  centrifugePhase: 'idle'                   ,
  gen1Spun: false,
  gen2Spun: false,
  gen1Slots: []             ,
  gen2Slots: []             ,
  recordedResults: {
    conservative: { gen1: null, gen2: null },
    semiconservative: { gen1: null, gen2: null },
    dispersive: { gen1: null, gen2: null }
  }                                                  ,
  actualResultRevealed: false,
  timers: new Map                                       (),

  setTimer(key        , fn            , ms        )       {
    this.clearTimer(key);
    const id = globalThis.setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, ms);
    this.timers.set(key, id);
  },

  clearTimer(key        )       {
    const existing = this.timers.get(key);
    if (existing !== undefined) {
      globalThis.clearTimeout(existing);
      this.timers.delete(key);
    }
  },

  clearAllTimers()       {
    this.timers.forEach((id) => globalThis.clearTimeout(id));
    this.timers.clear();
  },

  isBusy()          {
    return this.centrifugePhase !== 'idle';
  },

  getCurrentSlots()            {
    return this.currentGen === 1 ? this.gen1Slots : this.gen2Slots;
  },

  countCompletedHypotheses()         {
    return HYPOTHESIS_ORDER.filter(
      (h) => this.recordedResults[h].gen1 !== null && this.recordedResults[h].gen2 !== null
    ).length;
  }
};
