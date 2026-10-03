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
    document.documentElement.classList.toggle('menu-open', isOpen);
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

// Centred text is fine for a line or three; past that every line starts in a
// different place, which is hard to follow on a phone. On narrow screens, any
// centred paragraph (other than a verse quote) that wraps to four or more
// lines is left-aligned instead.
// It has to be measured, because how many lines a paragraph takes depends on
// the screen, and content.js fills some of them in after loading.
(function () {
  const narrow = window.matchMedia('(max-width: 640px)');
  function relax() {
    document.querySelectorAll('p.is-long-centred').forEach(p => p.classList.remove('is-long-centred'));
    if (!narrow.matches) return;
    document.querySelectorAll('p').forEach(p => {
      if (p.closest('nav, footer, .page-hero, .hero')) return;
      if (getComputedStyle(p).textAlign !== 'center') return;
      // Italic paragraphs are the verse quotes: pull quotes meant to sit centred
      // over their citation, so they keep their alignment.
      if (getComputedStyle(p).fontStyle === 'italic') return;
      const lineHeight = parseFloat(getComputedStyle(p).lineHeight) || 24;
      if (p.getBoundingClientRect().height / lineHeight >= 3.5) p.classList.add('is-long-centred');
    });
  }
  window.addEventListener('load', relax);
  setTimeout(relax, 600);
  narrow.addEventListener('change', relax);
})();
