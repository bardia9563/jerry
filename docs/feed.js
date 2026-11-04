// Data: polls alerts.json, updates stats/feed, demo mode.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LBL = { free: 'FREE', deal: 'DEAL', lowprof: 'LOWPROF' }, ICON = { free: '🆓', deal: '💸', lowprof: '🪙' };
const money = a => a.kind !== 'free' ? `$${a.price}→$${a.value} (+$${Math.round(a.value - a.price)})` : `~$${a.value}`;

function announce(a) {
  const t = $('toast'); t.textContent = `${ICON[a.kind] || '💸'} ${a.title} · ${money(a)} · ${a.where}`;
  t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 5000);
  const n = $(NODE[a.kind] || 'n-deal'); n.classList.remove('hit'); void n.offsetWidth; n.classList.add('hit');
}

function ui() {
  const real = sigs.map(s => s.a), day = new Date().setHours(0, 0, 0, 0);
  const f = real.filter(a => a.kind === 'free'), d = real.filter(a => a.kind !== 'free'), lo = real.filter(a => a.kind === 'lowprof');
  $('s-today').textContent = real.filter(a => a.t * 1000 >= day).length;
  $('s-free').textContent = $('c-free').textContent = f.length;
  $('s-deal').textContent = $('c-deal').textContent = d.length - lo.length;
  $('s-low').textContent = $('c-low').textContent = lo.length;
  // the more live lines a ball has, the brighter it glows (gently: 0 lines = normal, 12+ = max)
  const live = k => real.filter(a => a.kind === k && !a.gone).length;
  for (const [k, id] of [['free', 'n-free'], ['deal', 'n-deal'], ['lowprof', 'n-low']])
    $(id).style.setProperty('--g', Math.min(1, live(k) / 12).toFixed(2));
  $('s-profit').textContent = '$' + Math.round(f.reduce((x, a) => x + (+a.value || 0), 0) + d.reduce((x, a) => x + (a.value - a.price || 0), 0));
  const last = real.slice().sort((x, y) => y.t - x.t);
  renderFeed(real);
  $('tick').textContent = last.length ? last.slice(0, 8).map(a => `${LBL[a.kind] || 'DEAL'} ${a.title} ${money(a)} · ${a.where}`).join('   •   ') : 'waiting for signals…';
}

async function poll() {
  let data = [];
  // GitHub API sees new alerts seconds after Jerry saves them (the website copy can lag a few minutes)
  try {
    const r = await fetch('https://api.github.com/repos/bardia9563/jerry/contents/docs/alerts.json?ref=main',
      { cache: 'no-store', headers: { Accept: 'application/vnd.github.raw+json' } });
    if (!r.ok) throw 0;
    data = await r.json();
  } catch (e) {
    try { data = await (await fetch('alerts.json?' + Date.now(), { cache: 'no-store' })).json(); } catch (e2) {}
  }
  data = data.filter(a => a.lat && Date.now() - a.t * 1000 < KEEP);
  if (data.length && !demo) {
    $('demo').hidden = true;
    if (sigs.some(s => s.a.demo)) { sigs = []; document.querySelectorAll('#pts i:not(.home)').forEach(e => e.remove()); }
    // mark items that sold since the last check, so their lines fade away
    const byKey = new Map(data.map(a => [a.t + '|' + a.url, a]));
    for (const sg of sigs) { const n = byKey.get(sg.a.t + '|' + sg.a.url);
      if (n && n.gone && !sg.a.gone) { sg.a.gone = n.gone; sg.goneAt = performance.now(); } }
    for (const a of data.filter(a => a.t > lastT).sort((x, y) => x.t - y.t)) { add(a, !first); if (!first) announce(a); }
    lastT = Math.max(lastT, ...data.map(a => a.t));
    if (first) sigs.forEach((s, i) => s.born = performance.now() + i * 120);
    first = false; ui();
  } else if (!sigs.length) startDemo();
}

const SPOTS = [[43.6555,-79.4100,'Kensington'],[43.6390,-79.4200,'Liberty Village'],[43.7615,-79.4111,'North York'],
  [43.7731,-79.2578,'Scarborough'],[43.6629,-79.3957,'The Annex'],[43.6763,-79.3502,'Danforth'],
  [43.6205,-79.5132,'Etobicoke'],[43.6677,-79.4672,'Junction'],[43.7064,-79.3986,'Yonge & Eglinton'],[43.6532,-79.3832,'Downtown']];
const ITEMS = [['Samsung 50" TV', 'free', 0, 140], ['PS5 + 2 controllers', 'deal', 260, 420], ['Office chair', 'free', 0, 70],
  ['DeWalt drill kit', 'deal', 60, 130], ['iPad 9th gen', 'deal', 150, 240], ['Mini fridge', 'free', 0, 60], ['Road bike', 'deal', 120, 220], ['Herman Miller Aeron', 'lowprof', 450, 520], ['MacBook Air M2', 'lowprof', 700, 760]];
function fake(isNew) { const s = SPOTS[Math.random() * SPOTS.length | 0], it = ITEMS[Math.random() * ITEMS.length | 0];
  return { demo: 1, t: Date.now() / 1000, title: it[0], kind: it[1], price: it[2], value: it[3], where: s[2], source: 'demo', url: '#',
    lat: s[0] + (Math.random() - .5) * .02, lon: s[1] + (Math.random() - .5) * .03 }; }
