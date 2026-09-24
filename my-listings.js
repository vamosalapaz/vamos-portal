(function(){
var HOOK="https://hook.us2.make.com/esw01fv9bnkd8azj4squvtynr5s7t8xs";
var AGHOOK="https://hook.us2.make.com/q1khmq1vvcc3usokx3370l9xvhh14yeh";
var AGV="draft-2026-09";
var K=new URLSearchParams(location.search).get("k")||"";
var $=function(i){return document.getElementById(i)};
var D=function(v){if(v==null||v==="")return "";try{return decodeURIComponent(String(v))}catch(e){return String(v)}};
var TPL=$("ml-card-tpl");
var pending={},DATA=null,AG=null;

function bad(){$("ml-root").style.display="none";$("ml-badlink").style.display="block";}
function setPill(p,t,bg,fg){p.textContent=t;p.style.backgroundColor=bg;p.style.color=fg;}
function pv(id){return pending[id]!==undefined?pending[id].v:undefined}
function editPending(x){return D(x&&x.editStatuses).indexOf("Pending Review")>-1}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function closeMenus(){var m=document.querySelectorAll(".ml-menu");for(var i=0;i<m.length;i++)m[i].style.display="none";}
document.addEventListener("click",function(e){if(!e.target.closest||!e.target.closest(".ml-more"))closeMenus()});

var LIVE="\u25CF Live";
function pillFor(it){
  if(D(it.status)=="Removal requested")return["Removal requested","#FBE9E9","#98302F"];
  if(D(it.status)=="Submitted for review")return["Pending review","#FDF1DC","#8A5A12"];
  if(it.visible!="true")return["Hidden","#EEF1F3","#5A6670"];
  if(it.effectiveVisible!="1")return["Hidden because your profile is hidden","#EEF1F3","#5A6670"];
  return[LIVE,"#E6F4EC","#1B6B43"];
}

function addEditPill(after,it){
  if(!editPending(it)||D(it.status)=="Submitted for review")return;
  var e=after.cloneNode(false);setPill(e,"Changes awaiting review","#FDF1DC","#8A5A12");
  e.style.marginLeft="6px";after.parentNode.insertBefore(e,after.nextSibling);
}

function toggle(id,liveVal,kind){
  var cur=pv(id)!==undefined?pv(id):liveVal;
  var nv=!cur;
  if(nv===liveVal)delete pending[id];else pending[id]={v:nv,kind:kind};
  render();
}

function moreMenu(items){
  var wrap=el("div","ml-more");
  var btn=el("button","ml-btn ml-btn-quiet","\u2022\u2022\u2022");btn.setAttribute("aria-label","More actions");
  var menu=el("div","ml-menu");
  items.forEach(function(it){
    var b=el("button","ml-menu-item",it.label);
    b.onclick=function(ev){ev.stopPropagation();closeMenus();it.go()};menu.appendChild(b);
  });
  btn.onclick=function(ev){ev.stopPropagation();
    var open=menu.style.display=="block";closeMenus();menu.style.display=open?"none":"block";};
  wrap.appendChild(btn);wrap.appendChild(menu);return wrap;
}

function card(it,kind){
  var n=TPL.firstElementChild.cloneNode(true);
  var img=n.querySelector(".boat-card-img");
  if(D(it.coverPhoto))img.src=D(it.coverPhoto);else img.style.display="none";
  n.querySelector(".boat-card-name").textContent=D(it.name);
  n.querySelector(".boat-card-type").textContent=kind=="b"?D(it.model):[D(it.tourType),D(it.duration)].filter(Boolean).join(" \u00b7 ");
  n.querySelector(".boat-card-capacity").textContent=kind=="b"?(it.capacity?"Up to "+it.capacity+" guests":""):[D(it.priceRange),D(it.priceUnit)].filter(Boolean).join(" ");
  var p=n.querySelector(".ml-pill"),t=pillFor(it);setPill(p,t[0],t[1],t[2]);
  var acts=n.querySelector(".ml-actions");
  if(D(it.status)=="Removal requested"){
    acts.innerHTML="";
    var c=el("button","ml-btn ml-btn-ghost","Cancel removal request");c.style.flex="1";
    c.onclick=function(){post(kind=="b"?"cancel_remove_boat":"cancel_remove_offering",{recordId:it.id},sync)};
    acts.appendChild(c);return n;
  }
  var btns=acts.querySelectorAll("a, button");
  var live=it.visible=="true";
  btns[0].href="#";btns[0].onclick=function(e){e.preventDefault();openEditor(kind,it)};
  btns[1].textContent=(pv(it.id)!==undefined?pv(it.id):live)?"Hide":"Show";
  btns[1].onclick=function(){toggle(it.id,live,kind)};
  btns[2].parentNode.removeChild(btns[2]);
  acts.appendChild(moreMenu([{label:"Request removal",go:function(){confirmRemove(it,kind)}}]));
  n.style.cursor="pointer";
  n.setAttribute("role","button");n.setAttribute("tabindex","0");
  n.setAttribute("aria-label","Edit "+D(it.name));
  n.onclick=function(e){
    if(e.target.closest&&e.target.closest("button, .ml-more, .ml-menu"))return;
    e.preventDefault();openEditor(kind,it);
  };
  n.onkeydown=function(e){
    if(e.target!==n)return;
    if(e.key=="Enter"||e.key==" "){e.preventDefault();openEditor(kind,it)}
  };
  if(pv(it.id)!==undefined){
    n.style.boxShadow="0 0 0 3px rgba(43,74,139,.12)";
    setPill(p,pv(it.id)?"Will go live when you save":"Will be hidden when you save","#E8EEFB","#2B4A8B");
  }
  addEditPill(p,it);
  return n;
}

function summary(){
  var host=document.querySelector(".ml-who");if(!host||!DATA)return;
  var old=document.querySelector(".ml-summary");if(old)old.parentNode.removeChild(old);
  var s=el("div","ml-summary");
  function chip(t){s.appendChild(el("span","ml-chip",t))}
  chip(DATA.offerings.length+(DATA.offerings.length==1?" offering":" offerings"));
  chip(DATA.boats.length+(DATA.boats.length==1?" boat":" boats"));
  chip(DATA.operator&&DATA.operator.visible=="true"?"Profile live":"Profile hidden");
  var all=DATA.offerings.concat(DATA.boats);
  var waiting=all.filter(function(x){
    var st=D(x.status);return st=="Submitted for review"||st=="Removal requested"||editPending(x)}).length+(editPending(DATA.operator)?1:0);
  if(waiting)chip(waiting+(waiting==1?" change":" changes")+" awaiting review");
  var d=el("button","ml-chip","Documents");
  d.style.cssText="cursor:pointer;border:1px solid #D9D2C3;background:#fff;font:inherit";
  d.onclick=openDocs;s.appendChild(d);
  host.parentNode.insertBefore(s,host.nextSibling);
}

function profile(op){
  var w=$("ml-profile");w.innerHTML="";
  if(!op||!op.id||op.placeholder=="true")return;
  var box=el("div");
  box.style.cssText="border:1px solid #E5DFD1;border-radius:6px;padding:18px;display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;background:#fff";
  if(D(op.logo)){var im=el("img");im.src=D(op.logo);
    im.style.cssText="width:110px;height:73px;object-fit:contain;flex:0 0 auto";box.appendChild(im);}
  var body=el("div");body.style.cssText="flex:1 1 280px;min-width:0";
  var nm=el("div","boat-card-name",D(op.name));
  var ds=el("div");ds.style.cssText="font-size:14px;color:#46525C;margin:4px 0 10px;line-height:1.5";
  var txt=D(op.description).replace(/<[^>]*>/g,"").trim();
  ds.textContent=txt.length>260?txt.slice(0,260)+"\u2026":txt;
  var pl=el("div","ml-pill");
  var live=op.visible=="true";
  if(live)setPill(pl,LIVE,"#E6F4EC","#1B6B43");else setPill(pl,"Hidden","#EEF1F3","#5A6670");
  var pills=el("div");pills.style.cssText="display:flex;flex-wrap:wrap;gap:6px";pills.appendChild(pl);
  body.appendChild(nm);body.appendChild(ds);body.appendChild(pills);
  var acts=el("div");acts.style.cssText="flex:0 0 auto;display:flex;gap:8px;align-items:center";
  var ed=el("a","ml-btn ml-btn-ghost","Edit profile");ed.href="#";
  ed.onclick=function(e){e.preventDefault();openEditor("p",op)};
  var hd=el("button","ml-btn ml-btn-ghost",(pv(op.id)!==undefined?pv(op.id):live)?"Hide":"Show");
  hd.onclick=function(){toggle(op.id,live,"p")};
  acts.appendChild(ed);acts.appendChild(hd);
  if(pv(op.id)!==undefined){
    box.style.boxShadow="0 0 0 3px rgba(43,74,139,.12)";
    setPill(pl,pv(op.id)?"Will show when you save":"Will be hidden when you save","#E8EEFB","#2B4A8B");
  }
  addEditPill(pl,op);
  box.appendChild(body);box.appendChild(acts);w.appendChild(box);
}

function modal(title,body,btns){
  $("ml-modal-title").textContent=title;$("ml-modal-body").innerHTML=body;
  var r=$("ml-modal-row");r.innerHTML="";
  btns.forEach(function(b){var e=el("button","ml-btn "+(b.cls||"ml-btn-ghost"),b.label);e.style.marginLeft="8px";
    e.onclick=function(){$("ml-scrim").style.display="none";if(b.go)b.go()};r.appendChild(e)});
  $("ml-scrim").style.display="flex";
}

function confirmRemove(it,kind){
  modal("Ask us to remove this listing?","<strong>"+D(it.name)+"</strong> comes off the site straight away \u2014 this one doesn't wait for the Save button. We'll then take it down permanently. You can cancel the request from this page any time before we get to it.",
    [{label:"Keep it"},{label:"Request removal",cls:"ml-btn-quiet",go:function(){post(kind=="b"?"remove_boat":"remove_offering",{recordId:it.id},sync)}}]);
}

function post(type,params,done){
  var q=new URLSearchParams(Object.assign({formType:type,k:K},params));
  fetch(HOOK+"?"+q.toString()).then(function(){done&&done()}).catch(function(){
    modal("That didn't go through","Please try again, or message us on WhatsApp.",[{label:"OK"}])});
}

function sync(){post("set_visibility",{changes:""},load)}

function save(){
  var ids=Object.keys(pending);if(!ids.length)return;
  var changes=ids.map(function(i){return i+":"+pending[i].kind+":"+(pending[i].v?1:0)}).join(",");
  post("set_visibility",{changes:changes},function(){
    pending={};showBanner("Your visibility changes are live on the site.");load();});
}

function showBanner(t){$("ml-banner").textContent=t;$("ml-banner").style.display="block";window.scrollTo({top:0});}

function sendForm(params){
  return fetch(HOOK,{method:"POST",body:new URLSearchParams(Object.assign({k:K},params))})
    .then(function(r){return r.json()}).then(function(d){if(!d||!d.ok)throw 0;return d});
}

function shrink(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),im=new Image();
    im.onload=function(){
      var w=im.naturalWidth,h=im.naturalHeight,s=Math.min(1,2000/Math.max(w,h));
      var c=document.createElement("canvas");c.width=Math.round(w*s);c.height=Math.round(h*s);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
      var data=c.toDataURL("image/jpeg",0.82);
      res({b64:data.split(",")[1],preview:data,small:w<1600});
    };
    im.onerror=function(){URL.revokeObjectURL(url);rej()};
    im.src=url;
  });
}

