(function(){
// Vamos a La Paz partner portal — v3 (Oct 2026)
// Spanish-first interface with an English switch; bilingual listing text (ES/EN tabs,
// AI translation via the "Vamos Portal — translate" Make scenario); cancellation policy.
// Spanish + cancellation fields are read/saved through "Vamos Portal — bilingual fields".
var HOOK="https://hook.us2.make.com/esw01fv9bnkd8azj4squvtynr5s7t8xs";
var AGHOOK="https://hook.us2.make.com/q1khmq1vvcc3usokx3370l9xvhh14yeh";
var THOOK="https://hook.us2.make.com/y36pjclzg086op6y9vkg3dmwvvgjtnw3";
var XHOOK="https://hook.us2.make.com/juhnqhttwvi3gphci16587r1t736xbfq";
var AGV="draft-2026-09";
var K=new URLSearchParams(location.search).get("k")||"";
var $=function(i){return document.getElementById(i)};
var D=function(v){if(v==null||v==="")return "";try{return decodeURIComponent(String(v))}catch(e){return String(v)}};
var TPL=$("ml-card-tpl");
var pending={},DATA=null,AG=null,EXTRAS_OK=false;

// ---------- Language ----------
var LANG="es";
try{var sl=localStorage.getItem("vamos-portal-lang");if(sl=="en"||sl=="es")LANG=sl}catch(e){}
var S={
es:{
 live:"\u25CF Publicado",removal:"Eliminaci\u00f3n solicitada",review:"En revisi\u00f3n",hidden:"Oculto",hiddenProfile:"Oculto porque tu perfil est\u00e1 oculto",
 changesReview:"Cambios en revisi\u00f3n",willLive:"Se publicar\u00e1 al guardar",willHide:"Se ocultar\u00e1 al guardar",willShow:"Se mostrar\u00e1 al guardar",
 cancelRemoval:"Cancelar solicitud de eliminaci\u00f3n",hide:"Ocultar",show:"Mostrar",edit:"Editar",more:"M\u00e1s acciones",requestRemoval:"Solicitar eliminaci\u00f3n",
 upTo:function(n){return "Hasta "+n+" personas"},
 nOff:function(n){return n+(n==1?" experiencia":" experiencias")},nBoat:function(n){return n+(n==1?" barco":" barcos")},
 profLive:"Perfil publicado",profHidden:"Perfil oculto",nWaiting:function(n){return n+(n==1?" cambio en revisi\u00f3n":" cambios en revisi\u00f3n")},
 docs:"Documentos",editProfile:"Editar perfil",
 rmTitle:"\u00bfPedirnos que quitemos esta publicaci\u00f3n?",rmBody:function(n){return "<strong>"+n+"</strong> se quita del sitio de inmediato; esto no espera al bot\u00f3n Guardar. Despu\u00e9s la quitaremos de forma permanente. Puedes cancelar la solicitud desde esta p\u00e1gina mientras no la procesemos."},
 keep:"Conservarla",failTitle:"No se pudo completar",failBody:"Int\u00e9ntalo de nuevo o escr\u00edbenos por WhatsApp.",ok:"OK",
 visLive:"Tus cambios de visibilidad ya est\u00e1n en el sitio.",
 notChanged:function(n){return n==1?"1 cambio sin guardar":n+" cambios sin guardar"},
 // static page
 h1:"Tus publicaciones",notice:"Las publicaciones nuevas y los cambios se revisan antes de aparecer en el sitio. Ocultar y mostrar lo controlas t\u00fa en cualquier momento; tus publicaciones actuales siguen igual mientras revisamos un cambio.",
 hProfile:"Tu perfil",hOff:"Tus experiencias ",hBoats:"Tus barcos ",addOff:"Agregar una experiencia",addBoat:"Agregar un barco",
 offEmpty:"Todav\u00eda no tienes experiencias publicadas.",boatEmpty:"Todav\u00eda no tienes barcos publicados. Los barcos son las embarcaciones en las que operan tus viajes. Agrega uno y podr\u00e1s vincular tus experiencias a \u00e9l.",
 foot:"\u00bfNecesitas ayuda? Escr\u00edbele a Vamos a La Paz por WhatsApp y lo resolvemos.",save:"Guardar cambios",discard:"Descartar",
 badTitle:"Este enlace no funciona",badBody:"Puede que haya vencido o que se haya cortado al copiarlo. Escr\u00edbenos y te enviamos uno nuevo.",
 // agreement
 agNote:"Este es un borrador del acuerdo que a\u00fan no ha sido revisado legalmente. Es posible que te pidamos firmar una versi\u00f3n nueva cuando lo est\u00e9.",
 agEnNote:"Por ahora el texto del acuerdo est\u00e1 en ingl\u00e9s. Tendremos la versi\u00f3n en espa\u00f1ol cuando termine la revisi\u00f3n legal. Si tienes dudas sobre alg\u00fan punto, escr\u00edbenos por WhatsApp.",
 agIntro:"Entre Peter Jostrom (persona f\u00edsica), RFC JOPE801231DS8, La Paz, Baja California Sur, con el nombre comercial Vamos a La Paz, y t\u00fa.",
 before:"Antes de empezar",agUpdated:"Actualizamos el acuerdo de socios. Por favor l\u00e9elo y acepta la nueva versi\u00f3n.",agRead:"Por favor lee y acepta el acuerdo de socios. Toma un par de minutos.",
 agName:"Tu nombre completo y cargo",agNamePh:"Mar\u00eda Garc\u00eda, due\u00f1a",agC1:"Acepto este acuerdo en nombre de mi negocio.",
 agC2:"Confirmo que contamos con todas las licencias, permisos y seguros necesarios para lo que publicamos, y que est\u00e1n vigentes.",
 agGo:"Aceptar y continuar",saving:"Guardando\u2026",agSaved:"Gracias. Tu acuerdo qued\u00f3 guardado; puedes verlo cuando quieras en Documentos.",agFail:"No se guard\u00f3. Int\u00e9ntalo de nuevo o escr\u00edbenos por WhatsApp.",
 close:"Cerrar",partnerAg:"Acuerdo de socios",accepted:function(d,b,v){return "Aceptado "+d+" por "+b+" \u00b7 versi\u00f3n "+v},notAccepted:"A\u00fan no aceptado",
 readAg:"Leer el acuerdo",hideAg:"Ocultar el acuerdo",filesShared:"Archivos que compartimos contigo",linksExpire:"Los enlaces abren el archivo directamente y vencen despu\u00e9s de un par de horas; vuelve a abrir esta ventana para obtener uno nuevo.",
 // editor
 tAddO:"Agregar una experiencia",tEditO:"Editar experiencia",tAddB:"Agregar un barco",tEditB:"Editar barco",tEditP:"Editar tu perfil",
 introNew:"Las publicaciones nuevas se revisan antes de aparecer en el sitio.",introEdit:"Los cambios se revisan antes de aparecer en el sitio. Tu publicaci\u00f3n actual sigue visible mientras los revisamos.",
 howto:"Escribe en espa\u00f1ol o en ingl\u00e9s. Traducimos autom\u00e1ticamente al otro idioma y puedes ajustar la traducci\u00f3n si quieres.",
 noExtras:"No pudimos cargar las versiones en espa\u00f1ol de tus textos. Cierra esta ventana y recarga la p\u00e1gina antes de editar.",
 secBasics:"Datos b\u00e1sicos",secWhere:"D\u00f3nde aparece en el sitio",secPrice:"Precio y reservas en l\u00ednea",secDetails:"Detalles",secCancel:"Pol\u00edtica de cancelaci\u00f3n",
 secCap:"Capacidad y especificaciones",secLoc:"Ubicaci\u00f3n y descripci\u00f3n",secBiz:"Sobre tu negocio",secPhotos:"Fotos",
 f:{name:"Nombre",tourType:"Tipo de tour",duration:"Duraci\u00f3n",capacity:"M\u00e1ximo de personas",priceUnit:"Unidad de precio",boatId:"Barco",
  activityIds:"Qu\u00e9 hacen los visitantes",destinationIds:"A d\u00f3nde va",priceRange:"Rango de precio",bookingPlatform:"Reservas en l\u00ednea",
  otherBookingPlatform:"Nombre de tu plataforma de reservas",widgetCode:"C\u00f3digo del widget de reservas",description:"Descripci\u00f3n",whatsIncluded:"Qu\u00e9 incluye",
  cancellationPolicy:"Pol\u00edtica de cancelaci\u00f3n",cancellationNotes:"Notas de cancelaci\u00f3n",
  bname:"Nombre del barco",type:"Tipo",model:"Marca y modelo",length:"Eslora (pies)",sleepingCapacity:"Camas",cruisingSpeed:"Velocidad crucero (nudos)",
  departsFrom:"Sale de",amenities:"Comodidades",pname:"Nombre del negocio",trustNotes:"Notas de confianza y seguridad",website:"Sitio web"},
 hBoat:"El barco en el que opera este viaje. D\u00e9jalo sin elegir si es en tierra o si el barco var\u00eda.",
 hAct:"Elige al menos una. Esto decide en qu\u00e9 p\u00e1ginas de actividades aparece este viaje. Si tu actividad no est\u00e1 en la lista, av\u00edsanos y la agregamos.",
 hDest:"Opcional. D\u00e9jalo vac\u00edo si el viaje no est\u00e1 ligado a un solo lugar. Si tu destino no est\u00e1 en la lista, av\u00edsanos y lo agregamos.",
 hPrice:"Se muestra en las p\u00e1ginas de b\u00fasqueda; debe ser el precio final. Tu widget de reservas muestra el precio real al pagar.",
 hWidget:"Pega el c\u00f3digo del widget de tu plataforma de reservas. Lo revisamos antes de publicarlo.",
 hCancel:"Debe coincidir con la pol\u00edtica de tu sistema de reservas, si usas uno.",
 noBoat:"Sin un barco espec\u00edfico",curBoat:"Barco actual",choose:"Elige\u2026",noOnline:"Sin reservas en l\u00ednea",
 chooseAct:"Elige actividades",chooseDest:"Elige destinos",remove:"Quitar",
 shortDesc:"Descripci\u00f3n breve",shortHelp:"Tu widget de reservas muestra todos los detalles, as\u00ed que limita esto a 2 o 3 frases sobre lo que hace especial este viaje.",
 inclNote:"Qu\u00e9 incluye no se muestra en tu p\u00e1gina mientras tengas un widget de reservas; tu widget ya lo cubre.",
 addBoatFirst:"Agrega primero un barco y lo mostraremos aqu\u00ed cuando est\u00e9 aprobado.",
 own:"Escrito por ti",ai:"Traducci\u00f3n autom\u00e1tica \u00b7 puedes editarla",stale:"Puede estar desactualizada",pendingT:"Se traducir\u00e1 al enviar",
 now:"Traducir ahora",re:"Volver a traducir",translating:"Traduciendo\u2026",tFail:"No pudimos traducir ahora. Int\u00e9ntalo de nuevo en un momento, o escribe t\u00fa la traducci\u00f3n.",
 logo:"Logo",cover:"Foto de portada",logoHelp:"Se muestra en tu perfil y en las tarjetas de operador.",coverProfHelp:"Se muestra arriba en tu perfil. Las fotos horizontales funcionan mejor.",
 coverHelp:"Se muestra en las tarjetas de todo el sitio. Mejor en horizontal.",add:"+ Agregar ",replacePhoto:"Cambiar foto",keepPhoto:"Conservar la foto actual",
 small:"Esta foto mide menos de 1600 px de ancho y puede verse borrosa en el sitio.",
 smallN:function(n){return (n==1?"Una foto mide":n+" fotos miden")+" menos de 1600 px de ancho y pueden verse borrosas en el sitio."},
 heic:function(n){return n+(n==1?" foto no se pudo abrir":" fotos no se pudieron abrir")+". Las fotos de iPhone en formato HEIC hay que guardarlas como JPG primero. JPG y PNG funcionan."},
 galleryNow:function(n){return "Tu galer\u00eda actual \u00b7 "+n+(n==1?" foto":" fotos")},addGallery:"Agregar a tu galer\u00eda",newPhotos:function(n){return "Fotos nuevas por enviar \u00b7 "+n},gallery:"Galer\u00eda",
 addPhotos:"+ Agregar fotos",addToGallery:"Agregarlas a mi galer\u00eda",replaceGallery:"Reemplazar toda mi galer\u00eda con estas",
 uploading:function(i,n){return "Subiendo foto "+i+" de "+n+"\u2026"},keepOpen:"Mant\u00e9n esta p\u00e1gina abierta hasta que termine.",
 upFail:function(n,l){return (n==1?"1 foto no se subi\u00f3":n+" fotos no se subieron")+" ("+l+"). Tus dem\u00e1s cambios s\u00ed se enviaron. Presiona Intentar de nuevo para reintentar solo esas."},
 tryAgain:"Intentar de nuevo",photoLabel:function(i){return "foto "+i},coverLabel:"foto de portada",logoLabel:"logo",
 cancel:"Cancelar",sendNew:"Enviar a revisi\u00f3n",sendEdit:"Enviar cambios a revisi\u00f3n",sending:"Enviando\u2026",
 needName:"Escribe primero un nombre.",needAct:"Elige al menos una actividad para que tu viaje aparezca en las p\u00e1ginas correctas.",
 sendFail:"No se pudo enviar. Int\u00e9ntalo de nuevo o escr\u00edbenos por WhatsApp.",
 extrasFail:"Tus cambios se enviaron, pero las versiones en espa\u00f1ol/ingl\u00e9s y la pol\u00edtica de cancelaci\u00f3n no se guardaron. Escr\u00edbenos por WhatsApp y lo resolvemos.",
 doneNew:"Enviado a revisi\u00f3n. Aparecer\u00e1 como Publicado aqu\u00ed cuando est\u00e9 en el sitio.",doneEdit:"Tus cambios se enviaron a revisi\u00f3n. Aparecer\u00e1n en el sitio cuando se aprueben.",
 opt:{"Private Tour":"Tour privado","Shared Tour":"Tour compartido","per tour":"por tour","per person":"por persona","Other":"Otra",
  "Powerboat":"Lancha","Panga":"Panga","Sportfishing Boat":"Barco de pesca deportiva","Sailboat":"Velero","Sailing Catamaran":"Catamar\u00e1n de vela",
  "Power Catamaran":"Catamar\u00e1n de motor","Motor Yacht":"Yate de motor","Luxury Yacht":"Yate de lujo",
  "Free cancellation up to 24 hours before":"Cancelaci\u00f3n gratuita hasta 24 horas antes","Free cancellation up to 48 hours before":"Cancelaci\u00f3n gratuita hasta 48 horas antes",
  "Free cancellation up to 7 days before":"Cancelaci\u00f3n gratuita hasta 7 d\u00edas antes","Free cancellation up to 14 days before":"Cancelaci\u00f3n gratuita hasta 14 d\u00edas antes",
  "Non-refundable":"No reembolsable","Custom (see notes)":"Personalizada (ver notas)"}
},
en:{
 live:"\u25CF Live",removal:"Removal requested",review:"Pending review",hidden:"Hidden",hiddenProfile:"Hidden because your profile is hidden",
 changesReview:"Changes awaiting review",willLive:"Will go live when you save",willHide:"Will be hidden when you save",willShow:"Will show when you save",
 cancelRemoval:"Cancel removal request",hide:"Hide",show:"Show",edit:"Edit",more:"More actions",requestRemoval:"Request removal",
 upTo:function(n){return "Up to "+n+" guests"},
 nOff:function(n){return n+(n==1?" offering":" offerings")},nBoat:function(n){return n+(n==1?" boat":" boats")},
 profLive:"Profile live",profHidden:"Profile hidden",nWaiting:function(n){return n+(n==1?" change":" changes")+" awaiting review"},
 docs:"Documents",editProfile:"Edit profile",
 rmTitle:"Ask us to remove this listing?",rmBody:function(n){return "<strong>"+n+"</strong> comes off the site straight away \u2014 this one doesn't wait for the Save button. We'll then take it down permanently. You can cancel the request from this page any time before we get to it."},
 keep:"Keep it",failTitle:"That didn't go through",failBody:"Please try again, or message us on WhatsApp.",ok:"OK",
 visLive:"Your visibility changes are live on the site.",
 notChanged:function(n){return n==1?"1 change not saved yet":n+" changes not saved yet"},
 h1:"Your listings",notice:"New listings and edits are reviewed before they go live. Hiding and showing is yours to control at any time \u2014 existing listings stay up, unchanged, while an edit is reviewed.",
 hProfile:"Your profile",hOff:"Your offerings ",hBoats:"Your boats ",addOff:"Add an offering",addBoat:"Add a boat",
 offEmpty:"You don't have any offerings listed yet.",boatEmpty:"You don't have any boats listed yet. Boats are the vessels your trips run on. Add one and you'll be able to attach your offerings to it.",
 foot:"Need help? Message Vamos a La Paz on WhatsApp and we'll sort it out.",save:"Save changes",discard:"Discard",
 badTitle:"This link isn't working",badBody:"It may have expired, or part of it may have been cut off when it was copied. Send us a message and we'll issue you a fresh one.",
 agNote:"This is a draft agreement that has not been legally reviewed. We may ask you to sign a new version once it has been.",
 agEnNote:"",
 agIntro:"Between Peter Jostrom (persona f\u00edsica), RFC JOPE801231DS8, La Paz, Baja California Sur, trading as Vamos a La Paz, and you.",
 before:"Before you start",agUpdated:"We've updated the partner agreement. Please read and accept the new version.",agRead:"Please read and accept the partner agreement. It takes a couple of minutes.",
 agName:"Your full name and role",agNamePh:"Maria Garcia, owner",agC1:"I accept this agreement on behalf of my business.",
 agC2:"I confirm we hold every licence, permit and insurance required for what we list, and that they are current.",
 agGo:"Accept and continue",saving:"Saving\u2026",agSaved:"Thank you. Your agreement is saved \u2014 you can see it any time under Documents.",agFail:"That didn't save. Try again, or message us on WhatsApp.",
 close:"Close",partnerAg:"Partner agreement",accepted:function(d,b,v){return "Accepted "+d+" by "+b+" \u00b7 version "+v},notAccepted:"Not yet accepted",
 readAg:"Read the agreement",hideAg:"Hide the agreement",filesShared:"Files we've shared with you",linksExpire:"Links open the file directly and expire after a couple of hours \u2014 reopen this page for a fresh one.",
 tAddO:"Add an offering",tEditO:"Edit offering",tAddB:"Add a boat",tEditB:"Edit boat",tEditP:"Edit your profile",
 introNew:"New listings are reviewed before they appear on the site.",introEdit:"Changes are reviewed before they appear on the site. Your current listing stays live while we review them.",
 howto:"Write in Spanish or English. We translate it into the other language automatically, and you can adjust the translation if you like.",
 noExtras:"We couldn't load the Spanish versions of your text. Close this panel and reload the page before editing.",
 secBasics:"Basics",secWhere:"Where it shows on the site",secPrice:"Price and online booking",secDetails:"Details",secCancel:"Cancellation policy",
 secCap:"Capacity and specifications",secLoc:"Location and description",secBiz:"About your business",secPhotos:"Photos",
 f:{name:"Name",tourType:"Tour type",duration:"Duration",capacity:"Max guests",priceUnit:"Price unit",boatId:"Boat",
  activityIds:"What guests do",destinationIds:"Where it goes",priceRange:"Price range",bookingPlatform:"Online booking",
  otherBookingPlatform:"Name of your booking platform",widgetCode:"Booking widget code",description:"Description",whatsIncluded:"What's included",
  cancellationPolicy:"Cancellation policy",cancellationNotes:"Cancellation notes",
  bname:"Boat name",type:"Type",model:"Make and model",length:"Length (ft)",sleepingCapacity:"Sleeps",cruisingSpeed:"Cruising speed (knots)",
  departsFrom:"Departs from",amenities:"Amenities",pname:"Business name",trustNotes:"Trust and safety notes",website:"Website"},
 hBoat:"The boat this trip runs on. Leave it unset for a land-based trip, or if the boat varies.",
 hAct:"Pick at least one. This decides which activity pages list this trip. If your activity isn't listed here, please let us know and we'll add it.",
 hDest:"Optional. Leave it empty if the trip isn't tied to one place. If your destination isn't listed here, please let us know and we'll add it.",
 hPrice:"Shown on browse pages; it must be the final price. Your booking widget shows the real price at checkout.",
 hWidget:"Paste the widget code from your booking platform. We check it before it goes live.",
 hCancel:"Should match the policy in your booking system, if you use one.",
 noBoat:"Not tied to a specific boat",curBoat:"Current boat",choose:"Choose\u2026",noOnline:"No online booking",
 chooseAct:"Choose activities",chooseDest:"Choose destinations",remove:"Remove",
 shortDesc:"Short description",shortHelp:"Your booking widget shows the full details, so keep this to 2\u20133 sentences about what makes this trip special.",
 inclNote:"What's included isn't shown on your page while you have a booking widget. Your widget covers it.",
 addBoatFirst:"Add a boat first and we'll list it here once it's approved.",
 own:"Written by you",ai:"AI translation \u00b7 you can edit it",stale:"May be out of date",pendingT:"Will be translated when you send",
 now:"Translate now",re:"Re-translate",translating:"Translating\u2026",tFail:"We couldn't translate right now. Try again in a moment, or type the translation yourself.",
 logo:"Logo",cover:"Cover photo",logoHelp:"Shown on your profile and operator cards.",coverProfHelp:"Shown at the top of your profile. Landscape photos work best.",
 coverHelp:"Shown on cards across the site. Landscape works best.",add:"+ Add ",replacePhoto:"Replace photo",keepPhoto:"Keep current photo",
 small:"This photo is smaller than 1600 px wide and may look blurry on the site.",
 smallN:function(n){return (n==1?"One photo is":n+" photos are")+" smaller than 1600 px wide and may look blurry on the site."},
 heic:function(n){return n+(n==1?" photo":" photos")+" couldn't be opened. iPhone photos in HEIC format need saving as JPG first. JPG and PNG both work."},
 galleryNow:function(n){return "Your gallery now \u00b7 "+n+(n==1?" photo":" photos")},addGallery:"Add to your gallery",newPhotos:function(n){return "New photos to send \u00b7 "+n},gallery:"Gallery",
 addPhotos:"+ Add photos",addToGallery:"Add these to my gallery",replaceGallery:"Replace my whole gallery with these",
 uploading:function(i,n){return "Uploading photo "+i+" of "+n+"\u2026"},keepOpen:"Keep this page open until it finishes.",
 upFail:function(n,l){return n+(n==1?" photo":" photos")+" didn't upload ("+l+"). Your other changes were sent. Press Try again to retry just those."},
 tryAgain:"Try again",photoLabel:function(i){return "photo "+i},coverLabel:"cover photo",logoLabel:"logo",
 cancel:"Cancel",sendNew:"Send for review",sendEdit:"Send changes for review",sending:"Sending\u2026",
 needName:"Enter a name first.",needAct:"Choose at least one activity, so your trip shows on the right pages.",
 sendFail:"That didn't go through. Try again, or message us on WhatsApp.",
 extrasFail:"Your changes were sent, but the Spanish/English versions and cancellation policy didn't save. Message us on WhatsApp and we'll sort it out.",
 doneNew:"Sent for review. It will show as Live here once it's on the site.",doneEdit:"Your changes were sent for review. They'll appear on the site once approved.",
 opt:{}
}};
function t(k){return S[LANG][k]}
function f(k){return S[LANG].f[k]||k}
function optLabel(v){return (S[LANG].opt&&S[LANG].opt[v])||v}

function bad(){$("ml-root").style.display="none";$("ml-badlink").style.display="block";}
function setPill(p,tx,bg,fg){p.textContent=tx;p.style.backgroundColor=bg;p.style.color=fg;}
function pv(id){return pending[id]!==undefined?pending[id].v:undefined}
function editPending(x){return D(x&&x.editStatuses).indexOf("Pending Review")>-1}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function closeMenus(){var m=document.querySelectorAll(".ml-menu");for(var i=0;i<m.length;i++)m[i].style.display="none";}
document.addEventListener("click",function(e){if(!e.target.closest||!e.target.closest(".ml-more"))closeMenus()});

// ---------- Static page text + language switch ----------
function setLead(node,txt){if(!node)return;for(var i=0;i<node.childNodes.length;i++){if(node.childNodes[i].nodeType==3){node.childNodes[i].nodeValue=txt;return}}node.insertBefore(document.createTextNode(txt),node.firstChild)}
function applyStatic(){
 document.documentElement.lang=LANG;
 var h1=document.querySelector(".ml-h1");if(h1)h1.textContent=t("h1");
 var n=document.querySelector(".ml-notice");if(n)n.textContent=t("notice");
 var h2s=document.querySelectorAll("#ml-root .ml-h2");
 for(var i=0;i<h2s.length;i++){
  if(h2s[i].querySelector("#ml-off-count"))setLead(h2s[i],t("hOff"));
  else if(h2s[i].querySelector("#ml-boat-count"))setLead(h2s[i],t("hBoats"));
  else if(/profile|perfil/i.test(h2s[i].textContent))h2s[i].textContent=t("hProfile");
 }
 if($("ml-add-offering"))$("ml-add-offering").textContent=t("addOff");
 if($("ml-add-boat"))$("ml-add-boat").textContent=t("addBoat");
 if($("ml-off-empty"))$("ml-off-empty").textContent=t("offEmpty");
 if($("ml-boat-empty"))$("ml-boat-empty").textContent=t("boatEmpty");
 var ft=document.querySelector(".ml-foot");if(ft)ft.textContent=t("foot");
 if($("ml-save"))$("ml-save").textContent=t("save");
 if($("ml-discard"))$("ml-discard").textContent=t("discard");
 var bl=$("ml-badlink");if(bl){var bh=bl.querySelector(".ml-h2");if(bh)bh.textContent=t("badTitle");var bb=bl.querySelector(".ml-modal-body");if(bb)bb.textContent=t("badBody");}
 var sw=document.querySelectorAll(".ml-lang button");for(var j=0;j<sw.length;j++)sw[j].setAttribute("aria-pressed",sw[j].getAttribute("data-l")==LANG?"true":"false");
}
function langSwitch(onChange){
 var w=el("div","ml-lang");w.setAttribute("role","group");w.setAttribute("aria-label","Idioma / Language");
 [["es","Espa\u00f1ol"],["en","English"]].forEach(function(p){
  var b=el("button",null,p[1]);b.type="button";b.setAttribute("data-l",p[0]);b.setAttribute("aria-pressed",LANG==p[0]?"true":"false");
  b.onclick=function(){if(LANG==p[0])return;LANG=p[0];try{localStorage.setItem("vamos-portal-lang",LANG)}catch(e){}applyStatic();render();if(onChange)onChange();};
  w.appendChild(b)});
 return w;
}
(function(){var h1=document.querySelector(".ml-h1");if(h1&&h1.parentNode){var w=langSwitch();w.style.margin="0 0 12px";h1.parentNode.insertBefore(w,h1.nextSibling)}})();

var LIVE=function(){return t("live")};
function pillFor(it){
 if(D(it.status)=="Removal requested")return[t("removal"),"#FBE9E9","#98302F"];
 if(D(it.status)=="Submitted for review")return[t("review"),"#FDF1DC","#8A5A12"];
 if(it.visible!="true")return[t("hidden"),"#EEF1F3","#5A6670"];
 if(it.effectiveVisible!="1")return[t("hiddenProfile"),"#EEF1F3","#5A6670"];
 return[LIVE(),"#E6F4EC","#1B6B43"];
}
function addEditPill(after,it){
 if(!editPending(it)||D(it.status)=="Submitted for review")return;
 var e=after.cloneNode(false);setPill(e,t("changesReview"),"#FDF1DC","#8A5A12");
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
 var btn=el("button","ml-btn ml-btn-quiet","\u2022\u2022\u2022");btn.setAttribute("aria-label",t("more"));
 var menu=el("div","ml-menu");
 items.forEach(function(it){
  var b=el("button","ml-menu-item",it.label);
  b.onclick=function(ev){ev.stopPropagation();closeMenus();it.go()};menu.appendChild(b);
 });
 btn.onclick=function(ev){ev.stopPropagation();
  var open=menu.style.display=="block";closeMenus();menu.style.display=open?"none":"block";};
 wrap.appendChild(btn);wrap.appendChild(menu);return wrap;
}
function dispName(it,kind){return kind=="o"&&LANG=="es"&&D(it.nameEs)?D(it.nameEs):D(it.name)}
function card(it,kind){
 var n=TPL.firstElementChild.cloneNode(true);
 var img=n.querySelector(".boat-card-img");
 if(D(it.coverPhoto))img.src=D(it.coverPhoto);else img.style.display="none";
 n.querySelector(".boat-card-name").textContent=dispName(it,kind);
 var dur=LANG=="es"&&D(it.durationEs)?D(it.durationEs):D(it.duration);
 n.querySelector(".boat-card-type").textContent=kind=="b"?D(it.model):[optLabel(D(it.tourType)),dur].filter(Boolean).join(" \u00b7 ");
 n.querySelector(".boat-card-capacity").textContent=kind=="b"?(it.capacity?t("upTo")(it.capacity):""):[D(it.priceRange),optLabel(D(it.priceUnit))].filter(Boolean).join(" ");
 var p=n.querySelector(".ml-pill"),pl=pillFor(it);setPill(p,pl[0],pl[1],pl[2]);
 var acts=n.querySelector(".ml-actions");
 if(D(it.status)=="Removal requested"){
  acts.innerHTML="";
  var c=el("button","ml-btn ml-btn-ghost",t("cancelRemoval"));c.style.flex="1";
  c.onclick=function(){post(kind=="b"?"cancel_remove_boat":"cancel_remove_offering",{recordId:it.id},sync)};
  acts.appendChild(c);return n;
 }
 var btns=acts.querySelectorAll("a, button");
 var live=it.visible=="true";
 btns[0].href="#";btns[0].textContent=t("edit");btns[0].onclick=function(e){e.preventDefault();openEditor(kind,it)};
 btns[1].textContent=(pv(it.id)!==undefined?pv(it.id):live)?t("hide"):t("show");
 btns[1].onclick=function(){toggle(it.id,live,kind)};
 btns[2].parentNode.removeChild(btns[2]);
 acts.appendChild(moreMenu([{label:t("requestRemoval"),go:function(){confirmRemove(it,kind)}}]));
 n.style.cursor="pointer";
 n.setAttribute("role","button");n.setAttribute("tabindex","0");
 n.setAttribute("aria-label",t("edit")+" "+dispName(it,kind));
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
  setPill(p,pv(it.id)?t("willLive"):t("willHide"),"#E8EEFB","#2B4A8B");
 }
 addEditPill(p,it);
 return n;
}
function summary(){
 var host=document.querySelector(".ml-who");if(!host||!DATA)return;
 var old=document.querySelector(".ml-summary");if(old)old.parentNode.removeChild(old);
 var s=el("div","ml-summary");
 function chip(x){s.appendChild(el("span","ml-chip",x))}
 chip(t("nOff")(DATA.offerings.length));
 chip(t("nBoat")(DATA.boats.length));
 chip(DATA.operator&&DATA.operator.visible=="true"?t("profLive"):t("profHidden"));
 var all=DATA.offerings.concat(DATA.boats);
 var waiting=all.filter(function(x){
  var st=D(x.status);return st=="Submitted for review"||st=="Removal requested"||editPending(x)}).length+(editPending(DATA.operator)?1:0);
 if(waiting)chip(t("nWaiting")(waiting));
 var d=el("button","ml-chip",t("docs"));
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
 var src=LANG=="es"&&D(op.descriptionEs)?D(op.descriptionEs):D(op.description);
 var txt=src.replace(/<[^>]*>/g,"").trim();
 ds.textContent=txt.length>260?txt.slice(0,260)+"\u2026":txt;
 var pl=el("div","ml-pill");
 var live=op.visible=="true";
 if(live)setPill(pl,LIVE(),"#E6F4EC","#1B6B43");else setPill(pl,t("hidden"),"#EEF1F3","#5A6670");
 var pills=el("div");pills.style.cssText="display:flex;flex-wrap:wrap;gap:6px";pills.appendChild(pl);
 body.appendChild(nm);body.appendChild(ds);body.appendChild(pills);
 var acts=el("div");acts.style.cssText="flex:0 0 auto;display:flex;gap:8px;align-items:center";
 var ed=el("a","ml-btn ml-btn-ghost",t("editProfile"));ed.href="#";
 ed.onclick=function(e){e.preventDefault();openEditor("p",op)};
 var hd=el("button","ml-btn ml-btn-ghost",(pv(op.id)!==undefined?pv(op.id):live)?t("hide"):t("show"));
 hd.onclick=function(){toggle(op.id,live,"p")};
 acts.appendChild(ed);acts.appendChild(hd);
 if(pv(op.id)!==undefined){
  box.style.boxShadow="0 0 0 3px rgba(43,74,139,.12)";
  setPill(pl,pv(op.id)?t("willShow"):t("willHide"),"#E8EEFB","#2B4A8B");
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
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]})}
function confirmRemove(it,kind){
 modal(t("rmTitle"),t("rmBody")(esc(dispName(it,kind))),
  [{label:t("keep")},{label:t("requestRemoval"),cls:"ml-btn-quiet",go:function(){post(kind=="b"?"remove_boat":"remove_offering",{recordId:it.id},sync)}}]);
}
function post(type,params,done){
 var q=new URLSearchParams(Object.assign({formType:type,k:K},params));
 fetch(HOOK+"?"+q.toString()).then(function(){done&&done()}).catch(function(){
  modal(t("failTitle"),t("failBody"),[{label:t("ok")}])});
}
function sync(){post("set_visibility",{changes:""},load)}
function save(){
 var ids=Object.keys(pending);if(!ids.length)return;
 var changes=ids.map(function(i){return i+":"+pending[i].kind+":"+(pending[i].v?1:0)}).join(",");
 post("set_visibility",{changes:changes},function(){
  pending={};showBanner(t("visLive"));load();});
}
function showBanner(x){$("ml-banner").textContent=x;$("ml-banner").style.display="block";window.scrollTo({top:0});}
function sendForm(params,url){
 return fetch(url||HOOK,{method:"POST",body:new URLSearchParams(Object.assign({k:K},params))})
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

// ---------- Translation ----------
function translate(fieldsObj){
 return fetch(THOOK,{method:"POST",body:new URLSearchParams({k:K,fields:JSON.stringify(fieldsObj)})})
 .then(function(r){return r.text()}).then(function(tx){
  tx=String(tx).replace(/```json/g,"").replace(/```/g,"").trim();
  var d=JSON.parse(tx);if(!d||typeof d!="object")throw 0;return d;
 });
}

// ---------- Agreement text (English; legal draft) ----------
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
  var x=D(AG&&AG.customTerms);
  out.push(["Your arrangement",x?x.split("\n").filter(Boolean):["Your commercial terms are agreed with us separately and will be confirmed in writing before anything goes live."]]);
 }
 if(a.indexOf("Referral")>-1&&a.indexOf("Reseller")>-1)
  out.push(["Which applies",["Where both apply, the first covers the experiences that are bookable online through your own booking platform, and the second covers the rest."]]);
 out.push(AG_PRICE);
 return out;
}
function agreementBody(){
 var wrap=el("div");
 var note=el("p","ml-ed-note",t("agNote"));note.style.margin="0 0 12px";wrap.appendChild(note);
 if(t("agEnNote")){var en=el("p","ml-ed-note",t("agEnNote"));en.style.margin="0 0 16px";wrap.appendChild(en);}
 var intro=el("p","ml-ed-help",t("agIntro"));intro.style.margin="0 0 18px";wrap.appendChild(intro);
 var body=el("div");body.lang="en";
 AG_CORE.concat(schedules()).forEach(function(sec){
  body.appendChild(el("h3","ml-ed-sec",sec[0]));
  sec[1].forEach(function(p){
   var e=el("p",null,p);
   e.style.cssText="font-size:14px;line-height:1.55;color:#46525C;margin:0 0 10px";
   body.appendChild(e);
  });
 });
 wrap.appendChild(body);
 return wrap;
}
function openAgreementGate(){
 var scrim=el("div","ml-ed-scrim");scrim.style.justifyContent="center";
 var pan=el("div","ml-ed");pan.style.maxWidth="620px";pan.setAttribute("role","dialog");
 var head=el("div","ml-ed-head");
 head.appendChild(el("h2","ml-ed-title",t("before")));
 pan.appendChild(head);
 var scroll=el("div","ml-ed-body");pan.appendChild(scroll);
 scroll.appendChild(el("p","ml-ed-intro",(D(AG&&AG.accepted)?t("agUpdated"):t("agRead"))));
 scroll.appendChild(agreementBody());
 var fw=el("div","ml-ed-footwrap");
 var err=el("p","ml-ed-err");fw.appendChild(err);
 var f1=el("div","ml-ed-f");
 var l1=el("label",null,t("agName"));f1.appendChild(l1);
 var nm=el("input");nm.type="text";nm.placeholder=t("agNamePh");f1.appendChild(nm);
 fw.appendChild(f1);
 function chk(text){
  var w=el("label","ml-radio");var i=el("input");i.type="checkbox";
  w.appendChild(i);w.appendChild(document.createTextNode(text));
  w.style.alignItems="flex-start";w.style.marginBottom="6px";fw.appendChild(w);return i;
 }
 var c1=chk(t("agC1"));
 var c2=chk(t("agC2"));
 var foot=el("div","ml-ed-foot");foot.style.marginTop="12px";
 var go=el("button","ml-btn ml-btn-primary",t("agGo"));go.disabled=true;
 foot.appendChild(go);fw.appendChild(foot);pan.appendChild(fw);
 function upd(){go.disabled=!(nm.value.trim()&&c1.checked&&c2.checked)}
 nm.addEventListener("input",upd);c1.addEventListener("change",upd);c2.addEventListener("change",upd);
 go.onclick=function(){
  go.disabled=true;go.textContent=t("saving");err.style.display="none";
  fetch(AGHOOK,{method:"POST",body:new URLSearchParams({formType:"accept_agreement",k:K,signedBy:nm.value.trim(),version:AGV})})
  .then(function(r){return r.json()}).then(function(d){if(!d||!d.ok)throw 0;
   scrim.parentNode.removeChild(scrim);document.body.style.overflow="";
   showBanner(t("agSaved"));
   loadAgreement(true);})
  .catch(function(){go.disabled=false;go.textContent=t("agGo");
   err.textContent=t("agFail");err.style.display="block";});
 };
 scrim.appendChild(pan);document.body.appendChild(scrim);
 document.body.style.overflow="hidden";nm.focus();
}
function openDocs(){
 var scrim=el("div","ml-ed-scrim");
 scrim.onclick=function(e){if(e.target===scrim){scrim.parentNode.removeChild(scrim);document.body.style.overflow=""}};
 var pan=el("div","ml-ed");
 var head=el("div","ml-ed-head");
 head.appendChild(el("h2","ml-ed-title",t("docs")));
 var x=el("button","ml-ed-x","\u00d7");x.setAttribute("aria-label",t("close"));
 x.onclick=function(){scrim.parentNode.removeChild(scrim);document.body.style.overflow=""};
 head.appendChild(x);pan.appendChild(head);
 var scroll=el("div","ml-ed-body");pan.appendChild(scroll);
 var acc=D(AG&&AG.accepted);
 var row=el("div");row.style.cssText="border:1px solid #E5DFD1;border-radius:6px;padding:14px;margin-bottom:12px";
 row.appendChild(el("div","boat-card-name",t("partnerAg")));
 var meta=el("p","ml-ed-help");
 meta.textContent=acc?t("accepted")(acc.slice(0,10),D(AG.signedBy),D(AG.version)):t("notAccepted");
 row.appendChild(meta);
 var view=el("button","ml-link",t("readAg"));view.type="button";
 view.style.marginTop="8px";
 var holder=el("div");holder.style.display="none";
 view.onclick=function(){
  if(!holder.firstChild)holder.appendChild(agreementBody());
  var open=holder.style.display=="block";
  holder.style.display=open?"none":"block";
  view.textContent=open?t("readAg"):t("hideAg");
 };
 row.appendChild(view);row.appendChild(holder);scroll.appendChild(row);
 var names=D(AG&&AG.docNames).split("|").filter(Boolean);
 var urls=D(AG&&AG.docUrls).split(" ").filter(Boolean);
 if(names.length){
  scroll.appendChild(el("h3","ml-ed-sec",t("filesShared")));
  names.forEach(function(n,i){
   var a=el("a",null,n);a.href=urls[i]||"#";a.target="_blank";a.rel="noopener";
   a.style.cssText="display:block;padding:10px 0;border-bottom:1px solid #EFEAE0;color:#2B4A8B;font-size:15px";
   scroll.appendChild(a);
  });
  scroll.appendChild(el("p","ml-ed-help",t("linksExpire")));
 }
 scrim.appendChild(pan);document.body.appendChild(scrim);document.body.style.overflow="hidden";
}

