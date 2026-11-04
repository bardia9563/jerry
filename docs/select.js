// Tap a signal on the map (or an item in the list) to see it, copy its resale listing and post it.
(() => {
  const pick = document.createElement('div'); pick.id = 'pick'; document.body.appendChild(pick);
  const btn = document.createElement('button'); btn.id = 'listbtn'; btn.textContent = '☰ LIST'; document.body.appendChild(btn);
  btn.onclick = () => document.body.classList.toggle('showfeed');

  const label = { free: 'FREE', deal: 'DEAL', lowprof: 'LOWPROF' };
  const FB_SELL = 'https://www.facebook.com/marketplace/create/item';
  let cur = null;

  async function copy(text, el) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    const old = el.textContent; el.textContent = '✓ Copied'; setTimeout(() => el.textContent = old, 1400);
  }

  function show(a) {
    cur = a;
    const L = a.listing, sell = L ? Math.round(+L.price || +a.value || 0) : 0;
    const price = a.kind === 'free' ? `free · worth ~$${a.value}` : `$${a.price} → $${a.value} (+$${Math.round(a.value - a.price)})`;
    pick.className = 'on ' + a.kind;
    pick.innerHTML = `<b>${label[a.kind] || 'DEAL'}</b> ${esc(a.title)}<small>${esc(price)} · ${esc(a.where)} · ${esc(a.source)}</small>` +
      (a.gone ? '<div class="gone">🛑 Original is SOLD / gone — take your listing down</div>' : '') +
      (L ? `<div class="lst"><div class="lt">${esc(L.title)}</div><div class="lp">List for $${sell}</div><div class="ld">${esc(L.description)}</div></div>
            <div class="row"><button data-a="all">📋 Copy all</button><button data-a="title">Title</button><button data-a="price">Price</button><button data-a="desc">Description</button></div>
            <div class="row"><button data-a="fb" class="main">List it on Marketplace ↗</button></div>` : '') +
      `<div class="row">` +
      (a.url && a.url !== '#' ? `<a href="${esc(a.url.startsWith('/') ? 'https://www.kijiji.ca' + a.url : a.url)}" target="_blank" rel="noopener">Open original ↗</a>` : '') +
      (a.lat ? `<a href="https://maps.apple.com/?daddr=${a.lat},${a.lon}&dirflg=d" target="_blank" rel="noopener">🧭 Directions</a>` : '') +
      `</div>` +
      '<span class="x">✕</span>';
  }
  window.showPick = show;
  // keep drags / scrolls inside the card from moving the map
  for (const ev of ['pointerdown', 'wheel']) pick.addEventListener(ev, e => e.stopPropagation(), { passive: true });

  pick.addEventListener('click', e => {
    const t = e.target;
    if (t.classList.contains('x')) { pick.className = ''; return; }
    const act = t.dataset && t.dataset.a, L = cur && cur.listing;
    if (!act || !L) return;
    const sell = String(Math.round(+L.price || +cur.value || 0));
    const all = `${L.title}\n\n$${sell}\n\n${L.description}`;
    if (act === 'all') copy(all, t);
    if (act === 'title') copy(L.title, t);
    if (act === 'price') copy(sell, t);
    if (act === 'desc') copy(L.description, t);
    if (act === 'fb') { copy(all, t); window.open(FB_SELL, '_blank', 'noopener'); }
  });

  // tapping an item in the list opens its card instead of leaving the page
  document.getElementById('feed').addEventListener('click', e => {
    const li = e.target.closest('li'); if (!li) return;
    const i = [...li.parentNode.children].indexOf(li);
    const a = sigs.map(s => s.a).sort((x, y) => y.t - x.t)[i];
    if (a) { e.preventDefault(); show(a); }
  });

  // a tap, not a drag: find the closest signal dot
  let down = null;
  addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
  addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    if (e.target.closest('button,a,#feed,#pick')) return;
    let best = null, bd = innerWidth < 700 ? 34 : 22;
    for (const s of sigs) { const p = MAP.screen(s.el), d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if (d < bd) { bd = d; best = s; } }
    if (best) show(best.a); else pick.className = '';
  });
})();
