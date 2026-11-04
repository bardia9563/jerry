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

  // save all photos at once (iPhone share sheet -> Save Images); fall back to press-and-hold
  async function savePics(urls, el) {
    el.textContent = '…';
    try {
      const files = await Promise.all(urls.map(async (u, i) => {
        const b = await (await fetch(u, { mode: 'cors' })).blob();
        return new File([b], `photo${i + 1}.${(b.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`, { type: b.type || 'image/jpeg' });
      }));
      if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files }); el.textContent = '✓ Saved'; return; }
      throw 0;
    } catch (e) {
      el.textContent = '📷 Save photos';
      const h = pick.querySelector('.pics-hint'); if (h) h.hidden = false;
    }
  }

  const dim = document.createElement('div'); dim.id = 'dim'; document.body.appendChild(dim);
  function close() { pick.classList.remove('on'); dim.classList.remove('on'); window.FOCUS = null; }

  function show(a) {
    cur = a;
    const sig = sigs.find(s => s.a === a);
    window.FOCUS = sig || null;
    if (sig && window.ZOOM) ZOOM.flyTo(sig.el);
    dim.classList.add('on');
    pick.classList.remove('on'); void pick.offsetWidth;          // restart the open animation
    const L = a.listing, sell = L ? Math.round(+L.price || +a.value || 0) : 0;
    const price = a.kind === 'free' ? `free · worth ~$${a.value}` : `$${a.price} → $${a.value} (+$${Math.round(a.value - a.price)})`;
    pick.className = a.kind; requestAnimationFrame(() => pick.classList.add('on'));
    pick.innerHTML = `<b>${label[a.kind] || 'DEAL'}</b> ${esc(a.title)}<small>${esc(price)} · ${esc(a.source)}</small><small>📍 ${esc(a.where)}${window.tripTxt && a.lat ? ' · ' + tripTxt(a) : ''}</small>` +
      (a.images && a.images.length ? `<div class="pics">${a.images.map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>
            <div class="row"><button data-a="pics">📷 Save photos</button></div>
            <div class="hint pics-hint" hidden>If it doesn't save: press and hold a photo, then tap <b>Save to Photos</b>.</div>` : '') +
      (a.gone ? '<div class="gone">🛑 Original is SOLD / gone — take your listing down</div>' : '') +
      (L ? `<div class="lst"><div class="lt">${esc(L.title)}</div><div class="lp">List for $${sell}</div><div class="ld">${esc(L.description)}</div></div>
            <div class="row"><button data-a="title">Title</button><button data-a="price">Price</button><button data-a="desc">Description</button></div>
            <div class="row"><button data-a="fb" class="main">Open Facebook ↗</button></div><div class="hint fb-hint" hidden>In Facebook tap <b>Marketplace → Sell → Item for sale</b>, add photos, then use <b>Title / Price / Description</b> here to copy each part.</div>` : '') +
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
    if (t.classList.contains('x')) { close(); return; }
    const act = t.dataset && t.dataset.a, L = cur && cur.listing;
    if (act === 'pics') { savePics(cur.images || [], t); return; }
    if (!act || !L) return;
    const sell = String(Math.round(+L.price || +cur.value || 0));
    const all = `${L.title}\n\n$${sell}\n\n${L.description}`;
    if (act === 'title') copy(L.title, t);
    if (act === 'price') copy(sell, t);
    if (act === 'desc') copy(L.description, t);
    if (act === 'fb') { pick.querySelector('.fb-hint').hidden = false; window.open(FB_SELL, '_blank', 'noopener'); }
  });

  // tapping an item in the list opens its card instead of leaving the page
  document.getElementById('feed').addEventListener('click', e => {
    const li = e.target.closest('li[data-k]'); if (!li) return;
    const a = (window.FEEDLIST || [])[+li.dataset.k];
    if (a) { e.preventDefault(); show(a); }
  });

  // a tap, not a drag: find the closest signal dot
  let down = null;
  addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, true);
  addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    if (e.target.closest('button,a,#feed,#pick')) return;
    let best = null, bd = innerWidth < 700 ? 34 : 22;
    for (const s of sigs) { if (s.a.gone && performance.now() - (s.goneAt || 0) > 3000) continue; const p = MAP.screen(s.el), d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if (d < bd) { bd = d; best = s; } }
    if (best) show(best.a); else if (pick.classList.contains('on')) close();
  });
})();
