// Toronto map plane: tiles, projection, screen positions.
const MAP = (() => {
  const Z = 11, BOX = { w: -79.64, e: -79.11, n: 43.86, s: 43.58 };
  const HOME = { lat: 43.64139, lon: -79.39147 };
  const W = 256 * 2 ** Z;
  const mx = lon => (lon + 180) / 360 * W;
  const my = lat => { const r = lat * Math.PI / 180;
    return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * W; };
  const tx0 = Math.floor(mx(BOX.w) / 256), tx1 = Math.floor(mx(BOX.e) / 256);
  const ty0 = Math.floor(my(BOX.n) / 256), ty1 = Math.floor(my(BOX.s) / 256);
  const PW = (tx1 - tx0 + 1) * 256, PH = (ty1 - ty0 + 1) * 256;
  const stage = document.getElementById('stage');
  const tiles = document.getElementById('tiles');
  const pts = document.getElementById('pts');
  stage.style.width = PW + 'px'; stage.style.height = PH + 'px';

  // sharper: draw zoom-12 tiles (4 per zoom-11 square) into the same plane
  const lights = document.createElement('canvas'), lx = lights.getContext('2d');
  lights.width = PW * 2; lights.height = PH * 2; lights.id = 'lights';
  tiles.after(lights);
  for (let x = tx0 * 2; x <= tx1 * 2 + 1; x++) for (let y = ty0 * 2; y <= ty1 * 2 + 1; y++) {
    const img = new Image();
    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${Z + 1}/${y}/${x}`;
    img.style.left = (x - tx0 * 2) * 128 + 'px'; img.style.top = (y - ty0 * 2) * 128 + 'px';
    img.onerror = () => img.remove();
    tiles.appendChild(img);
    // city lights: roads (the brighter pixels) re-coloured as glowing streets
    const c = new Image(); c.crossOrigin = 'anonymous'; c.src = img.src + '?l';
    c.onload = () => { try {
      const t = document.createElement('canvas'); t.width = t.height = 256; const g = t.getContext('2d');
      g.drawImage(c, 0, 0); const d = g.getImageData(0, 0, 256, 256), a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        const L = (a[i] + a[i + 1] + a[i + 2]) / 3, k = Math.max(0, Math.min(1, (L - 83) / 18));
        a[i] = 255; a[i + 1] = 150 + 70 * k; a[i + 2] = 90 + 120 * k; a[i + 3] = k * 255;
      }
      g.putImageData(d, 0, 0);
      const X = (x - tx0 * 2) * 256, Y = (y - ty0 * 2) * 256;
      lx.globalAlpha = .55; lx.filter = 'blur(3px)'; lx.drawImage(t, X, Y);
      lx.globalAlpha = .9; lx.filter = 'none'; lx.drawImage(t, X, Y);
    } catch (e) {} };
  }

  function fit() {
    // whole city visible: about screen-wide, and about half the screen tall once tilted
    const s = Math.min(innerWidth * (innerWidth < 700 ? 1.9 : 1.15) / PW, innerHeight * 0.62 / (PH * 0.55));
    stage.style.transform = `translateX(-50%) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  const inBox = (lat, lon) => lat > BOX.s - .15 && lat < BOX.n + .25 && lon > BOX.w - .3 && lon < BOX.e + .3;

  // Place a dot on the plane; the browser does the 3D projection for us.
  function dot(lat, lon, cls) {
    const el = document.createElement('i');
    if (cls) el.className = cls;
    el.style.left = (mx(lon) - tx0 * 256) + 'px';
    el.style.top = (my(lat) - ty0 * 256) + 'px';
    pts.appendChild(el);
    return el;
  }
  const screen = el => { const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  const homeEl = dot(HOME.lat, HOME.lon, 'home');
  return { dot, screen, inBox, homeEl, BOX };
})();
