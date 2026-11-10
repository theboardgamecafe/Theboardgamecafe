(() => {
  const links=[...document.querySelectorAll('[data-mobile-page]')];
  if(!links.length||!document.getElementById('home')) return;
  const sections=['home','book','whats-on','google-reviews'].map(id=>document.getElementById(id)).filter(Boolean);
  if(!('IntersectionObserver' in window)) return;
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      const active=entry.target.id==='book'?'book':'home';
      for(const link of links){
        if(link.dataset.mobilePage===active)link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      }
    }
  },{rootMargin:'-15% 0px -65% 0px',threshold:0});
  sections.forEach(section=>observer.observe(section));
})();
