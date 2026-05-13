const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;

function safeCursorLoop() {
  if (!cursor || !ring) return;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function animate() {
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(animate);
  })();
  document.querySelectorAll('button, a, li, .service-card, .step').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.style.width = '60px'; ring.style.height = '60px'; ring.style.opacity = '0.6'; });
    el.addEventListener('mouseleave', () => { ring.style.width = '36px'; ring.style.height = '36px'; ring.style.opacity = '1'; });
  });
}

function formatCompact(num) {
  const value = Number(num || 0);
  if (value >= 1000000) return { main: (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1), suffix: 'M' };
  if (value >= 1000) return { main: (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1), suffix: 'K' };
  return { main: String(Math.round(value)), suffix: '' };
}
function setStat(index, value, label) {
  const item = document.querySelectorAll('.stats-bar .stat-item, .stats-grid .stat-card')[index];
  if (!item) return;
  const number = item.querySelector('.stat-num');
  const text = item.querySelector('.stat-label');
  const formatted = formatCompact(value);
  if (number) { number.dataset.target = String(value || 0); number.innerHTML = `${formatted.main}<span>${formatted.suffix}</span>`; }
  if (text) text.textContent = label;
}
async function loadPublicDynamicStats() {
  try {
    const response = await fetch('/api/public-stats/', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'stats');
    setStat(0, data.users?.approved_profiles || data.users?.profiles || data.users?.total || 0, 'Acteurs inscrits réellement');
    setStat(1, data.wilayas_count || 0, 'Wilayas couvertes');
    setStat(2, data.orders?.total || 0, 'Commandes enregistrées');
    setStat(3, data.products?.active_listings || data.products?.official || 0, 'Offres actives');
    const cta = document.querySelector('.cta-band-text p, .cta-section p');
    if (cta) cta.textContent = `${data.users?.profiles || 0} profil(s), ${data.orders?.total || 0} commande(s), ${data.products?.active_listings || 0} offre(s) synchronisés depuis la base AgriGov Market.`;
  } catch (error) { console.warn('Stats dynamiques indisponibles', error); }
}
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const num = parseFloat(el.dataset.target || el.textContent.replace(/[^0-9.]/g, '')) || 0;
    let start = 0; const step = Math.max(num / 60, 1);
    const timer = setInterval(() => {
      start += step;
      if (start >= num) { start = num; clearInterval(timer); }
      const compact = formatCompact(start);
      el.innerHTML = `${compact.main}<span>${compact.suffix}</span>`;
    }, 18);
  });
}
safeCursorLoop();
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => { nav?.classList.toggle('scrolled', window.scrollY > 50); });
const observer = new IntersectionObserver(entries => { entries.forEach((e, i) => { if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 90); }); }, { threshold: 0.15 });
document.querySelectorAll('.stat-item, .stat-card, .service-card, .step, .big-quote, .content-section').forEach(el => observer.observe(el));
const statsBlock = document.querySelector('.stats-bar, #stats, .stats-grid');
const statsObserver = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) { animateCounters(); statsObserver.disconnect(); } }, { threshold: 0.4 });
if (statsBlock) statsObserver.observe(statsBlock);
loadPublicDynamicStats();
function scrollTo(sel) { document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' }); }

/* ── Mobile drawer ── */
function toggleMobileNav() {
  const drawer = document.getElementById('navMobileDrawer');
  if (drawer) {
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open', !isOpen);
    document.body.style.overflow = isOpen ? '' : 'hidden';
  }
}
function closeMobileNav() {
  const drawer = document.getElementById('navMobileDrawer');
  if (drawer) { drawer.classList.remove('open'); document.body.style.overflow = ''; }
}
// Close on outside click
document.getElementById('navMobileDrawer')?.addEventListener('click', function(e) {
  if (e.target === this) closeMobileNav();
});
