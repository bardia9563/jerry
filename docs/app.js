// Live signals: alerts fly from where they are in Toronto up to FREE / DEALS.
const cv = document.getElementById('fx'), cx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const COL = { free: [89, 255, 176], deal: [255, 95, 168], lowprof: [255, 209, 102] };
const NODE = { free: 'n-free', deal: 'n-deal', lowprof: 'n-low' };
const DAY = 864e5, KEEP = 7 * DAY;
let sigs = [], lastT = 0, demo = /demo/.test(location.search), first = true;

function size() { const d = devicePixelRatio || 1;
  cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', size); size();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function add(a, isNew) {
  const B = MAP.BOX;
  const el = MAP.dot(clamp(a.lat, B.s, B.n), clamp(a.lon, B.w, B.e));
  sigs.push({ a, el, born: isNew ? performance.now() : -1e9, seed: Math.random() });
}

function bez(p, q, r, s, t) { const u = 1 - t;
  return { x: u*u*u*p.x + 3*u*u*t*q.x + 3*u*t*t*r.x + t*t*t*s.x,
           y: u*u*u*p.y + 3*u*u*t*q.y + 3*u*t*t*r.y + t*t*t*s.y }; }

function nodePos(kind) { const r = $(NODE[kind] || 'n-deal').querySelector('i').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

function frame(now) {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  cx.globalCompositeOperation = 'lighter';
  const ends = { free: nodePos('free'), deal: nodePos('deal'), lowprof: nodePos('lowprof') };
  const wall = Date.now();
  for (const s of sigs) {
    const p = MAP.screen(s.el), e = ends[s.a.kind] || ends.deal, h = p.y - e.y;
    const q = { x: p.x + (s.seed - .5) * 80, y: p.y - h * .55 }, r = { x: e.x, y: e.y + h * .35 };
    const age = s.a.demo ? 0 : (wall - s.a.t * 1000) / KEEP;
    const draw = clamp((now - s.born) / 1400, 0, 1);
    const fresh = clamp(1 - (now - s.born) / 6000, 0, 1);
    const al = clamp(1 - age, .18, 1) * (.35 + .65 * fresh), [R, G, Bc] = COL[s.a.kind] || COL.deal;
    cx.beginPath();
    for (let i = 0; i <= 40 * draw; i++) { const b = bez(p, q, r, e, i / 40); i ? cx.lineTo(b.x, b.y) : cx.moveTo(b.x, b.y); }
    cx.strokeStyle = `rgba(${R},${G},${Bc},${al * .18})`; cx.lineWidth = 6; cx.stroke();
    cx.strokeStyle = `rgba(${R},${G},${Bc},${al})`; cx.lineWidth = 1.2 + fresh * 1.5; cx.stroke();
    if (draw >= 1) for (let k = 0; k < 2; k++) {           // particles flowing up
      const b = bez(p, q, r, e, ((now / 2600) + s.seed + k / 2) % 1);
      cx.fillStyle = `rgba(${R},${G},${Bc},${al})`; cx.beginPath(); cx.arc(b.x, b.y, 1.8, 0, 7); cx.fill();
    }
    if (fresh > 0) {                                         // ripple where it was found
      const rr = 4 + (1 - fresh) * 40; cx.strokeStyle = `rgba(${R},${G},${Bc},${fresh})`; cx.lineWidth = 1.5;
      cx.beginPath(); cx.ellipse(p.x, p.y, rr, rr * .45, 0, 0, 7); cx.stroke();
    }
    cx.fillStyle = `rgba(${R},${G},${Bc},${al})`; cx.beginPath(); cx.arc(p.x, p.y, 2.2, 0, 7); cx.fill();
  }
  const hp = MAP.screen(MAP.homeEl);                         // home beacon
  const g = cx.createLinearGradient(0, hp.y - 70, 0, hp.y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.8)');
  cx.fillStyle = g; cx.fillRect(hp.x - 1, hp.y - 70, 2, 70);
  cx.globalCompositeOperation = 'source-over'; cx.fillStyle = '#fff'; cx.font = '10px ui-monospace,monospace';
  cx.fillText('HOME', hp.x + 7, hp.y - 56);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

