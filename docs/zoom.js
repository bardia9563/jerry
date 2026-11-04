// Zoom (pinch / wheel / buttons), drag to move, and 10/20/30 km rings around HOME.
(() => {
  const stage = document.getElementById('stage'), pts = document.getElementById('pts');
  const PW = parseFloat(stage.style.width), PH = parseFloat(stage.style.height);
  let z = 1, px = 0, py = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const base = () => Math.min(innerWidth * (innerWidth < 700 ? 1.9 : 1.15) / PW, innerHeight * 0.62 / (PH * 0.55));
  function apply() {
    const lim = PW * base() * z;
    px = clamp(px, -lim, lim); py = clamp(py, -lim, lim);
    stage.style.transform = `translate(calc(-50% + ${px}px), ${py}px) scale(${base() * z})`;
  }
  // zoom by f while keeping screen point (fx, fy) in place
  function zoomBy(f, fx, fy) {
    if (fx === undefined) ({ x: fx, y: fy } = MAP.screen(MAP.homeEl));
    const nz = clamp(z * f, .6, 6); f = nz / z; z = nz;
    const ax = innerWidth / 2, ay = innerHeight * .93;          // stage anchor on screen
    px = fx - ax - f * (fx - ax - px); py = fy - ay - f * (fy - ay - py); apply();
  }
  addEventListener('resize', apply);

  // distance rings around home
  const home = MAP.homeEl, mPerPx = 156543.03 * Math.cos(43.64139 * Math.PI / 180) / 2048;
  for (const km of [10, 20, 30]) {
    const r = km * 1000 / mPerPx, ring = document.createElement('div'), lab = document.createElement('span');
    Object.assign(ring.style, { position: 'absolute', left: home.style.left, top: home.style.top,
      width: 2 * r + 'px', height: 2 * r + 'px', margin: `${-r}px 0 0 ${-r}px`,
      border: '1px dashed #ffffff33', borderRadius: '50%', pointerEvents: 'none' });
    lab.textContent = km + ' km';
    Object.assign(lab.style, { position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)',
      color: '#ffffff80', font: '14px ui-monospace,monospace' });
    ring.appendChild(lab); pts.appendChild(ring);
  }

  // buttons
  const bar = document.createElement('div');
  Object.assign(bar.style, { position: 'fixed', left: '12px', bottom: '42px', zIndex: 7, display: 'flex', gap: '6px' });
  for (const [t, fn] of [['+', () => zoomBy(1.4)], ['−', () => zoomBy(1 / 1.4)], ['⟲', () => { z = 1; px = py = 0; apply(); }]]) {
    const b = document.createElement('button'); b.textContent = t; b.onclick = fn;
    Object.assign(b.style, { width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #ffffff33',
      background: '#0b0b10e6', color: '#e9e6f2', font: '18px ui-monospace,monospace', cursor: 'pointer' });
    bar.appendChild(b);
  }
  document.body.appendChild(bar);

  // mouse wheel
  addEventListener('wheel', e => { if (e.target.closest('#feed')) return;
    e.preventDefault(); zoomBy(Math.exp(-e.deltaY * .0015), e.clientX, e.clientY); }, { passive: false });

  // drag to move (mouse or one finger), pinch to zoom (two fingers)
  document.documentElement.style.touchAction = 'none';
  const ptrs = new Map(); let last = null, pinch = 0;
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  addEventListener('pointerdown', e => { if (e.target.closest('button,a,#feed')) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY };
    if (ptrs.size === 2) pinch = dist(); });
  addEventListener('pointermove', e => { if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const d = dist(), [a, b] = [...ptrs.values()];
      if (pinch) zoomBy(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch = d; }
    else if (last) { px += e.clientX - last.x; py += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; apply(); } });
  const up = e => { ptrs.delete(e.pointerId); pinch = 0;
    const p = [...ptrs.values()][0]; last = p ? { x: p.x, y: p.y } : null; };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);

  // smooth fly-to: zoom in on a point on the map and bring it to the upper middle of the screen
  let anim = 0;
  window.ZOOM = {
    flyTo(el, zTarget = 2.4) {
      cancelAnimationFrame(anim);
      const z0 = z, t0 = performance.now(), D = 900;
      const ease = t => 1 - Math.pow(1 - t, 3);
      const step = now => {
        const t = Math.min(1, (now - t0) / D), k = ease(t);
        const p = MAP.screen(el);
        const want = z0 + (Math.max(z0, zTarget) - z0) * k;
        zoomBy(want / z, p.x, p.y);
        const q = MAP.screen(el), gx = innerWidth / 2, gy = innerHeight * (innerWidth < 700 ? .34 : .42);
        px += (gx - q.x) * .12 * (0.4 + k); py += (gy - q.y) * .12 * (0.4 + k); apply();
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    },
    stop() { cancelAnimationFrame(anim); },
  };
  addEventListener('pointerdown', () => cancelAnimationFrame(anim));

  apply();
})();
