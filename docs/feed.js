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
  $('s-profit').textContent = '$' + Math.round(f.reduce((x, a) => x + (+a.value || 0), 0) + d.reduce((x, a) => x + (a.value - a.price || 0), 0));
  const last = real.slice().sort((x, y) => y.t - x.t);
  $('feed').innerHTML = last.slice(0, 12).map(a => `<li class="${a.kind}"><a href="${esc(a.url)}" target="_blank" rel="noopener"><b>${LBL[a.kind] || 'DEAL'}</b> ${esc(a.title)}</a><small>${esc(money(a))} · ${esc(a.where)} · ${esc(a.source)}</small></li>`).join('');
  $('tick').textContent = last.length ? last.slice(0, 8).map(a => `${LBL[a.kind] || 'DEAL'} ${a.title} ${money(a)} · ${a.where}`).join('   •   ') : 'waiting for signals…';
}

async function poll() {
  let data = [];
  try { data = await (await fetch('alerts.json?' + Date.now(), { cache: 'no-store' })).json(); } catch (e) {}
  data = data.filter(a => a.lat && Date.now() - a.t * 1000 < KEEP);
  if (data.length && !demo) {
    $('demo').hidden = true;
    if (sigs.some(s => s.a.demo)) { sigs = []; document.querySelectorAll('#pts i:not(.home)').forEach(e => e.remove()); }
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

poll(); setInterval(poll, 60000);
