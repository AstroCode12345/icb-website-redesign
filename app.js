// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
    }
  });
}

// Highlight active nav link.
// Pages now live in folders (about/history.html, facilities/rental.html, etc),
// so several files share the name "index.html" — matching by filename alone
// would light up every section at once. Compare full paths instead, and treat
// any page inside a section's folder as keeping that section highlighted.
const currentPath = location.pathname.replace(/^\//, '') || 'index.html';
const currentSection = currentPath.split('/')[0];
document.querySelectorAll('.nav__link, .nav__mobile .nav__link').forEach(link => {
  const href = (link.getAttribute('href') || '').replace(/^\//, '');
  const linkSection = href.split('/')[0];
  const isExact = href === currentPath;
  const isSectionMatch = href.includes('/') && linkSection === currentSection;
  link.classList.toggle('active', isExact || isSectionMatch);
});

// Next-prayer highlighting and the countdown live in content.js, which
// reads the real times from content.json. Do not duplicate that logic
// here — two copies would fight over the .prayer-time--next class.