let demoTimer;
function startDemo() {
  $('demo').hidden = false;
  for (let i = 0; i < 7; i++) add(fake(), false);
  sigs.forEach((s, i) => s.born = performance.now() + i * 150); ui();
  clearInterval(demoTimer);
  demoTimer = setInterval(() => { if (!sigs.length || !sigs[0].a.demo) return clearInterval(demoTimer);
    const a = fake(); add(a, true); announce(a); if (sigs.length > 14) { sigs.shift().el.remove(); } ui(); }, 6000);
}

// ---- list with filters: price range + sort (newest / highest ROI / most profit) ----
let FPRICE = 'any', FSORT = 'new', FDIST = 'any';
// distance from home (81 Navy Wharf Crt) + a rough TTC time: ~10 min walking/waiting + ~3 min per km
const HOME_LL = [43.64139, -79.39147];
window.kmOf = a => { if (!a.lat) return null; const R = 6371, r = Math.PI / 180, dLa = (a.lat - HOME_LL[0]) * r, dLo = (a.lon - HOME_LL[1]) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(HOME_LL[0] * r) * Math.cos(a.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
window.ttcOf = a => { const k = kmOf(a); return k == null ? null : Math.round((10 + k * 3) / 5) * 5; };
window.tripTxt = a => { const k = kmOf(a); return k == null ? '' : `${k < 10 ? k.toFixed(1) : Math.round(k)} km · ~${ttcOf(a)} min TTC`; };
const DISTS = { any: ['Any km', 1e9], d5: ['< 5 km', 5], d10: ['< 10 km', 10], d20: ['< 20 km', 20] };
window.FEEDLIST = [];
const PRICES = { any: ['Any price', 0, 1e9], u50: ['Under $50', 0, 50], u100: ['Under $100', 0, 100],
  u250: ['Under $250', 0, 250], u500: ['Under $500', 0, 500], o500: ['$500+', 500, 1e9] };
const SORTS = { new: 'Newest first', roi: 'Highest ROI', profit: 'Most profit', near: 'Closest' };
const profitOf = a => a.kind === 'free' ? (+a.value || 0) : (a.value - a.price);
const roiOf = a => a.kind === 'free' ? Infinity : profitOf(a) / Math.max(+a.price || 1, 1);
const roiTxt = a => a.kind === 'free' ? 'free' : `ROI ${Math.round(roiOf(a) * 100)}%`;
function renderFeed(real) {
  const [, lo, hi] = PRICES[FPRICE];
  const maxKm = DISTS[FDIST][1];
  let list = real.filter(a => (+a.price || 0) >= lo && (+a.price || 0) <= hi && (kmOf(a) ?? 0) <= maxKm);
  if (FSORT === 'new') list.sort((x, y) => y.t - x.t);
  if (FSORT === 'roi') list.sort((x, y) => roiOf(y) - roiOf(x) || y.t - x.t);
  if (FSORT === 'profit') list.sort((x, y) => profitOf(y) - profitOf(x) || y.t - x.t);
  if (FSORT === 'near') list.sort((x, y) => (kmOf(x) ?? 1e9) - (kmOf(y) ?? 1e9));
  FEEDLIST = list.slice(0, 40);
  const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${Array.isArray(v) ? v[0] : v}</option>`).join('');
  $('feed').innerHTML = `<li class="filters"><select id="f-price">${opt(PRICES, FPRICE)}</select><select id="f-dist">${opt(DISTS, FDIST)}</select><select id="f-sort">${opt(SORTS, FSORT)}</select></li>` +
    (FEEDLIST.length ? FEEDLIST.map((a, k) => `<li class="${a.kind}${a.gone ? ' gone' : ''}" data-k="${k}"><a href="${esc(a.url)}" target="_blank" rel="noopener"><b>${LBL[a.kind] || 'DEAL'}</b> ${esc(a.title)}</a><small>${esc(money(a))} · ${roiTxt(a)}${a.gone ? ' · SOLD' : ''}</small><small>📍 ${esc(a.where)}${kmOf(a) != null ? ' · ' + tripTxt(a) : ''}</small></li>`).join('')
      : '<li class="empty"><small>nothing matches these filters yet</small></li>');
}
$('feed').addEventListener('change', e => {
  if (e.target.id === 'f-price') FPRICE = e.target.value;
  if (e.target.id === 'f-sort') FSORT = e.target.value;
  if (e.target.id === 'f-dist') FDIST = e.target.value;
  renderFeed(sigs.map(s => s.a));
});

// ---- EARNED / LOST: your real result, tap to change; type a minus for a loss (saved on this phone) ----
(() => {
  const box = $('earn'), out = $('s-earn'), KEY = 'jerry-earned';
  let val = 0; try { val = +localStorage.getItem(KEY) || 0; } catch (e) {}
  const show = () => { out.textContent = (val < 0 ? '-$' : '$') + Math.abs(Math.round(val)).toLocaleString(); out.style.color = val < 0 ? '#ff6b6b' : ''; };
  show();
  box.addEventListener('click', () => {
    if (box.querySelector('input')) return;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.inputMode = 'decimal'; inp.value = Math.round(val); inp.id = 'earn-in';
    out.replaceWith(inp); inp.focus(); inp.select();
    const done = () => { const n = parseFloat(inp.value); if (!isNaN(n)) val = n;
      try { localStorage.setItem(KEY, String(val)); } catch (e) {}
      inp.replaceWith(out); show(); };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  });
})();

poll(); setInterval(poll, 70000);   // ~50 checks/hour, under GitHub's free limit of 60
addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
