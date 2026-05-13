/* AgriGov PWA — Registration & Install Prompt */
(function () {
  'use strict';

  /* ── Register Service Worker ── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => console.log('AgriGov SW registered:', reg.scope))
        .catch((err) => console.warn('AgriGov SW error:', err));
    });
  }

  /* ── Install Prompt (A2HS) ── */
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    if (document.getElementById('agrigov-install-banner')) return;
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const banner = document.createElement('div');
    banner.id = 'agrigov-install-banner';
    banner.innerHTML = `
      <div style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99990;
        background:linear-gradient(135deg,#2d7a2d,#4caf50);color:#fff;padding:14px 20px;
        border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.25);display:flex;align-items:center;
        gap:14px;max-width:360px;width:calc(100vw - 32px);font-family:system-ui,sans-serif;">
        <div style="font-size:2rem;flex-shrink:0">🌿</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.95rem">Installer AgriGov</div>
          <div style="font-size:0.78rem;opacity:0.9;margin-top:2px">Accédez à l'application directement depuis votre écran d'accueil</div>
        </div>
        <button id="agrigov-install-btn" style="background:#fff;color:#2d7a2d;border:none;
          padding:8px 16px;border-radius:10px;font-weight:700;font-size:0.85rem;cursor:pointer;
          white-space:nowrap;flex-shrink:0">Installer</button>
        <button id="agrigov-install-close" style="background:none;border:none;color:#fff;
          font-size:1.2rem;cursor:pointer;padding:4px;opacity:0.7">✕</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('agrigov-install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('Install result:', result.outcome);
      deferredPrompt = null;
      banner.remove();
    });

    document.getElementById('agrigov-install-close').addEventListener('click', () => {
      banner.remove();
      sessionStorage.setItem('agrigov_install_dismissed', '1');
    });

    // Auto-hide after 15s
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 15000);
  }

  /* ── Detect standalone mode ── */
  if (window.matchMedia('(display-mode: standalone)').matches) {
    document.documentElement.classList.add('pwa-standalone');
  }

  /* ── iOS install hint ── */
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true;
  if (isIOS && !isStandalone && !sessionStorage.getItem('agrigov_ios_hint')) {
    setTimeout(() => {
      const hint = document.createElement('div');
      hint.id = 'agrigov-ios-hint';
      hint.innerHTML = `
        <div style="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99990;
          background:#fff;color:#333;padding:16px 20px;border-radius:16px;
          box-shadow:0 8px 30px rgba(0,0,0,0.2);max-width:340px;width:calc(100vw - 32px);
          font-family:system-ui,sans-serif;text-align:center;">
          <div style="font-size:1.5rem;margin-bottom:8px">🌿</div>
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px">Installer AgriGov sur votre iPhone</div>
          <div style="font-size:0.8rem;color:#666;line-height:1.5">
            Appuyez sur <strong>Partager</strong> (⬆️) puis <strong>"Sur l'écran d'accueil"</strong>
          </div>
          <button onclick="this.parentNode.parentNode.remove();sessionStorage.setItem('agrigov_ios_hint','1')"
            style="margin-top:12px;background:#2d7a2d;color:#fff;border:none;padding:8px 20px;
            border-radius:10px;font-weight:600;font-size:0.85rem;cursor:pointer">Compris</button>
        </div>
      `;
      document.body.appendChild(hint);
      setTimeout(() => { if (hint.parentNode) hint.remove(); }, 12000);
    }, 3000);
  }
})();
