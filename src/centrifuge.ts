import { BiologyModel } from './model.ts';
import type { DensityTierKey, Molecule } from './types.ts';

// =========================================================================
// 遠心分離機＆試験管ビュー (CentrifugeView)
// =========================================================================
export const CentrifugeView = {
  renderParticleInnerHtml(molecule: Molecule): string {
    if (molecule.segmented) {
      const segsL = molecule.tierKey === 'mid'
        ? ['bg-rose-500', 'bg-sky-400', 'bg-rose-500', 'bg-sky-400']
        : ['bg-rose-500', 'bg-sky-400', 'bg-sky-400', 'bg-sky-400'];
      const segsR = molecule.tierKey === 'mid'
        ? ['bg-sky-400', 'bg-rose-500', 'bg-sky-400', 'bg-rose-500']
        : ['bg-sky-400', 'bg-rose-500', 'bg-sky-400', 'bg-sky-400'];

      const buildCol = (arr: readonly string[]): string =>
        `<span class="w-1 h-4 rounded-full overflow-hidden flex flex-col">${arr.map((c) => `<span class="flex-1 ${c}"></span>`).join('')}</span>`;
      return buildCol(segsL) + buildCol(segsR);
    }

    const pairMap: Record<DensityTierKey, [string, string]> = {
      heavy: ['bg-rose-500', 'bg-rose-500'],
      mid: ['bg-rose-500', 'bg-sky-400'],
      'light-mid': ['bg-rose-500', 'bg-sky-400'],
      light: ['bg-sky-400', 'bg-sky-400']
    };
    const [l, r] = pairMap[molecule.tierKey];
    return `
      <span class="w-1 h-4 rounded-full ${l} shadow-sm"></span>
      <span class="w-1 h-4 rounded-full ${r} shadow-sm"></span>
    `;
  },

  renderParticles(containerId: string, molecules: readonly Molecule[], swirling = false): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const total = molecules.length;
    const swirlClass = swirling ? 'dna-particle-swirl' : '';

    container.innerHTML = molecules
      .map((m, idx) => {
        const topPct = total === 1 ? 48 : 28 + ((idx * 17) % 46);
        const leftPct = total === 1 ? 42 : 20 + ((idx * 19) % 52);
        const delay = (idx * 0.12).toFixed(2);
        return `
          <div
            data-heavy-ratio="${m.heavyRatio}"
            data-strand-idx="${idx}"
            class="dna-strand-item dna-strand-move ${swirlClass} absolute flex items-center gap-0.5 opacity-95 -translate-y-1/2"
            style="top:${topPct}%; left:${leftPct}%; animation-delay:${delay}s;"
          >
            ${this.renderParticleInnerHtml(m)}
          </div>
        `;
      })
      .join('');
  },

  migrateParticlesToDensity(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>('.dna-strand-item');
    const layouts: Record<number, readonly string[]> = {
      1: ['44%'],
      2: ['30%', '58%'],
      4: ['16%', '35%', '54%', '73%']
    };
    const xSlots = layouts[items.length] ?? ['22%', '44%', '66%'];

    items.forEach((el, idx) => {
      el.classList.remove('dna-particle-swirl');
      const ratio = parseFloat(el.getAttribute('data-heavy-ratio') ?? '1');
      const targetTop = BiologyModel.computeBandTopPct(ratio);
      el.style.top = `${targetTop}%`;
      el.style.left = xSlots[idx % xSlots.length];
      el.style.transform = 'translateY(-50%) rotate(90deg)';
    });
  },

  renderBands(containerId: string, molecules: readonly Molecule[], compact = false): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const { bands } = BiologyModel.aggregateBands(molecules);

    container.innerHTML = bands
      .map((b) => {
        const heightPx = compact
          ? Math.max(5, Math.round(5 + b.fraction * 5))
          : Math.max(7, Math.round(6 + b.fraction * 7));
        const percentBadge = !compact && bands.length > 1
          ? `<span class="absolute right-0.5 -top-3.5 text-[9px] font-black text-slate-200 bg-slate-900/80 px-1 rounded">${b.percent}%</span>`
          : '';
        return `
          <div
            class="band-appear absolute inset-x-1.5 rounded-full ${b.bgClass} ${b.glowClass}"
            style="top:${b.topPct}%; height:${heightPx}px;"
            title="${b.shortLabel}: ${b.percent}% (${b.count}/${molecules.length}本)"
          >
            ${percentBadge}
          </div>
        `;
      })
      .join('');
  },

  clearGenTubes(): void {
    [1, 2].forEach((g) => {
      const content = document.getElementById(`tube-content-${g}`);
      const label = document.getElementById(`tube-label-${g}`);
      const wrapper = document.getElementById(`tube-wrapper-${g}`);
      if (wrapper) wrapper.classList.remove('animate-centrifuge');
      if (content) content.innerHTML = '';
      if (label) {
        label.textContent = '未実験';
        label.className = 'text-[10px] font-bold text-slate-400 leading-tight';
      }
    });
  },

  clearFlyingDna(): void {
    document.querySelectorAll('.dna-fly-clone, .result-fly-badge').forEach((el) => el.remove());
    document.querySelectorAll('.tube-receive-pulse').forEach((el) => el.classList.remove('tube-receive-pulse'));
  },

  flyResultToCompareBtn(hypothesisName: string): void {
    const srcTube = document.getElementById('tube-wrapper-2');
    const compareBtn = document.getElementById('open-compare-btn');
    if (!srcTube || !compareBtn) return;

    const srcRect = srcTube.getBoundingClientRect();
    const dstRect = compareBtn.getBoundingClientRect();

    // 第2世代の試験管＋仮説ラベルの小さなデータカードを飛ばす
    const badge = document.createElement('div');
    badge.className = 'result-fly-badge flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border-2 border-white';
    badge.style.position = 'fixed';
    badge.style.zIndex = '70';
    badge.style.pointerEvents = 'none';
    badge.style.willChange = 'transform, opacity';
    badge.style.left = `${srcRect.left + srcRect.width / 2 - 58}px`;
    badge.style.top = `${srcRect.top + srcRect.height / 2 - 16}px`;
    badge.textContent = `📊 ${hypothesisName} 記録`;
    document.body.appendChild(badge);

    const startX = srcRect.left + srcRect.width / 2;
    const startY = srcRect.top + srcRect.height / 2;
    const endX = dstRect.left + dstRect.width / 2;
    const endY = dstRect.top + dstRect.height / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const midX = dx * 0.45;
    const midY = Math.min(dy * 0.4, -40) - 30;

    if (typeof badge.animate === 'function') {
      const anim = badge.animate(
        [
          { transform: 'translate3d(0px, 0px, 0) scale(0.85)', opacity: 0, offset: 0 },
          { transform: 'translate3d(0px, -12px, 0) scale(1.06)', opacity: 1, offset: 0.18 },
          { transform: `translate3d(${midX}px, ${midY}px, 0) scale(0.95)`, opacity: 0.98, offset: 0.58 },
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.35)`, opacity: 0.1, offset: 1 }
        ],
        {
          duration: 780,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      );
      anim.onfinish = () => {
        badge.remove();
        compareBtn.classList.remove('compare-receive-pop');
        void compareBtn.offsetWidth;
        compareBtn.classList.add('compare-receive-pop');
      };
    } else {
      badge.remove();
    }
  },

  flyDnaIntoTube(sourceElements: readonly HTMLElement[], targetTubeId: string): number {
    const tube = document.getElementById(targetTubeId);
    if (!tube || sourceElements.length === 0) {
      return 0;
    }

    this.clearFlyingDna();
    const tubeRect = tube.getBoundingClientRect();
    const targetX = tubeRect.left + tubeRect.width / 2;
    const targetY = tubeRect.top + 28;
    const staggerMs = 90;
    const flyMs = 680;

    sourceElements.forEach((srcEl, idx) => {
      const rect = srcEl.getBoundingClientRect();
      const clone = srcEl.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      clone.classList.remove('relative');
      clone.classList.add('dna-fly-clone');

      // Inline positioning guarantees priority over Tailwind Play CDN classes
      clone.style.position = 'fixed';
      clone.style.zIndex = '60';
      clone.style.pointerEvents = 'none';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.margin = '0';
      document.body.appendChild(clone);

      const dx = targetX - (rect.left + rect.width / 2);
      const dy = targetY - (rect.top + rect.height / 2);
      const midX = dx * 0.45;
      const midY = Math.min(0, dy * 0.35) - 36;
      const tilt = idx % 2 === 0 ? 22 : -22;

      if (typeof clone.animate === 'function') {
        clone.animate(
          [
            { transform: 'translate(0px, 0px) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
            { transform: `translate(${midX}px, ${midY}px) scale(0.85) rotate(${tilt * 0.5}deg)`, opacity: 0.98, offset: 0.42 },
            { transform: `translate(${dx}px, ${dy - 14}px) scale(0.42) rotate(${tilt}deg)`, opacity: 0.85, offset: 0.78 },
            { transform: `translate(${dx}px, ${dy + 18}px) scale(0.18) rotate(${tilt * 1.2}deg)`, opacity: 0.05, offset: 1 }
          ],
          {
            duration: flyMs,
            delay: idx * staggerMs,
            easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
            fill: 'forwards'
          }
        );
      }
    });

    tube.classList.remove('tube-receive-pulse');
    void tube.offsetWidth;
    tube.classList.add('tube-receive-pulse');

    return flyMs + (sourceElements.length - 1) * staggerMs + 60;
  },

  setStatusBadge(text: string, colorClasses: string): void {
    const badge = document.getElementById('centrifuge-status');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `text-[11px] font-extrabold px-2.5 py-1 rounded-full ${colorClasses}`;
  }
};