// ---------- Agreement text ----------
var AG_CORE=[
 ["What this is",["Vamos a La Paz lists La Paz operators, boats and experiences at vamosalapaz.com so travellers can find them.","How bookings reach you depends on the arrangement in your Schedule below. Either way, you run the experience and you are responsible for it.","This is not exclusive. You can list and sell anywhere else, and we list other partners, including your competitors."]],
 ["Your listings",["You give us your business details, boats, experiences, prices and photos, and keep them current.","You confirm the information is accurate, that you own the photos or have permission to use them and we may publish them, and that you will honour bookings made through us at the price and terms shown.","All prices you give us include IVA and any other taxes and fees, so travellers see the final price.","We may edit listing copy, choose which photos to show, decide where listings appear, and pause or remove any listing at any time."]],
 ["Legal requirements",["You confirm that you hold every licence, permit, registration, insurance policy and authorisation required for the experiences you list, that they are current, and that you will tell us promptly if any lapses or changes."]],
 ["Running the experience",["You are responsible for delivering the experience safely and as described \u2014 vessel, crew, equipment, itinerary, and the travellers' safety while they are with you.","You handle complaints and incidents arising from your experiences. We pass on anything a traveller raises with us, and where we took the payment we coordinate refunds with you.","You will cover us against claims and costs arising from your experiences, your compliance, or the information you gave us. Our liability to you is limited to the amounts you paid us, or we retained, in the three months before the claim.","Nothing here creates a partnership, joint venture or employment relationship between us."]],
 ["Your information and portal access",["We hold your business and contact details to run the directory and contact you. We do not sell your information, and we publish only what appears in your listings.","Anyone holding your partner portal link can edit your listings, so treat it like a password. Tell us if it should be reissued."]],
 ["Ending it",["Either of us can end this at any time, effective immediately, by telling the other. Your listings come off the site.","Trips already booked still run on the terms that applied when they were booked, and amounts owed are still owed."]],
 ["Changes",["We will tell you before changed terms apply to you. Carrying on listing with us means the new terms apply; otherwise you can end the agreement."]],
 ["Law",["The laws of Mexico apply, and the courts of La Paz, Baja California Sur have jurisdiction."]]
];
var AG_A=["Travellers book with you \u2014 15% commission",[
 "15% of the total booking value, IVA included.",
 "Applies only to bookings that come through Vamos a La Paz: through a booking widget or link on our site, an enquiry we passed to you, or a booking we arranged.",
 "Not your own direct bookings, and not bookings a traveller later makes with you independently.",
 "You pay us after each booking, unless we agree otherwise in writing.",
 "Fully refunded booking: no commission, returned if already paid. Partly refunded: commission on what you keep.",
 "Where a booking platform pays our commission automatically, that covers it."]];
