window.setupCafeCalendar=function({calendar,dateInput,isDateAvailable}){
  if(!calendar||!dateInput) return;
  function key(date){
    return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
  }
  function ukNow(){
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
    const value=Object.fromEntries(parts.filter(part=>part.type!=="literal").map(part=>[part.type,Number(part.value)]));
    return new Date(value.year,value.month-1,value.day,value.hour,value.minute,value.second);
  }
  function formatVisitDate(value){
    return new Date(value+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  }
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
  const nextMonth=calendar.querySelector('[data-calendar-month="1"]');
  let month=new Date((dateInput.value>=dateInput.min?dateInput.value:dateInput.min)+"T00:00:00");
  month.setDate(1);

  function canRequest(date,now=ukNow()){
    const value=key(date);
    return (!dateInput.min||value>=dateInput.min)&&(!dateInput.max||value<=dateInput.max)&&isDateAvailable(date,now);
  }

  function renderCalendar(focusDate){
    const now=ukNow();
    const year=month.getFullYear();
    const monthIndex=month.getMonth();
    const firstDay=(month.getDay()+6)%7;
    const count=new Date(year,monthIndex+1,0).getDate();
    monthLabel.textContent=month.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
    previousMonth.disabled=Boolean(dateInput.min&&key(month).slice(0,7)<=dateInput.min.slice(0,7));
    nextMonth.disabled=Boolean(dateInput.max&&key(month).slice(0,7)>=dateInput.max.slice(0,7));
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
    status.textContent=!focus?"Choose another month for more dates."
      :dateInput.value?(canRequest(new Date(dateInput.value+"T00:00:00"),now)
        ?formatVisitDate(dateInput.value)+" selected.":"Please choose another date.")
        :"Choose a date. Tuesdays are closed.";
  }

  calendar.addEventListener("click",event=>{
    const navigation=event.target.closest("[data-calendar-month]");
    if(navigation&&!navigation.disabled){
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
};
