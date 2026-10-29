(() => {
  const nav = document.getElementById("site-navigation");
  const toggle = document.querySelector(".mobile-toggle");
  const bar = document.querySelector(".mobile-bar");
  const main = document.getElementById("main-content");

  if (main && !main.hasAttribute("tabindex")) main.setAttribute("tabindex","-1");

  window.setMenu = function(open){
    if(!nav || !toggle) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if(open){
      const first = nav.querySelector("a");
      if(first) first.focus({preventScroll:true});
    } else if(document.activeElement && nav.contains(document.activeElement)){
      toggle.focus({preventScroll:true});
    }
  };

  window.toggleMenu = function(){
    if(!toggle) return;
    window.setMenu(toggle.getAttribute("aria-expanded") !== "true");
  };

  if(toggle) toggle.addEventListener("click", window.toggleMenu);
  if(nav) nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => window.setMenu(false)));
  document.addEventListener("keydown", e => { if(e.key === "Escape") window.setMenu(false); });
  document.addEventListener("click", e => {
    if(nav && toggle && nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) window.setMenu(false);
  });

  if(!bar) return;

  let blocked = false;
  let formFocus = false;
  const syncBar = () => {
    const show = window.scrollY > 320 && !blocked && !formFocus;
    bar.classList.toggle("is-visible", show);
    document.body.classList.toggle("mobile-cta-active", show);
  };

  const blockers = [...document.querySelectorAll("footer, .footer-cta-section, form")];
  if("IntersectionObserver" in window && blockers.length){
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      blocked = visible.size > 0;
      syncBar();
    }, {rootMargin:"0px 0px 80px 0px", threshold:0.01});
    blockers.forEach(el => observer.observe(el));
  }

  document.addEventListener("focusin", e => {
    if(e.target.matches("input, select, textarea, [contenteditable='true']")){
      formFocus = true;
      syncBar();
    }
  });
  document.addEventListener("focusout", e => {
    if(e.target.matches("input, select, textarea, [contenteditable='true']")){
      setTimeout(() => {
        formFocus = !!document.activeElement?.matches?.("input, select, textarea, [contenteditable='true']");
        syncBar();
      }, 0);
    }
  });

  window.addEventListener("scroll", syncBar, {passive:true});
  window.addEventListener("resize", syncBar, {passive:true});
  syncBar();

  document.addEventListener("click", e => {
    const a = e.target.closest("a");
    if(!a) return;
    const href = a.getAttribute("href") || "";
    let action = "";
    if(href.includes("booking.html")) action = "book_table";
    else if(href.includes("group-bookings.html") || href.includes("private-hire.html") || href.includes("corporate-events.html")) action = "group_or_event";
    else if(href.startsWith("tel:")) action = "phone";
    else if(href.includes("wa.me")) action = "whatsapp";
    else if(href.includes("contact.html")) action = "enquiry";
    if(action){
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({event:"site_cta", action, href, page:location.pathname});
      window.dispatchEvent(new CustomEvent("site:cta",{detail:{action,href,page:location.pathname}}));
    }
  });


  // Lightweight Core Web Vitals hooks. These do not transmit data by themselves;
  // they make metrics available to any analytics layer connected later.
  try{
    if("PerformanceObserver" in window){
      let cls=0;
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(!entry.hadRecentInput) cls+=entry.value;
        }
      }).observe({type:"layout-shift",buffered:true});

      new PerformanceObserver(list=>{
        const entries=list.getEntries();
        const last=entries[entries.length-1];
        if(last){
          window.dataLayer=window.dataLayer||[];
          window.dataLayer.push({event:"site_web_vital",metric:"LCP",value:Math.round(last.startTime),page:location.pathname});
        }
      }).observe({type:"largest-contentful-paint",buffered:true});

      new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(entry.interactionId){
            window.__siteInp=Math.max(window.__siteInp||0,entry.duration||0);
          }
        }
      }).observe({type:"event",durationThreshold:40,buffered:true});

      addEventListener("pagehide",()=>{
        window.dataLayer=window.dataLayer||[];
        window.dataLayer.push({event:"site_web_vital",metric:"CLS",value:+cls.toFixed(3),page:location.pathname});
        if(window.__siteInp) window.dataLayer.push({event:"site_web_vital",metric:"INP",value:Math.round(window.__siteInp),page:location.pathname});
      },{once:true});
    }
  }catch(_){}
})();