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

// Highlight active nav link
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav__link, .nav__mobile .nav__link').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('active');
  } else {
    link.classList.remove('active');
  }
});

// Highlight next prayer time based on current time
function highlightNextPrayer() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  // [name, hours, mins]
  const iqamah = [
    ['Fajr',    5,  30],
    ['Zuhr',   13,  30],
    ['Asr',    17,  45],
    ['Maghrib',19,  40],
    ['Isha',   21,   0],
  ];
  let nextIdx = iqamah.findIndex(([, h, m]) => h * 60 + m > minutes);
  if (nextIdx === -1) nextIdx = 0; // wrap to Fajr

  document.querySelectorAll('.prayer-time').forEach((el, i) => {
    el.classList.toggle('prayer-time--next', i === nextIdx);
  });
}
highlightNextPrayer();
