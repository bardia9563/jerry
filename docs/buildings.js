// 3D skyline: real Toronto towers (OpenStreetMap, 60 m+) extruded off the map.
(() => {
  const EX = 5, FP = 2.2;               // exaggerate height and footprint so towers read at city scale
  const M_PER_PX = 55.3;                // metres per map pixel at zoom 11 (Toronto)
  const stage = document.getElementById('stage'), pts = document.getElementById('pts');
  const PW = parseFloat(stage.style.width), PH = parseFloat(stage.style.height);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d');
  Object.assign(cv.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' });
  document.body.appendChild(cv);

  // four corner dots -> the browser tells us where the plane's corners land on screen
  const corner = (x, y) => { const el = document.createElement('i'); el.style.left = x + 'px'; el.style.top = y + 'px'; pts.appendChild(el); return el; };
  const C = [corner(0, 0), corner(PW, 0), corner(PW, PH), corner(0, PH)];

  // homography: plane (u,v) -> screen (x,y) from 4 point pairs
  function homography(src, dst) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = src[i], [x, y] = dst[i];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
    }
    for (let c = 0; c < 8; c++) {                       // gaussian elimination
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
    const h = b.map((v, i) => v / A[i][i]);
    return (u, v) => { const w = h[6] * u + h[7] * v + 1; return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w]; };
  }

  let B = [], lastKey = '';
  Promise.all([1, 2, 3].map(i => fetch(`bld${i}.txt`).then(r => r.ok ? r.text() : '').catch(() => '')))
    .then(parts => {
      B = parts.join('_').split('_').filter(Boolean).map(s => s.trim().split(/\s+/).map(Number))
        .map(([x, y, w, d, h]) => ({ x: (x + w * (1 - FP) / 2) / 10, y: (y + d * (1 - FP) / 2) / 10, w: w * FP / 10, d: d * FP / 10, h }));
      B.sort((a, b) => a.y - b.y);                      // far (north) first
      lastKey = '';
    });

  function draw() {
    const d = devicePixelRatio || 1;
    if (cv.width !== innerWidth * d) { cv.width = innerWidth * d; cv.height = innerHeight * d; lastKey = ''; }
    const S = C.map(el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const key = S.flat().map(Math.round).join(',') + B.length;
    if (key !== lastKey && B.length) {
      lastKey = key;
      const P = homography([[0, 0], [PW, 0], [PW, PH], [0, PH]], S);
      cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);
      const mid = innerWidth / 2;
      for (const b of B) {
        const q = [P(b.x, b.y), P(b.x + b.w, b.y), P(b.x + b.w, b.y + b.d), P(b.x, b.y + b.d)];
        const sx = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / b.w;     // local px per map px
        const up = b.h / M_PER_PX * EX * sx * 0.85;
        const t = q.map(([x, y]) => [x, y - up]);
        const k = Math.min(1, b.h / 300);                                     // taller = brighter
        const face = (pts, fill) => { cx.beginPath(); pts.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.closePath(); cx.fillStyle = fill; cx.fill(); };
        const side = (q[0][0] + q[1][0]) / 2 < mid ? [q[1], q[2], t[2], t[1]] : [q[3], q[0], t[0], t[3]];
        face(side, `rgba(${60 + 60 * k},${40 + 30 * k},${120 + 60 * k},.85)`);
        face([q[3], q[2], t[2], t[3]], `rgba(${80 + 80 * k},${55 + 40 * k},${160 + 70 * k},.9)`);
        face(t, `rgba(${170 + 70 * k},${140 + 60 * k},255,.95)`);
        if (b.h > 200) {                                                      // glow on the tallest
          cx.strokeStyle = `rgba(200,170,255,${.35 + .4 * k})`; cx.lineWidth = 1;
          cx.beginPath(); cx.moveTo(t[3][0], t[3][1]); cx.lineTo(t[2][0], t[2][1]); cx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
