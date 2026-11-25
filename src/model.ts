import { CONFIG, DENSITY_TIERS } from './config.ts';
import type {
  BandSummary,
  BandSummaryItem,
  ConservativeSlot,
  DensityTierKey,
  DispersiveSlot,
  DnaSlot,
  Generation,
  HypothesisId,
  Molecule,
  NullableStrand,
  SemiconservativeSlot,
  SlotActionType
} from './types.ts';

// =========================================================================
// 純粋な生物モデル層 (BiologyModel: DOM非依存)
// =========================================================================
export const BiologyModel = {
  computeBandTopPct(heavyRatio: number): number {
    return CONFIG.TUBE_TOP_LIGHT_PCT + heavyRatio * CONFIG.TUBE_SPAN_PCT;
  },

  tierKeyFromHeavyRatio(heavyRatio: number): DensityTierKey {
    if (heavyRatio >= 0.875) return 'heavy';
    if (heavyRatio >= 0.375) return 'mid';
    if (heavyRatio >= 0.125) return 'light-mid';
    return 'light';
  },

  createDispersiveSlot(
    id: number,
    label: string,
    exists: boolean,
    leftSegs: readonly NullableStrand[],
    rightSegs: readonly NullableStrand[]
  ): DispersiveSlot {
    return {
      id,
      label,
      exists,
      cut: false,
      mixed: false,
      justBuilt: false,
      leftSegs: [...leftSegs],
      rightSegs: [...rightSegs],
      newLeftMask: [false, false, false, false],
      newRightMask: [false, false, false, false]
    };
  },

  createGen1Slots(hypo: HypothesisId): DnaSlot[] {
    if (hypo === 'conservative') {
      const slots: ConservativeSlot[] = [
        { id: 0, label: '① 元のDNA', left: 'red', right: 'red', built: true, isOriginal: true, justBuilt: false },
        { id: 1, label: '② 新しく作るDNA', left: null, right: null, built: false, isOriginal: false, justBuilt: false }
      ];
      return slots;
    }
    if (hypo === 'semiconservative') {
      const slots: SemiconservativeSlot[] = [
        { id: 0, label: '① 1本目のDNA', exists: true, split: false, left: 'red', right: 'red', built: false, newSide: null, justBuilt: false },
        { id: 1, label: '② 2本目のDNA', exists: false, split: false, left: null, right: null, built: false, newSide: null, justBuilt: false }
      ];
      return slots;
    }
    return [
      this.createDispersiveSlot(0, '① 1本目のDNA', true, ['red', 'red', 'red', 'red'], ['red', 'red', 'red', 'red']),
      this.createDispersiveSlot(1, '② 2本目のDNA', false, [null, null, null, null], [null, null, null, null])
    ];
  },

  // 第1世代の実際の結果を引き継いで第2世代の初期スロットを生成
  createGen2Slots(hypo: HypothesisId, gen1Slots: readonly DnaSlot[] = []): DnaSlot[] {
    if (hypo === 'conservative') {
      const cSlots = gen1Slots as readonly ConservativeSlot[];
      const p0 = cSlots[0] ?? { left: 'red' as NullableStrand, right: 'red' as NullableStrand };
      const p1 = cSlots[1] ?? { left: 'blue' as NullableStrand, right: 'blue' as NullableStrand };
      const slots: ConservativeSlot[] = [
        { id: 0, label: '① 元のDNA', left: p0.left, right: p0.right, built: true, isOriginal: true, justBuilt: false },
        { id: 1, label: '② 第1世代のDNA', left: p1.left, right: p1.right, built: true, isOriginal: true, justBuilt: false },
        { id: 2, label: '③ 新しく作るDNA', left: null, right: null, built: false, isOriginal: false, justBuilt: false },
        { id: 3, label: '④ 新しく作るDNA', left: null, right: null, built: false, isOriginal: false, justBuilt: false }
      ];
      return slots;
    }
    if (hypo === 'semiconservative') {
      const sSlots = gen1Slots as readonly SemiconservativeSlot[];
      const p0 = sSlots[0] ?? { left: 'red' as NullableStrand, right: 'blue' as NullableStrand };
      const p1 = sSlots[1] ?? { left: 'blue' as NullableStrand, right: 'red' as NullableStrand };
      const slots: SemiconservativeSlot[] = [
        { id: 0, label: '① 1本目のDNA', exists: true, split: false, left: p0.left, right: p0.right, built: false, newSide: null, justBuilt: false },
        { id: 1, label: '② 2本目のDNA', exists: false, split: false, left: null, right: null, built: false, newSide: null, justBuilt: false },
        { id: 2, label: '③ 3本目のDNA', exists: true, split: false, left: p1.left, right: p1.right, built: false, newSide: null, justBuilt: false },
        { id: 3, label: '④ 4本目のDNA', exists: false, split: false, left: null, right: null, built: false, newSide: null, justBuilt: false }
      ];
      return slots;
    }
    const dSlots = gen1Slots as readonly DispersiveSlot[];
    const p0 = dSlots[0] ?? {
      leftSegs: ['red', 'blue', 'red', 'blue'] as NullableStrand[],
      rightSegs: ['blue', 'red', 'blue', 'red'] as NullableStrand[]
    };
    const p1 = dSlots[1] ?? {
      leftSegs: ['blue', 'red', 'blue', 'red'] as NullableStrand[],
      rightSegs: ['red', 'blue', 'red', 'blue'] as NullableStrand[]
    };
    return [
      this.createDispersiveSlot(0, '① 1本目のDNA', true, p0.leftSegs, p0.rightSegs),
      this.createDispersiveSlot(1, '② 2本目のDNA', false, [null, null, null, null], [null, null, null, null]),
      this.createDispersiveSlot(2, '③ 3本目のDNA', true, p1.leftSegs, p1.rightSegs),
      this.createDispersiveSlot(3, '④ 4本目のDNA', false, [null, null, null, null], [null, null, null, null])
    ];
  },

  clearJustBuiltFlags(slots: readonly DnaSlot[]): void {
    slots.forEach((s) => {
      s.justBuilt = false;
    });
  },

  applySlotAction(
    slots: DnaSlot[],
    hypo: HypothesisId,
    gen: Generation,
    slotId: number,
    actionType: SlotActionType
  ): boolean {
    this.clearJustBuiltFlags(slots);

    if (hypo === 'conservative') {
      const slot = slots[slotId] as ConservativeSlot | undefined;
      if (!slot || slot.built) return false;
      slot.left = 'blue';
      slot.right = 'blue';
      slot.built = true;
      slot.justBuilt = true;
      return true;
    }

    if (hypo === 'semiconservative') {
      const sSlots = slots as SemiconservativeSlot[];
      if (actionType === 'split') {
        const parent = sSlots[slotId];
        const child = sSlots[slotId + 1];
        if (!parent || !child || !parent.exists || parent.split) return false;
        child.left = null;
        child.right = parent.right;
        parent.right = null;
        parent.split = true;
        child.exists = true;
        child.split = true;
        return true;
      }
      if (actionType === 'build') {
        const slot = sSlots[slotId];
        if (!slot || !slot.exists || !slot.split || slot.built) return false;
        if (!slot.left) {
          slot.left = 'blue';
          slot.newSide = 'left';
        } else if (!slot.right) {
          slot.right = 'blue';
          slot.newSide = 'right';
        }
        slot.built = true;
        slot.justBuilt = true;
        return true;
      }
      return false;
    }

    const dSlots = slots as DispersiveSlot[];
    if (actionType === 'cut') {
      const parent = dSlots[slotId];
      const child = dSlots[slotId + 1];
      if (!parent || !child || !parent.exists || parent.cut) return false;

      const pL = [...parent.leftSegs];
      const pR = [...parent.rightSegs];

      if (gen === 1) {
        parent.leftSegs = [pL[0], null, pL[2], null];
        parent.rightSegs = [null, pR[1], null, pR[3]];
        child.leftSegs = [null, pL[1], null, pL[3]];
        child.rightSegs = [pR[0], null, pR[2], null];
      } else if (slotId === 0) {
        parent.leftSegs = [pL[0], null, null, pL[3]];
        parent.rightSegs = [null, pR[1], pR[2], null];
        child.leftSegs = [null, pL[1], pL[2], null];
        child.rightSegs = [pR[0], null, null, pR[3]];
      } else {
        parent.leftSegs = [null, pL[1], pL[2], null];
        parent.rightSegs = [pR[0], null, null, pR[3]];
        child.leftSegs = [pL[0], null, null, pL[3]];
        child.rightSegs = [null, pR[1], pR[2], null];
      }

      parent.cut = true;
      child.exists = true;
      child.cut = true;
      return true;
    }

    if (actionType === 'mix') {
      const slot = dSlots[slotId];
      if (!slot || !slot.exists || !slot.cut || slot.mixed) return false;
      slot.newLeftMask = slot.leftSegs.map((c) => c === null);
      slot.newRightMask = slot.rightSegs.map((c) => c === null);
      slot.leftSegs = slot.leftSegs.map((c) => c || 'blue');
      slot.rightSegs = slot.rightSegs.map((c) => c || 'blue');
      slot.mixed = true;
      slot.justBuilt = true;
      return true;
    }

    return false;
  },

  isSlotComplete(slot: DnaSlot, hypo: HypothesisId): boolean {
    if (hypo === 'dispersive') {
      const d = slot as DispersiveSlot;
      return Boolean(d.exists && d.cut && d.mixed);
    }
    if (hypo === 'semiconservative') {
      const s = slot as SemiconservativeSlot;
      return Boolean(s.exists && s.split && s.built);
    }
    return Boolean((slot as ConservativeSlot).built);
  },

  isGenerationComplete(slots: readonly DnaSlot[], hypo: HypothesisId): boolean {
    return slots.length > 0 && slots.every((s) => this.isSlotComplete(s, hypo));
  },

  findNextActionSlotId(slots: readonly DnaSlot[], hypo: HypothesisId): number | null {
    if (hypo === 'dispersive') {
      const dSlots = slots as readonly DispersiveSlot[];
      const uncut = dSlots.find((s) => s.exists && !s.cut);
      if (uncut) return uncut.id;
      const unmixed = dSlots.find((s) => s.exists && s.cut && !s.mixed);
      return unmixed ? unmixed.id : null;
    }
    if (hypo === 'semiconservative') {
      const sSlots = slots as readonly SemiconservativeSlot[];
      const unsplit = sSlots.find((s) => s.exists && !s.split);
      if (unsplit) return unsplit.id;
      const unbuilt = sSlots.find((s) => s.exists && s.split && !s.built);
      return unbuilt ? unbuilt.id : null;
    }
    const cSlots = slots as readonly ConservativeSlot[];
    const unbuilt = cSlots.find((s) => !s.built);
    return unbuilt ? unbuilt.id : null;
  },

  // 各DNA分子の15N割合を計算（0.0〜1.0）
  calculateHeavyRatio(slot: DnaSlot, hypo: HypothesisId): number {
    if (hypo === 'dispersive') {
      const d = slot as DispersiveSlot;
      const all = [...d.leftSegs, ...d.rightSegs].filter(Boolean);
      if (all.length === 0) return 0;
      const redCount = all.filter((c) => c === 'red').length;
      return redCount / all.length;
    }
    const s = slot as ConservativeSlot | SemiconservativeSlot;
    const strands = [s.left, s.right].filter(Boolean);
    if (strands.length === 0) return 0;
    const redCount = strands.filter((c) => c === 'red').length;
    return redCount / strands.length;
  },

  getMoleculesFromSlots(slots: readonly DnaSlot[], hypo: HypothesisId): Molecule[] {
    return slots.map((slot) => {
      const heavyRatio = this.calculateHeavyRatio(slot, hypo);
      return {
        tierKey: this.tierKeyFromHeavyRatio(heavyRatio),
        heavyRatio,
        segmented: hypo === 'dispersive'
      };
    });
  },

  // バンドごとの分子数・割合・比率テキスト（例：3 : 1）を集計
  aggregateBands(molecules: readonly Molecule[]): BandSummary {
    const total = molecules.length || 1;
    const counts = new Map<DensityTierKey, number>();
    molecules.forEach((m) => {
      counts.set(m.tierKey, (counts.get(m.tierKey) || 0) + 1);
    });

    const order: readonly DensityTierKey[] = ['light', 'light-mid', 'mid', 'heavy'];
    const bands: BandSummaryItem[] = order
      .filter((k) => counts.has(k))
      .map((k) => {
        const count = counts.get(k) ?? 0;
        const tier = DENSITY_TIERS[k];
        return {
          ...tier,
          count,
          fraction: count / total,
          percent: Math.round((count / total) * 100),
          topPct: this.computeBandTopPct(tier.ratio)
        };
      });

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = bands.reduce((acc, b) => gcd(acc, b.count), bands[0]?.count || 1);
    const ratioStr = bands.length > 1
      ? bands.map((b) => b.count / divisor).join(' : ')
      : '100%';

    const posSummary = bands.map((b) => b.positionLabel).join('と');
    const compactLabel = bands.length === 1
      ? `${bands[0].shortLabel}（100%）`
      : `${bands.map((b) => b.positionLabel).join('・')}（${ratioStr}）`;
    const detailText = bands.length === 1
      ? `${posSummary}にバンド1本（100%）`
      : `${posSummary}にバンド${bands.length}本（比 ${ratioStr}）`;

    return { bands, ratioStr, compactLabel, detailText };
  }
};
