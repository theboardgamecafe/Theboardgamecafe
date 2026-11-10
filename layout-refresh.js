(() => {
  const navigation = document.querySelector('.section-navigation');
  if (!navigation) return;
  const links = Array.from(navigation.querySelectorAll('[data-section]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function showActiveLink(link) {
    if (!link || navigation.scrollWidth <= navigation.clientWidth) return;
    navigation.scrollTo({
      left: link.offsetLeft - (navigation.clientWidth - link.offsetWidth) / 2,
      behavior: reducedMotion.matches ? 'auto' : 'smooth'
    });
  }

  if (!document.body.classList.contains('home-page')) {
    if (location.pathname.endsWith('/things-to-do-blackburn.html') && ['#open-games', '#game-calendar'].includes(location.hash)) {
      links.forEach(link => {
        if (link.dataset.section === 'players') link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    showActiveLink(navigation.querySelector('[aria-current]'));
    return;
  }

  const sections = links.map(link => document.getElementById(link.dataset.section)).filter(Boolean);
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      let active;
      links.forEach(link => {
        if (link.dataset.section === entry.target.id) {
          link.setAttribute('aria-current', 'location');
          active = link;
        } else {
          link.removeAttribute('aria-current');
        }
      });
      showActiveLink(active);
    });
  }, {rootMargin: '-20% 0px -60% 0px', threshold: 0});
  sections.forEach(section => observer.observe(section));
})();
