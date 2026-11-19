import { store } from './store.js';

// =========================================================================
// インタラクティブジェスチャー制御 (ドラッグ分離 & ハサミ切り)
// =========================================================================
export const GestureController = {
  activeSplitSlotId: null,
  splitGhostEl: null,
  isOverTargetCard: false,
  activeCutSlotId: null,
  cutStartX: 0,

  isPointInCard(cardEl, x, y, margin = 12) {
    if (!cardEl) return false;
    const r = cardEl.getBoundingClientRect();
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

      const targetCard = document.querySelector(`[data-card-slot="${this.activeSplitSlotId + 1}"]`);
      if (targetCard) {
        targetCard.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-50/60', 'scale-[1.02]');
      }
      const targetDrop = document.querySelector(`[data-drop-target="${this.activeSplitSlotId + 1}"]`);
      if (targetDrop) {
        targetDrop.classList.remove('border-amber-400', 'bg-amber-50', 'text-amber-800');
        targetDrop.textContent = 'ここに右の鎖をドロップ！';
      }
    }
    this.activeSplitSlotId = null;
    this.isOverTargetCard = false;
  },

  cleanupCutSwipe() {
    if (this.activeCutSlotId !== null) {
      const bar = document.querySelector(`[data-cut-bar="${this.activeCutSlotId}"]`);
      if (bar) bar.style.width = '0%';
    }
    this.activeCutSlotId = null;
  },

  attach(onSlotAction) {
    document.addEventListener('pointerdown', (e) => {
      if (store.isBusy()) return;

      const splitZone = e.target.closest('[data-split-slot]');
      if (splitZone) {
        e.preventDefault();
        const slotId = parseInt(splitZone.getAttribute('data-split-slot'), 10);
        const slot = store.getCurrentSlots()[slotId];
        if (!slot || !slot.exists || slot.split) return;

        this.activeSplitSlotId = slotId;
        this.isOverTargetCard = false;
        splitZone.classList.add('opacity-30');

        const colorClass = slot.right === 'red' ? 'bg-rose-500' : 'bg-sky-500';
        this.splitGhostEl = document.createElement('div');
        this.splitGhostEl.className = `fixed w-4 h-24 rounded-full ${colorClass} shadow-xl opacity-95 pointer-events-none z-50 border-2 border-white scale-110`;
        this.splitGhostEl.style.left = `${e.clientX - 8}px`;
        this.splitGhostEl.style.top = `${e.clientY - 48}px`;
        document.body.appendChild(this.splitGhostEl);

        const targetDrop = document.querySelector(`[data-drop-target="${slotId + 1}"]`);
        if (targetDrop) {
          targetDrop.classList.add('border-amber-400', 'bg-amber-50', 'text-amber-800');
          targetDrop.textContent = 'ここにドロップして離す！';
        }
        return;
      }

      const cutZone = e.target.closest('[data-cut-slot]');
      if (cutZone) {
        e.preventDefault();
        this.activeCutSlotId = parseInt(cutZone.getAttribute('data-cut-slot'), 10);
        this.cutStartX = e.clientX;
      }
    });

    document.addEventListener('pointermove', (e) => {
      if (this.activeSplitSlotId !== null) {
        if (this.splitGhostEl) {
          this.splitGhostEl.style.left = `${e.clientX - 8}px`;
          this.splitGhostEl.style.top = `${e.clientY - 48}px`;
        }
        const targetCard = document.querySelector(`[data-card-slot="${this.activeSplitSlotId + 1}"]`);
        const inside = this.isPointInCard(targetCard, e.clientX, e.clientY);
        this.isOverTargetCard = inside;
        if (targetCard) {
          targetCard.classList.toggle('ring-4', inside);
          targetCard.classList.toggle('ring-amber-400', inside);
          targetCard.classList.toggle('bg-amber-50/60', inside);
          targetCard.classList.toggle('scale-[1.02]', inside);
        }
      }

      if (this.activeCutSlotId !== null) {
        const zone = document.querySelector(`[data-cut-slot="${this.activeCutSlotId}"]`);
        const requiredDist = zone ? Math.max(50, zone.getBoundingClientRect().width * 0.7) : 60;
        const dist = Math.abs(e.clientX - this.cutStartX);
        const pct = Math.min(100, Math.round((dist / requiredDist) * 100));
        const bar = document.querySelector(`[data-cut-bar="${this.activeCutSlotId}"]`);
        if (bar) bar.style.width = `${pct}%`;

        if (dist >= requiredDist) {
          const targetId = this.activeCutSlotId;
          this.cleanupCutSwipe();
          onSlotAction(targetId, 'cut');
        }
      }
    });

    document.addEventListener('pointerup', (e) => {
      if (this.activeSplitSlotId !== null) {
        const targetId = this.activeSplitSlotId;
        const targetCard = document.querySelector(`[data-card-slot="${targetId + 1}"]`);
        const dropped = this.isOverTargetCard || this.isPointInCard(targetCard, e.clientX, e.clientY);
        this.cleanupSplitDrag();
        if (dropped) onSlotAction(targetId, 'split');
      }
      if (this.activeCutSlotId !== null) {
        this.cleanupCutSwipe();
      }
    });

    document.addEventListener('pointercancel', () => {
      this.cleanupSplitDrag();
      this.cleanupCutSwipe();
    });
  }
};
