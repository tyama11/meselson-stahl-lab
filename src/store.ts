import { HYPOTHESIS_ORDER } from './config.ts';
import type {
  CentrifugePhase,
  DnaSlot,
  Gen0Phase,
  Generation,
  HypothesisId,
  RecordedHypothesisResult
} from './types.ts';

// =========================================================================
// 状態管理ストア (Single State Tree + Timer Management)
// =========================================================================
export const store = {
  hypothesis: 'semiconservative' as HypothesisId,
  currentGen: 1 as Generation,
  gen0Phase: 'idle' as Gen0Phase,
  centrifugePhase: 'idle' as CentrifugePhase,
  gen1Spun: false,
  gen2Spun: false,
  gen1Slots: [] as DnaSlot[],
  gen2Slots: [] as DnaSlot[],
  recordedResults: {
    conservative: { gen1: null, gen2: null },
    semiconservative: { gen1: null, gen2: null },
    dispersive: { gen1: null, gen2: null }
  } as Record<HypothesisId, RecordedHypothesisResult>,
  actualResultRevealed: false,
  timers: new Map<string, ReturnType<typeof setTimeout>>(),

  setTimer(key: string, fn: () => void, ms: number): void {
    this.clearTimer(key);
    const id = globalThis.setTimeout(() => {
      this.timers.delete(key);
      fn();
    }, ms);
    this.timers.set(key, id);
  },

  clearTimer(key: string): void {
    const existing = this.timers.get(key);
    if (existing !== undefined) {
      globalThis.clearTimeout(existing);
      this.timers.delete(key);
    }
  },

  clearAllTimers(): void {
    this.timers.forEach((id) => globalThis.clearTimeout(id));
    this.timers.clear();
  },

  isBusy(): boolean {
    return this.centrifugePhase !== 'idle';
  },

  getCurrentSlots(): DnaSlot[] {
    return this.currentGen === 1 ? this.gen1Slots : this.gen2Slots;
  },

  countCompletedHypotheses(): number {
    return HYPOTHESIS_ORDER.filter(
      (h) => this.recordedResults[h].gen1 !== null && this.recordedResults[h].gen2 !== null
    ).length;
  }
};
