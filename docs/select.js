// Tap a signal on the map (or use the list button on phones) to see the item and open it.
(() => {
  const pick = document.createElement('div'); pick.id = 'pick'; document.body.appendChild(pick);
  const btn = document.createElement('button'); btn.id = 'listbtn'; btn.textContent = '☰ LIST'; document.body.appendChild(btn);
  btn.onclick = () => document.body.classList.toggle('showfeed');

  const label = { free: 'FREE', deal: 'DEAL', lowprof: 'LOWPROF' };
  function show(a) {
    const price = a.kind === 'free' ? `free · worth ~$${a.value}` : `$${a.price} → $${a.value} (+$${Math.round(a.value - a.price)})`;
    pick.className = 'on ' + a.kind;
    pick.innerHTML = `<b>${label[a.kind] || 'DEAL'}</b> ${esc(a.title)}<small>${esc(price)} · ${esc(a.where)} · ${esc(a.source)}</small>` +
      (a.url && a.url !== '#' ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">Open listing ↗</a>` : '') + '<span class="x">✕</span>';
  }
  pick.addEventListener('click', e => { if (e.target.classList.contains('x')) pick.className = ''; });

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
