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

  for (let x = tx0; x <= tx1; x++) for (let y = ty0; y <= ty1; y++) {
    const img = new Image();
    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${Z}/${y}/${x}`;
    img.style.left = (x - tx0) * 256 + 'px'; img.style.top = (y - ty0) * 256 + 'px';
    img.onerror = () => img.remove();
    tiles.appendChild(img);
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