var AG_B=["We sell the trip \u2014 15% margin",[
 "You provide the trip at the price listed on our site less 15%, IVA included.",
 "We collect the traveller's payment and pay you your amount as agreed.",
 "We confirm with you before confirming to the traveller, unless we have agreed availability in advance.",
 "Published cancellation terms for the trip apply, and we pass on what you are owed under them.",
 "You invoice us for each trip."]];
var AG_PRICE=["Pricing",["The price on vamosalapaz.com will not be higher than the price you advertise for the same experience, on the same terms, anywhere else. If you lower a price elsewhere, tell us so we can match it."]];

function schedules(){
  var a=D(AG&&AG.arrangement),out=[];
  if(a.indexOf("Referral")>-1)out.push(AG_A);
  if(a.indexOf("Reseller")>-1)out.push(AG_B);
  if(a=="Custom"||!out.length){
    var t=D(AG&&AG.customTerms);
    out.push(["Your arrangement",t?t.split("\n").filter(Boolean):["Your commercial terms are agreed with us separately and will be confirmed in writing before anything goes live."]]);
  }
  if(a.indexOf("Referral")>-1&&a.indexOf("Reseller")>-1)
    out.push(["Which applies",["Where both apply, the first covers the experiences that are bookable online through your own booking platform, and the second covers the rest."]]);
  out.push(AG_PRICE);
  return out;
}

function agreementBody(){
  var wrap=el("div");
  var note=el("p","ml-ed-note","This is a draft agreement that has not been legally reviewed. We may ask you to sign a new version once it has been.");
  note.style.margin="0 0 16px";wrap.appendChild(note);
  var intro=el("p","ml-ed-help","Between Peter Jostrom (persona f\u00edsica), RFC JOPE801231DS8, La Paz, Baja California Sur, trading as Vamos a La Paz, and you.");
  intro.style.margin="0 0 18px";wrap.appendChild(intro);
  AG_CORE.concat(schedules()).forEach(function(sec){
    wrap.appendChild(el("h3","ml-ed-sec",sec[0]));
    sec[1].forEach(function(p){
      var e=el("p",null,p);
      e.style.cssText="font-size:14px;line-height:1.55;color:#46525C;margin:0 0 10px";
      wrap.appendChild(e);
    });
  });
  return wrap;
}

function openAgreementGate(){
  var scrim=el("div","ml-ed-scrim");scrim.style.justifyContent="center";
  var pan=el("div","ml-ed");pan.style.maxWidth="620px";pan.setAttribute("role","dialog");
  var head=el("div","ml-ed-head");
  head.appendChild(el("h2","ml-ed-title","Before you start"));
  pan.appendChild(head);
  var scroll=el("div","ml-ed-body");pan.appendChild(scroll);
  scroll.appendChild(el("p","ml-ed-intro",(D(AG&&AG.accepted)?"We've updated the partner agreement. Please read and accept the new version.":"Please read and accept the partner agreement. It takes a couple of minutes.")));
  scroll.appendChild(agreementBody());
  var fw=el("div","ml-ed-footwrap");
  var err=el("p","ml-ed-err");fw.appendChild(err);
  var f1=el("div","ml-ed-f");
  var l1=el("label",null,"Your full name and role");f1.appendChild(l1);
  var nm=el("input");nm.type="text";nm.placeholder="Maria Garcia, owner";f1.appendChild(nm);
  fw.appendChild(f1);
  function chk(text){
    var w=el("label","ml-radio");var i=el("input");i.type="checkbox";
    w.appendChild(i);w.appendChild(document.createTextNode(text));
    w.style.alignItems="flex-start";w.style.marginBottom="6px";fw.appendChild(w);return i;
  }
  var c1=chk("I accept this agreement on behalf of my business.");
  var c2=chk("I confirm we hold every licence, permit and insurance required for what we list, and that they are current.");
  var foot=el("div","ml-ed-foot");foot.style.marginTop="12px";
  var go=el("button","ml-btn ml-btn-primary","Accept and continue");go.disabled=true;
  foot.appendChild(go);fw.appendChild(foot);pan.appendChild(fw);
  function upd(){go.disabled=!(nm.value.trim()&&c1.checked&&c2.checked)}
  nm.addEventListener("input",upd);c1.addEventListener("change",upd);c2.addEventListener("change",upd);
  go.onclick=function(){
    go.disabled=true;go.textContent="Saving\u2026";err.style.display="none";
    fetch(AGHOOK,{method:"POST",body:new URLSearchParams({formType:"accept_agreement",k:K,signedBy:nm.value.trim(),version:AGV})})
      .then(function(r){return r.json()}).then(function(d){if(!d||!d.ok)throw 0;
        scrim.parentNode.removeChild(scrim);document.body.style.overflow="";
        showBanner("Thank you. Your agreement is saved \u2014 you can see it any time under Documents.");
        loadAgreement(true);})
      .catch(function(){go.disabled=false;go.textContent="Accept and continue";
        err.textContent="That didn't save. Try again, or message us on WhatsApp.";err.style.display="block";});
  };
  pan.appendChild(fw);scrim.appendChild(pan);document.body.appendChild(scrim);
  document.body.style.overflow="hidden";nm.focus();
}

