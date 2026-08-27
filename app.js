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
//
// Every page is served from its own folder, so the site's URLs are clean
// ("/prayers/", "/about/history/"). Reduce both the current URL and each
// link to a bare comparable key first — otherwise "/" and "/index.html"
// look like different pages and Home never lights up. The .html forms are
// still normalised so an old bookmark highlights the right tab too.
//
//   /                     -> ''
//   /about/               -> 'about'
//   /about/history/       -> 'about/history'
//   /prayers.html         -> 'prayers'   (legacy)
function normalizePath(p) {
  return p
    .replace(/^\//, '')
    .replace(/index\.html$/, '')
    .replace(/\.html$/, '')
    .replace(/\/$/, '');
}

const currentPath = normalizePath(location.pathname);
document.querySelectorAll('.nav__link, .nav__mobile .nav__link').forEach(link => {
  const target = normalizePath(link.getAttribute('href') || '');
  // A section stays highlighted while you are on any page inside it, but the
  // empty Home key must not match everything, hence the target !== '' guard.
  const isExact = target === currentPath;
  const isInSection = target !== '' && currentPath.startsWith(target + '/');
  link.classList.toggle('active', isExact || isInSection);
});

// Next-prayer highlighting and the countdown live in content.js, which
// reads the real times from content.json. Do not duplicate that logic
// here — two copies would fight over the .prayer-time--next class.
