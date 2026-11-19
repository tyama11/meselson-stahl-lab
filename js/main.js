import {
  ACTUAL_MESELSON_STAHL,
  CONFIG,
  HYPOTHESES,
  HYPOTHESIS_ORDER
} from './config.js';
import { BiologyModel } from './model.js';
import { store } from './store.js';
import { CentrifugeView } from './centrifuge.js';
import { LabView } from './labView.js';
import { GestureController } from './gestures.js';

// =========================================================================
// アプリケーションコントローラ (Actions & Lifecycle)
// =========================================================================
const AppController = {
  init() {
    store.gen1Slots = BiologyModel.createGen1Slots(store.hypothesis);
    CentrifugeView.renderParticles('tube-content-0', ACTUAL_MESELSON_STAHL.gen0, false);
    CentrifugeView.renderParticles('modal-tube-content', ACTUAL_MESELSON_STAHL.gen0, false);
    this.showModalStep(1);
    LabView.syncGen0ModalUi();
    LabView.renderLab();
    GestureController.attach((slotId, op) => this.handleSlotAction(slotId, op));
    this.attachEvents();
  },

  openRulesModal(step = 1) {
    const modal = document.getElementById('rules-modal');
    if (!modal) return;
    this.showModalStep(step);
    modal.classList.remove('hidden');
  },

  closeRulesModal() {
    const modal = document.getElementById('rules-modal');
    if (modal) modal.classList.add('hidden');
    store.clearTimer('gen0');
    store.clearTimer('gen0-load');
    CentrifugeView.clearFlyingDna();

    if (store.gen0Phase !== 'done') {
      store.gen0Phase = 'done';
      this.finalizeGen0Visuals();
    }
    LabView.renderLab();
  },

  showModalStep(step) {
    const s1 = document.getElementById('modal-step-1');
    const s2 = document.getElementById('modal-step-2');
    if (!s1 || !s2) return;
    s1.classList.toggle('hidden', step !== 1);
    s2.classList.toggle('hidden', step !== 2);
    if (step === 2) {
      if (store.gen0Phase === 'idle') {
        CentrifugeView.renderParticles('modal-tube-content', ACTUAL_MESELSON_STAHL.gen0, false);
      } else if (store.gen0Phase === 'done') {
        CentrifugeView.renderBands('modal-tube-content', ACTUAL_MESELSON_STAHL.gen0);
      }
      LabView.syncGen0ModalUi();
    }
  },

  finalizeGen0Visuals() {
    CentrifugeView.renderBands('modal-tube-content', ACTUAL_MESELSON_STAHL.gen0);
    CentrifugeView.renderBands('tube-content-0', ACTUAL_MESELSON_STAHL.gen0);
    const lbl0 = document.getElementById('tube-label-0');
    if (lbl0) {
      lbl0.textContent = '下（重・100%）';
      lbl0.className = 'text-[10px] font-extrabold text-rose-400 leading-tight';
    }
    LabView.syncGen0ModalUi();
    LabView.setObservation('第0世代は一番下（比重大）に沈みました！次は第1世代を作ろう！');
  },

  toggleModalGen0() {
    if (store.gen0Phase === 'idle') {
      store.gen0Phase = 'loading';
      LabView.syncGen0ModalUi();

      const srcEl = document.getElementById('gen0-dna-visual');
      const modalContent = document.getElementById('modal-tube-content');
      if (modalContent) modalContent.innerHTML = '';

      const delayMs = CentrifugeView.flyDnaIntoTube(srcEl ? [srcEl] : [], 'modal-tube-wrapper');
      store.setTimer('gen0-load', () => {
        CentrifugeView.clearFlyingDna();
        store.gen0Phase = 'spinning';
        CentrifugeView.renderParticles('modal-tube-content', ACTUAL_MESELSON_STAHL.gen0, true);
        CentrifugeView.renderParticles('tube-content-0', ACTUAL_MESELSON_STAHL.gen0, true);
        LabView.syncGen0ModalUi();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            CentrifugeView.migrateParticlesToDensity('modal-tube-content');
            CentrifugeView.migrateParticlesToDensity('tube-content-0');
          });
        });
      }, delayMs);
    } else if (store.gen0Phase === 'spinning') {
      store.gen0Phase = 'settling';
      LabView.syncGen0ModalUi();

      requestAnimationFrame(() => {
        CentrifugeView.migrateParticlesToDensity('modal-tube-content');
        CentrifugeView.migrateParticlesToDensity('tube-content-0');
      });

      store.setTimer('gen0', () => {
        store.gen0Phase = 'done';
        this.finalizeGen0Visuals();
      }, CONFIG.SETTLE_DURATION_MS);
    }
  },

  selectHypothesis(hypo) {
    if (store.isBusy() || !HYPOTHESES[hypo]) return;
    store.hypothesis = hypo;
    store.currentGen = 1;
    store.gen1Spun = false;
    store.gen2Spun = false;
    store.gen1Slots = BiologyModel.createGen1Slots(hypo);
    store.gen2Slots = [];
    CentrifugeView.clearGenTubes();
    CentrifugeView.setStatusBadge('待機中', 'bg-slate-100 text-slate-600');
    LabView.setObservation(`【${HYPOTHESES[hypo].name}】に切り替えました。第1世代のDNAを組み立てよう！`);
    LabView.renderLab();
  },

  goToGen1() {
    if (store.isBusy() || store.currentGen === 1) return;
    store.currentGen = 1;
    store.gen1Spun = false;
    store.gen2Spun = false;
    store.gen1Slots = BiologyModel.createGen1Slots(store.hypothesis);
    store.gen2Slots = [];
    CentrifugeView.clearGenTubes();
    CentrifugeView.setStatusBadge('待機中', 'bg-slate-100 text-slate-600');
    LabView.setObservation('第1世代（1回目の複製）に戻りました！');
    LabView.renderLab();
  },

  goToGen2() {
    if (store.isBusy() || !store.gen1Spun) return;
    store.currentGen = 2;
    store.gen2Spun = false;
    store.gen2Slots = BiologyModel.createGen2Slots(store.hypothesis, store.gen1Slots);
    CentrifugeView.setStatusBadge('待機中', 'bg-slate-100 text-slate-600');
    LabView.setObservation('第1世代のDNAをさらに複製して、第2世代（4本）を作ろう！');
    LabView.renderLab();
  },

  handleSlotAction(slotId, actionType) {
    if (store.isBusy()) return;
    const slots = store.getCurrentSlots();
    const changed = BiologyModel.applySlotAction(slots, store.hypothesis, store.currentGen, slotId, actionType);
    if (changed) LabView.renderLab();
  },

  toggleCentrifuge() {
    const slots = store.getCurrentSlots();
    if (store.centrifugePhase === 'loading' || store.centrifugePhase === 'settling') return;
    if (!BiologyModel.isGenerationComplete(slots, store.hypothesis)) return;

    const gen = store.currentGen;
    const wrapper = document.getElementById(`tube-wrapper-${gen}`);
    const labelEl = document.getElementById(`tube-label-${gen}`);
    BiologyModel.clearJustBuiltFlags(slots);
    const molecules = BiologyModel.getMoleculesFromSlots(slots, store.hypothesis);

    if (store.centrifugePhase === 'idle') {
      store.centrifugePhase = 'loading';
      CentrifugeView.setStatusBadge('DNAを投入中...', 'bg-sky-100 text-sky-700');
      if (labelEl) {
        labelEl.textContent = '投入中...';
        labelEl.className = 'text-[10px] font-bold text-sky-400 leading-tight';
      }

      const sourceEls = [...document.querySelectorAll('#dna-slots-container [data-dna-visual]')];
      const delayMs = CentrifugeView.flyDnaIntoTube(sourceEls, `tube-wrapper-${gen}`);
      LabView.renderLab();

      store.setTimer('centrifuge-load', () => {
        CentrifugeView.clearFlyingDna();
        store.centrifugePhase = 'spinning';
        CentrifugeView.setStatusBadge('回転・分離中...', 'bg-rose-100 text-rose-700');
        if (labelEl) {
          labelEl.textContent = '移動中...';
          labelEl.className = 'text-[10px] font-bold text-rose-400 leading-tight';
        }
        CentrifugeView.renderParticles(`tube-content-${gen}`, molecules, true);
        if (wrapper) wrapper.classList.add('animate-centrifuge');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            CentrifugeView.migrateParticlesToDensity(`tube-content-${gen}`);
          });
        });
        LabView.renderLab();
      }, delayMs);
    } else if (store.centrifugePhase === 'spinning') {
      store.centrifugePhase = 'settling';
      if (wrapper) wrapper.classList.remove('animate-centrifuge');
      CentrifugeView.setStatusBadge('バンド形成中...', 'bg-amber-100 text-amber-800');
      if (labelEl) {
        labelEl.textContent = '分離中...';
        labelEl.className = 'text-[10px] font-bold text-amber-400 leading-tight';
      }

      requestAnimationFrame(() => {
        CentrifugeView.migrateParticlesToDensity(`tube-content-${gen}`);
      });
      LabView.renderLab();

      store.setTimer('centrifuge', () => {
        store.centrifugePhase = 'idle';
        if (gen === 1) {
          store.gen1Spun = true;
          store.recordedResults[store.hypothesis].gen1 = molecules;
        } else {
          store.gen2Spun = true;
          store.recordedResults[store.hypothesis].gen2 = molecules;
        }

        CentrifugeView.renderBands(`tube-content-${gen}`, molecules);
        const summary = BiologyModel.aggregateBands(molecules);

        CentrifugeView.setStatusBadge('分離完了', 'bg-emerald-100 text-emerald-700');
        if (labelEl) {
          labelEl.textContent = summary.compactLabel;
          labelEl.className = 'text-[10px] font-extrabold text-emerald-400 leading-tight';
        }

        LabView.setObservation(
          `【${HYPOTHESES[store.hypothesis].name}・第${gen}世代】${summary.detailText}が現れました！`
        );
        LabView.renderLab();
      }, CONFIG.SETTLE_DURATION_MS);
    }
  },

  openCompareModal() {
    const modal = document.getElementById('compare-modal');
    if (!modal) return;
    LabView.renderCompareModal();
    modal.classList.remove('hidden');
  },

  closeCompareModal() {
    const modal = document.getElementById('compare-modal');
    if (modal) modal.classList.add('hidden');
  },

  toggleActualResult() {
    store.actualResultRevealed = !store.actualResultRevealed;
    LabView.renderCompareModal();
  },

  resetAll() {
    store.clearAllTimers();
    CentrifugeView.clearFlyingDna();
    store.gen0Phase = 'idle';
    store.centrifugePhase = 'idle';
    store.currentGen = 1;
    store.gen1Spun = false;
    store.gen2Spun = false;
    store.actualResultRevealed = false;
    HYPOTHESIS_ORDER.forEach((h) => {
      store.recordedResults[h] = { gen1: null, gen2: null };
    });
    store.gen1Slots = BiologyModel.createGen1Slots(store.hypothesis);
    store.gen2Slots = [];

    CentrifugeView.renderParticles('tube-content-0', ACTUAL_MESELSON_STAHL.gen0, false);
    CentrifugeView.renderParticles('modal-tube-content', ACTUAL_MESELSON_STAHL.gen0, false);
    const lbl0 = document.getElementById('tube-label-0');
    if (lbl0) {
      lbl0.textContent = '準備中';
      lbl0.className = 'text-[10px] font-bold text-rose-400 leading-tight';
    }
    CentrifugeView.clearGenTubes();
    CentrifugeView.setStatusBadge('待機中', 'bg-slate-100 text-slate-600');
    LabView.setObservation('まずは第0世代（重い赤いDNA）の動きを見てみよう！');
    LabView.syncGen0ModalUi();
    this.closeCompareModal();
    this.openRulesModal(1);
    LabView.renderLab();
  },

  attachEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      switch (action) {
        case 'select-hypothesis':
          this.selectHypothesis(target.getAttribute('data-hypothesis'));
          break;
        case 'go-gen-1':
          this.goToGen1();
          break;
        case 'go-gen-2':
          this.goToGen2();
          break;
        case 'slot-action':
          this.handleSlotAction(
            parseInt(target.getAttribute('data-slot-id'), 10),
            target.getAttribute('data-slot-op')
          );
          break;
        case 'toggle-centrifuge':
          this.toggleCentrifuge();
          break;
        case 'toggle-modal-gen0':
          this.toggleModalGen0();
          break;
        case 'open-rules':
          this.openRulesModal(1);
          break;
        case 'close-rules':
          this.closeRulesModal();
          break;
        case 'modal-step':
          this.showModalStep(parseInt(target.getAttribute('data-step'), 10));
          break;
        case 'open-compare':
          this.openCompareModal();
          break;
        case 'close-compare':
          this.closeCompareModal();
          break;
        case 'toggle-actual-result':
          this.toggleActualResult();
          break;
        case 'reset-all':
          this.resetAll();
          break;
        default:
          break;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const compareModal = document.getElementById('compare-modal');
      if (compareModal && !compareModal.classList.contains('hidden')) {
        this.closeCompareModal();
        return;
      }
      const rulesModal = document.getElementById('rules-modal');
      if (rulesModal && !rulesModal.classList.contains('hidden')) {
        this.closeRulesModal();
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});
