(() => {
  const nav=document.getElementById("site-navigation");
  const toggle=document.querySelector(".mobile-toggle");
  const main=document.getElementById("main-content");
  if(main&&!main.hasAttribute("tabindex")) main.setAttribute("tabindex","-1");

  const whatsOn=document.getElementById("whats-on");
  const whatsOnLink=nav?.querySelector('a[href="/#whats-on"]');
  if(whatsOn&&whatsOnLink&&"IntersectionObserver" in window){
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting) whatsOnLink.setAttribute("aria-current","location");
      else whatsOnLink.removeAttribute("aria-current");
    },{rootMargin:"-90px 0px -40% 0px"});
    observer.observe(whatsOn);
  }

  window.setMenu=function(open){
    if(!nav||!toggle) return;
    nav.classList.toggle("open",open);
    toggle.setAttribute("aria-expanded",String(open));
    toggle.setAttribute("aria-label",open?"Close menu":"Open menu");
    if(open){
      nav.querySelector("a")?.focus({preventScroll:true});
    }else if(document.activeElement&&nav.contains(document.activeElement)){
      toggle.focus({preventScroll:true});
    }
  };
  window.toggleMenu=function(){
    if(toggle) window.setMenu(toggle.getAttribute("aria-expanded")!=="true");
  };
  toggle?.addEventListener("click",window.toggleMenu);
  nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>window.setMenu(false)));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")window.setMenu(false)});
  document.addEventListener("click",e=>{
    if(nav&&toggle&&nav.classList.contains("open")&&!nav.contains(e.target)&&!toggle.contains(e.target)) window.setMenu(false);
  });
  document.addEventListener("focusin",e=>{
    if(nav&&toggle&&nav.classList.contains("open")&&!nav.contains(e.target)&&e.target!==toggle) window.setMenu(false);
  });

  const bar=document.querySelector(".mobile-bar");
  if(bar){
    const barLinks=[...bar.querySelectorAll("a")];
    let blocked=false,formFocus=false;
    const syncBar=()=>{
      const show=window.scrollY>320&&!blocked&&!formFocus;
      bar.classList.toggle("is-visible",show);
      bar.setAttribute("aria-hidden",String(!show));
      barLinks.forEach(a=>show?a.removeAttribute("tabindex"):a.setAttribute("tabindex","-1"));
    };
    const blockers=[...document.querySelectorAll("footer,.footer-cta-section,form")];
    if("IntersectionObserver" in window&&blockers.length){
      const visible=new Set();
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));
        blocked=visible.size>0; syncBar();
      },{rootMargin:"0px 0px 80px 0px",threshold:.01});
      blockers.forEach(el=>observer.observe(el));
    }
    document.addEventListener("focusin",e=>{
      if(e.target.matches("input,select,textarea,[contenteditable='true']")){formFocus=true;syncBar()}
    });
    document.addEventListener("focusout",e=>{
      if(e.target.matches("input,select,textarea,[contenteditable='true']")){
        setTimeout(()=>{formFocus=!!document.activeElement?.matches?.("input,select,textarea,[contenteditable='true']");syncBar()},0);
      }
    });
    addEventListener("scroll",syncBar,{passive:true});
    addEventListener("resize",syncBar,{passive:true});
    syncBar();
  }

  const push=(payload)=>{
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent("site:analytics",{detail:payload}));
  };

  document.addEventListener("click",e=>{
    const a=e.target.closest("a"); if(!a)return;
    const href=a.getAttribute("href")||"";
    let action="";
    if(href.includes("booking.html")) action="book_table";
    else if(href.includes("group-bookings.html")||href.includes("private-hire.html")||href.includes("corporate-events.html")) action="group_or_event";
    else if(href.startsWith("tel:")) action="phone";
    else if(href.includes("wa.me")) action="whatsapp";
    else if(href.includes("contact.html")) action="enquiry";
    if(action) push({event:"site_cta",action,href,page:location.pathname});
  });

  document.querySelectorAll("form").forEach(form=>{
    form.addEventListener("submit",()=>{
      if(!form.checkValidity()) return;
      const kind=form.id==="booking-form"?"booking":form.id==="enquiry-form"?"enquiry":"form";
      push({event:"site_form_submit",form:kind,page:location.pathname});
    });
  });
  // Count only a confirmed submission from this browser, once. A direct visit
  // or refresh of a thank-you URL is not a conversion.
  try{
    const receipt=JSON.parse(sessionStorage.getItem("tbgc_form_receipt")||"null");
    const kind=location.pathname.endsWith("/booking-thanks.html")?"booking":location.pathname.endsWith("/thanks.html")?"enquiry":null;
    if(kind&&receipt?.form===kind&&Date.now()-receipt.time>=0&&Date.now()-receipt.time<300000){
      sessionStorage.removeItem("tbgc_form_receipt");
      push({event:"site_form_success",form:kind,page:location.pathname});
    }
  }catch(_){}

  if("PerformanceObserver" in window){
    let cls=0,lcp=0,inp=0;
    try{
      new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)cls+=entry.value})
        .observe({type:"layout-shift",buffered:true});
    }catch(_){}
    try{
      new PerformanceObserver(list=>{
        const entries=list.getEntries(),last=entries[entries.length-1];
        if(last) lcp=Math.max(lcp,last.startTime||0);
      }).observe({type:"largest-contentful-paint",buffered:true});
    }catch(_){}
    try{
      new PerformanceObserver(list=>{
        for(const entry of list.getEntries()) if(entry.interactionId) inp=Math.max(inp,entry.duration||0);
      }).observe({type:"event",durationThreshold:16,buffered:true});
    }catch(_){}
    addEventListener("pagehide",()=>{
      if(lcp) push({event:"site_web_vital",metric:"LCP",value:Math.round(lcp),page:location.pathname});
      push({event:"site_web_vital",metric:"CLS",value:+cls.toFixed(3),page:location.pathname});
      // A maximum event duration is a diagnostic, not the standard INP metric.
      if(inp) push({event:"site_performance_diagnostic",metric:"max_interaction_duration",value:Math.round(inp),page:location.pathname});
    },{once:true});
  }
})();
