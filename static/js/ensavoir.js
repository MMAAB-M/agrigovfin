function scrollTo(id) {
  const el = document.querySelector(id);
  if (el) {
    const offset = 140;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
 
// Scroll reveal
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
 
// Quick nav active state
const sections = ['agriculteurs','acheteurs','transporteurs','administration','autres'];
const qnLinks = document.querySelectorAll('.qn-link');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) current = id;
  });
  qnLinks.forEach((link, i) => {
    link.classList.toggle('active', sections[i] === current);
  });
});
 
// Hash navigation
if (window.location.hash) {
  setTimeout(() => scrollTo(window.location.hash), 300);}
  