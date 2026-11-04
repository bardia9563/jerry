// Turn on notifications (home-screen app only) + open the item a notification points to.
(() => {
  const VAPID = 'BHcu3_HJvjQiiqdmO_vk2BQmwt990ueisB00e2hIUK0AJLzayag81CUB_pAcTnU6qzoDf7gxKFiuhgCObjlFBCY';
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  // open the item from a notification tap
  const focusOn = url => {
    if (!url) return;
    const tryIt = (n = 0) => { const s = sigs.find(s => s.a.url === url);
      if (s && window.showPick) showPick(s.a); else if (n < 20) setTimeout(() => tryIt(n + 1), 500); };
    tryIt();
  };
  focusOn(new URLSearchParams(location.search).get('focus'));
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => focusOn(e.data && e.data.focus));

  // the bell button
  const bell = document.createElement('button'); bell.id = 'bell'; bell.textContent = '🔔';
  document.body.appendChild(bell);
  const box = document.createElement('div'); box.id = 'pushbox'; document.body.appendChild(box);
  let subOn = false;
  try { subOn = localStorage.getItem('jerry-push') === '1'; } catch (e) {}
  if (subOn && Notification.permission === 'granted') bell.classList.add('on');

  bell.onclick = async () => {
    box.classList.add('on');
    if (!standalone) { box.innerHTML = '<b>Add Jerry to your Home Screen first</b><small>Safari → Share → Add to Home Screen, then open Jerry from its icon and tap 🔔 again.</small><span class="x">✕</span>'; return; }
    if (!('PushManager' in window)) { box.innerHTML = '<b>Notifications need iOS 16.4 or newer</b><span class="x">✕</span>'; return; }
    box.innerHTML = '<b>Turning on…</b>';
    try {
      if (await Notification.requestPermission() !== 'granted') throw new Error('Notifications were not allowed. Settings → Notifications → Jerry to allow them.');
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
      const code = JSON.stringify(sub);
      try { localStorage.setItem('jerry-push', '1'); } catch (e) {}
      bell.classList.add('on');
      box.innerHTML = `<b>✓ Notifications on</b><small>Last step: copy this code and paste it into GitHub as the secret <b>PUSH_SUBSCRIPTION</b>.</small>
        <textarea readonly>${code.replace(/</g, '&lt;')}</textarea><div class="row"><button data-copy>📋 Copy code</button></div><span class="x">✕</span>`;
      box.querySelector('[data-copy]').onclick = async ev => { try { await navigator.clipboard.writeText(code); } catch (e) { box.querySelector('textarea').select(); document.execCommand('copy'); } ev.target.textContent = '✓ Copied'; };
    } catch (err) {
      box.innerHTML = `<b>Couldn't turn on notifications</b><small>${String(err.message || err).replace(/</g, '&lt;')}</small><span class="x">✕</span>`;
    }
  };
  box.addEventListener('click', e => { if (e.target.classList.contains('x')) box.classList.remove('on'); });
  for (const ev of ['pointerdown', 'wheel']) { box.addEventListener(ev, e => e.stopPropagation(), { passive: true }); bell.addEventListener(ev, e => e.stopPropagation(), { passive: true }); }
})();