function openDocs(){
  var scrim=el("div","ml-ed-scrim");
  scrim.onclick=function(e){if(e.target===scrim){scrim.parentNode.removeChild(scrim);document.body.style.overflow=""}};
  var pan=el("div","ml-ed");
  var head=el("div","ml-ed-head");
  head.appendChild(el("h2","ml-ed-title","Documents"));
  var x=el("button","ml-ed-x","\u00d7");x.setAttribute("aria-label","Close");
  x.onclick=function(){scrim.parentNode.removeChild(scrim);document.body.style.overflow=""};
  head.appendChild(x);pan.appendChild(head);
  var scroll=el("div","ml-ed-body");pan.appendChild(scroll);
  var acc=D(AG&&AG.accepted);
  var row=el("div");row.style.cssText="border:1px solid #E5DFD1;border-radius:6px;padding:14px;margin-bottom:12px";
  row.appendChild(el("div","boat-card-name","Partner agreement"));
  var meta=el("p","ml-ed-help");
  meta.textContent=acc?("Accepted "+acc.slice(0,10)+" by "+D(AG.signedBy)+" \u00b7 version "+D(AG.version)):"Not yet accepted";
  row.appendChild(meta);
  var view=el("button","ml-link","Read the agreement");view.type="button";
  view.style.marginTop="8px";
  var holder=el("div");holder.style.display="none";
  view.onclick=function(){
    if(!holder.firstChild)holder.appendChild(agreementBody());
    var open=holder.style.display=="block";
    holder.style.display=open?"none":"block";
    view.textContent=open?"Read the agreement":"Hide the agreement";
  };
  row.appendChild(view);row.appendChild(holder);scroll.appendChild(row);
  var names=D(AG&&AG.docNames).split("|").filter(Boolean);
  var urls=D(AG&&AG.docUrls).split(" ").filter(Boolean);
  if(names.length){
    scroll.appendChild(el("h3","ml-ed-sec","Files we've shared with you"));
    names.forEach(function(n,i){
      var a=el("a",null,n);a.href=urls[i]||"#";a.target="_blank";a.rel="noopener";
      a.style.cssText="display:block;padding:10px 0;border-bottom:1px solid #EFEAE0;color:#2B4A8B;font-size:15px";
      scroll.appendChild(a);
    });
    scroll.appendChild(el("p","ml-ed-help","Links open the file directly and expire after a couple of hours \u2014 reopen this page for a fresh one."));
  }
  scrim.appendChild(pan);document.body.appendChild(scrim);document.body.style.overflow="hidden";
}

// ---------- Edit and add panel ----------
var WHERE="Where it shows on the site",TOUR=["Private Tour","Shared Tour"],UNIT=["per tour","per person"],PLAT=["","Bokun","FareHarbor","Other"];
var BTYPE=["","Powerboat","Panga","Sportfishing Boat","Sailboat","Sailing Catamaran","Power Catamaran","Motor Yacht","Luxury Yacht"];
var MARINA=["","Marina de La Paz","La Marina del Palmar","Marina Palmira","Muelle Fiscal"];
var FIELDS={
 o:[["#","Basics"],["name","Name","text",0],["tourType","Tour type","select",1,TOUR],["duration","Duration","text",1],
    ["capacity","Max guests","number",1],["priceUnit","Price unit","select",1,UNIT],
    ["boatId","Boat","select",0,null,"The boat this trip runs on. Leave it unset for a land-based trip, or if the boat varies."],
    ["#",WHERE],
["activityIds","What guests do","multi",0,"Activity","Pick at least one. This decides which activity pages list this trip. If your activity isn't listed here, please let us know and we'll add it."],
["destinationIds","Where it goes","multi",0,"Destination","Optional. Leave it empty if the trip isn't tied to one place. If your destination isn't listed here, please let us know and we'll add it."],
["#","Price and online booking"],
    ["priceRange","Price range","text",0,null,"Shown on browse pages, including IVA. Your booking widget shows the real price at checkout."],
    ["bookingPlatform","Online booking","select",0,PLAT],["otherBookingPlatform","Name of your booking platform","text",0],
    ["widgetCode","Booking widget code","textarea",0,null,"Paste the widget code from your booking platform. We check it before it goes live."],
    ["#","Details"],["description","Description","textarea",0],["whatsIncluded","What's included","textarea",0]],
 b:[["#","Basics"],["name","Boat name","text",0],["type","Type","select",1,BTYPE],["model","Make and model","text",1],
    ["#","Capacity and specifications"],["length","Length (ft)","number",1],["capacity","Max guests","number",1],
    ["sleepingCapacity","Sleeps","number",1],["cruisingSpeed","Cruising speed (knots)","number",1],
    ["#","Location and description"],["departsFrom","Departs from","select",0,MARINA],["description","Description","textarea",0],["amenities","Amenities","textarea",0]],
 p:[["#","About your business"],["name","Business name","text",0],["description","Description","textarea",0],
    ["trustNotes","Trust and safety notes","textarea",0],["website","Website","text",0]]
};

