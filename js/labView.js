import {
  ACTUAL_MESELSON_STAHL,
  HYPOTHESES,
  HYPOTHESIS_ORDER
} from './config.js';
import { BiologyModel } from './model.js';
import { store } from './store.js';
import { CentrifugeView } from './centrifuge.js';

// =========================================================================
// DNAカード＆ラボ全体ビュー (LabView)
// =========================================================================
export const LabView = {
  setObservation(text) {
    const el = document.getElementById('observation-box');
    if (el) el.textContent = text;
  },

  renderStrandHtml(color, { animateGrow = false, delaySec = 0, buildSlotId = null } = {}) {
    const animClass = animateGrow ? 'animate-grow-top' : '';
    const animStyle = animateGrow && delaySec > 0 ? `style="animation-delay:${delaySec}s;"` : '';
    if (color === 'red') {
      return `<div class="w-3.5 h-24 rounded-full bg-rose-500 shadow-sm ${animClass}" ${animStyle}></div>`;
    }
    if (color === 'blue') {
      return `<div class="w-3.5 h-24 rounded-full bg-sky-500 shadow-sm ${animClass}" ${animStyle}></div>`;
    }
    const fillHtml = buildSlotId !== null
      ? `<div data-build-fill="${buildSlotId}" class="absolute inset-x-0 top-0 bg-sky-500 rounded-full" style="height:0%;"></div>`
      : '';
    return `<div class="relative w-3.5 h-24 rounded-full border-2 border-dashed border-sky-300 bg-sky-50/60 overflow-hidden">${fillHtml}</div>`;
  },

  renderSegmentedStrandHtml(segs, isCut, newMask = [], animateGrow = false, buildSlotId = null) {
    if (!isCut) {
      return `
        <div class="flex flex-col h-24 w-3.5 rounded-full overflow-hidden shadow-sm">
          ${segs
            .map((c) => {
              const bg = c === 'red' ? 'bg-rose-500' : c === 'blue' ? 'bg-sky-500' : 'bg-slate-100/60';
              return `<span class="w-full flex-1 ${bg}"></span>`;
            })
            .join('')}
        </div>
      `;
    }
    return `
      <div class="flex flex-col gap-1 h-24 justify-between">
        ${segs
          .map((c, idx) => {
            const isNew = animateGrow && newMask[idx];
            const animAttr = isNew ? `style="animation-delay:${idx * 0.22}s;"` : '';
            const animClass = isNew ? 'animate-grow-top' : '';
            if (c === 'red') {
              return `<span class="w-3.5 flex-1 rounded-full bg-rose-500 shadow-sm"></span>`;
            }
            if (c === 'blue') {
              return `<span class="w-3.5 flex-1 rounded-full bg-sky-500 shadow-sm ${animClass}" ${animAttr}></span>`;
            }
            const segFill = buildSlotId !== null
              ? `<span data-build-seg-fill="${buildSlotId}" data-seg-idx="${idx}" class="absolute inset-x-0 top-0 bg-sky-500 rounded-full" style="height:0%;"></span>`
              : '';
            return `<span class="relative w-3.5 flex-1 rounded-full border border-dashed border-sky-300 bg-sky-50/60 overflow-hidden">${segFill}</span>`;
          })
          .join('')}
      </div>
    `;
  },

  renderRungsHtml(active) {
    const color = active ? 'bg-slate-400' : 'bg-slate-200';
    return `
      <div class="flex flex-col justify-around h-20" aria-hidden="true">
        <span class="w-2.5 h-0.5 ${color}"></span>
        <span class="w-2.5 h-0.5 ${color}"></span>
        <span class="w-2.5 h-0.5 ${color}"></span>
      </div>
    `;
  },

  renderStatusBadge(slot, hypo) {
    if (BiologyModel.isSlotComplete(slot, hypo)) {
      return `<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">完成</span>`;
    }
    const label = slot.exists === false ? '待機中' : '作業中';
    return `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">${label}</span>`;
  },

  renderSwipeBuildGuide(slotId, text = '上から下へなぞって青い鎖を合成！') {
    return `
      <div class="text-center text-[11px] font-extrabold text-sky-800 py-1 bg-sky-50 rounded-xl border border-sky-200">
        ${text}
        <div class="mt-1 mx-2 h-1.5 bg-sky-200/80 rounded-full overflow-hidden">
          <div data-build-bar="${slotId}" class="h-full bg-sky-500 rounded-full transition-all duration-75" style="width:0%;"></div>
        </div>
      </div>
    `;
  },

  renderBuildOverlay(slotId, op, glowClass) {
    return `
      <div
        data-build-slot="${slotId}"
        data-build-op="${op}"
        class="gesture-zone absolute -inset-1.5 flex items-center justify-center cursor-ns-resize rounded-xl ${glowClass}"
        title="上から下へドラッグして青い鎖を伸ばそう！"
      >
        <span class="pointer-events-none text-[10px] font-black text-sky-900 bg-sky-100/95 px-2 py-0.5 rounded-full border border-sky-300 shadow-sm">
          ⬇ なぞって合成
        </span>
      </div>
    `;
  },

  renderConservativeCard(slot, glowClass) {
    const animGrow = Boolean(slot.justBuilt && !slot.isOriginal);
    const canBuild = !slot.built;
    const actionHtml = slot.built
      ? `<div class="text-center text-[11px] font-extrabold text-emerald-700 py-1.5 bg-emerald-50 rounded-xl">${slot.isOriginal ? '元のDNAそのまま' : '2本鎖が完成！'}</div>`
      : this.renderSwipeBuildGuide(slot.id, '上から下へなぞって青の2本鎖を作る！');

    return `
      <div class="bg-white rounded-2xl border-2 ${slot.built ? 'border-emerald-300' : 'border-slate-200'} p-3 flex flex-col items-center justify-between gap-2 shadow-sm">
        <div class="w-full flex items-center justify-between gap-1">
          <span class="text-xs font-extrabold text-slate-700">${slot.label}</span>
          ${this.renderStatusBadge(slot, 'conservative')}
        </div>
        <div class="relative flex items-center justify-center gap-3 my-1 px-2">
          ${this.renderStrandHtml(slot.left, { animateGrow: animGrow, delaySec: 0, buildSlotId: canBuild ? slot.id : null })}
          ${this.renderRungsHtml(slot.built)}
          ${this.renderStrandHtml(slot.right, { animateGrow: animGrow, delaySec: 0.4, buildSlotId: canBuild ? slot.id : null })}
          ${canBuild ? this.renderBuildOverlay(slot.id, 'build', glowClass) : ''}
        </div>
        <div class="w-full">${actionHtml}</div>
      </div>
    `;
  },

  renderSemiconservativeCard(slot, glowClass) {
    const isDone = BiologyModel.isSlotComplete(slot, 'semiconservative');
    const animLeft = Boolean(slot.justBuilt && slot.newSide === 'left');
    const animRight = Boolean(slot.justBuilt && slot.newSide === 'right');
    const canBuild = Boolean(slot.exists && slot.split && !slot.built);

    let actionHtml = '';
    if (!slot.exists) {
      actionHtml = `<div data-drop-target="${slot.id}" class="text-center text-[11px] font-bold text-slate-400 py-1.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 transition">ここに右の鎖をドラッグ！</div>`;
    } else if (!slot.split) {
      actionHtml = `<div class="text-center text-[11px] font-extrabold text-amber-800 py-1.5 bg-amber-50 rounded-xl border border-amber-200">右側の鎖を隣へドラッグ！</div>`;
    } else if (canBuild) {
      actionHtml = this.renderSwipeBuildGuide(slot.id);
    } else {
      actionHtml = `<div class="text-center text-[11px] font-extrabold text-emerald-700 py-1.5 bg-emerald-50 rounded-xl">2本鎖が完成！</div>`;
    }

    const rightStrandInteractive = slot.exists && !slot.split
      ? `<div data-split-slot="${slot.id}" class="gesture-zone relative cursor-grab active:cursor-grabbing group p-1 -m-1 rounded-xl ${glowClass}" title="掴んで隣の枠までドラッグして離そう！">
           ${this.renderStrandHtml(slot.right)}
           <span class="absolute -right-2.5 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm group-hover:scale-110 transition">➡</span>
         </div>`
      : this.renderStrandHtml(slot.right, { animateGrow: animRight, buildSlotId: canBuild && !slot.right ? slot.id : null });

    return `
      <div data-card-slot="${slot.id}" class="bg-white rounded-2xl border-2 ${isDone ? 'border-emerald-300' : 'border-slate-200'} p-3 flex flex-col items-center justify-between gap-2 shadow-sm transition">
        <div class="w-full flex items-center justify-between gap-1">
          <span class="text-xs font-extrabold text-slate-700">${slot.label}</span>
          ${this.renderStatusBadge(slot, 'semiconservative')}
        </div>
        <div class="relative flex items-center justify-center gap-3 my-1 px-2">
          ${this.renderStrandHtml(slot.left, { animateGrow: animLeft, buildSlotId: canBuild && !slot.left ? slot.id : null })}
          ${this.renderRungsHtml(isDone || (slot.exists && !slot.split))}
          ${rightStrandInteractive}
          ${canBuild ? this.renderBuildOverlay(slot.id, 'build', glowClass) : ''}
        </div>
        <div class="w-full">${actionHtml}</div>
      </div>
    `;
  },

  renderDispersiveCard(slot, glowClass) {
    const isDone = BiologyModel.isSlotComplete(slot, 'dispersive');
    const canBuild = Boolean(slot.exists && slot.cut && !slot.mixed);

    let actionHtml = '';
    if (!slot.exists) {
      actionHtml = `<div class="text-center text-[11px] font-bold text-slate-400 py-1.5 bg-slate-50 rounded-xl">隣のカット待ち</div>`;
    } else if (!slot.cut) {
      actionHtml = `
        <div class="text-center text-[11px] font-extrabold text-amber-800 py-1 bg-amber-50 rounded-xl border border-amber-200">
          上のハサミ線を左右になぞって切ろう！
          <div class="mt-1 mx-2 h-1.5 bg-amber-200/80 rounded-full overflow-hidden">
            <div data-cut-bar="${slot.id}" class="h-full bg-amber-500 rounded-full transition-all duration-75" style="width:0%;"></div>
          </div>
        </div>
      `;
    } else if (canBuild) {
      actionHtml = this.renderSwipeBuildGuide(slot.id, '上から下へなぞって青の断片を埋める！');
    } else {
      actionHtml = `<div class="text-center text-[11px] font-extrabold text-emerald-700 py-1.5 bg-emerald-50 rounded-xl">2本鎖が完成！</div>`;
    }

    const cutOverlay = slot.exists && !slot.cut
      ? `<div data-cut-slot="${slot.id}" class="gesture-zone absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-ew-resize py-2 rounded-xl ${glowClass}" title="端までドラッグしてハサミで切ろう！">
           <div class="w-full border-t-2 border-dashed border-amber-500 flex items-center justify-between px-1">
             <span class="scissor-snip-anim text-sm bg-amber-100 border border-amber-400 rounded-full px-1 shadow-sm">✂️</span>
             <span class="text-[10px] font-black text-amber-900 bg-amber-100/95 px-1.5 rounded-full border border-amber-300">なぞって切る</span>
           </div>
         </div>`
      : '';

    return `
      <div class="bg-white rounded-2xl border-2 ${isDone ? 'border-emerald-300' : 'border-slate-200'} p-3 flex flex-col items-center justify-between gap-2 shadow-sm">
        <div class="w-full flex items-center justify-between gap-1">
          <span class="text-xs font-extrabold text-slate-700">${slot.label}</span>
          ${this.renderStatusBadge(slot, 'dispersive')}
        </div>
        <div class="relative flex items-center justify-center gap-3 my-1 px-2">
          ${this.renderSegmentedStrandHtml(slot.leftSegs, slot.cut, slot.newLeftMask, Boolean(slot.justBuilt), canBuild ? slot.id : null)}
          ${this.renderRungsHtml(isDone)}
          ${this.renderSegmentedStrandHtml(slot.rightSegs, slot.cut, slot.newRightMask, Boolean(slot.justBuilt), canBuild ? slot.id : null)}
          ${cutOverlay}
          ${canBuild ? this.renderBuildOverlay(slot.id, 'mix', glowClass) : ''}
        </div>
        <div class="w-full">${actionHtml}</div>
      </div>
    `;
  },

  renderLab() {
    const h = store.hypothesis;
    const gen = store.currentGen;
    const slots = store.getCurrentSlots();
    const complete = BiologyModel.isGenerationComplete(slots, h);
    const spun = gen === 1 ? store.gen1Spun : store.gen2Spun;

    HYPOTHESIS_ORDER.forEach((key) => {
      const btn = document.getElementById(`hypo-btn-${key}`);
      const doneBadge = document.getElementById(`hypo-done-${key}`);
      const isRecorded = Boolean(store.recordedResults[key].gen1 && store.recordedResults[key].gen2);
      if (doneBadge) doneBadge.classList.toggle('hidden', !isRecorded);
      if (!btn) return;
      const selected = key === h;
      btn.setAttribute('aria-selected', String(selected));
      btn.className = selected
        ? 'p-2 sm:p-2.5 rounded-2xl border-2 border-sky-500 bg-sky-50/70 text-left transition cursor-pointer shadow-sm'
        : 'p-2 sm:p-2.5 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-left transition cursor-pointer';
    });

    const completedCount = store.countCompletedHypotheses();
    const countBadge = document.getElementById('compare-count-badge');
    if (countBadge) countBadge.textContent = `${completedCount}/3`;

    const b1 = document.getElementById('step-badge-1');
    const b2 = document.getElementById('step-badge-2');
    if (b1 && b2) {
      if (gen === 1) {
        b1.className = 'px-2.5 py-1 rounded-xl text-xs font-extrabold bg-sky-500 text-white shadow-sm cursor-pointer';
        b2.className = 'px-2.5 py-1 rounded-xl text-xs font-extrabold bg-slate-200 text-slate-500';
      } else {
        b1.className = 'px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer';
        b2.className = 'px-2.5 py-1 rounded-xl text-xs font-extrabold bg-sky-500 text-white shadow-sm';
      }
    }

    const guideEl = document.getElementById('builder-guide-text');
    if (guideEl) {
      if (!complete) {
        guideEl.textContent = '光っている場所をドラッグ・なぞってDNAを完成させよう！';
      } else if (store.centrifugePhase === 'spinning') {
        guideEl.textContent = '回転中！もう一度ボタンを押して止めよう！';
      } else if (store.centrifugePhase === 'settling') {
        guideEl.textContent = '比重の合う高さへDNAが移動中...';
      } else if (!spun) {
        guideEl.textContent = 'DNAが完成！赤いボタンを押して遠心分離機を回そう！';
      } else if (gen === 1) {
        guideEl.textContent = '第1世代の分離完了！「第2世代へ進む」を押そう！';
      } else if (completedCount < 3) {
        guideEl.textContent = `記録完了（${completedCount}/3仮説）！他の仮説も試してみよう！`;
      } else {
        guideEl.textContent = '全3仮説の実験完了！「結果の比較」で実際の結果と比べよう！';
      }
    }

    const nextSlotId = store.isBusy() ? null : BiologyModel.findNextActionSlotId(slots, h);
    const container = document.getElementById('dna-slots-container');
    if (container) {
      container.className = gen === 1
        ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
        : 'grid grid-cols-2 lg:grid-cols-4 gap-2.5';
      container.innerHTML = slots
        .map((slot) => {
          const glow = slot.id === nextSlotId ? 'next-action-glow' : '';
          if (h === 'conservative') return this.renderConservativeCard(slot, glow);
          if (h === 'semiconservative') return this.renderSemiconservativeCard(slot, glow);
          return this.renderDispersiveCard(slot, glow);
        })
        .join('');
    }

    const spinBtn = document.getElementById('spin-centrifuge-btn');
    const spinIcon = document.getElementById('spin-btn-icon');
    const spinLabel = document.getElementById('spin-btn-label');
    const nextBtn = document.getElementById('next-gen-btn');
    const compareCtaBtn = document.getElementById('compare-cta-btn');

    if (spinBtn && spinIcon && spinLabel) {
      if (store.centrifugePhase === 'spinning') {
        spinBtn.disabled = false;
        spinBtn.className = 'bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 next-action-glow';
        spinIcon.className = 'w-3 h-3 rounded-sm bg-white inline-block';
        spinLabel.textContent = '遠心分離機を止める（ストップ）';
      } else if (store.centrifugePhase === 'settling') {
        spinBtn.disabled = true;
        spinBtn.className = 'bg-slate-300 text-slate-500 cursor-not-allowed font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-sm flex items-center justify-center gap-2';
        spinIcon.className = 'w-3 h-3 rounded-full bg-slate-400 inline-block';
        spinLabel.textContent = '比重の位置へ移動中...';
      } else if (complete && !spun) {
        spinBtn.disabled = false;
        spinBtn.className = 'bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 next-action-glow';
        spinIcon.className = 'w-3 h-3 rounded-full bg-white inline-block';
        spinLabel.textContent = '遠心分離機を回す（スタート）';
      } else {
        spinBtn.disabled = true;
        spinBtn.className = 'bg-slate-300 text-slate-500 cursor-not-allowed font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-sm flex items-center justify-center gap-2';
        spinIcon.className = 'w-3 h-3 rounded-full bg-slate-400 inline-block';
        spinLabel.textContent = spun ? '遠心分離 完了' : '遠心分離機を回す（スタート）';
      }
    }

    if (nextBtn) {
      const showNext = gen === 1 && spun && !store.isBusy();
      nextBtn.classList.toggle('hidden', !showNext);
      nextBtn.classList.toggle('next-action-glow', showNext);
    }

    if (compareCtaBtn) {
      const showCompare = gen === 2 && spun && !store.isBusy();
      compareCtaBtn.classList.toggle('hidden', !showCompare);
      compareCtaBtn.classList.toggle('next-action-glow', showCompare && completedCount === 3);
    }
  },

  renderMiniTubeHtml(title, molecules, idPrefix) {
    const summary = molecules ? BiologyModel.aggregateBands(molecules).compactLabel : '未実験';
    return `
      <div class="flex flex-col items-center">
        <div class="relative w-11 h-28 rounded-b-full border border-slate-500/80 bg-slate-800 overflow-hidden">
          <div class="absolute inset-x-0 top-[24%] -translate-y-1/2 border-t border-dashed border-sky-400/35"></div>
          <div class="absolute inset-x-0 top-[52%] -translate-y-1/2 border-t border-dashed border-slate-400/35"></div>
          <div class="absolute inset-x-0 top-[80%] -translate-y-1/2 border-t border-dashed border-rose-400/35"></div>
          <div id="${idPrefix}" class="absolute inset-0"></div>
        </div>
        <div class="text-[10px] font-extrabold text-slate-200 mt-1">${title}</div>
        <div class="text-[9px] font-bold ${molecules ? 'text-emerald-300' : 'text-slate-400'} text-center leading-tight min-h-[22px]">${summary}</div>
      </div>
    `;
  },

  renderCompareModal() {
    const grid = document.getElementById('compare-cards-grid');
    if (!grid) return;

    grid.innerHTML = HYPOTHESIS_ORDER.map((key) => {
      const meta = HYPOTHESES[key];
      const rec = store.recordedResults[key];
      const bothDone = Boolean(rec.gen1 && rec.gen2);
      return `
        <div class="bg-white border-2 ${bothDone ? 'border-emerald-300' : 'border-slate-200'} rounded-2xl p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-extrabold ${meta.accentText}">${meta.number}</span>
              <h3 class="font-black text-sm text-slate-900">${meta.name}</h3>
            </div>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${bothDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
              ${bothDone ? '記録完了' : '未完了'}
            </span>
          </div>
          <div class="bg-slate-900 rounded-xl p-2.5 flex items-end justify-around gap-1">
            ${this.renderMiniTubeHtml('第0世代', ACTUAL_MESELSON_STAHL.gen0, `cmp-${key}-0`)}
            ${this.renderMiniTubeHtml('第1世代', rec.gen1, `cmp-${key}-1`)}
            ${this.renderMiniTubeHtml('第2世代', rec.gen2, `cmp-${key}-2`)}
          </div>
        </div>
      `;
    }).join('');

    HYPOTHESIS_ORDER.forEach((key) => {
      const rec = store.recordedResults[key];
      CentrifugeView.renderBands(`cmp-${key}-0`, ACTUAL_MESELSON_STAHL.gen0, true);
      if (rec.gen1) CentrifugeView.renderBands(`cmp-${key}-1`, rec.gen1, true);
      if (rec.gen2) CentrifugeView.renderBands(`cmp-${key}-2`, rec.gen2, true);
    });

    const actualPanel = document.getElementById('actual-result-panel');
    const toggleBtn = document.getElementById('toggle-actual-btn');
    const actualTubes = document.getElementById('actual-tubes-container');

    if (actualPanel && toggleBtn && actualTubes) {
      actualPanel.classList.toggle('hidden', !store.actualResultRevealed);
      toggleBtn.textContent = store.actualResultRevealed
        ? '実際の実験結果を隠す'
        : '実際の実験結果を表示する';

      if (store.actualResultRevealed) {
        actualTubes.innerHTML = [
          this.renderMiniTubeHtml('第0世代', ACTUAL_MESELSON_STAHL.gen0, 'actual-tube-0'),
          this.renderMiniTubeHtml('第1世代', ACTUAL_MESELSON_STAHL.gen1, 'actual-tube-1'),
          this.renderMiniTubeHtml('第2世代', ACTUAL_MESELSON_STAHL.gen2, 'actual-tube-2')
        ].join('');
        CentrifugeView.renderBands('actual-tube-0', ACTUAL_MESELSON_STAHL.gen0, true);
        CentrifugeView.renderBands('actual-tube-1', ACTUAL_MESELSON_STAHL.gen1, true);
        CentrifugeView.renderBands('actual-tube-2', ACTUAL_MESELSON_STAHL.gen2, true);
      }
    }
  },

  syncGen0ModalUi() {
    const wrapper = document.getElementById('modal-tube-wrapper');
    const spinBtn = document.getElementById('modal-spin-gen0-btn');
    const spinLabel = document.getElementById('modal-spin-label');
    const spinIcon = document.getElementById('modal-spin-icon');
    const startBtn = document.getElementById('modal-start-btn');
    const statusEl = document.getElementById('modal-tube-status');
    const phase = store.gen0Phase;

    if (wrapper) wrapper.classList.toggle('animate-centrifuge', phase === 'spinning');

    if (phase === 'idle') {
      if (spinBtn) {
        spinBtn.disabled = false;
        spinBtn.className = 'w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-2.5 px-4 rounded-2xl text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 next-action-glow';
      }
      if (spinIcon) spinIcon.className = 'w-3 h-3 rounded-full bg-white inline-block';
      if (spinLabel) spinLabel.textContent = '遠心分離機を回す（スタート）';
      if (statusEl) statusEl.textContent = 'ボタンを押して回してみよう！';
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.classList.remove('next-action-glow');
      }
    } else if (phase === 'spinning') {
      if (spinBtn) {
        spinBtn.disabled = false;
        spinBtn.className = 'w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 px-4 rounded-2xl text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 next-action-glow';
      }
      if (spinIcon) spinIcon.className = 'w-3 h-3 rounded-sm bg-white inline-block';
      if (spinLabel) spinLabel.textContent = '遠心分離機を止める（ストップ）';
      if (statusEl) statusEl.textContent = '回転中！もう一度押して止めよう';
    } else if (phase === 'settling') {
      if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.classList.remove('next-action-glow');
      }
      if (spinLabel) spinLabel.textContent = 'バンドに集まっています...';
      if (statusEl) statusEl.textContent = '比重の高さへ移動中...';
    } else if (phase === 'done') {
      if (spinBtn) {
        spinBtn.disabled = true;
        spinBtn.className = 'w-full bg-slate-300 text-slate-500 cursor-not-allowed font-black py-2.5 px-4 rounded-2xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2';
      }
      if (spinIcon) spinIcon.className = 'w-3 h-3 rounded-full bg-slate-400 inline-block';
      if (spinLabel) spinLabel.textContent = '分離完了！';
      if (statusEl) statusEl.textContent = '一番下（比重大）にバンドができた！';
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.classList.add('next-action-glow');
      }
    }
  }
};
