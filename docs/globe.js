// Rough Earth behind the Toronto plane: ocean, continents, graticule, atmosphere.
(() => {
  const stage = document.getElementById('stage'), pts = document.getElementById('pts');
  const PW = parseFloat(stage.style.width), PH = parseFloat(stage.style.height);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d');
  Object.assign(cv.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' });
  document.body.prepend(cv);
  const dotAt = (x, y) => { const el = document.createElement('i'); el.style.left = x + 'px'; el.style.top = y + 'px'; pts.appendChild(el); return el; };
  const C = [dotAt(0, 0), dotAt(PW, 0), dotAt(PW / 2, PH / 2), dotAt(PW / 2, PH)];   // far-left, far-right, centre, near
  const pos = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  const RAD = Math.PI / 180, LAT0 = (43.65 - 52) * RAD, LON0 = -79.38 * RAD;   // look at Earth from south of Toronto
  const sL = Math.sin(LAT0), cL = Math.cos(LAT0);
  function proj(lon, lat) {                       // orthographic -> unit disk (x right, y down) + visible flag
    const p = lat * RAD, l = lon * RAD - LON0, cp = Math.cos(p);
    const x = cp * Math.sin(l), y = cL * Math.sin(p) - sL * cp * Math.cos(l);
    const vis = sL * Math.sin(p) + cL * cp * Math.cos(l);
    return [x, -y, vis];
  }
  const TOR = proj(-79.38, 43.65);

  // land from world-atlas (TopoJSON, 1:110m), decoded by hand
  let rings = [];
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(r => r.json()).then(t => {
    const [sx, sy] = t.transform.scale, [tx, ty] = t.transform.translate;
    const arcs = t.arcs.map(a => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
    const arc = i => i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    for (const g of t.objects.land.geometries) {
      const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs;
      for (const poly of polys) for (const ring of poly) rings.push(ring.flatMap(arc));
    }
    last = '';
  }).catch(() => {});

  let last = '';
  function draw() {
    const d = devicePixelRatio || 1;
    if (cv.width !== innerWidth * d) { cv.width = innerWidth * d; cv.height = innerHeight * d; last = ''; }
    const [fl, fr, ce, ne] = C.map(pos);
    const key = [fl, fr, ce].flat().map(Math.round).join(',') + rings.length;
    if (key !== last) {
      last = key;
      // globe size follows how big the plane is on screen; Toronto sits under the plane's centre
      const planeW = Math.hypot(fr[0] - fl[0], fr[1] - fl[1]);
      const R = Math.max(planeW * 2.2, innerWidth * .9);
      const ox = ce[0] - TOR[0] * R, oy = ce[1] - TOR[1] * R;
      const P = (lon, lat) => { const [x, y, v] = proj(lon, lat); if (v < 0) { const m = Math.hypot(x, y) || 1; return [ox + x / m * R, oy + y / m * R, v]; } return [ox + x * R, oy + y * R, v]; };
      cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);

      // atmosphere + ocean
      const atm = cx.createRadialGradient(ox, oy, R * .96, ox, oy, R * 1.12);
      atm.addColorStop(0, 'rgba(120,80,255,.35)'); atm.addColorStop(1, 'rgba(120,80,255,0)');
      cx.fillStyle = atm; cx.beginPath(); cx.arc(ox, oy, R * 1.12, 0, 7); cx.fill();
      const sea = cx.createRadialGradient(ox, oy - R * .5, R * .1, ox, oy, R);
      sea.addColorStop(0, '#16123a'); sea.addColorStop(1, '#07061a');
      cx.fillStyle = sea; cx.beginPath(); cx.arc(ox, oy, R, 0, 7); cx.fill();
      cx.save(); cx.beginPath(); cx.arc(ox, oy, R, 0, 7); cx.clip();

      // graticule
      cx.strokeStyle = 'rgba(160,140,255,.10)'; cx.lineWidth = 1;
      const line = ptsList => { cx.beginPath(); let pen = false; for (const [lo, la] of ptsList) { const [x, y, v] = P(lo, la); if (v < 0) { pen = false; continue; } pen ? cx.lineTo(x, y) : cx.moveTo(x, y); pen = true; } cx.stroke(); };
      for (let lo = -180; lo < 180; lo += 15) line(Array.from({ length: 61 }, (_, i) => [lo, -90 + i * 3]));
      for (let la = -75; la <= 75; la += 15) line(Array.from({ length: 121 }, (_, i) => [-180 + i * 3, la]));

      // continents
      cx.fillStyle = 'rgba(70,50,140,.55)'; cx.strokeStyle = 'rgba(180,150,255,.45)'; cx.lineWidth = 1;
      for (const ring of rings) {
        let any = false; cx.beginPath();
        ring.forEach(([lo, la], i) => { const [x, y, v] = P(lo, la); if (v > 0) any = true; i ? cx.lineTo(x, y) : cx.moveTo(x, y); });
        if (any) { cx.closePath(); cx.fill(); cx.stroke(); }
      }
      // limb shading so the edge feels round
      const sh = cx.createRadialGradient(ox, oy - R * .3, R * .4, ox, oy, R);
      sh.addColorStop(0, 'rgba(5,5,7,0)'); sh.addColorStop(1, 'rgba(5,5,7,.6)');
      cx.fillStyle = sh; cx.fillRect(ox - R, oy - R, 2 * R, 2 * R);
      // soft glow where Toronto is
      const g = cx.createRadialGradient(ce[0], ce[1], 0, ce[0], ce[1], planeW * .9);
      g.addColorStop(0, 'rgba(140,90,255,.25)'); g.addColorStop(1, 'rgba(140,90,255,0)');
      cx.fillStyle = g; cx.fillRect(0, 0, innerWidth, innerHeight);
      cx.restore();
      cx.strokeStyle = 'rgba(170,140,255,.5)'; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ox, oy, R, 0, 7); cx.stroke();
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