(function(){var s=document.createElement("style");s.textContent=
".ml-ed-scrim{position:fixed;inset:0;background:rgba(20,30,40,.35);z-index:9998;display:flex;justify-content:flex-end}"+
".ml-ed{background:#fff;width:100%;max-width:480px;height:100%;overflow:hidden;box-sizing:border-box;padding:22px 24px 0;border-left:1px solid #E5DFD1;display:flex;flex-direction:column}"+
".ml-ed-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding-bottom:6px}"+
".ml-ed-head{flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}"+
".ml-ed-title{font-size:20px;font-weight:600;margin:0}"+
".ml-ed-x{background:none;border:0;font-size:24px;line-height:1;cursor:pointer;color:#46525C;padding:4px 8px}"+
".ml-ed-intro{font-size:14px;color:#46525C;line-height:1.5;margin:0 0 4px}"+
".ml-ed-grid{display:flex;flex-wrap:wrap;gap:0 12px}"+
".ml-ed-sec{flex:1 1 100%;font-size:15px;font-weight:600;margin:28px 0 12px;padding-top:18px;border-top:1px solid #EFEAE0}"+
".ml-ed-f{flex:1 1 100%;margin-bottom:15px;min-width:0}.ml-ed-f.half{flex:1 1 180px}"+
".ml-ed-f label,.ml-ed-lab{display:block;font-size:13px;color:#46525C;margin-bottom:6px}"+
".ml-ed-f input,.ml-ed-f select,.ml-ed-f textarea{width:100%;box-sizing:border-box;border:1px solid #D9D2C3;border-radius:6px;padding:9px 10px;font:inherit;font-size:15px;background:#fff;color:inherit}"+
".ml-ed-f textarea{min-height:104px;resize:vertical}"+
".ml-ed-help{font-size:12px;color:#6B757D;margin:6px 0 0;line-height:1.4}"+
".ml-ed-note{flex:1 1 100%;font-size:13px;color:#46525C;background:#F6F2EA;border-radius:6px;padding:8px 10px;margin:0 0 15px;line-height:1.45}"+
".ml-ed-warn{font-size:12px;color:#8A5A12;margin:6px 0 0;line-height:1.4}"+
".ml-ed-err{color:#98302F;font-size:13px;margin:0 0 10px;display:none;line-height:1.4}"+
".ml-ed-footwrap{flex:0 0 auto;margin:0 -24px;padding:14px 24px calc(14px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid #E5DFD1}"+
".ml-ed-foot{display:flex;justify-content:flex-end;gap:8px}"+
".ml-ed-foot .ml-btn[disabled]{opacity:.45;cursor:default}"+
".ml-ph-blk{margin-bottom:18px}"+
".ml-ph-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"+
".ml-cover{display:flex;align-items:center;justify-content:center;width:100%;max-width:360px;aspect-ratio:3/2;border:1px dashed #C9C0AE;border-radius:8px;background:#F6F2EA center/cover no-repeat;cursor:pointer;font:inherit;font-size:14px;color:#46525C;margin:0 0 8px;padding:0}"+
".ml-cover.has{border:1px solid #E5DFD1}.ml-cover.small{border-color:#E0B25C}"+
".ml-cover.logo{max-width:200px;background-size:contain;background-color:#fff}"+
".ml-link{background:none;border:0;padding:0;color:#2B4A8B;font:inherit;font-size:14px;cursor:pointer;text-decoration:underline}"+
".ml-th{position:relative;width:84px;height:56px;border-radius:6px;background:#F3EFE6 center/cover no-repeat;border:1px solid #E5DFD1;flex:0 0 auto}"+
".ml-th.small{border-color:#E0B25C}"+
".ml-th-x{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:1px solid #D9D2C3;background:#fff;font-size:13px;line-height:16px;padding:0;cursor:pointer}"+
".ml-th-add{height:56px;padding:0 14px;border:1px dashed #C9C0AE;border-radius:6px;background:#fff;font:inherit;font-size:13px;color:#46525C;cursor:pointer}"+
".ml-radio{display:flex;gap:8px;align-items:center;font-size:14px;margin:8px 0 0;cursor:pointer}"+
".ml-prog{margin-bottom:10px}"+
".ml-prog-bar{height:6px;border-radius:3px;background:#F0ECE3;overflow:hidden;margin:8px 0}"+
".ml-prog-bar div{height:100%;width:0;background:#2B4A8B;transition:width .3s}"+
".ml-ms-box{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-height:40px;box-sizing:border-box;padding:6px 32px 6px 10px;border:1px solid #D9D2C3;border-radius:6px;background:#fff;cursor:pointer;position:relative}"+
".ml-ms-box:focus-visible{outline:2px solid #2B4A8B;outline-offset:1px}"+
".ml-ms-ph{font-size:15px;color:#8A949B}"+
".ml-ms-chip{display:inline-flex;align-items:center;gap:2px;font-size:13px;padding:3px 4px 3px 9px;border-radius:999px;background:#E8EEFB;color:#2B4A8B}"+
".ml-ms-x{background:none;border:0;color:#2B4A8B;font-size:15px;line-height:1;padding:0 4px;cursor:pointer}"+
".ml-ms-chev{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#6B757D;font-size:12px}"+
".ml-ms-menu{border:1px solid #D9D2C3;border-radius:6px;background:#fff;margin-top:4px;padding:4px 0}"+
".ml-ed-f .ml-ms-opt{display:flex;align-items:center;gap:10px;padding:8px 12px;font-size:15px;margin:0;color:inherit;cursor:pointer}"+
".ml-ed-f .ml-ms-opt:hover{background:#F6F2EA}"+
".ml-ed-f .ml-ms-opt input{width:auto;margin:0;padding:0}"+
"@media (max-width:600px){.ml-ed{max-width:none;border-left:0;padding:18px 18px 0}.ml-ed-footwrap{margin:0 -18px;padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px))}}";
document.head.appendChild(s)})();

var ED=null,BUSY=false;
function closeEditor(){if(BUSY)return;if(ED){ED.parentNode.removeChild(ED);ED=null;document.body.style.overflow="";}}
document.addEventListener("keydown",function(e){if(e.key=="Escape")closeEditor()});

function picker(multiple,onFiles){
  var i=document.createElement("input");i.type="file";i.accept="image/*";i.multiple=!!multiple;i.style.display="none";
  i.onchange=function(){onFiles(Array.prototype.slice.call(i.files||[]));i.value=""};
  document.body.appendChild(i);return i;
}

