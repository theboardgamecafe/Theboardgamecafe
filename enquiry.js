(() => {
"use strict";

const form=document.getElementById("enquiry-form");
const hpInput=document.getElementById("enquiry-website");
const formStarted=Date.now();
const typeEl=document.getElementById("type");
const submitBtn=document.getElementById("enquiry-submit");
const statusEl=document.getElementById("enquiry-status");
const routeNote=document.getElementById("booking-route-note");
const routeLink=document.getElementById("table-booking-link");
const eventTypes=new Set(["Birthday party","Group booking","Private hire","Corporate event","School or college group","Care or support group","Charity or community event","Live sport","Movie night"]);
function todayKey(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const date=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  return date.year+"-"+date.month+"-"+date.day;
}
function selectedEnquiryType(){return typeEl?typeEl.value:"General enquiry"}
function updateFormState(){
  const rawType=selectedEnquiryType();
  const tableBooking=rawType==="Table booking";
  if(routeNote) routeNote.hidden=!tableBooking;
  submitBtn.disabled=tableBooking;
  const subject=document.getElementById("form-subject");
  if(subject) subject.value=rawType?"Website enquiry – "+rawType:"Website enquiry";
  const host=document.getElementById("booking-details");
  const template=document.getElementById("booking-details-template");
  const showDetails=eventTypes.has(rawType);
  if(host&&template){
    const alreadyShown=Boolean(host.querySelector("#date"));
    if(showDetails&&!alreadyShown) host.appendChild(template.content.cloneNode(true));
    if(!showDetails&&alreadyShown) host.replaceChildren();
    const date=host.querySelector("#date");
    const size=host.querySelector("#size");
    if(date){date.min=todayKey();date.required=showDetails}
    if(size) size.required=showDetails;
    const duration=host.querySelector("#event-duration");
    if(duration){
      const isHire=rawType==="Private hire";
      for(const option of duration.options){option.hidden=isHire&&["1 hour","2 hours"].includes(option.value);option.disabled=option.hidden;}
      if(isHire&&["1 hour","2 hours"].includes(duration.value))duration.value="";
      duration.setAttribute("aria-describedby","event-planning-note");
      host.querySelector("#event-planning-note").textContent=isHire
        ?"Times are UK local time. Private hire has a three-hour minimum. Bringing outside food has a £50 fee. We confirm availability, catering and the full quote with you."
        :"Times are UK local time. Timing and any food or TV arrangements are confirmed with you before a booking is agreed.";
    }
  }
  const message=document.getElementById("message");
  const messageLabel=document.getElementById("message-label");
  const needsMessage=!showDetails||rawType==="Live sport"||rawType==="Movie night";
  message.required=needsMessage;
  const prompts={
    "Open game":"Which game would you like to play, and when?",
    "Off-site games hire":"What’s your event date, venue postcode, group size and preferred games?",
    "Live sport":"Which match or event would you like to watch?",
    "Movie night":"Tell us your preferred film and plans"
  };
  if(messageLabel)messageLabel.textContent=prompts[rawType]||(needsMessage?"Tell us what you’re planning":"Anything else we should know? (optional)");
}
function enquiryPayload(){
  return {
    name:document.getElementById("name")?.value.trim()||"",
    email:document.getElementById("email")?.value.trim()||"",
    phone:document.getElementById("phone")?.value.trim()||"",
    type:selectedEnquiryType(),
    date:document.getElementById("date")?.value||"",
    size:document.getElementById("size")?.value||"",
    time:document.getElementById("event-time")?.value||"",
    duration:document.getElementById("event-duration")?.value||"",
    catering:document.getElementById("event-catering")?.value||"",
    screens:document.getElementById("event-screens")?.value.trim()||"",
    message:document.getElementById("message")?.value.trim()||""
  };
}
function validEnquiry(){
  if(!form)return false;
  // WhatsApp opens a customer-reviewed draft. Email is useful, but is not
  // required when the customer has chosen a different way to contact us.
  for(const control of form.querySelectorAll("input,select,textarea")){
    if(control.id==="email"&&!control.value.trim())continue;
    if(typeof control.reportValidity==="function"&&!control.reportValidity())return false;
  }
  return true;
}
function formattedBody(){
  const d=enquiryPayload();
  const lines=["Website enquiry – "+d.type,"","Name: "+d.name,"Email: "+(d.email||"Not provided"),"Phone: "+(d.phone||"Not provided")];
  if(d.date) lines.push("Preferred date: "+d.date);
  if(d.size) lines.push("Group size: "+d.size);
  if(d.time) lines.push("Preferred start time (UK): "+d.time);
  if(d.duration) lines.push("Approximate duration: "+d.duration);
  if(d.catering) lines.push("Food and drinks: "+d.catering);
  if(d.screens) lines.push("TV or presentation requirements: "+d.screens);
  lines.push("","Message:",d.message);
  return lines.join("\n");
}
function sendWhatsAppEnquiry(){
  if(selectedEnquiryType()==="Table booking"){
    routeLink?.focus();
    statusEl.textContent="Use ‘Continue to table booking’ to choose your arrival time and duration. You can also call or WhatsApp 07768 489048 directly.";
    return;
  }
  if(!validEnquiry()) return;
  const body=encodeURIComponent(formattedBody());
  window.open("https://wa.me/447768489048?text="+body,"_blank","noopener");
  window.dispatchEvent(new CustomEvent("site:whatsapp-draft"));
}
document.querySelector("[data-whatsapp-enquiry]")?.addEventListener("click",sendWhatsAppEnquiry);
typeEl.addEventListener("change",updateFormState);
routeLink?.addEventListener("click",()=>{
  try{
    sessionStorage.setItem("tbgc_booking_prefill",JSON.stringify({
      name:document.getElementById("name")?.value.trim()||"",
      email:document.getElementById("email")?.value.trim()||"",
      phone:document.getElementById("phone")?.value.trim()||""
    }));
  }catch(_){}
});
const p=new URLSearchParams(location.search).get("type");
if(p){
  for(const o of typeEl.options){
    if(o.text.toLowerCase().includes(p.toLowerCase())){typeEl.value=o.value;break}
  }
}
form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(hpInput?.value || Date.now()-formStarted<800) return;
  if(!form.reportValidity() || selectedEnquiryType()==="Table booking") return;
  if(form.getAttribute("aria-busy")==="true") return;
  form.setAttribute("aria-busy","true");
  const previous=submitBtn.textContent;
  submitBtn.disabled=true;
  submitBtn.textContent="Sending…";
  statusEl.textContent="Sending your enquiry…";
  try{
    const payload = new FormData(form);
    for (const [field, value] of Array.from(payload)) {
      if (value === "") payload.delete(field);
    }
    const response=await fetch(form.action,{method:"POST",body:payload,signal:AbortSignal.timeout(20000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok || data?.success!==true) throw new Error("Submission failed");
    try{window.dispatchEvent(new CustomEvent("site:conversion",{detail:{form:"enquiry"}}))}catch(_){}
    try{sessionStorage.setItem("tbgc_form_receipt",JSON.stringify({form:form.id==="booking-form"?"booking":"enquiry",time:Date.now()}))}catch(_){}
    location.href="thanks.html";
  }catch(_){
    statusEl.textContent="We couldn’t send your enquiry just now. Please try again, call 07768 489048, or use WhatsApp.";
    form.removeAttribute("aria-busy");
    submitBtn.disabled=false;
    submitBtn.textContent=previous;
  }
});
updateFormState();

})();
