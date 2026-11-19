import { store } from './store.js';

// =========================================================================
// インタラクティブジェスチャー制御 (ドラッグ分離・ハサミ切り・なぞり合成)
// =========================================================================
export const GestureController = {
  activeSplitSlotId: null,
  splitGhostEl: null,
  splitTargetCard: null,
  splitTargetRect: null,
  isOverTargetCard: false,

  activeCutSlotId: null,
  cutStartX: 0,
  cutRequiredDist: 60,
  cutBarEl: null,

  activeBuildSlotId: null,
  activeBuildOp: null,
  buildStartY: 0,
  buildRequiredDist: 56,
  buildBarEl: null,
  buildFillEls: [],
  buildSegFillEls: [],

  isPointInRect(r, x, y, margin = 12) {
    if (!r) return false;
    return x >= r.left - margin && x <= r.right + margin && y >= r.top - margin && y <= r.bottom + margin;
  },

  cleanupSplitDrag() {
    if (this.splitGhostEl) {
      this.splitGhostEl.remove();
      this.splitGhostEl = null;
    }
    if (this.activeSplitSlotId !== null) {
      const origZone = document.querySelector(`[data-split-slot="${this.activeSplitSlotId}"]`);
      if (origZone) origZone.classList.remove('opacity-30');

      if (this.splitTargetCard) {
        this.splitTargetCard.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-50/60', 'scale-[1.02]');
      }
      const targetDrop = document.querySelector(`[data-drop-target="${this.activeSplitSlotId + 1}"]`);
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

  cleanupCutSwipe() {
    if (this.cutBarEl) {
      this.cutBarEl.style.width = '0%';
      this.cutBarEl = null;
    }
    this.activeCutSlotId = null;
  },

  updateBuildProgress(pct) {
    if (this.buildBarEl) this.buildBarEl.style.width = `${pct}%`;

    for (let i = 0; i < this.buildFillEls.length; i++) {
      this.buildFillEls[i].style.height = `${pct}%`;
    }

    for (let i = 0; i < this.buildSegFillEls.length; i++) {
      const { el, idx } = this.buildSegFillEls[i];
      const segPct = Math.max(0, Math.min(100, ((pct - idx * 25) / 25) * 100));
      el.style.height = `${segPct}%`;
    }
  },

  cleanupBuildSwipe() {
    if (this.activeBuildSlotId !== null) {
      this.updateBuildProgress(0);
    }
    this.activeBuildSlotId = null;
    this.activeBuildOp = null;
    this.buildBarEl = null;
    this.buildFillEls = [];
    this.buildSegFillEls = [];
  },

  attach(onSlotAction) {
    document.addEventListener('pointerdown', (e) => {
      if (store.isBusy()) return;

      // 1. 半保存的複製：右鎖ドラッグ
      const splitZone = e.target.closest('[data-split-slot]');
      if (splitZone) {
        e.preventDefault();
        const slotId = parseInt(splitZone.getAttribute('data-split-slot'), 10);
        const slot = store.getCurrentSlots()[slotId];
        if (!slot || !slot.exists || slot.split) return;

        this.activeSplitSlotId = slotId;
        this.isOverTargetCard = false;
        this.splitTargetCard = document.querySelector(`[data-card-slot="${slotId + 1}"]`);
        this.splitTargetRect = this.splitTargetCard ? this.splitTargetCard.getBoundingClientRect() : null;
        splitZone.classList.add('opacity-30');

        const colorClass = slot.right === 'red' ? 'bg-rose-500' : 'bg-sky-500';
        this.splitGhostEl = document.createElement('div');
        this.splitGhostEl.className = `fixed top-0 left-0 w-4 h-24 rounded-full ${colorClass} shadow-xl opacity-95 pointer-events-none z-50 border-2 border-white`;
        this.splitGhostEl.style.willChange = 'transform';
        this.splitGhostEl.style.transform = `translate3d(${e.clientX - 8}px, ${e.clientY - 48}px, 0) scale(1.1)`;
        document.body.appendChild(this.splitGhostEl);

        const targetDrop = document.querySelector(`[data-drop-target="${slotId + 1}"]`);
        if (targetDrop) {
          targetDrop.classList.add('border-amber-400', 'bg-amber-50', 'text-amber-800');
          targetDrop.textContent = 'ここにドロップして離す！';
        }
        return;
      }

      // 2. 分散的複製：ハサミのスワイプ切り
      const cutZone = e.target.closest('[data-cut-slot]');
      if (cutZone) {
        e.preventDefault();
        const slotId = parseInt(cutZone.getAttribute('data-cut-slot'), 10);
        this.activeCutSlotId = slotId;
        this.cutStartX = e.clientX;
        this.cutRequiredDist = Math.max(50, cutZone.getBoundingClientRect().width * 0.7);
        this.cutBarEl = document.querySelector(`[data-cut-bar="${slotId}"]`);
        return;
      }

      // 3. 全仮説共通：上から下へなぞって青い鎖を合成
      const buildZone = e.target.closest('[data-build-slot]');
      if (buildZone) {
        e.preventDefault();
        const slotId = parseInt(buildZone.getAttribute('data-build-slot'), 10);
        this.activeBuildSlotId = slotId;
        this.activeBuildOp = buildZone.getAttribute('data-build-op') || 'build';
        this.buildStartY = e.clientY;
        this.buildRequiredDist = Math.max(48, buildZone.getBoundingClientRect().height * 0.65);
        this.buildBarEl = document.querySelector(`[data-build-bar="${slotId}"]`);
        this.buildFillEls = [...document.querySelectorAll(`[data-build-fill="${slotId}"]`)];
        this.buildSegFillEls = [...document.querySelectorAll(`[data-build-seg-fill="${slotId}"]`)].map((el) => ({
          el,
          idx: parseInt(el.getAttribute('data-seg-idx') || '0', 10)
        }));
      }
    });

    document.addEventListener('pointermove', (e) => {
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
          const targetOp = this.activeBuildOp;
          this.activeBuildSlotId = null;
          this.activeBuildOp = null;
          this.buildBarEl = null;
          this.buildFillEls = [];
          this.buildSegFillEls = [];
          onSlotAction(targetId, targetOp);
        }
      }
    });

    document.addEventListener('pointerup', (e) => {
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
