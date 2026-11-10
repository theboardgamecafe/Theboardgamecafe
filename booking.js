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
function updatePlan(){
  const partySize=sizeInput.validity.valid?sizeInput.valueAsNumber:0;
  const groupVisit=partySize>maxTableRequestGuests;
  if(groupVisit) reviewing=false;
  const busy=form.getAttribute("aria-busy")==="true";
  groupRoute.hidden=!groupVisit;
  visitDetails.hidden=reviewing;
  contactDetails.hidden=!reviewing;
  contactDetails.disabled=!reviewing;
  requestActions.hidden=!reviewing;
  reviewActions.hidden=reviewing||groupVisit;
  editActions.hidden=!reviewing;
  reviewButton.disabled=busy;
  editButton.disabled=busy;
  estimateRow.hidden=groupVisit;
  priceNote.hidden=groupVisit;
  seatingNote.hidden=partySize<5||groupVisit;
  stepLabel.textContent=reviewing?"Step 2 of 2 · Your details":"Step 1 of 2 · Your visit";
  submitBtn.disabled=!reviewing||groupVisit||!partySize||!timeSelect.value||!durationSelect.value||busy;

  const details=[];
  const visitDate=arrivalDateInput.value||dateInput.value;
  if(visitDate) details.push(formatVisitDate(visitDate));
  if(timeSelect.value) details.push(timeSelect.value);
  if(partySize) details.push(partySize+" "+(partySize===1?"guest":"guests"));
  if(durationSelect.value) details.push(durationSelect.value);
  planDetails.textContent=details.join(" · ")||"Your visit details will appear here.";

  const duration=durationSelect.value;
  if(groupVisit||!partySize||!duration){
    estimateAmount.textContent="—";
    return;
  }
  const total=firstTableHour+additionalTableHour*(Number.parseInt(duration,10)-1);
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
  for(const field of [dateInput,sizeInput,timeSelect,durationSelect]){
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

function setupCalendar(){
  const calendar=document.getElementById("booking-calendar");
  if(!calendar) return;
  calendar.innerHTML=`
    <div class="booking-calendar-header">
      <button type="button" class="booking-calendar-month-button" data-calendar-month="-1" aria-label="Previous month">‹</button>
      <h3 id="booking-calendar-month" aria-live="polite" aria-atomic="true"></h3>
      <button type="button" class="booking-calendar-month-button" data-calendar-month="1" aria-label="Next month">›</button>
    </div>
    <table class="booking-calendar-grid" role="grid" aria-labelledby="booking-calendar-month" aria-describedby="booking-calendar-help booking-calendar-status">
      <thead><tr><th scope="col" abbr="Monday">Mon</th><th scope="col" abbr="Tuesday">Tue</th><th scope="col" abbr="Wednesday">Wed</th><th scope="col" abbr="Thursday">Thu</th><th scope="col" abbr="Friday">Fri</th><th scope="col" abbr="Saturday">Sat</th><th scope="col" abbr="Sunday">Sun</th></tr></thead>
      <tbody></tbody>
    </table>
    <p class="sr-only" id="booking-calendar-help">Use the arrow keys to move between dates and Enter to select.</p>
    <p class="booking-calendar-status" id="booking-calendar-status" role="status">Choose a date. Tuesdays are closed.</p>`;
  const monthLabel=calendar.querySelector("#booking-calendar-month");
  const days=calendar.querySelector("tbody");
  const previousMonth=calendar.querySelector('[data-calendar-month="-1"]');
  const status=calendar.querySelector("#booking-calendar-status");
  let month=new Date((dateInput.value>=dateInput.min?dateInput.value:dateInput.min)+"T00:00:00");
  month.setDate(1);

  function canRequest(date,now=ukNow()){
    return key(date)>=dateInput.min&&availableStartHours(date,now).length>0;
  }

  function renderCalendar(focusDate){
    const now=ukNow();
    const year=month.getFullYear();
    const monthIndex=month.getMonth();
    const firstDay=(month.getDay()+6)%7;
    const count=new Date(year,monthIndex+1,0).getDate();
    monthLabel.textContent=month.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
    previousMonth.disabled=key(month).slice(0,7)<=dateInput.min.slice(0,7);
    days.textContent="";
    const buttons=[];
    for(let week=0;week<Math.ceil((firstDay+count)/7);week++){
      const row=document.createElement("tr");
      for(let weekday=0;weekday<7;weekday++){
        const cell=document.createElement("td");
        const day=week*7+weekday-firstDay+1;
        if(day>=1&&day<=count){
          const date=new Date(year,monthIndex,day);
          const value=key(date);
          const button=document.createElement("button");
          button.type="button";
          button.className="booking-calendar-day";
          button.textContent=String(day);
          button.dataset.calendarDate=value;
          button.disabled=!canRequest(date,now);
          const selected=value===dateInput.value&&!button.disabled;
          button.tabIndex=-1;
          const label=date.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
          button.setAttribute("aria-label",label+(button.disabled?(date.getDay()===2?", closed":", unavailable to request"):""));
          cell.setAttribute("aria-selected",String(selected));
          if(selected) button.classList.add("is-selected");
          if(value===key(now)) button.setAttribute("aria-current","date");
          cell.appendChild(button);
          buttons.push(button);
        }
        row.appendChild(cell);
      }
      days.appendChild(row);
    }
    const focus=buttons.find(button=>!button.disabled&&button.dataset.calendarDate===(focusDate||dateInput.value))
      ||buttons.find(button=>!button.disabled);
    if(focus) focus.tabIndex=0;
    if(focusDate) focus?.focus();
    status.textContent=!focus?"See next month for more dates."
      :dateInput.value?(canRequest(new Date(dateInput.value+"T00:00:00"),now)
        ?formatVisitDate(dateInput.value)+" selected.":"Please choose another date.")
        :"Choose a date. Tuesdays are closed.";
  }

  calendar.addEventListener("click",event=>{
    const navigation=event.target.closest("[data-calendar-month]");
    if(navigation){
      month.setMonth(month.getMonth()+Number(navigation.dataset.calendarMonth));
      renderCalendar();
      return;
    }
    const button=event.target.closest("[data-calendar-date]");
    if(!button||button.disabled) return;
    const value=button.dataset.calendarDate;
    if(!canRequest(new Date(value+"T00:00:00"))){renderCalendar();return;}
    dateInput.value=value;
    dateInput.dispatchEvent(new Event("change",{bubbles:true}));
    calendar.querySelector(`[data-calendar-date="${value}"]`)?.focus();
  });

  days.addEventListener("keydown",event=>{
    const button=event.target.closest("[data-calendar-date]");
    if(!button) return;
    const date=new Date(button.dataset.calendarDate+"T00:00:00");
    const steps={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    let direction=1;
    if(event.key in steps){
      const step=steps[event.key];
      date.setDate(date.getDate()+step);
      direction=Math.sign(step);
    }else if(event.key==="Home"||event.key==="End"){
      const weekday=(date.getDay()+6)%7;
      date.setDate(date.getDate()+(event.key==="Home"?-weekday:6-weekday));
      direction=event.key==="Home"?1:-1;
    }else if(event.key==="PageUp"||event.key==="PageDown"){
      direction=event.key==="PageUp"?-1:1;
      const day=date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth()+direction);
      date.setDate(Math.min(day,new Date(date.getFullYear(),date.getMonth()+1,0).getDate()));
    }else return;
    event.preventDefault();
    for(let attempt=0;attempt<7;attempt++){
      if(canRequest(date)){
        month=new Date(date.getFullYear(),date.getMonth(),1);
        renderCalendar(key(date));
        return;
      }
      date.setDate(date.getDate()+direction);
    }
  });

  dateInput.addEventListener("change",()=>{
    if(dateInput.value){
      const value=dateInput.value>=dateInput.min?dateInput.value:dateInput.min;
      month=new Date(value.slice(0,7)+"-01T00:00:00");
    }
    renderCalendar();
  });
  renderCalendar();
  calendar.hidden=false;
}
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
  updatePlan();
});
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
setupCalendar();

})();
