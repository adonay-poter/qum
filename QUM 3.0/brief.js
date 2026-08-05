/* =========================================================================
   QUM Brief — interactions & diagrams (vanilla JS)
   ========================================================================= */

(function () {
  'use strict';

  // ---------- Scroll progress + section indicator ----------
  const fill   = document.querySelector('.scroll-bar .fill');
  const ticks  = Array.from(document.querySelectorAll('.scroll-bar .tick'));
  const sections = Array.from(document.querySelectorAll('main > section[data-section]'));
  const hudSec = document.querySelector('.hud-top .live-section');
  const hudTtl = document.querySelector('.hud-top .live-title');

  function onScroll() {
    const sc = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? sc / max : 0;
    if (fill) fill.style.width = (pct * 100).toFixed(2) + '%';

    // find current section
    let active = 0;
    const probe = window.innerHeight * 0.4 + sc;
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].offsetTop;
      if (top <= probe) active = i;
    }
    ticks.forEach((t, i) => t.classList.toggle('active', i === active));
    if (sections[active] && hudSec && hudTtl) {
      const num   = sections[active].dataset.section || '--';
      const title = sections[active].dataset.title   || '';
      hudSec.textContent = 'SECTION ' + num + ' / 09';
      hudTtl.textContent = title;
    }

    // section local progress (the small bar in section-mark)
    sections.forEach((s) => {
      const top = s.offsetTop;
      const h   = s.offsetHeight;
      const local = Math.min(1, Math.max(0, (sc - top + window.innerHeight * 0.5) / h));
      const bar = s.querySelector('.section-mark .progress');
      if (bar) bar.style.setProperty('--p', (local * 100).toFixed(1) + '%');
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  ticks.forEach((t) => {
    t.addEventListener('click', () => {
      const id = t.dataset.target;
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
    });
  });

  // ---------- Citation popovers ----------
  const popover = document.createElement('div');
  popover.className = 'cite-pop';
  document.body.appendChild(popover);

  let hideT = null;
  function showCite(target) {
    const n = target.dataset.ref;
    const refEl = document.querySelector('.ref[data-n="' + n + '"]');
    if (!refEl) return;
    const au = refEl.querySelector('.au')?.textContent || '';
    const src = refEl.querySelector('.src')?.textContent || '';
    popover.innerHTML = '<span class="n">REF ' + (n.length < 2 ? '0' + n : n) + '</span><span class="au">' + au + '</span> ' + src;
    const r = target.getBoundingClientRect();
    const top = r.bottom + window.scrollY + 8;
    let left = r.left + window.scrollX - 16;
    const max = window.innerWidth - 380;
    if (left > max) left = max;
    if (left < 16) left = 16;
    popover.style.top = top + 'px';
    popover.style.left = left + 'px';
    clearTimeout(hideT);
    popover.classList.add('on');
  }
  function hideCite() {
    hideT = setTimeout(() => popover.classList.remove('on'), 120);
  }

  document.addEventListener('mouseover', (e) => {
    const c = e.target.closest('sup.cite');
    if (c) showCite(c);
  });
  document.addEventListener('mouseout', (e) => {
    const c = e.target.closest('sup.cite');
    if (c) hideCite();
  });
  document.addEventListener('click', (e) => {
    const c = e.target.closest('sup.cite');
    if (!c) return;
    e.preventDefault();
    const n = c.dataset.ref;
    const refEl = document.querySelector('.ref[data-n="' + n + '"]');
    if (!refEl) return;
    window.scrollTo({ top: refEl.offsetTop - 120, behavior: 'smooth' });
    document.querySelectorAll('.ref.target').forEach((r) => r.classList.remove('target'));
    refEl.classList.add('target');
    setTimeout(() => refEl.classList.remove('target'), 2600);
  });

  // =========================================================================
  // Diagram 1 — The Wave
  // =========================================================================
  (function () {
    const root = document.getElementById('diagram-wave');
    if (!root) return;

    const svg = root.querySelector('svg');
    const W = 800, H = 220;
    const live = svg.querySelector('.live-path');
    const ghost = svg.querySelector('.ghost-path');
    const playhead = svg.querySelector('.playhead');
    const dot = svg.querySelector('.head-dot');
    const readout = root.querySelector('.wave-intensity');
    const readoutLabel = root.querySelector('.wave-clock');
    const phaseEl = root.querySelector('.phase');

    let mode = 'ride';      // ride | fight | feed
    let t = 0;              // seconds 0..20
    let playing = true;
    let lastTs = 0;

    const ridePath = (s) => {
      // smooth wave: rises, peaks ~6s, decays by ~16s
      const a = Math.max(0, 1 - Math.abs(s - 7) / 7);
      const v = a * a * (1.4 - Math.abs(s - 7) / 14);
      return Math.max(0, Math.min(1, v));
    };
    const fightPath = (s) => {
      // suppress hard, bounces back stronger
      const base = ridePath(s);
      const ripple = 0.18 * Math.sin(s * 1.7);
      const bounce = s > 9 ? Math.max(0, (s - 9) / 6) * 0.9 : 0;
      return Math.max(0, Math.min(1, base * 0.7 + ripple + bounce));
    };
    const feedPath = (s) => {
      // give in: spikes harder, sustains
      const ramp = Math.min(1, s / 5);
      const plateau = s > 5 ? 1 - Math.min(0.15, (s - 5) / 40) : ramp;
      return plateau;
    };
    function fnFor(m) { return m === 'fight' ? fightPath : m === 'feed' ? feedPath : ridePath; }

    function buildPath(fn, samples) {
      const pts = [];
      const N = samples || 80;
      for (let i = 0; i <= N; i++) {
        const s = (i / N) * 20;
        const v = fn(s);
        const x = (i / N) * W;
        const y = H - 20 - v * (H - 60);
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      }
      return 'M' + pts.join(' L');
    }

    function render() {
      // ghost = previous mode's full path (always all 20s)
      live.setAttribute('d', buildPath(fnFor(mode), 80));

      // playhead segment up to t
      const segPct = Math.min(1, t / 20);
      const xHead = segPct * W;
      const v = fnFor(mode)(t);
      const yHead = H - 20 - v * (H - 60);
      playhead.setAttribute('x2', xHead);
      dot.setAttribute('cx', xHead);
      dot.setAttribute('cy', yHead);

      // readout
      readout.textContent = (v * 100).toFixed(0) + ' / 100';
      const phaseTxt = t < 3 ? 'rising' : t < 8 ? 'peak' : t < 15 ? 'descent' : 'settled';
      phaseEl.textContent = phaseTxt.toUpperCase();
      readoutLabel.textContent = 't = ' + t.toFixed(1) + 's';
    }

    function step(ts) {
      if (!lastTs) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (playing && document.body.dataset.motion !== 'off') {
        t += dt;
        if (t > 20) { t = 0; }
        render();
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    root.querySelectorAll('[data-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        mode = b.dataset.mode;
        t = 0;
        playing = true;
        root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('primary', x === b));
        render();
      });
    });
    root.querySelector('[data-mode="ride"]').classList.add('primary');
    render();
  })();

  // =========================================================================
  // Diagram 2 — Wanting vs Liking (years scrubber)
  // =========================================================================
  (function () {
    const root = document.getElementById('diagram-wantlike');
    if (!root) return;

    const svg = root.querySelector('svg');
    const W = 800, H = 220;
    const wantPath = svg.querySelector('.want-path');
    const likePath = svg.querySelector('.like-path');
    const head1 = svg.querySelector('.head-want');
    const head2 = svg.querySelector('.head-like');
    const playhead = svg.querySelector('.playhead');
    const slider = root.querySelector('.scrubber');
    const yearLabel = root.querySelector('.year-readout .v');
    const wantVal = root.querySelector('.metric-want .v');
    const likeVal = root.querySelector('.metric-like .v');
    const gapEl = root.querySelector('.metric-gap .v');

    // Models: wanting rises (sensitization). liking flat/decline.
    const wantFn = (yr) => 0.18 + 0.66 * (yr / 10) + 0.05 * Math.sin(yr * 1.3);
    const likeFn = (yr) => 0.55 - 0.08 * (yr / 10) + 0.04 * Math.sin(yr * 0.9 + 1);

    function pathFor(fn) {
      const pts = [];
      const N = 60;
      for (let i = 0; i <= N; i++) {
        const yr = (i / N) * 10;
        const v = Math.max(0, Math.min(1, fn(yr)));
        const x = (i / N) * W;
        const y = H - 20 - v * (H - 50);
        pts.push(x.toFixed(1) + ',' + y.toFixed(1));
      }
      return 'M' + pts.join(' L');
    }
    wantPath.setAttribute('d', pathFor(wantFn));
    likePath.setAttribute('d', pathFor(likeFn));

    function render(yr) {
      const x = (yr / 10) * W;
      playhead.setAttribute('x1', x); playhead.setAttribute('x2', x);
      const w = Math.max(0, Math.min(1, wantFn(yr)));
      const l = Math.max(0, Math.min(1, likeFn(yr)));
      head1.setAttribute('cx', x); head1.setAttribute('cy', H - 20 - w * (H - 50));
      head2.setAttribute('cx', x); head2.setAttribute('cy', H - 20 - l * (H - 50));
      yearLabel.textContent = 'year ' + yr.toFixed(1);
      wantVal.textContent = (w * 100).toFixed(0);
      likeVal.textContent = (l * 100).toFixed(0);
      const d = (w - l) * 100;
      gapEl.textContent = (d >= 0 ? '+' : '') + d.toFixed(0);
    }
    slider.addEventListener('input', () => render(parseFloat(slider.value)));
    render(0);
  })();

  // =========================================================================
  // Diagram 3 — Mental sketchpad (visuospatial working memory grid)
  // =========================================================================
  (function () {
    const root = document.getElementById('diagram-sketchpad');
    if (!root) return;

    const COLS = 12, ROWS = 6;
    const grid = root.querySelector('.sk-grid');
    grid.style.gridTemplateColumns = 'repeat(' + COLS + ', 1fr)';
    const cells = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = document.createElement('div');
      c.className = 'sk-cell';
      grid.appendChild(c);
      cells.push(c);
    }

    const cravingPct = root.querySelector('.metric-craving .v');
    const tetrisPct  = root.querySelector('.metric-tetris .v');
    const vividEl    = root.querySelector('.vivid .v');
    const cravingBtn = root.querySelector('[data-action="craving"]');
    const tetrisBtn  = root.querySelector('[data-action="tetris"]');
    const clearBtn   = root.querySelector('[data-action="clear"]');

    let state = new Array(cells.length).fill(0); // 0 empty, 1 craving, 2 tetris

    function paint() {
      let c = 0, t = 0;
      cells.forEach((cell, i) => {
        cell.classList.remove('craving', 'tetris');
        if (state[i] === 1) { cell.classList.add('craving'); c++; }
        else if (state[i] === 2) { cell.classList.add('tetris'); t++; }
      });
      const total = cells.length;
      const cP = Math.round(c / total * 100);
      const tP = Math.round(t / total * 100);
      cravingPct.textContent = cP + '%';
      tetrisPct.textContent  = tP + '%';
      const vivid = c === 0 ? 'NONE' : c > total * 0.4 ? 'VIVID' : c > total * 0.15 ? 'FUZZY' : 'FAINT';
      vividEl.textContent = vivid;
      vividEl.className = 'v vivid-' + vivid.toLowerCase();
    }

    function fillCraving() {
      // fill empties with craving cells, randomized
      const idxs = state.map((v, i) => v === 0 ? i : -1).filter((i) => i >= 0).sort(() => Math.random() - 0.5);
      const target = Math.floor(cells.length * 0.65);
      let n = 0;
      const already = state.filter((v) => v === 1).length;
      const need = Math.max(0, target - already);
      const step = () => {
        if (n >= need || n >= idxs.length) { paint(); return; }
        state[idxs[n]] = 1;
        n++;
        paint();
        setTimeout(step, 35);
      };
      step();
    }

    // Tetris-style overwrite: place L/T/I shapes that displace craving cells
    const SHAPES = [
      [[0,0],[1,0],[2,0],[2,1]],        // L
      [[0,0],[1,0],[2,0],[1,1]],        // T
      [[0,0],[1,0],[2,0],[3,0]],        // I
      [[0,0],[0,1],[1,0],[1,1]],        // O
      [[0,0],[1,0],[1,1],[2,1]],        // S
      [[1,0],[2,0],[0,1],[1,1]]         // Z
    ];
    function fillTetris() {
      let placed = 0;
      const stepper = () => {
        if (placed >= 14) { paint(); return; }
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const cx = Math.floor(Math.random() * (COLS - 4));
        const cy = Math.floor(Math.random() * (ROWS - 2));
        shape.forEach(([dx, dy]) => {
          const idx = (cy + dy) * COLS + (cx + dx);
          if (idx >= 0 && idx < cells.length) state[idx] = 2;
        });
        placed++;
        paint();
        setTimeout(stepper, 75);
      };
      stepper();
    }

    cravingBtn.addEventListener('click', () => { fillCraving(); });
    tetrisBtn.addEventListener('click',  () => { fillTetris();  });
    clearBtn.addEventListener('click',   () => { state.fill(0); paint(); });

    paint();
  })();

  // =========================================================================
  // Diagram 4 — Slot-machine feed
  // =========================================================================
  (function () {
    const root = document.getElementById('diagram-slot');
    if (!root) return;

    const feed = root.querySelector('.feed');
    const counter = root.querySelector('.metric-pulls .v');
    const hits = root.querySelector('.metric-hits .v');
    const ratio = root.querySelector('.metric-ratio .v');
    const startBtn = root.querySelector('[data-action="scroll"]');
    const stopBtn  = root.querySelector('[data-action="stop"]');

    let pulls = 0, hitsCount = 0;
    let scrolling = false;

    function tile(isHit) {
      const t = document.createElement('div');
      t.className = 'tile' + (isHit ? ' hit' : '');
      const fake = isHit ? '★ JACKPOT' : ['BORING', 'MID', '...', 'BORING', 'MID', 'NOPE', 'OK', 'MID'][Math.floor(Math.random() * 8)];
      t.textContent = fake;
      return t;
    }

    function tick() {
      if (!scrolling) return;
      const isHit = Math.random() < 0.11; // ~1 in 9 — variable ratio
      const el = tile(isHit);
      feed.prepend(el);
      pulls++;
      if (isHit) hitsCount++;
      counter.textContent = String(pulls).padStart(3, '0');
      hits.textContent = String(hitsCount).padStart(2, '0');
      ratio.textContent = pulls > 0 ? '1 / ' + (pulls / Math.max(1, hitsCount)).toFixed(1) : '—';
      // trim
      while (feed.children.length > 12) feed.removeChild(feed.lastChild);
      setTimeout(tick, 320 + Math.random() * 320);
    }

    startBtn.addEventListener('click', () => {
      if (scrolling) return;
      scrolling = true;
      startBtn.classList.remove('primary');
      stopBtn.classList.add('primary');
      tick();
    });
    stopBtn.addEventListener('click', () => {
      scrolling = false;
      stopBtn.classList.remove('primary');
      startBtn.classList.add('primary');
    });
    root.querySelector('[data-action="reset"]').addEventListener('click', () => {
      scrolling = false;
      pulls = 0; hitsCount = 0;
      feed.innerHTML = '';
      counter.textContent = '000'; hits.textContent = '00'; ratio.textContent = '—';
      stopBtn.classList.remove('primary');
      startBtn.classList.add('primary');
    });
    startBtn.classList.add('primary');
  })();

  // =========================================================================
  // Diagram 5 — Breathing pacer (4-4-6) + HRV line
  // =========================================================================
  (function () {
    const root = document.getElementById('diagram-breath');
    if (!root) return;

    const circle = root.querySelector('.breath-circle');
    const phaseLbl = root.querySelector('.breath-phase');
    const count   = root.querySelector('.breath-count');
    const startBtn = root.querySelector('[data-action="start"]');

    const svg = root.querySelector('svg.hrv');
    const HW = 800, HH = 100;
    const hrvLine = svg.querySelector('.hrv-line');

    let running = false;
    let phase = 0;        // 0 inhale, 1 hold-in, 2 exhale, 3 hold-out
    let phaseStart = 0;
    const durs = [4000, 4000, 4000, 4000];          // box breathing 4-4-4-4
    const labels = ['INHALE', 'HOLD', 'EXHALE', 'HOLD'];

    function setSize(scale) {
      circle.style.transform = 'scale(' + scale.toFixed(3) + ')';
    }

    let hrvPts = [];
    function pushHrv(s) {
      hrvPts.push(s);
      if (hrvPts.length > 100) hrvPts.shift();
      const pts = hrvPts.map((v, i) => {
        const x = (i / 100) * HW;
        const y = HH * 0.5 - v * (HH * 0.4);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' L');
      hrvLine.setAttribute('d', pts ? 'M' + pts : '');
    }

    function frame(ts) {
      if (running) {
        if (!phaseStart) phaseStart = ts;
        const dt = ts - phaseStart;
        const dur = durs[phase];
        const f = dt / dur;
        // sizing — box breathing: grow / hold-full / shrink / hold-empty
        let scale = 0.5;
        if (phase === 0) scale = 0.5 + f * 0.5;       // inhale grow
        else if (phase === 1) scale = 1.0;            // hold full
        else if (phase === 2) scale = 1.0 - f * 0.5;  // exhale shrink
        else scale = 0.5;                             // hold empty
        setSize(scale);
        // count
        const sec = Math.max(0, Math.ceil((dur - dt) / 1000));
        count.textContent = sec;
        phaseLbl.textContent = labels[phase];
        // HRV simulated: slow breathing -> bigger swings, settled baseline
        const t = ts / 1000;
        const hr = 0.55 * Math.sin(t * 0.9) + 0.18 * Math.sin(t * 0.45 + 1.2);
        pushHrv(hr);
        if (dt >= dur) { phase = (phase + 1) % 4; phaseStart = ts; }
      } else {
        setSize(0.5);
        const t = ts / 1000;
        const hr = 0.22 * Math.sin(t * 3.5) + 0.1 * Math.sin(t * 6);
        pushHrv(hr);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    startBtn.addEventListener('click', () => {
      running = !running;
      startBtn.textContent = running ? '■ STOP PACER' : '▶ START PACER';
      startBtn.classList.toggle('primary', !running);
      phaseStart = 0;
      phase = 0;
    });
    startBtn.classList.add('primary');
  })();

  // =========================================================================
  // Diagram 6 — Extinction curve (bars get smaller each trial)
  // =========================================================================
  (function () {
    const root = document.getElementById('diagram-extinction');
    if (!root) return;

    const bars = root.querySelector('.bars');
    const trialsLbl = root.querySelector('.metric-trials .v');
    const peakLbl = root.querySelector('.metric-peak .v');
    const rideBtn = root.querySelector('[data-action="ride"]');
    const resetBtn = root.querySelector('[data-action="reset"]');

    const HEIGHTS = [100, 96, 89, 99, 78, 72, 86, 60, 52, 48, 38, 30]; // includes a burst at idx 3
    let trial = 0;

    function render() {
      bars.innerHTML = '';
      for (let i = 0; i < HEIGHTS.length; i++) {
        const b = document.createElement('div');
        b.className = 'ex-bar';
        if (i < trial) {
          b.classList.add('done');
          b.style.height = HEIGHTS[i] + '%';
        } else if (i === trial) {
          b.classList.add('next');
          b.style.height = HEIGHTS[i] + '%';
        } else {
          b.classList.add('future');
          b.style.height = HEIGHTS[i] + '%';
        }
        // burst label
        if (i === 3) b.dataset.lbl = 'EXT. BURST';
        bars.appendChild(b);
      }
      trialsLbl.textContent = String(trial).padStart(2, '0') + ' / ' + HEIGHTS.length;
      peakLbl.textContent   = trial > 0 ? HEIGHTS[trial - 1] + '%' : '—';
      rideBtn.disabled = trial >= HEIGHTS.length;
    }
    rideBtn.addEventListener('click', () => {
      if (trial < HEIGHTS.length) { trial++; render(); }
    });
    resetBtn.addEventListener('click', () => { trial = 0; render(); });
    rideBtn.classList.add('primary');
    render();
  })();

  // ---------- kick off ----------
  onScroll();
})();