function msNorm(ids,opts){ids=ids.filter(Boolean);var known=opts.map(function(o){return o.id});
return known.filter(function(i){return ids.indexOf(i)>-1}).concat(ids.filter(function(i){return known.indexOf(i)<0}));}
function msWidget(inp,opts,boxId,ph){
var root=el("div","ml-ms"),box=el("div","ml-ms-box"),menu=el("div","ml-ms-menu");
box.id=boxId;box.tabIndex=0;box.setAttribute("role","button");box.setAttribute("aria-haspopup","listbox");menu.style.display="none";
root.appendChild(box);root.appendChild(menu);
function sel(){return inp.value?inp.value.split(","):[]}
function set(a){inp.value=msNorm(a,opts).join(",");inp.dispatchEvent(new Event("change",{bubbles:true}));draw()}
function draw(){
var s=sel(),open=menu.style.display!="none";box.innerHTML="";box.setAttribute("aria-expanded",open?"true":"false");
var shown=opts.filter(function(o){return s.indexOf(o.id)>-1});
if(!shown.length)box.appendChild(el("span","ml-ms-ph",ph));
shown.forEach(function(o){var c=el("span","ml-ms-chip",o.label);var x=el("button","ml-ms-x","\u00d7");x.type="button";x.setAttribute("aria-label","Remove "+o.label);
x.onclick=function(e){e.stopPropagation();set(sel().filter(function(i){return i!==o.id}))};c.appendChild(x);box.appendChild(c)});
box.appendChild(el("span","ml-ms-chev",open?"\u25B4":"\u25BE"));
menu.innerHTML="";
opts.forEach(function(o){var lb=el("label","ml-ms-opt");var cb=el("input");cb.type="checkbox";cb.checked=s.indexOf(o.id)>-1;
cb.onchange=function(){var a=sel().filter(function(i){return i!==o.id});if(cb.checked)a.push(o.id);set(a)};
lb.appendChild(cb);lb.appendChild(document.createTextNode(o.label));menu.appendChild(lb)});
}
function tog(){menu.style.display=menu.style.display=="none"?"block":"none";draw()}
box.onclick=tog;box.onkeydown=function(e){if(e.target===box&&(e.key=="Enter"||e.key==" ")){e.preventDefault();tog()}};
draw();return root;
}

