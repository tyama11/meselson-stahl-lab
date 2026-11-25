import { store } from './store.ts';
import type { SemiconservativeSlot, SlotActionType } from './types.ts';

interface BuildSegFillItem {
  readonly el: HTMLElement;
  readonly idx: number;
}

interface BuildDotItem {
  readonly el: HTMLElement;
  readonly sx: number;
  readonly sy: number;
  readonly tx: number;
  readonly ty: number;
}

// =========================================================================
// インタラクティブジェスチャー制御 (ドラッグ分離・ハサミ切り・なぞり合成)
// =========================================================================
export const GestureController = {
  activeSplitSlotId: null as number | null,
  splitGhostEl: null as HTMLElement | null,
  splitTargetCard: null as HTMLElement | null,
  splitTargetRect: null as DOMRect | null,
  isOverTargetCard: false,

  activeCutSlotId: null as number | null,
  cutStartX: 0,
  cutRequiredDist: 60,
  cutBarEl: null as HTMLElement | null,

  activeBuildSlotId: null as number | null,
  activeBuildOp: null as SlotActionType | null,
  buildStartY: 0,
  buildRequiredDist: 56,
  buildBarEl: null as HTMLElement | null,
  buildFillEls: [] as HTMLElement[],
  buildSegFillEls: [] as BuildSegFillItem[],
  buildDotEls: [] as BuildDotItem[],

  isPointInRect(r: DOMRect | null, x: number, y: number, margin = 12): boolean {
    if (!r) return false;
    return x >= r.left - margin && x <= r.right + margin && y >= r.top - margin && y <= r.bottom + margin;
  },

  cleanupSplitDrag(): void {
    if (this.splitGhostEl) {
      this.splitGhostEl.remove();
      this.splitGhostEl = null;
    }
    if (this.activeSplitSlotId !== null) {
      const origZone = document.querySelector<HTMLElement>(`[data-split-slot="${this.activeSplitSlotId}"]`);
      if (origZone) origZone.classList.remove('opacity-30');

      if (this.splitTargetCard) {
        this.splitTargetCard.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-50/60', 'scale-[1.02]');
      }
      const targetDrop = document.querySelector<HTMLElement>(`[data-drop-target="${this.activeSplitSlotId + 1}"]`);
      if (targetDrop) {
        targetDrop.classList.remove('border-amber-400', 'bg-amber-50', 'text-amber-800');
        targetDrop.textContent = 'ここに右の鎖をドラッグ！';
      }
    }
    this.activeSplitSlotId = null;
    this.splitTargetCard = null;
    this.splitTargetRect = null;
    this.isOverTargetCard = false;
  },

  cleanupCutSwipe(): void {
    if (this.cutBarEl) {
      this.cutBarEl.style.width = '0%';
      this.cutBarEl = null;
    }
    this.activeCutSlotId = null;
  },

  updateBuildProgress(pct: number): void {
    if (this.buildBarEl) this.buildBarEl.style.width = `${pct}%`;

    for (let i = 0; i < this.buildFillEls.length; i++) {
      this.buildFillEls[i].style.height = `${pct}%`;
    }

    for (let i = 0; i < this.buildSegFillEls.length; i++) {
      const { el, idx } = this.buildSegFillEls[i];
      const segPct = Math.max(0, Math.min(100, ((pct - idx * 25) / 25) * 100));
      el.style.height = `${segPct}%`;
    }

    const t = pct / 100;
    const dotOpacity = t <= 0 ? 0 : t < 0.18 ? (t / 0.18) * 0.95 : Math.max(0, (1 - (t - 0.18) / 0.82) * 0.95);
    for (let i = 0; i < this.buildDotEls.length; i++) {
      const { el, sx, sy, tx, ty } = this.buildDotEls[i];
      const cx = (sx + (tx - sx) * t).toFixed(1);
      const cy = (sy + (ty - sy) * t).toFixed(1);
      const sc = (1 - t * 0.65).toFixed(2);
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${sc})`;
      el.style.opacity = dotOpacity.toFixed(2);
    }
  },

  cleanupBuildSwipe(): void {
    if (this.activeBuildSlotId !== null) {
      this.updateBuildProgress(0);
    }
    this.activeBuildSlotId = null;
    this.activeBuildOp = null;
    this.buildBarEl = null;
    this.buildFillEls = [];
    this.buildSegFillEls = [];
    this.buildDotEls = [];
  },

  attach(onSlotAction: (slotId: number, actionType: SlotActionType) => void): void {
    document.addEventListener('pointerdown', (e: PointerEvent) => {
      if (store.isBusy() || !(e.target instanceof Element)) return;

      // 1. 半保存的複製：右鎖ドラッグ
      const splitZone = e.target.closest<HTMLElement>('[data-split-slot]');
      if (splitZone) {
        e.preventDefault();
        const slotId = parseInt(splitZone.getAttribute('data-split-slot') ?? '', 10);
        const slot = store.getCurrentSlots()[slotId] as SemiconservativeSlot | undefined;
        if (!slot || !slot.exists || slot.split) return;

        this.activeSplitSlotId = slotId;
        this.isOverTargetCard = false;
        this.splitTargetCard = document.querySelector<HTMLElement>(`[data-card-slot="${slotId + 1}"]`);
        this.splitTargetRect = this.splitTargetCard ? this.splitTargetCard.getBoundingClientRect() : null;
        splitZone.classList.add('opacity-30');

        const colorClass = slot.right === 'red' ? 'bg-rose-500' : 'bg-sky-500';
        this.splitGhostEl = document.createElement('div');
        this.splitGhostEl.className = `fixed top-0 left-0 w-4 h-24 rounded-full ${colorClass} shadow-xl opacity-95 pointer-events-none z-50 border-2 border-white`;
        this.splitGhostEl.style.willChange = 'transform';
        this.splitGhostEl.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 48}px, 0) scale(1.1)`;
        document.body.appendChild(this.splitGhostEl);

        const targetDrop = document.querySelector<HTMLElement>(`[data-drop-target="${slotId + 1}"]`);
        if (targetDrop) {
          targetDrop.classList.add('border-amber-400', 'bg-amber-50', 'text-amber-800');
          targetDrop.textContent = 'ここにドロップして離す！';
        }
        return;
      }

      // 2. 分散的複製：ハサミのスワイプ切り
      const cutZone = e.target.closest<HTMLElement>('[data-cut-slot]');
      if (cutZone) {
        e.preventDefault();
        const slotId = parseInt(cutZone.getAttribute('data-cut-slot') ?? '', 10);
        this.activeCutSlotId = slotId;
        this.cutStartX = e.clientX;
        this.cutRequiredDist = Math.max(50, cutZone.getBoundingClientRect().width * 0.7);
        this.cutBarEl = document.querySelector<HTMLElement>(`[data-cut-bar="${slotId}"]`);
        return;
      }

      // 3. 全仮説共通：上から下へなぞって青い鎖を合成
      const buildZone = e.target.closest<HTMLElement>('[data-build-slot]');
      if (buildZone) {
        e.preventDefault();
        const slotId = parseInt(buildZone.getAttribute('data-build-slot') ?? '', 10);
        const rawOp = buildZone.getAttribute('data-build-op');
        this.activeBuildSlotId = slotId;
        this.activeBuildOp = rawOp === 'mix' ? 'mix' : 'build';
        this.buildStartY = e.clientY;
        this.buildRequiredDist = Math.max(48, buildZone.getBoundingClientRect().height * 0.65);
        this.buildBarEl = document.querySelector<HTMLElement>(`[data-build-bar="${slotId}"]`);
        this.buildFillEls = Array.from(document.querySelectorAll<HTMLElement>(`[data-build-fill="${slotId}"]`));
        this.buildSegFillEls = Array.from(document.querySelectorAll<HTMLElement>(`[data-build-seg-fill="${slotId}"]`)).map((el) => ({
          el,
          idx: parseInt(el.getAttribute('data-seg-idx') ?? '0', 10)
        }));
        this.buildDotEls = Array.from(document.querySelectorAll<HTMLElement>(`[data-build-dot="${slotId}"]`)).map((el) => ({
          el,
          sx: parseFloat(el.getAttribute('data-sx') ?? '0'),
          sy: parseFloat(el.getAttribute('data-sy') ?? '0'),
          tx: parseFloat(el.getAttribute('data-tx') ?? '0'),
          ty: parseFloat(el.getAttribute('data-ty') ?? '0')
        }));
      }
    });

    document.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activeSplitSlotId !== null) {
        if (this.splitGhostEl) {
          this.splitGhostEl.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 48}px, 0) scale(1.1)`;
        }
        const inside = this.isPointInRect(this.splitTargetRect, e.clientX, e.clientY);
        if (inside !== this.isOverTargetCard) {
          this.isOverTargetCard = inside;
          if (this.splitTargetCard) {
            this.splitTargetCard.classList.toggle('ring-4', inside);
            this.splitTargetCard.classList.toggle('ring-amber-400', inside);
            this.splitTargetCard.classList.toggle('bg-amber-50/60', inside);
            this.splitTargetCard.classList.toggle('scale-[1.02]', inside);
          }
        }
      }

      if (this.activeCutSlotId !== null) {
        const dist = Math.abs(e.clientX - this.cutStartX);
        const pct = Math.min(100, Math.round((dist / this.cutRequiredDist) * 100));
        if (this.cutBarEl) this.cutBarEl.style.width = `${pct}%`;

        if (dist >= this.cutRequiredDist) {
          const targetId = this.activeCutSlotId;
          this.cleanupCutSwipe();
          onSlotAction(targetId, 'cut');
        }
      }

      if (this.activeBuildSlotId !== null) {
        const dy = Math.max(0, e.clientY - this.buildStartY);
        const pct = Math.min(100, Math.round((dy / this.buildRequiredDist) * 100));
        this.updateBuildProgress(pct);

        if (dy >= this.buildRequiredDist) {
          const targetId = this.activeBuildSlotId;
          const targetOp = this.activeBuildOp ?? 'build';
          this.activeBuildSlotId = null;
          this.activeBuildOp = null;
          this.buildBarEl = null;
          this.buildFillEls = [];
          this.buildSegFillEls = [];
          this.buildDotEls = [];
          onSlotAction(targetId, targetOp);
        }
      }
    });

    document.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.activeSplitSlotId !== null) {
        const targetId = this.activeSplitSlotId;
        const dropped = this.isOverTargetCard || this.isPointInRect(this.splitTargetRect, e.clientX, e.clientY);
        this.cleanupSplitDrag();
        if (dropped) onSlotAction(targetId, 'split');
      }
      if (this.activeCutSlotId !== null) {
        this.cleanupCutSwipe();
      }
      if (this.activeBuildSlotId !== null) {
        this.cleanupBuildSwipe();
      }
    });

    document.addEventListener('pointercancel', () => {
      this.cleanupSplitDrag();
      this.cleanupCutSwipe();
      this.cleanupBuildSwipe();
    });
  }
};
