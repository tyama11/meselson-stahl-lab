// =========================================================================
// 定数・ドメイン設定 (Single Source of Truth)
// =========================================================================

export const CONFIG = {
  SETTLE_DURATION_MS: 1200,
  TUBE_TOP_LIGHT_PCT: 24, // 15N = 0% (完全な14N DNA)
  TUBE_SPAN_PCT: 56       // 15N = 100% -> 24 + 56 = 80% (完全な15N DNA)
};

export const HYPOTHESES = {
  conservative: {
    id: 'conservative',
    number: '仮説①',
    name: '保存的複製',
    accentText: 'text-amber-600',
    summary: '元の2本鎖を残し、新しい2本鎖をまるごと合成'
  },
  semiconservative: {
    id: 'semiconservative',
    number: '仮説②',
    name: '半保存的複製',
    accentText: 'text-emerald-600',
    summary: '元の2本鎖を1本ずつ開き、それぞれに新しい鎖を合成'
  },
  dispersive: {
    id: 'dispersive',
    number: '仮説③',
    name: '分散的複製',
    accentText: 'text-purple-600',
    summary: '元のDNAを細かく切って分配し、隙間を新しい鎖で補完'
  }
};

export const HYPOTHESIS_ORDER = ['conservative', 'semiconservative', 'dispersive'];

// 15Nの含有割合（0.0〜1.0）から線形密度位置・視覚表現を一元定義
export const DENSITY_TIERS = {
  light: {
    key: 'light',
    ratio: 0,
    shortLabel: '上（軽）',
    positionLabel: '上',
    bgClass: 'bg-sky-400',
    glowClass: 'shadow-[0_0_10px_rgba(56,189,248,0.9)]',
    badgeClass: 'bg-sky-100 text-sky-800',
    ratioText: '15N 0%'
  },
  'light-mid': {
    key: 'light-mid',
    ratio: 0.25,
    shortLabel: 'やや上',
    positionLabel: 'やや上',
    bgClass: 'bg-gradient-to-r from-rose-500 via-sky-400 to-sky-400',
    glowClass: 'shadow-[0_0_10px_rgba(56,189,248,0.8)]',
    badgeClass: 'bg-purple-100 text-purple-800',
    ratioText: '15N 25%'
  },
  mid: {
    key: 'mid',
    ratio: 0.5,
    shortLabel: '真ん中（中）',
    positionLabel: '真ん中',
    bgClass: 'bg-gradient-to-r from-rose-500 to-sky-400',
    glowClass: 'shadow-[0_0_10px_rgba(168,85,247,0.7)]',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    ratioText: '15N 50%'
  },
  heavy: {
    key: 'heavy',
    ratio: 1,
    shortLabel: '下（重）',
    positionLabel: '下',
    bgClass: 'bg-rose-500',
    glowClass: 'shadow-[0_0_10px_rgba(244,63,94,0.9)]',
    badgeClass: 'bg-rose-100 text-rose-800',
    ratioText: '15N 100%'
  }
};

export const ACTUAL_MESELSON_STAHL = {
  gen0: [{ tierKey: 'heavy', heavyRatio: 1, segmented: false }],
  gen1: [
    { tierKey: 'mid', heavyRatio: 0.5, segmented: false },
    { tierKey: 'mid', heavyRatio: 0.5, segmented: false }
  ],
  gen2: [
    { tierKey: 'mid', heavyRatio: 0.5, segmented: false },
    { tierKey: 'light', heavyRatio: 0, segmented: false },
    { tierKey: 'light', heavyRatio: 0, segmented: false },
    { tierKey: 'mid', heavyRatio: 0.5, segmented: false }
  ]
};
