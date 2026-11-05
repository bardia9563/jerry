// 💬 Ongoing negotiations: keep track of every buyer/seller chat in one place (saved on this phone).
(() => {
  const KEY = 'jerry-talks';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
  let talks = load();
  const STAGES = [['talking', '💬 Talking'], ['agreed', '🤝 Agreed'], ['pickup', '📍 Pickup set'], ['done', '✅ Sold / bought'], ['dead', '✖ Dead']];
  const stageName = k => (STAGES.find(s => s[0] === k) || STAGES[0])[1];
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // button (top right, next to the bell) + panel
  const btn = document.createElement('button'); btn.id = 'talkbtn'; document.body.appendChild(btn);
  const panel = document.createElement('div'); panel.id = 'talks'; document.body.appendChild(panel);
  for (const ev of ['pointerdown', 'wheel']) { panel.addEventListener(ev, x => x.stopPropagation(), { passive: true }); btn.addEventListener(ev, x => x.stopPropagation(), { passive: true }); }
  const active = () => talks.filter(t => t.stage !== 'done' && t.stage !== 'dead');
  const badge = () => { const n = active().length; btn.innerHTML = '💬' + (n ? `<b>${n}</b>` : ''); };
  btn.onclick = () => { panel.classList.toggle('on'); render(); };

  let editing = null;   // id being edited, or 'new'
  function render() {
    badge();
    if (!panel.classList.contains('on')) return;
    const list = talks.slice().sort((a, b) => (a.stage === 'done' || a.stage === 'dead') - (b.stage === 'done' || b.stage === 'dead') || b.updated - a.updated);
    let html = `<div class="th"><b>💬 Negotiations</b><span class="x">✕</span></div>
      <div class="row"><button data-act="new" class="main">+ New</button></div>`;
    if (editing) html += form(editing === 'new' ? { stage: 'talking', side: 'selling' } : talks.find(t => t.id === editing));
    if (!list.length && !editing) html += '<small class="empty">Nothing yet. Tap <b>+ New</b>, or <b>💬 Track</b> on any item.</small>';
    for (const t of list) {
      const offer = t.offer ? `offer $${e(t.offer)}` : '', ask = t.ask ? `ask $${e(t.ask)}` : '';
      html += `<div class="tk st-${t.stage}" data-id="${t.id}">
        <div class="tt"><b>${e(t.item || 'Untitled')}</b><span class="chip">${stageName(t.stage)}</span></div>
        <small>${t.side === 'buying' ? '🛒 Buying from' : '💰 Selling to'} ${e(t.who || '?')}${t.where ? ' · ' + e(t.where) : ''}</small>
        <small>${[ask, offer, t.cost ? `cost $${e(t.cost)}` : ''].filter(Boolean).join(' · ')}${t.when ? ' · 🕒 ' + e(t.when) : ''}</small>
        ${t.notes ? `<small class="nt">${e(t.notes)}</small>` : ''}
        <div class="row">${STAGES.filter(s => s[0] !== t.stage).map(s => `<button data-stage="${s[0]}">${s[1]}</button>`).join('')}<button data-act="edit">✎</button></div>
      </div>`;
    }
    panel.innerHTML = html;
  }
  function form(t) {
    const f = (k, label, type = 'text', ph = '') => `<label>${label}<input name="${k}" type="${type}" ${type === 'number' ? 'inputmode="decimal"' : ''} value="${e(t[k] ?? '')}" placeholder="${ph}"></label>`;
    return `<form class="tf">
      <div class="seg"><label><input type="radio" name="side" value="selling" ${t.side !== 'buying' ? 'checked' : ''}> 💰 I'm selling</label>
        <label><input type="radio" name="side" value="buying" ${t.side === 'buying' ? 'checked' : ''}> 🛒 I'm buying</label></div>
      ${f('item', 'Item', 'text', 'e.g. Schwinn bike')}
      ${f('who', 'Person', 'text', 'name / username')}
      <div class="two">${f('ask', 'Asking $', 'number')}${f('offer', 'Their offer $', 'number')}</div>
      <div class="two">${f('cost', 'What I paid $', 'number')}${f('when', 'Pickup time', 'text', 'e.g. Sat 3pm')}</div>
      ${f('where', 'Where / app', 'text', 'FB Marketplace, lobby…')}
      <label>Notes<textarea name="notes" placeholder="what they said, lowest price, etc.">${e(t.notes)}</textarea></label>
      <div class="row"><button type="submit" class="main">Save</button><button type="button" data-act="cancel">Cancel</button>${t.id ? '<button type="button" data-act="del" class="del">Delete</button>' : ''}</div>
    </form>`;
  }

  // add from an item card (select.js calls this)
  window.trackItem = a => {
    const L = a.listing || {};
    talks.unshift({ id: Date.now() + '', created: Date.now(), updated: Date.now(), stage: 'talking',
      side: a.kind === 'free' ? 'buying' : 'buying', item: a.title, who: '', where: a.source || '',
      ask: a.price || '', offer: '', cost: '', when: '', notes: L.price ? `Plan: resell for $${L.price}` : '', url: a.url || '' });
    save(talks); editing = talks[0].id; panel.classList.add('on'); render();
  };

  panel.addEventListener('click', ev => {
    const el = ev.target, card = el.closest('.tk'), id = card && card.dataset.id;
    if (el.classList.contains('x')) { panel.classList.remove('on'); editing = null; return; }
    if (el.dataset.act === 'new') { editing = 'new'; render(); return; }
    if (el.dataset.act === 'cancel') { editing = null; render(); return; }
    if (el.dataset.act === 'edit') { editing = id; render(); panel.scrollTop = 0; return; }
    if (el.dataset.act === 'del') { talks = talks.filter(t => t.id !== editing); save(talks); editing = null; render(); return; }
    if (el.dataset.stage && id) {
      const t = talks.find(t => t.id === id); t.stage = el.dataset.stage; t.updated = Date.now();
      // selling and it's done: add the profit to EARNED/LOST
      if (t.stage === 'done' && t.side === 'selling' && !t.counted) {
        const got = parseFloat(prompt('Sold for how much? ($)', t.offer || t.ask || '')), cost = parseFloat(t.cost) || 0;
        if (!isNaN(got)) { t.sold = got; t.counted = true;
          let cur = 0; try { cur = +localStorage.getItem('jerry-earned') || 0; localStorage.setItem('jerry-earned', String(cur + got - cost)); } catch (x) {}
          dispatchEvent(new Event('jerry-earned')); }
      }
      save(talks); render();
    }
  });
  panel.addEventListener('submit', ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target).entries());
    if (editing === 'new') talks.unshift({ id: Date.now() + '', created: Date.now(), stage: 'talking', ...d, updated: Date.now() });
    else Object.assign(talks.find(t => t.id === editing), d, { updated: Date.now() });
    save(talks); editing = null; render();
  });
  badge();
})();
