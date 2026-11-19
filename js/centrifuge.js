import { BiologyModel } from './model.js';

// =========================================================================
// 遠心分離機＆試験管ビュー (CentrifugeView)
// =========================================================================
export const CentrifugeView = {
  renderParticleInnerHtml(molecule) {
    if (molecule.segmented) {
      const segsL = molecule.tierKey === 'mid'
        ? ['bg-rose-500', 'bg-sky-400', 'bg-rose-500', 'bg-sky-400']
        : ['bg-rose-500', 'bg-sky-400', 'bg-sky-400', 'bg-sky-400'];
      const segsR = molecule.tierKey === 'mid'
        ? ['bg-sky-400', 'bg-rose-500', 'bg-sky-400', 'bg-rose-500']
        : ['bg-sky-400', 'bg-rose-500', 'bg-sky-400', 'bg-sky-400'];

      const buildCol = (arr) =>
        `<span class="w-1 h-4 rounded-full overflow-hidden flex flex-col">${arr.map((c) => `<span class="flex-1 ${c}"></span>`).join('')}</span>`;
      return buildCol(segsL) + buildCol(segsR);
    }

    const pairMap = {
      heavy: ['bg-rose-500', 'bg-rose-500'],
      mid: ['bg-rose-500', 'bg-sky-400'],
      'light-mid': ['bg-rose-500', 'bg-sky-400'],
      light: ['bg-sky-400', 'bg-sky-400']
    };
    const [l, r] = pairMap[molecule.tierKey] || pairMap.heavy;
    return `
      <span class="w-1 h-4 rounded-full ${l} shadow-sm"></span>
      <span class="w-1 h-4 rounded-full ${r} shadow-sm"></span>
    `;
  },

  renderParticles(containerId, molecules, swirling = false) {
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

  migrateParticlesToDensity(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = container.querySelectorAll('.dna-strand-item');
    const layouts = {
      1: ['44%'],
      2: ['30%', '58%'],
      4: ['16%', '35%', '54%', '73%']
    };
    const xSlots = layouts[items.length] || ['22%', '44%', '66%'];

    items.forEach((el, idx) => {
      el.classList.remove('dna-particle-swirl');
      const ratio = parseFloat(el.getAttribute('data-heavy-ratio') || '1');
      const targetTop = BiologyModel.computeBandTopPct(ratio);
      el.style.top = `${targetTop}%`;
      el.style.left = xSlots[idx % xSlots.length];
      el.style.transform = 'translateY(-50%) rotate(90deg)';
    });
  },

  renderBands(containerId, molecules, compact = false) {
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

  clearGenTubes() {
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

  clearFlyingDna() {
    document.querySelectorAll('.dna-fly-clone').forEach((el) => el.remove());
    document.querySelectorAll('.tube-receive-pulse').forEach((el) => el.classList.remove('tube-receive-pulse'));
  },

  flyDnaIntoTube(sourceElements, targetTubeId) {
    const tube = document.getElementById(targetTubeId);
    if (!tube || !sourceElements || sourceElements.length === 0) {
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
      const clone = srcEl.cloneNode(true);
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

  setStatusBadge(text, colorClasses) {
    const badge = document.getElementById('centrifuge-status');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `text-[11px] font-extrabold px-2.5 py-1 rounded-full ${colorClasses}`;
  }
};
