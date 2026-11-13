(() => {
"use strict";

const form=document.getElementById("booking-form");
if(!form) return;
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
const visitDetails=document.getElementById("booking-visit-details");
const reviewButton=document.getElementById("booking-review");
const reviewActions=document.getElementById("booking-review-actions");
const editButton=document.getElementById("booking-edit");
const editActions=document.getElementById("booking-edit-actions");
const stepLabel=document.getElementById("booking-step-label");
const estimateRow=document.getElementById("booking-estimate-row");
const priceNote=document.getElementById("booking-price-note");
let reviewing=false;
const hours={0:[14,23],1:[19,24],2:null,3:[19,24],4:[19,24],5:[19,26],6:[16,26]};
const tableHour=8;
let maxTableRequestGuests=6;

/* Live bookings. When data-booking-api is set on the form and that booking server answers, the planner
   shows real availability, the total price and how many tables are free, and the table is confirmed
   straight away. If the server is not set or cannot be reached, this stays a booking request. */
const apiBase=(form.dataset.bookingApi||"").trim().replace(/\/$/,"");
const live={on:false,config:null,slots:new Map(),request:0,key:null,busy:false};
const activityField=document.getElementById("booking-activity-field");
const activitySelect=document.getElementById("booking-activity");
const liveActions=document.getElementById("booking-live-actions");
const payLaterButton=document.getElementById("booking-pay-later");
const payNowButton=document.getElementById("booking-pay-now");
const pounds=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
async function liveFetch(path,body){
  const response=await fetch(apiBase+path,{
    method:body?"POST":"GET",
    headers:body?{Accept:"application/json","Content-Type":"application/json"}:{Accept:"application/json"},
    body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(15000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data){
    const error=new Error(typeof data?.error==="string"&&data.error.length<280?data.error:"Something went wrong. Please try again.");
    error.status=response.status;
    throw error;
  }
  return data;
}
function liveSlot(){return live.slots.get(timeSelect.selectedOptions[0]?.dataset.start||"")}
function liveQuote(){return liveSlot()?.durations.get(Number.parseInt(durationSelect.value,10))}
function liveGuestLimit(){
  return live.config?.activities?.find(activity=>activity.id===activitySelect.value)?.maxPartySize||4;
}
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
function availableStartHours(selected,now){
  const schedule=hours[selected.getDay()];
  if(!schedule) return [];
  const starts=[];
  for(let t=schedule[0];t<=schedule[1]-1;t+=0.5){
    const slot=new Date(selected);
    slot.setHours(Math.floor(t)%24,t%1?30:0,0,0);
    if(t>=24) slot.setDate(slot.getDate()+1);
    if(slot.getTime()>=now.getTime()+30*60*1000) starts.push(t);
  }
  return starts;
}
// The form does not ask how many are coming. A table is booked for as many as it seats: four, or two for pool and
// carrom. Bigger groups are pointed to an enquiry by the note under the times.
function syncSeats(){
  maxTableRequestGuests=live.on?liveGuestLimit():4;
  sizeInput.value=String(maxTableRequestGuests);
}
function updatePlan(){
  if(live.done) return;
  syncSeats();
  const partySize=sizeInput.validity.valid?sizeInput.valueAsNumber:0;
  const groupVisit=partySize>maxTableRequestGuests;
  if(groupVisit) reviewing=false;
  const busy=form.getAttribute("aria-busy")==="true";
  groupRoute.hidden=!groupVisit;
  visitDetails.hidden=reviewing;
  contactDetails.hidden=!reviewing;
  contactDetails.disabled=!reviewing;
  requestActions.hidden=!reviewing||live.on;
  liveActions.hidden=!reviewing||!live.on;
  reviewActions.hidden=reviewing||groupVisit;
  editActions.hidden=!reviewing;
  reviewButton.disabled=busy;
  editButton.disabled=busy;
  estimateRow.hidden=groupVisit;
  priceNote.hidden=groupVisit||!priceNote.textContent;
  seatingNote.hidden=partySize<5||groupVisit;
  stepLabel.textContent=reviewing?"Step 2 of 2 · Your details":"Step 1 of 2 · Your visit";
  submitBtn.disabled=!reviewing||groupVisit||!partySize||!timeSelect.value||!durationSelect.value||busy;

  const details=[];
  const visitDate=arrivalDateInput.value||dateInput.value;
  if(visitDate) details.push(formatVisitDate(visitDate));
  if(timeSelect.value) details.push(timeSelect.value);
  if(durationSelect.value) details.push(durationSelect.value);
  planDetails.textContent=details.join(" · ")||"Your visit details will appear here.";

  const duration=durationSelect.value;
  if(live.on){
    // The total and the buttons come from the booking server's own price for this time and length.
    const quote=groupVisit?null:liveQuote();
    document.getElementById("booking-estimate-label").textContent="Total for your table";
    estimateAmount.textContent=quote?pounds.format(quote.base/100):"—";
    seatingNote.hidden=true;
    priceNote.textContent=quote?"":"Choose a time and length to see the total.";
    priceNote.hidden=groupVisit||!priceNote.textContent;
    payLaterButton.textContent=quote?"Book now · pay "+pounds.format(quote.base/100)+" at the café":"Book now and pay at the café";
    const prepay=quote&&live.prepay&&quote.amount<quote.base;
    payNowButton.hidden=!live.prepay;
    payNowButton.textContent=prepay?"Pay now · "+pounds.format(quote.amount/100)+" (save "+pounds.format((quote.base-quote.amount)/100)+")":"Pay now";
    payLaterButton.disabled=payNowButton.disabled=!quote||busy||live.busy;
    return;
  }
  if(groupVisit||!partySize||!duration){
    estimateAmount.textContent="—";
    return;
  }
  const total=tableHour*Number.parseInt(duration,10);
  estimateAmount.textContent=(duration==="4+ hours"?"From ":"")+"£"+total;
}
function reviewPlan(){
  if(sizeInput.valueAsNumber>maxTableRequestGuests){
    updatePlan();
    return;
  }
  if(!dateInput.value){
    const calendar=document.getElementById("booking-calendar");
    if(calendar&&!calendar.hidden){
      document.getElementById("booking-calendar-status").textContent="Choose a date to plan your visit.";
      const target=calendar.querySelector('[data-calendar-date][tabindex="0"]')
        ||calendar.querySelector('[data-calendar-month="1"]');
      target.focus();
      return;
    }
  }
  for(const field of [dateInput,timeSelect,durationSelect]){
    if(!field.reportValidity()) return;
  }
  if(!timeSelect.value||!durationSelect.value){
    dateInput.focus();
    return;
  }
  reviewing=true;
  statusEl.textContent="";
  updatePlan();
  document.getElementById("booking-name").focus();
}
reviewButton.addEventListener("click",reviewPlan);
editButton.addEventListener("click",()=>{
  reviewing=false;
  statusEl.textContent="";
  updatePlan();
  dateInput.focus();
});
function resetDuration(){
  durationSelect.disabled=true;
  durationSelect.innerHTML='<option value="">Choose an arrival time first</option>';
}
function refreshDurations(){
  if(live.on){refreshLiveDurations();return}
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
}
function refreshLiveDurations(){
  const slot=liveSlot();
  if(!slot){resetDuration();return}
  durationSelect.innerHTML='<option value="">Choose duration</option>';
  for(const [hoursBooked,quote] of slot.durations){
    const o=document.createElement("option");
    o.value=hoursBooked+" hour"+(hoursBooked>1?"s":"");
    o.textContent=o.value+" · "+pounds.format(quote.base/100);
    durationSelect.appendChild(o);
  }
  durationSelect.disabled=false;
  timeStatus.textContent=(slot.free===1?"Last table free":slot.free+" tables free")+" at "+slot.label+".";
}
// Times are shown as the clock time only: a time after midnight belongs to the night that was chosen.
function plainTime(label){return String(label==null?"":label).replace(/\s*·\s*next day\s*$/i,"");}
// Ask the booking server which start times still have a free table, for one, two and three hours.
async function refreshLiveTimes(){
  const serial=++live.request;
  live.slots=new Map();
  live.key=null;
  arrivalDateInput.value="";
  resetDuration();
  timeSelect.disabled=true;
  syncSeats();
  const partySize=sizeInput.validity.valid?sizeInput.valueAsNumber:0;
  if(!dateInput.value||!partySize){
    timeSelect.innerHTML='<option value="">Choose a date first</option>';
    timeStatus.textContent="";
    return;
  }
  if(partySize>liveGuestLimit()){
    timeSelect.innerHTML='<option value="">Group visit</option>';
    timeStatus.textContent="";
    return;
  }
  timeSelect.innerHTML='<option value="">Checking tables…</option>';
  timeStatus.textContent="Checking which tables are free…";
  const query="date="+encodeURIComponent(dateInput.value)+"&partySize="+partySize+"&activity="+encodeURIComponent(activitySelect.value);
  const answers=await Promise.allSettled([1,2,3].map(length=>liveFetch("/api/availability?"+query+"&duration="+length)));
  if(serial!==live.request) return;
  const failed=answers.find(answer=>answer.status==="rejected");
  if(answers.every(answer=>answer.status==="rejected")){
    timeSelect.innerHTML='<option value="">Times unavailable</option>';
    timeStatus.textContent=failed.reason.status===400?failed.reason.message:"We couldn’t check availability just now. Please try again or call 07768 489048.";
    return;
  }
  answers.forEach((answer,index)=>{
    if(answer.status!=="fulfilled") return;
    const result=answer.value;
    for(const slot of result.slots||[]){
      const entry=live.slots.get(slot.start)||{start:slot.start,label:plainTime(slot.label),free:slot.tablesFree,durations:new Map()};
      entry.durations.set(index+1,{amount:result.amount,base:result.baseAmount??result.amount});
      if(index===0) entry.free=slot.tablesFree;
      live.slots.set(slot.start,entry);
    }
  });
  const slots=[...live.slots.values()].filter(slot=>slot.durations.has(1)).sort((a,b)=>a.start<b.start?-1:1);
  timeSelect.innerHTML='<option value="">'+(slots.length?"Choose a time":"No tables free")+'</option>';
  for(const slot of slots){
    const o=document.createElement("option");
    o.value=slot.label;
    o.dataset.start=slot.start;
    o.textContent=slot.label+(slot.free?" · "+slot.free+" free":"");
    timeSelect.appendChild(o);
  }
  timeSelect.disabled=slots.length===0;
  timeStatus.textContent=slots.length?"":"No tables are free on this date for your group. Please choose another date.";
  updatePlan();
}
function refreshTimes(){
  if(live.on){void refreshLiveTimes();return}
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
  for(const t of availableStartHours(selected,now)){
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
  reviewing=false;
  refreshTimes();
  updatePlan();
});
timeSelect.addEventListener("change",()=>{
  reviewing=false;
  refreshDurations();
  updatePlan();
});
sizeInput.addEventListener("input",()=>{
  reviewing=false;
  if(live.on) refreshTimes();
  updatePlan();
});
activitySelect.addEventListener("change",()=>{
  reviewing=false;
  refreshTimes();
  updatePlan();
});
function showConfirmation(booking){
  const panel=document.getElementById("booking-confirmed");
  const length=booking.duration+" hour"+(booking.duration>1?"s":"");
  document.getElementById("booking-confirmed-summary").textContent=formatVisitDate(booking.date)+" · "+plainTime(booking.label)+" · "+length;
  document.getElementById("booking-confirmed-reference").textContent=booking.reference;
  document.getElementById("booking-confirmed-payment").textContent="Pay "+pounds.format(booking.amount/100)+" at the café when you arrive. We hold your table for 15 minutes after your start time.";
  document.getElementById("booking-confirmed-calendar").href=apiBase+"/api/bookings/"+encodeURIComponent(booking.token)+"/calendar";
  document.getElementById("booking-confirmed-manage").href=apiBase+"/booking#booking="+encodeURIComponent(booking.token);
  live.done=true;
  form.hidden=true;
  stepLabel.textContent="Booking confirmed";
  document.querySelector(".booking-planner-intro")?.setAttribute("hidden","");
  panel.hidden=false;
  panel.focus();
}
// The café still gets its usual email for each instant booking, so staff hear about it straight away.
// For a card payment the booking service emails the café itself once the money is in. The website only passes on
// a guest's note, which would otherwise be lost, and says clearly that the booking is not confirmed yet.
function notifyCafe(booking,paying){
  const payload=new FormData(form);
  payload.set("subject",paying?"Guest note for a booking being paid by card · "+booking.reference:"Website table booking CONFIRMED · "+booking.reference);
  payload.set("Booking reference",booking.reference);
  payload.set("Status",paying?"NOT CONFIRMED YET. The guest is paying "+pounds.format(booking.amount/100)+" by card. A separate PAID email follows if the payment goes through. If none arrives, ignore this note."
    :"Confirmed automatically · pay "+pounds.format(booking.amount/100)+" at the café");
  payload.set("Table type",activitySelect.selectedOptions[0]?.textContent||"");
  payload.set("Arrival time",plainTime(booking.label));
  payload.delete("Actual arrival date");
  for(const [field,value] of Array.from(payload)) if(value==="") payload.delete(field);
  // keepalive lets the email finish sending while the browser moves on to the payment page.
  fetch(form.action,{method:"POST",body:payload,keepalive:paying===true,signal:paying?undefined:AbortSignal.timeout(20000)}).catch(()=>{});
}
async function submitLive(payment){
  if(live.busy||hpInput?.value||Date.now()-formStarted<800) return;
  const slot=liveSlot(),quote=liveQuote();
  if(!slot||!quote){reviewing=false;updatePlan();return}
  for(const id of ["booking-name","booking-phone","booking-email"]){
    if(!document.getElementById(id).reportValidity()) return;
  }
  const body={
    activity:activitySelect.value,date:dateInput.value,start:slot.start,duration:Number.parseInt(durationSelect.value,10),partySize:sizeInput.valueAsNumber,
    name:document.getElementById("booking-name").value.trim(),email:document.getElementById("booking-email").value.trim(),phone:document.getElementById("booking-phone").value.trim()
  };
  if(payment==="venue") body.payment="venue";
  const fingerprint=JSON.stringify(body);
  if(live.key?.fingerprint!==fingerprint) live.key={fingerprint,value:crypto.randomUUID()};
  live.busy=true;
  statusEl.textContent=payment==="venue"?"Booking your table…":"Taking you to payment…";
  updatePlan();
  try{
    const {booking}=await liveFetch("/api/bookings",{...body,idempotencyKey:live.key.value});
    if(payment==="venue"){
      if(booking.status!=="confirmed") throw new Error("We couldn’t confirm that table. Please try again.");
      try{window.dispatchEvent(new CustomEvent("site:conversion",{detail:{form:"booking"}}));}catch(_){}
      notifyCafe(booking);
      statusEl.textContent="";
      showConfirmation(booking);
      return;
    }
    if(!booking.checkoutUrl) throw new Error("Online payment isn’t available just now. You can book and pay at the café instead.");
    if(document.getElementById("booking-message")?.value.trim()) notifyCafe(booking,true);
    location.href=new URL(booking.checkoutUrl,apiBase+"/").href;
  }catch(error){
    statusEl.textContent=error.status===429?"Too many attempts. Please wait a moment and try again.":error.message;
    if(error.status===409){
      // Someone else has just taken that time, so show what is free now.
      reviewing=false;
      refreshTimes();
    }
  }finally{
    live.busy=false;
    updatePlan();
  }
}
payLaterButton.addEventListener("click",()=>void submitLive("venue"));
payNowButton.addEventListener("click",()=>void submitLive("online"));
durationSelect.addEventListener("change",()=>{
  reviewing=false;
  updatePlan();
});
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!reviewing){
    reviewPlan();
    return;
  }
  // With live bookings on, pressing Enter books the table and pays at the café; it never sends a request.
  if(live.on){
    void submitLive("venue");
    return;
  }
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
if(apiBase){
  liveFetch("/api/config").then(config=>{
    if(!Array.isArray(config.activities)||config.payAtVenue!==true) return;
    live.on=true;
    live.config=config;
    // Paying now by card appears only once the booking server says it takes card payments.
    live.prepay=config.features?.prepay===true||form.dataset.bookingPrepay==="test";
    const wanted=(game||"").toLowerCase();
    activitySelect.value=/pool/.test(wanted)?"pool":/carrom/.test(wanted)?"carrom":/ps5|playstation|fc ?27|ea sports|gta|ufc/.test(wanted)?"ps5":"board-games";
    activitySelect.disabled=false;
    activityField.hidden=false;
    document.querySelector(".booking-planner-intro")?.replaceChildren("Choose your visit details to see free tables and the total price.");
    const saving=Number.isInteger(config.prepayDiscountPercent)&&config.prepayDiscountPercent>0?" and save "+config.prepayDiscountPercent+"%":"";
    document.querySelector(".booking-intro")?.replaceChildren(live.prepay
      ?"Choose a date and how long. Your table is confirmed straight away. Pay at the café, or pay now by card"+saving+"."
      :"Choose a date and how long. Your table is confirmed straight away and you pay at the café.");
    reviewActions.querySelector(".form-note")?.replaceChildren("Your table is confirmed as soon as you book.");
    // With card payments on, say what paying now means before the guest chooses.
    const liveNote=document.getElementById("booking-live-note");
    if(live.prepay&&liveNote?.firstChild) liveNote.firstChild.textContent="Pay now by card"+saving+", with a full refund if you cancel at least 24 hours before your start time. Or book now and pay at the café. By booking, you acknowledge our ";
    reviewing=false;
    refreshTimes();
    updatePlan();
  }).catch(()=>{});
}
window.setupCafeCalendar?.({
  calendar:document.getElementById("booking-calendar"),
  dateInput,
  isDateAvailable:(date,now)=>availableStartHours(date,now).length>0
});

})();
