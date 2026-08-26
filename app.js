// Mobile nav toggle
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  // Every path that opens or closes the menu goes through here, so the
  // button's accessible state can never drift out of sync with what is
  // actually on screen.
  const setMenu = (isOpen) => {
    mobileMenu.classList.toggle('open', isOpen);
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  };

  hamburger.addEventListener('click', () => {
    setMenu(!mobileMenu.classList.contains('open'));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      setMenu(false);
    }
  });

  // Close on Escape, and put focus back on the button so keyboard users
  // are not stranded inside a menu that is no longer visible.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      setMenu(false);
      hamburger.focus();
    }
  });

  // Tapping a link navigates away; close first so the menu is not left
  // open behind the new page when it is served from the back/forward cache.
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
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