// ---------- Edit and add panel ----------
var TOUR=["Private Tour","Shared Tour"],UNIT=["per tour","per person"],PLAT=["","Bokun","FareHarbor","Other"];
var BTYPE=["","Powerboat","Panga","Sportfishing Boat","Sailboat","Sailing Catamaran","Power Catamaran","Motor Yacht","Luxury Yacht"];
var MARINA=["","Marina de La Paz","La Marina del Palmar","Marina Palmira","Muelle Fiscal"];
var CP=["","Free cancellation up to 24 hours before","Free cancellation up to 48 hours before","Free cancellation up to 7 days before","Free cancellation up to 14 days before","Non-refundable","Custom (see notes)"];
// [key, labelKey, type, half, options, helpKey, bilingual]
var FIELDS={
 o:[["#","secBasics"],["name","name","text",0,null,null,1],["tourType","tourType","select",1,TOUR],["duration","duration","text",1,null,null,1],
  ["capacity","capacity","number",1],["priceUnit","priceUnit","select",1,UNIT],
  ["boatId","boatId","select",0,null,"hBoat"],
  ["#","secWhere"],
  ["activityIds","activityIds","multi",0,"Activity","hAct"],
  ["destinationIds","destinationIds","multi",0,"Destination","hDest"],
  ["#","secPrice"],
  ["priceRange","priceRange","text",0,null,"hPrice"],
  ["bookingPlatform","bookingPlatform","select",0,PLAT],["otherBookingPlatform","otherBookingPlatform","text",0],
  ["widgetCode","widgetCode","textarea",0,null,"hWidget"],
  ["#","secDetails"],["description","description","textarea",0,null,null,1],["whatsIncluded","whatsIncluded","textarea",0,null,null,1],
  ["#","secCancel"],["cancellationPolicy","cancellationPolicy","select",0,CP,"hCancel"],["cancellationNotes","cancellationNotes","textarea",0,null,null,1]],
 b:[["#","secBasics"],["name","bname","text",0],["type","type","select",1,BTYPE],["model","model","text",1],
  ["#","secCap"],["length","length","number",1],["capacity","capacity","number",1],
  ["sleepingCapacity","sleepingCapacity","number",1],["cruisingSpeed","cruisingSpeed","number",1],
  ["#","secLoc"],["departsFrom","departsFrom","select",0,MARINA],["description","description","textarea",0,null,null,1],["amenities","amenities","textarea",0,null,null,1]],
 p:[["#","secBiz"],["name","pname","text",0],["description","description","textarea",0,null,null,1],
  ["trustNotes","trustNotes","textarea",0,null,null,1],["website","website","text",0]]
};
// Airtable "AI translated" tag names per field
var AIL={o:{name:"Name",duration:"Duration",description:"Description",whatsIncluded:"What's included",cancellationNotes:"Cancellation notes"},
 b:{description:"Description",amenities:"Amenities"},p:{description:"Description",trustNotes:"Trust and safety notes"}};

