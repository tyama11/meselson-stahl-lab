// =========================================================================
// 共通型定義 (Domain & Application Types)
// =========================================================================

export type HypothesisId = 'conservative' | 'semiconservative' | 'dispersive';
export type StrandColor = 'red' | 'blue';
export type NullableStrand = StrandColor | null;
export type DensityTierKey = 'light' | 'light-mid' | 'mid' | 'heavy';
export type Generation = 1 | 2;
export type Gen0Phase = 'idle' | 'loading' | 'spinning' | 'settling' | 'done';
export type CentrifugePhase = 'idle' | 'loading' | 'spinning' | 'settling';
export type SlotActionType = 'build' | 'split' | 'cut' | 'mix';
export type StrandSide = 'left' | 'right';
export type AbsorbMode = 'ready' | 'justBuilt' | null;

export interface HypothesisMeta {
  readonly id: HypothesisId;
  readonly number: string;
  readonly name: string;
  readonly accentText: string;
  readonly summary: string;
}

export interface DensityTier {
  readonly key: DensityTierKey;
  readonly ratio: number;
  readonly shortLabel: string;
  readonly positionLabel: string;
  readonly bgClass: string;
  readonly glowClass: string;
  readonly badgeClass: string;
  readonly ratioText: string;
}

export interface Molecule {
  readonly tierKey: DensityTierKey;
  readonly heavyRatio: number;
  readonly segmented: boolean;
}

export interface ConservativeSlot {
  id: number;
  label: string;
  left: NullableStrand;
  right: NullableStrand;
  built: boolean;
  isOriginal: boolean;
  justBuilt: boolean;
}

export interface SemiconservativeSlot {
  id: number;
  label: string;
  exists: boolean;
  split: boolean;
  left: NullableStrand;
  right: NullableStrand;
  built: boolean;
  newSide: StrandSide | null;
  justBuilt: boolean;
}

export interface DispersiveSlot {
  id: number;
  label: string;
  exists: boolean;
  cut: boolean;
  mixed: boolean;
  justBuilt: boolean;
  leftSegs: NullableStrand[];
  rightSegs: NullableStrand[];
  newLeftMask: boolean[];
  newRightMask: boolean[];
}

export type DnaSlot = ConservativeSlot | SemiconservativeSlot | DispersiveSlot;

export interface BandSummaryItem extends DensityTier {
  readonly count: number;
  readonly fraction: number;
  readonly percent: number;
  readonly topPct: number;
}

export interface BandSummary {
  readonly bands: BandSummaryItem[];
  readonly ratioStr: string;
  readonly compactLabel: string;
  readonly detailText: string;
}

export interface RecordedHypothesisResult {
  gen1: Molecule[] | null;
  gen2: Molecule[] | null;
}

export interface Point2D {
  readonly tx: number;
  readonly ty: number;
}