function openEditor(kind,it){
  closeEditor();
  var isNew=!it,send=null,textSent=false;
  var titles={o:isNew?"Add an offering":"Edit offering",b:isNew?"Add a boat":"Edit boat",p:"Edit your profile"};
  var scrim=el("div","ml-ed-scrim");
  scrim.onclick=function(e){if(e.target===scrim)closeEditor()};
  var pan=el("div","ml-ed");pan.setAttribute("role","dialog");pan.setAttribute("aria-modal","true");
  var head=el("div","ml-ed-head");
  var h=el("h2","ml-ed-title",titles[kind]);
  var x=el("button","ml-ed-x","\u00d7");x.setAttribute("aria-label","Close");x.onclick=closeEditor;
  head.appendChild(h);head.appendChild(x);pan.appendChild(head);
  var scroll=el("div","ml-ed-body");pan.appendChild(scroll);
  scroll.appendChild(el("p","ml-ed-intro",isNew?"New listings are reviewed before they appear on the site.":"Changes are reviewed before they appear on the site. Your current listing stays live while we review them."));
  var grid=el("div","ml-ed-grid");scroll.appendChild(grid);
  var inputs={},wraps={},OPTS=(DATA&&DATA.options)||[];
  FIELDS[kind].forEach(function(f){
    if((f[0]=="#"&&f[1]==WHERE||f[2]=="multi")&&!OPTS.length)return;
if(f[0]=="#"){grid.appendChild(el("h3","ml-ed-sec",f[1]));return;}
    var w=el("div","ml-ed-f"+(f[3]?" half":""));
    var id="ml-ed-"+f[0];
    var l=el("label",null,f[1]);l.setAttribute("for",id);w.appendChild(l);
    var v=it?D(it[f[0]]):"";var inp;
    if(f[2]=="multi"){
inp=el("input");inp.type="hidden";
var mo=OPTS.filter(function(o){return o.type==f[4]}).map(function(o){return{id:o.id,label:D(o.label)}}).sort(function(a,b){return a.label.localeCompare(b.label)});
inp.value=msNorm(v.split(","),mo).join(",");
l.setAttribute("for",id+"-box");
w.appendChild(msWidget(inp,mo,id+"-box",f[4]=="Activity"?"Choose activities":"Choose destinations"));
}
else if(f[0]=="boatId"){
      inp=el("select");
      var none=el("option",null,"Not tied to a specific boat");none.value="";inp.appendChild(none);
      (DATA&&DATA.boats||[]).forEach(function(b){var op=el("option",null,D(b.name));op.value=b.id;inp.appendChild(op)});
      inp.value=v;
      if(v&&inp.value!=v){var cur=el("option",null,"Current boat");cur.value=v;inp.appendChild(cur);inp.value=v;}
    }
    else if(f[2]=="select"){inp=el("select");
      var opts=f[4].slice();if(v&&opts.indexOf(v)<0)opts.push(v);
      opts.forEach(function(o){var op=el("option",null,o||(f[0]=="bookingPlatform"?"No online booking":"Choose\u2026"));op.value=o;inp.appendChild(op)});
      inp.value=v||(f[4][0]||"");}
    else if(f[2]=="textarea"){inp=el("textarea");inp.value=v;}
    else{inp=el("input");inp.type=f[2]=="number"?"number":"text";if(f[2]=="number"){inp.min="0";inp.step="any";}inp.value=v;}
    inp.id=id;w.appendChild(inp);
    if(f[5])w.appendChild(el("p","ml-ed-help",f[5]));
    grid.appendChild(w);inputs[f[0]]=inp;wraps[f[0]]=w;
  });
  var first=grid.querySelector(".ml-ed-sec");if(first){first.style.marginTop="18px";first.style.borderTop="0";first.style.paddingTop="0";}

  if(kind=="o"){
    var wc=inputs.widgetCode;wc.style.fontFamily="monospace";wc.style.fontSize="13px";wc.spellcheck=false;
    var dLab=wraps.description.querySelector("label");
    var dHelp=el("p","ml-ed-help","Your booking widget shows the full details, so keep this to 2\u20133 sentences about what makes this trip special.");
    wraps.description.appendChild(dHelp);
    var incNote=el("p","ml-ed-note","What's included isn't shown on your page while you have a booking widget. Your widget covers it.");
    grid.insertBefore(incNote,wraps.whatsIncluded.nextSibling);
    var mode=function(){
      var plat=inputs.bookingPlatform.value,w=!!(plat&&wc.value.trim());
      wraps.otherBookingPlatform.style.display=plat=="Other"?"":"none";
      wraps.widgetCode.style.display=plat?"":"none";
      dLab.textContent=w?"Short description":"Description";
      dHelp.style.display=w?"block":"none";
      wraps.whatsIncluded.style.display=w?"none":"";
      incNote.style.display=w?"block":"none";
    };
    inputs.bookingPlatform.addEventListener("change",mode);wc.addEventListener("input",mode);mode();
    if(!(DATA&&DATA.boats&&DATA.boats.length))
      wraps.boatId.appendChild(el("p","ml-ed-help","Add a boat first and we'll list it here once it's approved."));
  }

  var initial={};Object.keys(inputs).forEach(function(k){initial[k]=inputs[k].value});
  var PH={cover:null,logo:null,gallery:[]};
  function dirty(){
    if(PH.cover||PH.logo||PH.gallery.length)return true;
    return Object.keys(inputs).some(function(k){return inputs[k].value!==initial[k]});
  }
  function upd(){if(!send||isNew||textSent)return;send.disabled=!dirty();}
  grid.addEventListener("input",upd);grid.addEventListener("change",upd);
grid.addEventListener("change",function(e){if(e.target&&e.target.type=="hidden")err.style.display="none"});

  grid.appendChild(el("h3","ml-ed-sec","Photos"));
  var ph=el("div");scroll.appendChild(ph);
  var err=el("p","ml-ed-err");
  function thumb(src,cls,onRemove){
    var t=el("div","ml-th"+(cls?" "+cls:""));if(src)t.style.backgroundImage="url('"+src.replace(/'/g,"%27")+"')";
    if(onRemove){var b=el("button","ml-th-x","\u00d7");b.type="button";b.setAttribute("aria-label","Remove");b.onclick=onRemove;t.appendChild(b);}
    return t;
  }
  function addFiles(files,cb){
    err.style.display="none";
    Promise.all(files.map(function(f){return shrink(f).catch(function(){return null})})).then(function(rs){
      var bad=rs.filter(function(r){return !r}).length;
      if(bad){err.textContent=bad+(bad==1?" photo":" photos")+" couldn't be opened. iPhone photos in HEIC format need saving as JPG first. JPG and PNG both work.";err.style.display="block";}
      cb(rs.filter(Boolean));
    });
  }
  function single(key,label,current,help,isLogo){
    var blk=el("div","ml-ph-blk");blk.appendChild(el("span","ml-ed-lab",label));
    var tile=el("button","ml-cover"+(isLogo?" logo":""));tile.type="button";tile.setAttribute("aria-label",(current?"Replace ":"Add ")+label.toLowerCase());
    var row=el("div","ml-ph-row");
    var warn=el("p","ml-ed-warn");warn.style.display="none";
    var pk=picker(false,function(fs){addFiles(fs.slice(0,1),function(r){if(r[0]){PH[key]=r[0];draw()}})});
    tile.onclick=function(){pk.click()};
    function draw(){
      var src=PH[key]?PH[key].preview:current;
      tile.style.backgroundImage=src?"url('"+src.replace(/'/g,"%27")+"')":"";
      tile.textContent=src?"":"+ Add "+label.toLowerCase();
      tile.className="ml-cover"+(isLogo?" logo":"")+(src?" has":"")+(PH[key]&&PH[key].small?" small":"");
      row.innerHTML="";
      if(src){var b=el("button","ml-link","Replace photo");b.type="button";b.onclick=function(){pk.click()};row.appendChild(b);}
      if(PH[key]){var u=el("button","ml-link",current?"Keep current photo":"Remove");u.type="button";u.onclick=function(){PH[key]=null;draw()};row.appendChild(u);}
      warn.textContent="This photo is smaller than 1600 px wide and may look blurry on the site.";
      warn.style.display=PH[key]&&PH[key].small?"block":"none";
      upd();
    }
    blk.appendChild(tile);blk.appendChild(row);
    if(help)blk.appendChild(el("p","ml-ed-help",help));
    blk.appendChild(warn);ph.appendChild(blk);draw();
  }
  var modeReplace=null;
  if(kind=="p"){
    single("logo","Logo",it&&D(it.logo),"Shown on your profile and operator cards.",true);
    single("cover","Cover photo",it&&D(it.coverPhoto),"Shown at the top of your profile. Landscape photos work best.");
  }else{
    single("cover","Cover photo",it&&D(it.coverPhoto),"Shown on cards across the site. Landscape works best.");
    var cur=it?D(it.photos).split(" ").filter(Boolean):[];
    if(cur.length){
      var gb=el("div","ml-ph-blk");gb.appendChild(el("span","ml-ed-lab","Your gallery now \u00b7 "+cur.length+(cur.length==1?" photo":" photos")));
      var gr=el("div","ml-ph-row");cur.forEach(function(u){gr.appendChild(thumb(u))});gb.appendChild(gr);ph.appendChild(gb);
    }
    var nb=el("div","ml-ph-blk");var nl=el("span","ml-ed-lab");nb.appendChild(nl);
    var nr=el("div","ml-ph-row");nb.appendChild(nr);
    var nwarn=el("p","ml-ed-warn");nb.appendChild(nwarn);
    var gpk=picker(true,function(fs){addFiles(fs,function(r){PH.gallery=PH.gallery.concat(r);drawG()})});
    var rd=null;
    if(!isNew&&cur.length){
      rd=el("div");
      var r1=el("label","ml-radio"),i1=el("input");i1.type="radio";i1.name="ml-pm";i1.checked=true;r1.appendChild(i1);r1.appendChild(document.createTextNode("Add these to my gallery"));
      var r2=el("label","ml-radio"),i2=el("input");i2.type="radio";i2.name="ml-pm";r2.appendChild(i2);r2.appendChild(document.createTextNode("Replace my whole gallery with these"));
      rd.appendChild(r1);rd.appendChild(r2);nb.appendChild(rd);modeReplace=i2;
    }
    function drawG(){
      nl.textContent=cur.length?(PH.gallery.length?"New photos to send \u00b7 "+PH.gallery.length:"Add to your gallery"):"Gallery"+(PH.gallery.length?" \u00b7 "+PH.gallery.length:"");
      nr.innerHTML="";
      PH.gallery.forEach(function(p,i){nr.appendChild(thumb(p.preview,p.small?"small":"",function(){PH.gallery.splice(i,1);drawG()}))});
      var add=el("button","ml-th-add","+ Add photos");add.type="button";add.onclick=function(){gpk.click()};nr.appendChild(add);
      var s=PH.gallery.filter(function(p){return p.small}).length;
      nwarn.textContent=s?(s==1?"One photo is":s+" photos are")+" smaller than 1600 px wide and may look blurry on the site.":"";
      nwarn.style.display=s?"block":"none";
      if(rd)rd.style.display=PH.gallery.length?"":"none";
      upd();
    }
    ph.appendChild(nb);drawG();
  }

  var fw=el("div","ml-ed-footwrap");
  fw.appendChild(err);
  var prog=el("div","ml-prog");prog.style.display="none";
  var progT=el("div");progT.style.fontSize="14px";var bar=el("div","ml-prog-bar"),fill=el("div");bar.appendChild(fill);
  prog.appendChild(progT);prog.appendChild(bar);prog.appendChild(el("div","ml-ed-help","Keep this page open until it finishes."));
  fw.appendChild(prog);
  var foot=el("div","ml-ed-foot");
  var cancel=el("button","ml-btn ml-btn-ghost","Cancel");cancel.onclick=closeEditor;
  var SEND_LABEL=isNew?"Send for review":"Send changes for review";
  send=el("button","ml-btn ml-btn-primary",SEND_LABEL);
  foot.appendChild(cancel);foot.appendChild(send);fw.appendChild(foot);pan.appendChild(fw);
  upd();
  inputs.name.addEventListener("input",function(){err.style.display="none"});

  var target=null,rowId=null,queue=[];
  function runUploads(){
    var failed=[],n=queue.length,i=0;
    BUSY=true;foot.style.display="none";prog.style.display="block";err.style.display="none";
    function step(){
      if(i>=n){BUSY=false;
        if(!failed.length){closeEditor();done();return;}
        queue=failed;prog.style.display="none";foot.style.display="flex";
        err.textContent=failed.length+(failed.length==1?" photo":" photos")+" didn't upload ("+failed.map(function(q){return q.label}).join(", ")+"). Your other changes were sent. Press Try again to retry just those.";
        err.style.display="block";send.disabled=false;send.textContent="Try again";send.onclick=runUploads;return;}
      var q=queue[i];progT.textContent="Uploading photo "+(i+1)+" of "+n+"\u2026";fill.style.width=Math.round(i/n*100)+"%";
      sendForm({formType:"upload_photo",target:target,recordId:rowId,slot:q.slot,filename:q.name,file:q.p.b64})
        .catch(function(){failed.push(q)}).then(function(){i++;fill.style.width=Math.round(i/n*100)+"%";step()});
    }
    step();
  }
  function done(){
    showBanner(isNew?"Sent for review. It will show as Live here once it's on the site.":"Your changes were sent for review. They'll appear on the site once approved.");load();
  }
  send.onclick=function(){
    if(!inputs.name.value.trim()){err.textContent="Enter a name first.";err.style.display="block";inputs.name.focus();return;}
if(inputs.activityIds&&!inputs.activityIds.value){err.textContent="Choose at least one activity, so your trip shows on the right pages.";err.style.display="block";return;}
    var params={};Object.keys(inputs).forEach(function(k){params[k]=inputs[k].value.trim()});
    if(params.bookingPlatform!==undefined&&params.bookingPlatform!="Other")params.otherBookingPlatform="";
    if(kind=="o"&&!params.bookingPlatform)params.widgetCode="";
    if(!isNew&&kind!="p"&&PH.gallery.length)params.photosAction=modeReplace&&modeReplace.checked?"Replace all":"Add to existing";
    var type;
    if(kind=="o"){type=isNew?"create_offering":"offering_update";if(!isNew)params.offeringRecordId=it.id;}
    else if(kind=="b"){type=isNew?"create_boat":"boat_update";if(!isNew)params.boatRecordId=it.id;}
    else{type="operator_update";params.operatorRecordId=it.id;}
    params.formType=type;
    queue=[];
    if(PH.logo)queue.push({slot:"logo",name:"logo.jpg",p:PH.logo,label:"logo"});
    if(PH.cover)queue.push({slot:"cover",name:"cover.jpg",p:PH.cover,label:"cover photo"});
    PH.gallery.forEach(function(p,i){queue.push({slot:"gallery",name:"photo-"+(i+1)+".jpg",p:p,label:"photo "+(i+1)})});
    send.disabled=true;send.textContent="Sending\u2026";err.style.display="none";BUSY=true;
    sendForm(params).then(function(d){
      BUSY=false;textSent=true;rowId=d.id;target=isNew?kind:kind+"u";
      if(!queue.length||!rowId){closeEditor();done();return;}
      runUploads();
    }).catch(function(){BUSY=false;send.disabled=false;send.textContent=SEND_LABEL;
      err.textContent="That didn't go through. Try again, or message us on WhatsApp.";err.style.display="block";});
  };
  scrim.appendChild(pan);document.body.appendChild(scrim);ED=scrim;
  document.body.style.overflow="hidden";inputs.name.focus();
}

