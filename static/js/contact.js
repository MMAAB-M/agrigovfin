function contactToast(message, type='error') { let wrap = document.getElementById('buyerToastWrap'); if (!wrap) { wrap = document.createElement('div'); wrap.id = 'buyerToastWrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); } const toast = document.createElement('div'); toast.className = `toast-item ${type}`; toast.textContent = message; wrap.appendChild(toast); setTimeout(() => toast.classList.add('visible'), 10); setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 250); }, 2600); }
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
(function animate() {
  rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
  cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(animate);
})();
document.querySelectorAll('button, a, li, .contact-card, .social-btn').forEach(el => {
  el.addEventListener('mouseenter', () => { ring.style.width = '60px'; ring.style.height = '60px'; ring.style.opacity = '0.6'; });
  el.addEventListener('mouseleave', () => { ring.style.width = '36px'; ring.style.height = '36px'; ring.style.opacity = '1'; });
});

/* ── Navbar scroll ── */
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => { nav.classList.toggle('scrolled', window.scrollY > 50); });

/* ── Intersection Observer ── */
const observer = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 120);
  });
}, { threshold: 0.12 });
document.querySelectorAll('.contact-card, .social-block, .form-block, .map-wrap').forEach(el => observer.observe(el));