(function(){var s=document.createElement("style");s.textContent=
".ml-lang{display:inline-flex;gap:4px;font-size:12.5px}"+
".ml-lang button{font:inherit;font-size:12.5px;border:1px solid #D9D2C3;background:#fff;border-radius:999px;padding:3px 10px;cursor:pointer;color:#46525C}"+
".ml-lang button[aria-pressed=\"true\"]{background:#2B4A8B;border-color:#2B4A8B;color:#fff}"+
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
".ml-bi-top{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-bottom:6px}"+
".ml-bi-top label{margin:0}"+
".ml-tabs{display:inline-flex;border:1px solid #D9D2C3;border-radius:6px;overflow:hidden;flex:0 0 auto}"+
".ml-tabs button{font:inherit;font-size:12.5px;border:0;background:#fff;color:#46525C;padding:4px 10px;cursor:pointer;display:flex;align-items:center;gap:5px}"+
".ml-tabs button+button{border-left:1px solid #D9D2C3}"+
".ml-tabs button[aria-selected=\"true\"]{background:#E8EEFB;color:#2B4A8B;font-weight:600}"+
".ml-dot{width:7px;height:7px;border-radius:50%;background:#C9C0AE;flex:0 0 auto}"+
".ml-dot.own{background:#1B6B43}.ml-dot.ai{background:#8A5A12}.ml-dot.stale{background:#C2410C}"+
".ml-bi-badge{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:12px;line-height:1.4}"+
".ml-bp{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11.5px;font-weight:600}"+
".ml-bp.own{background:#E6F4EC;color:#1B6B43}.ml-bp.ai{background:#FDF1DC;color:#8A5A12}.ml-bp.stale{background:#FCE8DD;color:#9A3412}.ml-bp.pend{background:#EEF1F3;color:#5A6670}"+
".ml-ed-f .ml-ai-in{background:#FFFBF3}"+
".ml-ph-blk{margin-bottom:18px}"+
".ml-ph-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}"+
".ml-cover{display:flex;align-items:center;justify-content:center;width:100%;max-width:360px;aspect-ratio:3/2;border:1px dashed #C9C0AE;border-radius:8px;background:#F6F2EA center/cover no-repeat;cursor:pointer;font:inherit;font-size:14px;color:#46525C;margin:0 0 8px;padding:0}"+
".ml-cover.has{border:1px solid #E5DFD1}.ml-cover.small{border-color:#E0B25C}"+
".ml-cover.logo{max-width:200px;background-size:contain;background-color:#fff}"+
".ml-link{background:none;border:0;padding:0;color:#2B4A8B;font:inherit;font-size:14px;cursor:pointer;text-decoration:underline}"+
".ml-bi-badge .ml-link{font-size:12.5px}"+
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
  shown.forEach(function(o){var c=el("span","ml-ms-chip",o.label);var x=el("button","ml-ms-x","\u00d7");x.type="button";x.setAttribute("aria-label",t("remove")+" "+o.label);
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

// Bilingual field state.
// st = {key, en, es, ai:{en,es}, pend:{en,es}, stale:{en,es}, tab}
function biInit(kind,key,it){
 var tags=D(it&&it.aiTranslated).split(",").map(function(x){return x.trim()}).filter(Boolean);
 var lab=AIL[kind][key];
 var en=it?D(it[key]):"",es=it?D(it[key+"Es"]):"";
 var st={key:key,en:en,es:es,ai:{en:tags.indexOf(lab+" EN")>-1,es:tags.indexOf(lab+" ES")>-1},pend:{en:false,es:false},stale:{en:false,es:false}};
 if(st.en.trim()&&!st.es.trim())st.pend.es=true;
 if(st.es.trim()&&!st.en.trim())st.pend.en=true;
 st.tab=LANG;
 return st;
}
function biEdit(st,L,val){
 var O=L=="es"?"en":"es";
 if(!st.tuned)st.tuned={en:false,es:false};
 if(st.ai[L])st.tuned[L]=true; // fine-tuning a translation: leave the original alone
 st[L]=val;st.ai[L]=false;st.pend[L]=false;st.stale[L]=false;
 if(!val.trim()||st.tuned[L])return;
 if(st.ai[O]||!st[O].trim()||st.pend[O]){st.pend[O]=true;st.stale[O]=false;}
 else st.stale[O]=true;
}
function biApply(st,res){
 if(!res||(!res.es&&!res.en))return false;
 var src=res.source=="en"?"en":"es",O=src=="es"?"en":"es";
 st.es=res.es||"";st.en=res.en||"";
 st.ai[src]=false;st.ai[O]=true;st.pend.en=st.pend.es=false;st.stale.en=st.stale.es=false;st.tuned={en:false,es:false};
 return true;
}
function biSource(st){
 // which language to translate FROM when the other side needs filling
 if(st.pend.en&&!st.pend.es)return "es";
 if(st.pend.es&&!st.pend.en)return "en";
 if(st.stale.en)return "es";
 if(st.stale.es)return "en";
 return st.es.trim()?"es":"en";
}

function openEditor(kind,it,restore){
 closeEditor();
 var isNew=!it,send=null,textSent=false;
 var titles={o:isNew?t("tAddO"):t("tEditO"),b:isNew?t("tAddB"):t("tEditB"),p:t("tEditP")};
 var scrim=el("div","ml-ed-scrim");
 scrim.onclick=function(e){if(e.target===scrim)closeEditor()};
 var pan=el("div","ml-ed");pan.setAttribute("role","dialog");pan.setAttribute("aria-modal","true");
 var head=el("div","ml-ed-head");
 var h=el("h2","ml-ed-title",titles[kind]);
 var x=el("button","ml-ed-x","\u00d7");x.setAttribute("aria-label",t("close"));x.onclick=closeEditor;
 head.appendChild(h);head.appendChild(x);pan.appendChild(head);
 var langRow=langSwitch(function(){var snap=snapshot();BUSY=false;closeEditor();openEditor(kind,it,snap)});
 langRow.style.margin="2px 0 10px";pan.appendChild(langRow);
 var scroll=el("div","ml-ed-body");pan.appendChild(scroll);
 scroll.appendChild(el("p","ml-ed-intro",isNew?t("introNew"):t("introEdit")));
 var how=el("p","ml-ed-note",t("howto"));how.style.marginTop="10px";scroll.appendChild(how);
 if(!isNew&&!EXTRAS_OK){var ne=el("p","ml-ed-note",t("noExtras"));ne.style.background="#FBE9E9";ne.style.color="#98302F";scroll.appendChild(ne);}
 var grid=el("div","ml-ed-grid");scroll.appendChild(grid);
 var inputs={},wraps={},BI={},OPTS=(DATA&&DATA.options)||[];

 function biField(f0,w,lab){
  var st=restore&&restore.bi&&restore.bi[f0]?restore.bi[f0]:biInit(kind,f0,it);BI[f0]=st;
  var top=el("div","ml-bi-top");top.appendChild(lab);
  var tabs=el("div","ml-tabs");tabs.setAttribute("role","tablist");top.appendChild(tabs);w.appendChild(top);
  var multi=f0!="name"&&f0!="duration";
  var inp=el(multi?"textarea":"input");if(!multi)inp.type="text";inp.id="ml-ed-"+f0;w.appendChild(inp);
  var badge=el("div","ml-bi-badge");w.appendChild(badge);
  function draw(){
   tabs.innerHTML="";
   ["es","en"].forEach(function(L){
    var b=el("button");b.type="button";b.setAttribute("role","tab");b.setAttribute("aria-selected",st.tab==L?"true":"false");
    var own=st[L].trim()&&!st.ai[L]&&!st.pend[L]&&!st.stale[L];
    var d=el("span","ml-dot"+(st.stale[L]?" stale":st.ai[L]?" ai":own?" own":""));
    b.appendChild(d);b.appendChild(document.createTextNode(L.toUpperCase()));
    b.onclick=function(){st.tab=L;draw()};tabs.appendChild(b)});
   var L=st.tab;inp.value=st[L];
   inp.className=st.ai[L]?"ml-ai-in":"";
   inp.placeholder=st.pend[L]?t("pendingT"):"";
   badge.innerHTML="";
   var p=el("span","ml-bp");
   if(st.pend[L]){p.className+=" pend";p.textContent=t("pendingT");badge.appendChild(p);
    var n=el("button","ml-link",t("now"));n.type="button";n.onclick=function(){run(n)};badge.appendChild(n);}
   else if(st.stale[L]){p.className+=" stale";p.textContent=t("stale");badge.appendChild(p);
    var r=el("button","ml-link",t("re"));r.type="button";r.onclick=function(){st.pend[L]=true;st.stale[L]=false;run(r)};badge.appendChild(r);}
   else if(st.ai[L]&&st[L].trim()){p.className+=" ai";p.textContent=t("ai");badge.appendChild(p);}
   else if(st[L].trim()){p.className+=" own";p.textContent=t("own");badge.appendChild(p);}
  }
  function run(btn){
   var src=biSource(st);if(!st[src].trim())return;
   btn.disabled=true;btn.textContent=t("translating");
   var o={};o[f0]={text:st[src],lang:src};
   translate(o).then(function(d){if(!biApply(st,d[f0]))throw 0;draw();upd();})
   .catch(function(){err.textContent=t("tFail");err.style.display="block";draw();});
  }
  inp.addEventListener("input",function(){biEdit(st,st.tab,inp.value);
   var keep=inp.selectionStart;draw();try{inp.setSelectionRange(keep,keep)}catch(e){}inp.focus();
  });
  draw();
  return inp;
 }

 FIELDS[kind].forEach(function(fd){
  if((fd[0]=="#"&&fd[1]=="secWhere"||fd[2]=="multi")&&!OPTS.length)return;
  if(fd[0]=="#"){grid.appendChild(el("h3","ml-ed-sec",t(fd[1])));return;}
  var w=el("div","ml-ed-f"+(fd[3]?" half":""));
  var id="ml-ed-"+fd[0];
  var l=el("label",null,f(fd[1]));l.setAttribute("for",id);
  var v=it?D(it[fd[0]]):"";var inp;
  if(restore&&restore.inputs&&restore.inputs[fd[0]]!==undefined)v=restore.inputs[fd[0]];
  if(fd[6]){inp=biField(fd[0],w,l);}
  else{
   w.appendChild(l);
   if(fd[2]=="multi"){
    inp=el("input");inp.type="hidden";
    var mo=OPTS.filter(function(o){return o.type==fd[4]}).map(function(o){return{id:o.id,label:D(o.label)}}).sort(function(a,b){return a.label.localeCompare(b.label)});
    inp.value=msNorm(v.split(","),mo).join(",");
    l.setAttribute("for",id+"-box");
    w.appendChild(msWidget(inp,mo,id+"-box",fd[4]=="Activity"?t("chooseAct"):t("chooseDest")));
   }
   else if(fd[0]=="boatId"){
    inp=el("select");
    var none=el("option",null,t("noBoat"));none.value="";inp.appendChild(none);
    (DATA&&DATA.boats||[]).forEach(function(b){var op=el("option",null,D(b.name));op.value=b.id;inp.appendChild(op)});
    inp.value=v;
    if(v&&inp.value!=v){var cur=el("option",null,t("curBoat"));cur.value=v;inp.appendChild(cur);inp.value=v;}
   }
   else if(fd[2]=="select"){inp=el("select");
    var opts=fd[4].slice();if(v&&opts.indexOf(v)<0)opts.push(v);
    opts.forEach(function(o){var op=el("option",null,o?optLabel(o):(fd[0]=="bookingPlatform"?t("noOnline"):t("choose")));op.value=o;inp.appendChild(op)});
    inp.value=v||(fd[4][0]||"");}
   else if(fd[2]=="textarea"){inp=el("textarea");inp.value=v;}
   else{inp=el("input");inp.type=fd[2]=="number"?"number":"text";if(fd[2]=="number"){inp.min="0";inp.step="any";}inp.value=v;}
   inp.id=id;w.appendChild(inp);
  }
  if(fd[5])w.appendChild(el("p","ml-ed-help",t(fd[5])));
  grid.appendChild(w);inputs[fd[0]]=inp;wraps[fd[0]]=w;
 });
 var first=grid.querySelector(".ml-ed-sec");if(first){first.style.marginTop="18px";first.style.borderTop="0";first.style.paddingTop="0";}

 if(kind=="o"){
  var wc=inputs.widgetCode;wc.style.fontFamily="monospace";wc.style.fontSize="13px";wc.spellcheck=false;
  var dLab=wraps.description.querySelector("label");
  var dHelp=el("p","ml-ed-help",t("shortHelp"));
  wraps.description.appendChild(dHelp);
  var incNote=el("p","ml-ed-note",t("inclNote"));
  grid.insertBefore(incNote,wraps.whatsIncluded.nextSibling);
  var mode=function(){
   var plat=inputs.bookingPlatform.value,wd=!!(plat&&wc.value.trim());
   wraps.otherBookingPlatform.style.display=plat=="Other"?"":"none";
   wraps.widgetCode.style.display=plat?"":"none";
   dLab.textContent=wd?t("shortDesc"):f("description");
   dHelp.style.display=wd?"block":"none";
   wraps.whatsIncluded.style.display=wd?"none":"";
   incNote.style.display=wd?"block":"none";
  };
  inputs.bookingPlatform.addEventListener("change",mode);wc.addEventListener("input",mode);mode();
  if(!(DATA&&DATA.boats&&DATA.boats.length))
   wraps.boatId.appendChild(el("p","ml-ed-help",t("addBoatFirst")));
 }

 function biSig(){return Object.keys(BI).map(function(k){var s=BI[k];return k+"|"+s.en+"|"+s.es}).join("\u0001")}
 var initial={};Object.keys(inputs).forEach(function(k){if(!BI[k])initial[k]=inputs[k].value});
 var initialBi=restore&&restore.initialBi!=null?restore.initialBi:(function(){var o={};Object.keys(BI).forEach(function(k){o[k]=biInit(kind,k,it)});return Object.keys(o).map(function(k){return k+"|"+o[k].en+"|"+o[k].es}).join("\u0001")})();
 if(restore&&restore.initial)initial=restore.initial;
 var PH=restore&&restore.ph?restore.ph:{cover:null,logo:null,gallery:[]};
 function dirty(){
  if(PH.cover||PH.logo||PH.gallery.length)return true;
  if(biSig()!==initialBi)return true;
  return Object.keys(initial).some(function(k){return inputs[k].value!==initial[k]});
 }
 function upd(){if(!send||isNew||textSent)return;send.disabled=!dirty()||(!EXTRAS_OK);}
 function snapshot(){var o={};Object.keys(inputs).forEach(function(k){if(!BI[k])o[k]=inputs[k].value});return{inputs:o,bi:BI,ph:PH,initial:initial,initialBi:initialBi}}
 grid.addEventListener("input",upd);grid.addEventListener("change",upd);
 grid.addEventListener("change",function(e){if(e.target&&e.target.type=="hidden")err.style.display="none"});

 grid.appendChild(el("h3","ml-ed-sec",t("secPhotos")));
 var ph=el("div");scroll.appendChild(ph);
 var err=el("p","ml-ed-err");
 function thumb(src,cls,onRemove){
  var th=el("div","ml-th"+(cls?" "+cls:""));if(src)th.style.backgroundImage="url('"+src.replace(/'/g,"%27")+"')";
  if(onRemove){var b=el("button","ml-th-x","\u00d7");b.type="button";b.setAttribute("aria-label",t("remove"));b.onclick=onRemove;th.appendChild(b);}
  return th;
 }
 function addFiles(files,cb){
  err.style.display="none";
  Promise.all(files.map(function(fl){return shrink(fl).catch(function(){return null})})).then(function(rs){
   var nb=rs.filter(function(r){return !r}).length;
   if(nb){err.textContent=t("heic")(nb);err.style.display="block";}
   cb(rs.filter(Boolean));
  });
 }
 function single(key,label,current,help,isLogo){
  var blk=el("div","ml-ph-blk");blk.appendChild(el("span","ml-ed-lab",label));
  var tile=el("button","ml-cover"+(isLogo?" logo":""));tile.type="button";tile.setAttribute("aria-label",label);
  var row=el("div","ml-ph-row");
  var warn=el("p","ml-ed-warn");warn.style.display="none";
  var pk=picker(false,function(fs){addFiles(fs.slice(0,1),function(r){if(r[0]){PH[key]=r[0];draw()}})});
  tile.onclick=function(){pk.click()};
  function draw(){
   var src=PH[key]?PH[key].preview:current;
   tile.style.backgroundImage=src?"url('"+src.replace(/'/g,"%27")+"')":"";
   tile.textContent=src?"":t("add")+label.toLowerCase();
   tile.className="ml-cover"+(isLogo?" logo":"")+(src?" has":"")+(PH[key]&&PH[key].small?" small":"");
   row.innerHTML="";
   if(src){var b=el("button","ml-link",t("replacePhoto"));b.type="button";b.onclick=function(){pk.click()};row.appendChild(b);}
   if(PH[key]){var u=el("button","ml-link",current?t("keepPhoto"):t("remove"));u.type="button";u.onclick=function(){PH[key]=null;draw()};row.appendChild(u);}
   warn.textContent=t("small");
   warn.style.display=PH[key]&&PH[key].small?"block":"none";
   upd();
  }
  blk.appendChild(tile);blk.appendChild(row);
  if(help)blk.appendChild(el("p","ml-ed-help",help));
  blk.appendChild(warn);ph.appendChild(blk);draw();
 }
 var modeReplace=null;
 if(kind=="p"){
  single("logo",t("logo"),it&&D(it.logo),t("logoHelp"),true);
  single("cover",t("cover"),it&&D(it.coverPhoto),t("coverProfHelp"));
 }else{
  single("cover",t("cover"),it&&D(it.coverPhoto),t("coverHelp"));
  var cur=it?D(it.photos).split(" ").filter(Boolean):[];
  if(cur.length){
   var gb=el("div","ml-ph-blk");gb.appendChild(el("span","ml-ed-lab",t("galleryNow")(cur.length)));
   var gr=el("div","ml-ph-row");cur.forEach(function(u){gr.appendChild(thumb(u))});gb.appendChild(gr);ph.appendChild(gb);
  }
  var nb=el("div","ml-ph-blk");var nl=el("span","ml-ed-lab");nb.appendChild(nl);
  var nr=el("div","ml-ph-row");nb.appendChild(nr);
  var nwarn=el("p","ml-ed-warn");nb.appendChild(nwarn);
  var gpk=picker(true,function(fs){addFiles(fs,function(r){PH.gallery=PH.gallery.concat(r);drawG()})});
  var rd=null;
  if(!isNew&&cur.length){
   rd=el("div");
   var r1=el("label","ml-radio"),i1=el("input");i1.type="radio";i1.name="ml-pm";i1.checked=true;r1.appendChild(i1);r1.appendChild(document.createTextNode(t("addToGallery")));
   var r2=el("label","ml-radio"),i2=el("input");i2.type="radio";i2.name="ml-pm";r2.appendChild(i2);r2.appendChild(document.createTextNode(t("replaceGallery")));
   rd.appendChild(r1);rd.appendChild(r2);nb.appendChild(rd);modeReplace=i2;
  }
  function drawG(){
   nl.textContent=cur.length?(PH.gallery.length?t("newPhotos")(PH.gallery.length):t("addGallery")):t("gallery")+(PH.gallery.length?" \u00b7 "+PH.gallery.length:"");
   nr.innerHTML="";
   PH.gallery.forEach(function(p,i){nr.appendChild(thumb(p.preview,p.small?"small":"",function(){PH.gallery.splice(i,1);drawG()}))});
   var add=el("button","ml-th-add",t("addPhotos"));add.type="button";add.onclick=function(){gpk.click()};nr.appendChild(add);
   var sm=PH.gallery.filter(function(p){return p.small}).length;
   nwarn.textContent=sm?t("smallN")(sm):"";
   nwarn.style.display=sm?"block":"none";
   if(rd)rd.style.display=PH.gallery.length?"":"none";
   upd();
  }
  ph.appendChild(nb);drawG();
 }

 var fw=el("div","ml-ed-footwrap");
 fw.appendChild(err);
 var prog=el("div","ml-prog");prog.style.display="none";
 var progT=el("div");progT.style.fontSize="14px";var bar=el("div","ml-prog-bar"),fill=el("div");bar.appendChild(fill);
 prog.appendChild(progT);prog.appendChild(bar);prog.appendChild(el("div","ml-ed-help",t("keepOpen")));
 fw.appendChild(prog);
 var foot=el("div","ml-ed-foot");
 var cancel=el("button","ml-btn ml-btn-ghost",t("cancel"));cancel.onclick=closeEditor;
 var SEND_LABEL=isNew?t("sendNew"):t("sendEdit");
 send=el("button","ml-btn ml-btn-primary",SEND_LABEL);
 foot.appendChild(cancel);foot.appendChild(send);fw.appendChild(foot);pan.appendChild(fw);
 upd();
 var target=null,rowId=null,queue=[],extrasWarn=false;
 function runUploads(){
  var failed=[],n=queue.length,i=0;
  BUSY=true;foot.style.display="none";prog.style.display="block";err.style.display="none";
  function step(){
   if(i>=n){BUSY=false;
    if(!failed.length){closeEditor();done();return;}
    queue=failed;prog.style.display="none";foot.style.display="flex";
    err.textContent=t("upFail")(failed.length,failed.map(function(q){return q.label}).join(", "));
    err.style.display="block";send.disabled=false;send.textContent=t("tryAgain");send.onclick=runUploads;return;}
   var q=queue[i];progT.textContent=t("uploading")(i+1,n);fill.style.width=Math.round(i/n*100)+"%";
   sendForm({formType:"upload_photo",target:target,recordId:rowId,slot:q.slot,filename:q.name,file:q.p.b64})
   .catch(function(){failed.push(q)}).then(function(){i++;fill.style.width=Math.round(i/n*100)+"%";step()});
  }
  step();
 }
 function done(){
  if(extrasWarn){showBanner(t("extrasFail"));load();return;}
  showBanner(isNew?t("doneNew"):t("doneEdit"));load();
 }
 function aiTags(){
  var out=[];Object.keys(BI).forEach(function(k){var s=BI[k],lab=AIL[kind][k];
   if(s.ai.en&&s.en.trim())out.push(lab+" EN");if(s.ai.es&&s.es.trim())out.push(lab+" ES");});
  return out.join(",");
 }
 function translatePending(){
  var o={},keys=[];
  Object.keys(BI).forEach(function(k){var s=BI[k];
   if(s.pend.en||s.pend.es){var src=biSource(s);if(s[src].trim()){o[k]={text:s[src],lang:src};keys.push(k);}else{s.pend.en=s.pend.es=false;}}});
  if(!keys.length)return Promise.resolve();
  return translate(o).then(function(d){keys.forEach(function(k){if(!biApply(BI[k],d[k]))throw 0;});});
 }
 function saveExtras(){
  var p={formType:"save_extras",target:target,recordId:rowId,aiTranslated:aiTags()};
  Object.keys(BI).forEach(function(k){p[k+"Es"]=BI[k].es.trim();});
  if(kind=="o"){p.cancellationPolicy=inputs.cancellationPolicy.value;p.cancellationNotes=BI.cancellationNotes.en.trim();p.cancellationNotesEs=BI.cancellationNotes.es.trim();}
  return sendForm(p,XHOOK).catch(function(){return sendForm(p,XHOOK)});
 }
 send.onclick=function(){
  if(!isNew&&!EXTRAS_OK)return;
  var nm=BI.name?(BI.name.en.trim()||BI.name.es.trim()):inputs.name.value.trim();
  if(!nm){err.textContent=t("needName");err.style.display="block";return;}
  if(inputs.activityIds&&!inputs.activityIds.value){err.textContent=t("needAct");err.style.display="block";return;}
  send.disabled=true;send.textContent=t("translating");err.style.display="none";BUSY=true;
  translatePending().then(function(){
   send.textContent=t("sending");
   var params={};
   Object.keys(inputs).forEach(function(k){params[k]=BI[k]?BI[k].en.trim():inputs[k].value.trim()});
   delete params.cancellationPolicy;delete params.cancellationNotes;
   if(params.bookingPlatform!==undefined&&params.bookingPlatform!="Other")params.otherBookingPlatform="";
   if(kind=="o"&&!params.bookingPlatform)params.widgetCode="";
   if(!isNew&&kind!="p"&&PH.gallery.length)params.photosAction=modeReplace&&modeReplace.checked?"Replace all":"Add to existing";
   var type;
   if(kind=="o"){type=isNew?"create_offering":"offering_update";if(!isNew)params.offeringRecordId=it.id;}
   else if(kind=="b"){type=isNew?"create_boat":"boat_update";if(!isNew)params.boatRecordId=it.id;}
   else{type="operator_update";params.operatorRecordId=it.id;}
   params.formType=type;
   queue=[];
   if(PH.logo)queue.push({slot:"logo",name:"logo.jpg",p:PH.logo,label:t("logoLabel")});
   if(PH.cover)queue.push({slot:"cover",name:"cover.jpg",p:PH.cover,label:t("coverLabel")});
   PH.gallery.forEach(function(p,i){queue.push({slot:"gallery",name:"photo-"+(i+1)+".jpg",p:p,label:t("photoLabel")(i+1)})});
   return sendForm(params).then(function(d){
    textSent=true;rowId=d.id;target=isNew?kind:kind+"u";
    if(!rowId){BUSY=false;closeEditor();done();return;}
    return saveExtras().catch(function(){extrasWarn=true}).then(function(){
     BUSY=false;
     if(!queue.length){closeEditor();done();return;}
     runUploads();
    });
   },function(){throw "send"});
  }).catch(function(e){BUSY=false;send.disabled=false;send.textContent=SEND_LABEL;
   err.textContent=e=="send"?t("sendFail"):t("tFail");err.style.display="block";});
 };
 scrim.appendChild(pan);document.body.appendChild(scrim);ED=scrim;
 document.body.style.overflow="hidden";var fi=inputs.name;if(fi&&fi.focus)fi.focus();
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
 $("ml-savemsg").textContent=t("notChanged")(n);
 document.body.style.paddingBottom=n?"90px":"";
}
function loadAgreement(after){
 return fetch(AGHOOK+"?formType=agreement_status&k="+encodeURIComponent(K))
 .then(function(r){return r.json()})
 .then(function(d){if(d&&d.ok){AG=d;if((!D(d.accepted)||D(d.version)!==AGV)&&!after)openAgreementGate();}})
 .catch(function(){});
}
function mergeExtras(x){
 function into(list,ex){var m={};(ex||[]).forEach(function(e){m[e.id]=e});(list||[]).forEach(function(it){var e=m[it.id];if(e)Object.keys(e).forEach(function(k){if(k!="id")it[k]=e[k]})})}
 into(DATA.offerings,x.offerings);into(DATA.boats,x.boats);
 if(DATA.operator&&x.operator&&x.operator[0]&&x.operator[0].id==DATA.operator.id)Object.keys(x.operator[0]).forEach(function(k){if(k!="id")DATA.operator[k]=x.operator[0][k]});
}
function load(){
 if(!K){bad();return}
 Promise.all([
  fetch(HOOK+"?formType=listings&k="+encodeURIComponent(K)).then(function(r){return r.json()}),
  fetch(XHOOK+"?formType=extras&k="+encodeURIComponent(K)).then(function(r){return r.json()}).catch(function(){return null})
 ]).then(function(rs){
  var d=rs[0];if(!d||!d.ok){bad();return}
  DATA=d;EXTRAS_OK=!!(rs[1]&&rs[1].ok);if(EXTRAS_OK)mergeExtras(rs[1]);
  $("ml-who").textContent=D(d.operator&&d.operator.name)||D(d.partnerName);render();
 }).catch(bad);
}
$("ml-save").onclick=save;
$("ml-discard").onclick=function(){pending={};render()};
$("ml-add-offering").onclick=function(e){e.preventDefault();openEditor("o",null)};
$("ml-add-boat").onclick=function(e){e.preventDefault();openEditor("b",null)};
window.addEventListener("beforeunload",function(e){if(Object.keys(pending).length||BUSY){e.preventDefault();e.returnValue=""}});
applyStatic();loadAgreement();load();
})();