function render(){
  if(!DATA)return;
  summary();profile(DATA.operator);
  var og=$("ml-off-grid"),bg=$("ml-boat-grid");og.innerHTML="";bg.innerHTML="";
  DATA.offerings.forEach(function(o){og.appendChild(card(o,"o"))});
  DATA.boats.forEach(function(b){bg.appendChild(card(b,"b"))});
  $("ml-off-count").textContent=DATA.offerings.length;
  $("ml-boat-count").textContent=DATA.boats.length;
  $("ml-off-empty").style.display=DATA.offerings.length?"none":"block";
  $("ml-boat-empty").style.display=DATA.boats.length?"none":"block";
  var n=Object.keys(pending).length;
  $("ml-savebar").style.display=n?"flex":"none";
  $("ml-savemsg").textContent=n==1?"1 change not saved yet":n+" changes not saved yet";
  document.body.style.paddingBottom=n?"90px":"";
}

function loadAgreement(after){
  return fetch(AGHOOK+"?formType=agreement_status&k="+encodeURIComponent(K))
    .then(function(r){return r.json()})
    .then(function(d){if(d&&d.ok){AG=d;if((!D(d.accepted)||D(d.version)!==AGV)&&!after)openAgreementGate();}})
    .catch(function(){});
}

function load(){
  if(!K){bad();return}
  fetch(HOOK+"?formType=listings&k="+encodeURIComponent(K))
    .then(function(r){return r.json()})
    .then(function(d){if(!d||!d.ok){bad();return}
      DATA=d;$("ml-who").textContent=D(d.operator&&d.operator.name)||D(d.partnerName);render();})
    .catch(bad);
}

$("ml-save").onclick=save;
$("ml-discard").onclick=function(){pending={};render()};
$("ml-add-offering").onclick=function(e){e.preventDefault();openEditor("o",null)};
$("ml-add-boat").onclick=function(e){e.preventDefault();openEditor("b",null)};
window.addEventListener("beforeunload",function(e){if(Object.keys(pending).length||BUSY){e.preventDefault();e.returnValue=""}});
loadAgreement();load();
})();
