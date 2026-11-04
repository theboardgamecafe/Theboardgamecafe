(() => {
"use strict";

const form=document.getElementById("booking-form");
const startedInput=document.getElementById("booking-started");
const hpInput=document.getElementById("booking-website");
const formStarted=Date.now();
if(startedInput) startedInput.value=new Date(formStarted).toISOString();
const dateInput=document.getElementById("booking-date");
try{
  const saved=JSON.parse(sessionStorage.getItem("tbgc_booking_prefill")||"null");
  if(saved){
    if(saved.name) document.getElementById("booking-name").value=saved.name;
    if(saved.email) document.getElementById("booking-email").value=saved.email;
    if(saved.phone) document.getElementById("booking-phone").value=saved.phone;
    sessionStorage.removeItem("tbgc_booking_prefill");
  }
}catch(_){}
const timeSelect=document.getElementById("booking-time");
const durationSelect=document.getElementById("booking-duration");
const statusEl=document.getElementById("booking-status");
const submitBtn=document.getElementById("booking-submit");
const hours={0:[14,23],1:[19,24],2:null,3:[19,24],4:[19,24],5:[19,26],6:[16,26]};
function ukNow(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const value=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
  return new Date(value.year,value.month-1,value.day,value.hour,value.minute,value.second);
}
function pad(n){return String(n).padStart(2,"0")}
function labelTime(v){const h=Math.floor(v)%24,m=v%1?30:0,ap=h>=12?"pm":"am",hh=h%12||12;return hh+":"+pad(m)+ap}
function key(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function resetDuration(){
  durationSelect.disabled=true;
  durationSelect.innerHTML='<option value="">Choose an arrival time first</option>';
}
function refreshDurations(){
  const option=timeSelect.selectedOptions[0];
  const start=Number(option?.dataset.hour);
  const close=Number(option?.dataset.close);
  if(!Number.isFinite(start)||!Number.isFinite(close)){resetDuration();return}
  const remaining=close-start;
  durationSelect.innerHTML='<option value="">Choose duration</option>';
  [1,2,3].forEach(h=>{
    if(remaining>=h){
      const o=document.createElement("option");
      o.value=h+" hour"+(h>1?"s":"");
      o.textContent=o.value;
      durationSelect.appendChild(o);
    }
  });
  if(remaining>=4){
    const o=document.createElement("option");
    o.value="4+ hours";
    o.textContent="4+ hours";
    durationSelect.appendChild(o);
  }
  durationSelect.disabled=durationSelect.options.length<=1;
  const actualDate=new Date(dateInput.value+"T00:00:00");
  if(start>=24)actualDate.setDate(actualDate.getDate()+1);
  document.getElementById("booking-arrival-date").value=key(actualDate);
  statusEl.textContent=start>=24?"Your arrival is after midnight on "+actualDate.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})+" (the night of your selected booking date).":"";
}
function refreshTimes(){
  document.getElementById("booking-arrival-date").value="";
  timeSelect.innerHTML="";
  resetDuration();
  if(!dateInput.value){
    timeSelect.disabled=true;
    timeSelect.innerHTML='<option value="">Choose a date first</option>';
    statusEl.textContent="";
    submitBtn.disabled=false;
    return;
  }
  if(dateInput.value<dateInput.min){
    timeSelect.disabled=true;
    timeSelect.innerHTML='<option value="">Choose an available date</option>';
    statusEl.textContent="Please choose today or a future date.";
    submitBtn.disabled=true;return;
  }
  const selected=new Date(dateInput.value+"T00:00:00"),schedule=hours[selected.getDay()];
  if(!schedule){
    timeSelect.disabled=true;
    timeSelect.innerHTML='<option value="">Closed Tuesdays</option>';
    statusEl.textContent="We’re closed on Tuesdays — please choose another date.";
    submitBtn.disabled=true;
    return;
  }
  statusEl.textContent="";
  submitBtn.disabled=false;
  timeSelect.innerHTML='<option value="">Choose a time</option>';
  const now=ukNow();
  for(let t=schedule[0];t<=schedule[1]-1;t+=0.5){
    const slot=new Date(selected);
    slot.setHours(Math.floor(t)%24,t%1?30:0,0,0);
    if(t>=24) slot.setDate(slot.getDate()+1);
    if(slot.getTime()<now.getTime()+30*60*1000) continue;
    const o=document.createElement("option");
    o.value=labelTime(t);
    o.textContent=labelTime(t);
    o.dataset.hour=String(t);
    o.dataset.close=String(schedule[1]);
    timeSelect.appendChild(o);
  }
  timeSelect.disabled=timeSelect.options.length<=1;
  if(timeSelect.disabled){
    statusEl.textContent="No remaining booking times are available to request for today. Please choose another date.";
    submitBtn.disabled=true;
  }
}
const today=ukNow();
const previousDay=new Date(today);
previousDay.setDate(today.getDate()-1);
const previousSchedule=hours[previousDay.getDay()];
const currentHour=today.getHours()+today.getMinutes()/60;
const inLateNightSpillover=Boolean(previousSchedule&&previousSchedule[1]>24&&currentHour<(previousSchedule[1]-24));
dateInput.min=key(inLateNightSpillover?previousDay:today);
dateInput.addEventListener("change",refreshTimes);
timeSelect.addEventListener("change",refreshDurations);
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(hpInput?.value || Date.now()-formStarted<800) return;
  if(!form.reportValidity()) return;
  if(form.getAttribute("aria-busy")==="true") return;
  form.setAttribute("aria-busy","true");
  const previous=submitBtn.textContent;
  submitBtn.disabled=true;
  submitBtn.textContent="Sending…";
  statusEl.textContent="Sending your booking request…";
  try{
    const response=await fetch(form.action,{method:"POST",body:new FormData(form),signal:AbortSignal.timeout(20000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok || data?.success!==true) throw new Error("Submission failed");
    try{sessionStorage.setItem("tbgc_form_receipt",JSON.stringify({form:form.id==="booking-form"?"booking":"enquiry",time:Date.now()}))}catch(_){}
    location.href="booking-thanks.html";
  }catch(_){
    statusEl.textContent="We couldn’t send your request just now. Please try again, call 07768 489048, or use the contact page.";
    form.removeAttribute("aria-busy");
    submitBtn.disabled=false;
    submitBtn.textContent=previous;
  }
});
refreshTimes();

})();
