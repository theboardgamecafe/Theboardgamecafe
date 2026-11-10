(() => {
"use strict";

const form=document.getElementById("booking-form");
const hpInput=document.getElementById("booking-website");
const formStarted=Date.now();
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
const sizeInput=document.getElementById("booking-size");
const arrivalDateInput=document.getElementById("booking-arrival-date");
const timeStatus=document.getElementById("booking-time-status");
const statusEl=document.getElementById("booking-status");
const submitBtn=document.getElementById("booking-submit");
const plan=document.getElementById("booking-plan");
const planDetails=document.getElementById("booking-plan-details");
const estimateAmount=document.getElementById("booking-estimate-amount");
const seatingNote=document.getElementById("booking-seating-note");
const groupRoute=document.getElementById("booking-group-route");
const contactDetails=document.getElementById("booking-contact-details");
const requestActions=document.getElementById("booking-request-actions");
const hours={0:[14,23],1:[19,24],2:null,3:[19,24],4:[19,24],5:[19,26],6:[16,26]};
const firstTableHour=15;
const additionalTableHour=8;
const maxTableRequestGuests=6;
const game=new URLSearchParams(location.search).get("game")?.trim();
if(game && /^[\p{L}\p{N}][\p{L}\p{N} ’'&.,:!?()+/–-]{0,79}$/u.test(game)){
  const gameInput=document.getElementById("booking-game");
  gameInput.value=game.toLowerCase()==="catan"?"Catan":game;
  gameInput.disabled=false;
  document.getElementById("booking-game-field").hidden=false;
}
function ukNow(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const value=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
  return new Date(value.year,value.month-1,value.day,value.hour,value.minute,value.second);
}
function pad(n){return String(n).padStart(2,"0")}
function labelTime(v){const h=Math.floor(v)%24,m=v%1?30:0,ap=h>=12?"pm":"am",hh=h%12||12;return hh+":"+pad(m)+ap}
function key(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function formatVisitDate(value){
  return new Date(value+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
}
function updatePlan(){
  const partySize=sizeInput.validity.valid?sizeInput.valueAsNumber:0;
  const groupVisit=partySize>maxTableRequestGuests;
  groupRoute.hidden=!groupVisit;
  plan.hidden=groupVisit;
  contactDetails.hidden=groupVisit;
  contactDetails.disabled=groupVisit;
  requestActions.hidden=groupVisit;
  seatingNote.hidden=partySize<5;
  submitBtn.disabled=groupVisit || !partySize || !timeSelect.value || !durationSelect.value || form.getAttribute("aria-busy")==="true";
  if(groupVisit) return;

  const details=[];
  const visitDate=arrivalDateInput.value || dateInput.value;
  if(visitDate) details.push(formatVisitDate(visitDate));
  if(timeSelect.value) details.push(timeSelect.value);
  if(partySize) details.push(partySize+" "+(partySize===1?"guest":"guests"));
  if(durationSelect.value) details.push(durationSelect.value);
  planDetails.textContent=details.join(" · ") || "Choose your visit details to see them here.";

  const duration=durationSelect.value;
  if(!partySize || !duration){
    estimateAmount.textContent="—";
    return;
  }
  const total=firstTableHour+additionalTableHour*(Number.parseInt(duration,10)-1);
  estimateAmount.textContent=(duration==="4+ hours"?"From ":"")+"£"+total;
}
function resetDuration(){
  durationSelect.disabled=true;
  durationSelect.innerHTML='<option value="">Choose an arrival time first</option>';
}
function refreshDurations(){
  arrivalDateInput.value="";
  timeStatus.textContent="";
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
  arrivalDateInput.value=key(actualDate);
  if(start>=24) timeStatus.textContent="Your arrival is after midnight on "+formatVisitDate(arrivalDateInput.value)+" (the night of your selected booking date).";
}
function refreshTimes(){
  arrivalDateInput.value="";
  timeSelect.innerHTML="";
  resetDuration();
  if(!dateInput.value){
    timeSelect.disabled=true;
    timeSelect.innerHTML='<option value="">Choose a date first</option>';
    timeStatus.textContent="";
    return;
  }
  if(dateInput.value<dateInput.min){
    timeSelect.disabled=true;
    timeSelect.innerHTML='<option value="">Choose an available date</option>';
    timeStatus.textContent="Please choose today or a future date.";
    return;
  }
  const selected=new Date(dateInput.value+"T00:00:00"),schedule=hours[selected.getDay()];
  if(!schedule){
    timeSelect.disabled=true;
    timeSelect.innerHTML='<option value="">Closed Tuesdays</option>';
    timeStatus.textContent="We’re closed on Tuesdays — please choose another date.";
    return;
  }
  timeStatus.textContent="";
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
    timeStatus.textContent="No remaining booking times are available to request for today. Please choose another date.";
  }
}
const today=ukNow();
const previousDay=new Date(today);
previousDay.setDate(today.getDate()-1);
const previousSchedule=hours[previousDay.getDay()];
const currentHour=today.getHours()+today.getMinutes()/60;
const inLateNightSpillover=Boolean(previousSchedule&&previousSchedule[1]>24&&currentHour<(previousSchedule[1]-24));
dateInput.min=key(inLateNightSpillover?previousDay:today);
dateInput.addEventListener("change",()=>{
  refreshTimes();
  updatePlan();
});
timeSelect.addEventListener("change",()=>{
  refreshDurations();
  updatePlan();
});
sizeInput.addEventListener("input",updatePlan);
durationSelect.addEventListener("change",updatePlan);
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(hpInput?.value || Date.now()-formStarted<800) return;
  if(sizeInput.valueAsNumber>maxTableRequestGuests || !timeSelect.value || !durationSelect.value || !form.reportValidity()) return;
  if(form.getAttribute("aria-busy")==="true") return;
  form.setAttribute("aria-busy","true");
  const previous=submitBtn.textContent;
  submitBtn.disabled=true;
  submitBtn.textContent="Sending…";
  statusEl.textContent="Sending your booking request…";
  try{
    const payload = new FormData(form);
    if (payload.get("Actual arrival date") === payload.get("Date")) {
      payload.delete("Actual arrival date");
    }
    for (const [field, value] of Array.from(payload)) {
      if (value === "") payload.delete(field);
    }
    const response=await fetch(form.action,{method:"POST",body:payload,signal:AbortSignal.timeout(20000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok || data?.success!==true) throw new Error("Submission failed");
    try{window.dispatchEvent(new CustomEvent("site:conversion",{detail:{form:"booking"}}));}catch(_){}
    try{sessionStorage.setItem("tbgc_form_receipt",JSON.stringify({form:form.id==="booking-form"?"booking":"enquiry",time:Date.now()}))}catch(_){}
    location.href="booking-thanks.html";
  }catch(_){
    statusEl.textContent="We couldn’t send your request just now. Please try again, call 07768 489048, or use the contact page.";
    form.removeAttribute("aria-busy");
    submitBtn.textContent=previous;
    updatePlan();
  }
});
refreshTimes();
updatePlan();

})();
