(() => {
  'use strict';
  const script=document.currentScript;
  const site=script?.dataset.statisticsSite;
  if(!['cafe','hv'].includes(site))return;
  const endpoint='https://hollin-and-vale-enquiries.r9shbntmg2.chatgpt.site/api/statistics';
  const key='website_statistics_choice_v1';
  const test=new URLSearchParams(location.search).get('qa_statistics')==='1';
  const page=location.pathname==='/index.html'?'/':location.pathname;
  const browserOptOut=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
  let choice='off',known=false,notice,preferenceButton,pageCounted=false,startCounted=false,successCounted=false;
  try{const value=localStorage.getItem(key);if(value==='on'||value==='off'){choice=value;known=true;}}catch(_){}
  const enabled=()=>choice==='on'&&!browserOptOut();
  const send=event=>{
    if(!enabled()||document.visibilityState==='prerender')return;
    const payload={site,page,event};if(test)payload.is_test=true;
    // No query strings, referrer, identifiers, form values or contact details.
    try{fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});}catch(_){}
  };
  const view=()=>{if(enabled()&&!pageCounted){pageCounted=true;send('page_view');}};
  const updateChoice=value=>{
    choice=value;known=true;
    try{localStorage.setItem(key,value);}catch(_){}
    if(notice)notice.hidden=true;
    if(preferenceButton)preferenceButton.textContent=enabled()?'Statistics: on':'Statistics: off';
    view();
    window.dispatchEvent(new CustomEvent('site:statistics-choice',{detail:{enabled:enabled()}}));
  };
  const init=()=>{
    notice=document.createElement('aside');notice.className='statistics-notice';notice.setAttribute('aria-label','Optional website statistics');
    const title=document.createElement('strong');title.textContent='Optional website statistics';
    const text=document.createElement('p');text.textContent='Count page views and button clicks to help us improve this site. Form text and contact details are never included in these counts.';
    const actions=document.createElement('div');actions.className='statistics-actions';
    const allow=document.createElement('button');allow.type='button';allow.textContent='Allow statistics';allow.addEventListener('click',()=>updateChoice('on'));
    const off=document.createElement('button');off.type='button';off.textContent='Keep off';off.addEventListener('click',()=>updateChoice('off'));
    const privacy=document.createElement('a');privacy.href='/privacy.html#website-statistics';privacy.textContent='How statistics work';
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='statistics-close';dismiss.textContent='Close';dismiss.setAttribute('aria-label','Close statistics preferences');dismiss.addEventListener('click',()=>{notice.hidden=true;preferenceButton?.focus();});
    actions.append(allow,off);notice.append(title,text,actions,privacy,dismiss);document.body.append(notice);
    const footer=document.querySelector('.footerlinks')||document.querySelector('.footer-links')||document.querySelector('.site-footer .wrap,footer .wrap')||document.querySelector('footer');
    preferenceButton=document.createElement('button');preferenceButton.type='button';preferenceButton.className='statistics-preferences';preferenceButton.textContent=enabled()?'Statistics: on':'Statistics: off';
    preferenceButton.addEventListener('click',()=>{notice.hidden=false;off.textContent=enabled()?'Turn statistics off':'Keep off';(browserOptOut()?off:allow).focus();});
    footer?.append(preferenceButton);
    if(browserOptOut()){allow.disabled=true;text.textContent='Your browser asks not to be tracked. Optional website statistics stay off. No form text or contact details are included in statistics.';}
    notice.hidden=known||browserOptOut();view();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a');if(!link)return;
    const raw=link.getAttribute('href')||'';let url;try{url=new URL(raw,location.href);}catch(_){return;}
    if(raw.startsWith('tel:'))send('phone');
    else if(url.hostname==='wa.me'||url.hostname.endsWith('.whatsapp.com'))send('whatsapp');
    else if(url.pathname.endsWith('/booking.html'))send('book_table');
    else if(url.pathname.endsWith('/samples.html')||url.searchParams.get('enquiry')==='samples')send('sample_request');
    else if(url.pathname.endsWith('/trade.html')||url.searchParams.get('enquiry')==='trade')send('trade_enquiry');
    else if(/\/(group-bookings|private-hire|corporate-events|birthday-party-venue-blackburn)\.html$/.test(url.pathname))send('group_or_event');
  });
  window.addEventListener('site:whatsapp-draft',()=>send('whatsapp'));
  document.addEventListener('focusin',event=>{
    if(startCounted||!event.target.matches?.('input:not([type=hidden]),select,textarea')||!event.target.closest('form'))return;
    if(enabled()){startCounted=true;send('enquiry_start');}
  });
  document.addEventListener('change',event=>{if(event.target.closest?.('[data-product-enquiry]'))send('product_select');});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-save-selection],.selection-save'))send('save_selection');});
  window.addEventListener('site:conversion',event=>{
    if(successCounted||!['booking','enquiry'].includes(event.detail?.form))return;
    if(enabled()){successCounted=true;send('enquiry_success');}
  });
})();
