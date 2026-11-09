/* Vamos a La Paz — live availability search (vamosalapaz.com /offerings, /es/offerings and the home pages)
   Source: github.com/vamosalapaz/vamos-portal (availability.js), served via jsDelivr tagged releases.
   Data: Cloudflare Worker vamos-availability, public route /search (FareHarbor + Bókun, all visible Airtable offerings).

   /offerings: adds a date (or date range) + guests + "departing after" box above the filters (the existing Tour type
   dropdown moves into it). With a date, cards without space are hidden, open cards show their departure times, and
   offers with no online calendar (private owners) move to an "Ask us about this date" section grouped by boat, with a
   WhatsApp button to the Vamos number. Works together with the existing filter script (activity / destination /
   tour type / booking), which keeps hiding cards with inline display:none; this script uses its own class.
   URL: /offerings?date=2026-11-21&guests=2[&after=10:00]  or  ?from=2026-11-19&to=2026-11-22&guests=4
   Home (/ and /es): adds the same date + guests box to the hero; it sends people to /offerings with those parameters.
   v51: first release (Oct 29, 2026). v52 (Nov 4, 2026): whale shark landing copy for ?activity=swimming-with-the-whale-sharks. v53: date box on /activities/<slug> pages.
   v54 (Nov 8, 2026): availability_results dataLayer event once results load (search_from, search_to, guests, search_page,
   results = experiences shown as open, 0 = nothing available). availability_search itself is unchanged.
   v55 (Nov 8, 2026): /activities/swimming-with-the-whale-sharks gets a month calendar across all whale shark operators
   (Worker route /month) instead of the date box; call-to-book departures get an "Ask about this departure" WhatsApp button. */
(function () {
  'use strict';
  var API = 'https://vamos-availability.solitary-wind-dfb8.workers.dev/search';
  var WA = '526122903605';
  var MAX_RANGE = 14;
  var TZ = 'America/Mazatlan';
  var path = location.pathname.replace(/\/+$/, '') || '/';
  var ES = /^\/es(\/|$)/.test(path);
  var base = path.replace(/^\/es(?=\/|$)/, '') || '/';
  var isOfferings = base === '/offerings';
  var isHome = base === '/';
  var actM = /^\/activities\/([a-z0-9-]+)$/.exec(base);
  var actSlug = actM ? actM[1] : '';
  if (!isOfferings && !isHome && !actSlug) return;

  var T = ES ? {
    heading: '¿Qué hay disponible en tu día?', date: 'FECHA', to: 'HASTA', guests: 'PERSONAS', flexible: 'Mis fechas son flexibles (hasta 14 días)',
    check: 'Consultar disponibilidad', browse: 'O ver todos los tours y actividades', after: 'SALIDA DESPUÉS DE', anyTime: 'Cualquier hora',
    clear: 'Quitar fecha', choose: 'Elige una fecha', fewer: 'Menos personas', more: 'Más personas',
    guest: function (n) { return n + (n === 1 ? ' persona' : ' personas'); },
    checking: function (d) { return 'Consultando disponibilidad en vivo para ' + d + '…'; },
    openOn: function (d, n) { return n + (n === 1 ? ' experiencia disponible' : ' experiencias disponibles'); },
    moreOpts: 'Más opciones de búsqueda', moreOptsHint: '(fechas flexibles, hora de salida)', edit: 'Editar búsqueda', after2: function (t) { return 'después de las ' + t; },
    perGroup: 'por grupo', perPerson: 'por persona', privTour: 'Tour privado', sharedTour: 'Tour compartido',
    sub: function (g) { return 'En vivo desde los calendarios de reserva de cada operador, para ' + T.guest(g) + '.'; },
    hidden: function (n, d) { return n + (n === 1 ? ' experiencia está llena o no sale ' : ' experiencias están llenas o no salen ') + d + '.'; },
    showAnyway: 'Mostrarlas de todos modos', hideFull: 'Ocultar las llenas', fullOn: function (d) { return 'Lleno ' + d; },
    space: 'Hay lugar', tsdb: 'hora por confirmar', tsdbNote: 'La autoridad del parque asigna la hora de salida un día antes del tour.',
    departures: 'SALIDAS CON LUGAR', available: 'DISPONIBLE', left: function (n) { return 'quedan ' + n; }, privateNote: 'Barco completo, solo tu grupo',
    anyDeparture: 'Disponible', moreDays: function (n) { return '+' + n + ' días más'; },
    askTitle: function (d) { return 'Pregúntanos por ' + d; },
    askIntro: 'Estos barcos privados no tienen calendario en línea. Escríbenos y confirmamos la fecha con el dueño por ti.',
    askBtn: function (d) { return 'Preguntar por ' + d; }, bookWa: 'Reservar por WhatsApp', boatFree: 'El barco está libre ese día',
    boatFreeOn: function (d) { return 'Barco libre: ' + d; },
    upTo: function (n) { return 'hasta ' + n + ' personas'; }, trips: function (n) { return n + ' viajes'; }, from: 'Desde ',
    moreBoats: function (n) { return 'Ver ' + n + ' barcos más'; },
    nothing: function (g, d) { return 'No hay nada disponible para ' + T.guest(g) + ' ' + d; },
    nearby: 'Estas fechas cercanas todavía tienen lugar:', nOpen: function (n) { return n + ' disponibles'; },
    askFind: function (d) { return 'Pídenos que busquemos algo para ' + d; },
    failed: 'No pudimos consultar la disponibilidad en vivo en este momento, así que mostramos todas las experiencias.', retry: 'Reintentar',
    waOne: function (what, d, g) { return 'Hola! Está disponible ' + what + ' ' + d + ' para ' + T.guest(g) + '? Lo vi en vamosalapaz.com'; },
    waFind: function (d, g) { return 'Hola! Busco algo para ' + T.guest(g) + ' ' + d + '. Me pueden ayudar?'; },
    onDay: function (d) { return 'el ' + d; }, between: function (a, b) { return 'entre el ' + a + ' y el ' + b; },
    locale: 'es-MX'
  } : {
    heading: "What's available on your day?", date: 'DATE', to: 'TO', guests: 'GUESTS', flexible: 'My dates are flexible (up to 14 days)',
    check: 'Check availability', browse: 'Or browse all tours & activities', after: 'DEPARTING AFTER', anyTime: 'Any time',
    clear: 'Clear date', choose: 'Choose a date', fewer: 'Fewer guests', more: 'More guests',
    guest: function (n) { return n + (n === 1 ? ' guest' : ' guests'); },
    checking: function (d) { return 'Checking live availability for ' + d + '…'; },
    openOn: function (d, n) { return n + (n === 1 ? ' experience available' : ' experiences available'); },
    moreOpts: 'More search options', moreOptsHint: '(flexible dates, departure time)', edit: 'Edit search', after2: function (t) { return 'after ' + t; },
    perGroup: 'per group', perPerson: 'per person', privTour: 'Private tour', sharedTour: 'Shared tour',
    sub: function (g) { return "Live from the operators' booking calendars, for " + T.guest(g) + '.'; },
    hidden: function (n, d) { return n + (n === 1 ? ' experience is' : ' experiences are') + ' full or not running ' + d + '.'; },
    showAnyway: 'Show them anyway', hideFull: 'Hide full ones', fullOn: function (d) { return 'Full ' + d; },
    space: 'Space available', tsdb: 'time set the day before', tsdbNote: 'The park authority assigns the departure time the day before your tour.',
    departures: 'DEPARTURES WITH SPACE', available: 'AVAILABLE', left: function (n) { return n + ' left'; }, privateNote: 'Whole boat, just your group',
    anyDeparture: 'Available', moreDays: function (n) { return '+' + n + ' more days'; },
    askTitle: function (d) { return 'Ask us about ' + d; },
    askIntro: "These private boats don't have an online calendar. Message us and we'll check the date with the owner for you.",
    askBtn: function (d) { return 'Ask about ' + d; }, bookWa: 'Book on WhatsApp', boatFree: 'Boat is free this day',
    boatFreeOn: function (d) { return 'Boat free: ' + d; },
    upTo: function (n) { return 'up to ' + n + ' guests'; }, trips: function (n) { return n + ' trips'; }, from: 'From ',
    moreBoats: function (n) { return 'Show ' + n + ' more boats'; },
    nothing: function (g, d) { return 'Nothing open for ' + T.guest(g) + ' ' + d; },
    nearby: 'These nearby dates still have space:', nOpen: function (n) { return n + ' open'; },
    askFind: function (d) { return 'Ask us to find something for ' + d; },
    failed: "We couldn't check live availability just now, so all experiences are shown.", retry: 'Try again',
    waOne: function (what, d, g) { return 'Hi! Is ' + what + ' available ' + d + ' for ' + T.guest(g) + '? I saw it on vamosalapaz.com'; },
    waFind: function (d, g) { return "Hi! I'm looking for something for " + T.guest(g) + ' ' + d + '. Can you help?'; },
    onDay: function (d) { return 'on ' + d; }, between: function (a, b) { return 'between ' + a + ' and ' + b; },
    locale: 'en-US'
  };

  // ---------------------------------------------------------------- styles
  var CSS = [
    '.vlp-av-box{border:1px solid #E5DFD1;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px;background:#fff;margin:0 0 18px;font-family:"DM Sans",sans-serif;color:#17202A;box-sizing:border-box}',
    '.vlp-av-box *{box-sizing:border-box}',
    '[class*="vlp-av-"][hidden],.vlp-av-box [hidden]{display:none!important}',
    '.vlp-av-row{display:flex;gap:8px;flex-wrap:wrap}',
    '.vlp-av-row>*{flex:1 1 140px;min-width:0}',
    '.vlp-av-lbl{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#46525C;letter-spacing:.3px;margin:0}',
    '.vlp-av-field{position:relative;display:block}',
    '.vlp-av-input{width:100%;min-height:48px;border:1px solid #E5DFD1;border-radius:8px;padding:0 12px;font:inherit;font-size:16px;font-weight:600;color:#17202A;background:#fff;-webkit-appearance:none;appearance:none;letter-spacing:0;margin:0}',
    '.vlp-av-input:focus,.vlp-av-step button:focus-visible,.vlp-av-btn:focus-visible{outline:2px solid #B51E66;outline-offset:2px}',
    '.vlp-av-ph{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:16px;font-weight:500;color:#6B7680;pointer-events:none;letter-spacing:0}',
    '.vlp-av-field.has-val .vlp-av-ph,.vlp-av-field:focus-within .vlp-av-ph{display:none}',
    '.vlp-av-input[type=date]{cursor:pointer}',
    '.vlp-av-field:not(.has-val) .vlp-av-input{color:transparent}',
    '.vlp-av-field:not(.has-val) .vlp-av-input:focus{color:#17202A}',
    '.vlp-av-step{display:flex;align-items:center;justify-content:space-between;border:1px solid #E5DFD1;border-radius:8px;padding:2px;min-height:48px}',
    '.vlp-av-step button{width:38px;height:42px;flex:none;border:none;border-radius:6px;background:#F4EFE6;font:inherit;font-size:22px;font-weight:600;color:#17202A;cursor:pointer;line-height:1;padding:0}',
    '.vlp-av-step span{font-size:15px;font-weight:600;letter-spacing:0;color:#17202A;white-space:nowrap;padding:0 4px}',
    '.vlp-av-check{display:flex;align-items:center;gap:10px;font-size:15px;color:#17202A;min-height:32px;font-weight:400;letter-spacing:0;cursor:pointer;margin:0}',
    '.vlp-av-check input{width:22px;height:22px;accent-color:#B51E66;margin:0}',
    '.vlp-av-btn{min-height:48px;display:flex;align-items:center;justify-content:center;background:#B51E66;color:#fff!important;border:none;border-radius:999px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none;width:100%}',
    '.vlp-av-btn:hover{background:#9C1958}',
    '.vlp-av-link{font-size:14px;font-weight:600;color:#B51E66;background:none;border:none;padding:4px 0;font-family:inherit;cursor:pointer;text-decoration:underline;align-self:flex-start}',
    '.vlp-av-box h2{margin:0;font-size:18px;font-weight:700;line-height:1.25;color:#17202A}',
    '.vlp-av-box .offerings-select-wrap{margin:0}',
    '.vlp-av-moreopt{text-decoration:none;font-size:14px}.vlp-av-moreopt span{font-weight:400;color:#46525C}',
    '.vlp-av-opts{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:flex-end}.vlp-av-opts>.vlp-av-lbl{flex:0 1 220px}',
    '.vlp-av-sum{border:1px solid #E5DFD1;border-radius:14px;padding:10px 10px 10px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 18px;font-family:"DM Sans",sans-serif;color:#17202A;background:#fff}',
    '.vlp-av-sumtxt{display:flex;align-items:center;gap:10px;font-size:17px;min-width:0}.vlp-av-sumtxt svg{flex:none}.vlp-av-sumtxt b{font-weight:700}.vlp-av-sumtxt span span{color:#46525C}.vlp-av-dot{font-style:normal;color:#46525C;white-space:pre}.vlp-av-short{display:none}',
    '.vlp-av-sumnav{display:flex;gap:6px}',
    '.vlp-av-sumnav button{border:1px solid #E5DFD1;border-radius:999px;padding:7px 12px;font:inherit;font-size:14px;font-weight:600;color:#46525C;background:#fff;cursor:pointer;min-height:38px}',
    '.vlp-av-sumnav button:hover{border-color:#B51E66;color:#B51E66}',
    '.vlp-av-edit{margin-left:auto;min-height:44px;padding:0 20px;border:1.5px solid #B51E66;border-radius:999px;background:#fff;color:#B51E66;font:inherit;font-size:15px;font-weight:700;cursor:pointer}',
    '@media (max-width:767px){.vlp-av-sum{padding:12px}.vlp-av-sumtxt{flex:1 1 0;min-width:0;font-size:16px}.vlp-av-sumtxt>span{display:flex;flex-direction:column}.vlp-av-sumtxt span span{font-size:14px}.vlp-av-dot,.vlp-av-long{display:none}.vlp-av-short{display:inline}.vlp-av-edit{order:2;padding:0 14px}.vlp-av-sumnav{order:3;flex:1 1 100%}.vlp-av-sumnav button{flex:1 1 0}}',
    '.offering-card-price-wrap{display:flex!important;flex-direction:row!important;flex-wrap:wrap;align-items:baseline;column-gap:6px;row-gap:0!important;height:auto!important;min-height:0!important}',
    '.offering-card-price-wrap>*{margin-top:0!important;margin-bottom:0!important}',
    '[data-offerings-count]{font-size:22px!important;font-weight:700!important;color:#17202A!important;font-family:"DM Sans",sans-serif}',
    '@media (min-width:768px){' +
      '.vlp-av-off{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;row-gap:6px;padding:12px 14px;border-radius:14px}' +
      '.vlp-av-off>.vlp-av-row{grid-column:1;grid-row:1;flex-wrap:nowrap}' +
      '.vlp-av-off>.vlp-av-row>[role=group]{flex:0 0 200px}' +
      '.vlp-av-off>.vlp-av-btn{grid-column:2;grid-row:1;align-self:end;width:210px;min-height:48px}' +
      '.vlp-av-off>.vlp-av-moreopt{grid-column:1;grid-row:2;justify-self:start}' +
      '.vlp-av-off>.vlp-av-clear{grid-column:2;grid-row:2;justify-self:end}' +
      '.vlp-av-off>.vlp-av-opts{grid-column:1/-1;grid-row:3}' +
    '}',
    '.vlp-av-slot{display:flex;flex-direction:column}.vlp-av-slot .offerings-select-wrap,.vlp-av-slot select{width:100%}',
    '.vlp-av-home .vlp-av-browse{margin-top:-4px;padding:0}',
    '.vlp-av-on [data-offerings-count]{display:none!important}',
    '.vlp-av-hide{display:none!important}',
    '.vlp-av-head{display:flex;flex-direction:column;gap:4px;margin:4px 0 14px;font-family:"DM Sans",sans-serif}',
    '.vlp-av-head h2{margin:0;font-size:24px;font-weight:700;color:#17202A;line-height:1.25}',
    '.vlp-av-head p{margin:0;font-size:14px;color:#46525C}',
    '.vlp-av-msg{border:1px solid #E5DFD1;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px;margin:0 0 16px;font-family:"DM Sans",sans-serif;color:#17202A}',
    '.vlp-av-msg h2{margin:0;font-size:20px;font-weight:700;line-height:1.25}',
    '.vlp-av-msg p{margin:0;font-size:15px;color:#46525C;line-height:1.4}',
    '.vlp-av-spin{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:600}',
    '.vlp-av-spin:before{content:"";width:18px;height:18px;border:2.5px solid #F1D3E2;border-top-color:#B51E66;border-radius:50%;animation:vlpspin .8s linear infinite;flex:none}',
    '@keyframes vlpspin{to{transform:rotate(360deg)}}',
    '.vlp-av-warn{background:#F4EFE6;border-radius:10px;padding:14px 16px;font-size:15px;line-height:1.4;margin:0 0 16px;font-family:"DM Sans",sans-serif;color:#17202A}',
    '.vlp-av-strip{margin-top:10px;display:flex;flex-direction:column;gap:8px;font-family:"DM Sans",sans-serif}',
    '.vlp-av-cap{font-size:12px;font-weight:700;color:#1C6B3A;letter-spacing:.3px}',
    '.vlp-av-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}',
    '.vlp-av-chip{border:1px solid #1C6B3A;color:#1C6B3A;border-radius:999px;padding:5px 11px;font-size:14px;font-weight:600;line-height:1.3;white-space:nowrap}',
    '.vlp-av-note{color:#46525C;font-size:14px}',
    '.vlp-av-wa{display:block;flex-basis:100%;font-weight:600;color:#1C6B3A}',
    '.vlp-av-tsdb{background:#FFF4E0;border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}',
    '.vlp-av-tsdb b{font-size:14px;color:#7A4A00}',
    '.vlp-av-tsdb span{font-size:13px;color:#6A4300;line-height:1.35}',
    '.vlp-av-days{border:1px solid #E5DFD1;border-radius:8px;overflow:hidden}',
    '.vlp-av-day{display:grid;grid-template-columns:64px minmax(0,1fr);gap:8px;align-items:center;padding:7px 10px;border-top:1px solid #E5DFD1}',
    '.vlp-av-day:first-child{border-top:none}',
    '.vlp-av-day>b{font-size:14px;color:#17202A}',
    '.vlp-av-day .vlp-av-chip{font-size:13px;padding:4px 9px}',
    '.vlp-av-tsdbday{font-size:13px;font-weight:600;color:#7A4A00}',
    '.vlp-av-full{opacity:.55}',
    '.vlp-av-fulltag{display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:#46525C;background:#F1EEE7;border-radius:999px;padding:5px 11px}',
    '.vlp-av-more{border-top:1px solid #E5DFD1;padding-top:8px;margin:18px 0 0;font-size:14px;color:#46525C;font-family:"DM Sans",sans-serif;grid-column:1/-1}',
    '.vlp-av-ask{background:#F4EFE6;border-radius:12px;padding:18px 14px;display:flex;flex-direction:column;gap:12px;margin:24px 0 0;font-family:"DM Sans",sans-serif;color:#17202A}',
    '.vlp-av-ask>h2{margin:0;font-size:21px;font-weight:700;line-height:1.25}',
    '.vlp-av-ask>p{margin:0;font-size:14px;color:#46525C;line-height:1.4}',
    '.vlp-av-askgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
    '.vlp-av-askrow{background:#fff;border:1px solid #E5DFD1;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:10px}',
    '.vlp-av-askrow-top{display:flex;gap:12px;align-items:center}',
    '.vlp-av-askrow img{width:72px;height:72px;flex:none;border-radius:8px;object-fit:cover;background:#E5EEF0}',
    '.vlp-av-askrow-txt{display:flex;flex-direction:column;gap:2px;min-width:0}',
    '.vlp-av-askrow-txt b{font-size:16px;font-weight:600;color:#17202A}',
    '.vlp-av-askrow-txt span{font-size:14px;color:#46525C}',
    '.vlp-av-askrow-txt strong{font-size:14px;font-weight:600;color:#17202A}',
    '.vlp-av-askrow-txt em{font-style:normal;font-size:13px;font-weight:700;color:#1C6B3A}',
    '.vlp-av-trips{display:flex;gap:6px;flex-wrap:wrap}',
    '.vlp-av-trips a{font-size:13px;border:1px solid #E5DFD1;border-radius:999px;padding:6px 10px;color:#46525C;text-decoration:none;background:#fff}',
    '.vlp-av-trips a:hover{border-color:#B51E66;color:#B51E66}',
    '.vlp-av-wa{min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;background:#0F7A3F;color:#fff!important;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none!important}',
    '.vlp-av-wa:hover{background:#0B6533}',
    '.vlp-av-wa svg{flex:none}',
    '.vlp-av-rqbtn{min-height:46px;display:flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:#B51E66;color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;padding:0 14px}',
    '.vlp-av-rqbtn:hover{background:#8E1550}',
    'a.vlp-av-waout{background:#fff;color:#0F7A3F!important;border:1.5px solid #0F7A3F}',
    'a.vlp-av-waout svg{stroke:#0F7A3F}',
    '.vlp-av-rq2{display:flex;gap:8px}.vlp-av-rq2>*{flex:1 1 0;min-width:0}',
    '.vlp-av-rqhelp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:12.5px;line-height:1.35;color:#46525C}',
    '.vlp-av-rqcard{display:flex;flex-direction:column;gap:8px;margin-top:8px}',
    '.vlp-av-rqnote{font-size:13px;line-height:1.4;color:#46525C;text-align:center}',
    '.vlp-av-dates{display:flex;flex-direction:column;gap:8px}',
    '.vlp-av-dates button{min-height:48px;display:flex;align-items:center;justify-content:space-between;border:1px solid #1C6B3A;border-radius:8px;padding:0 14px;background:#fff;font:inherit;font-size:15px;font-weight:600;color:#17202A;cursor:pointer}',
    '.vlp-av-dates button span{color:#1C6B3A;font-size:14px}',
    '.vlp-av-homewrap{position:relative;z-index:3;max-width:472px;margin:-96px auto 8px;padding:0 16px;box-sizing:border-box}',
    // Desktop: one-line search bar (approved mockup) — date (+ to) and guests | button, then flexible + browse link
    '@media (min-width:768px){' +
      '.vlp-av-homewrap{max-width:792px;margin-top:-90px}' +
      '.vlp-av-home{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;row-gap:8px;padding:14px 16px 12px;border-radius:14px}' +
      '.vlp-av-home>h2{display:none}' +
      '.vlp-av-home>.vlp-av-row{grid-column:1;grid-row:1;flex-wrap:nowrap}' +
      '.vlp-av-home>.vlp-av-row>[role=group]{flex:0 0 200px}' +
      '.vlp-av-home>.vlp-av-btn{grid-column:2;grid-row:1;align-self:end;width:210px;min-height:48px}' +
      '.vlp-av-home>.vlp-av-check{grid-column:1;grid-row:2;font-size:14px;min-height:28px}' +
      '.vlp-av-home>.vlp-av-check input{width:18px;height:18px}' +
      '.vlp-av-home>.vlp-av-browse{grid-column:2;grid-row:2;justify-self:end;align-self:center;margin:0;white-space:nowrap;text-decoration:none}' +
    '}',
    '.vlp-av-home{margin:0;text-align:left;width:100%;box-shadow:0 8px 24px rgba(23,32,42,.12)}',
    '.vlp-av-home .vlp-av-browse{align-self:center;text-decoration:underline}'
  ].join('');

  var WA_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5z"></path></svg>';

  // ---------------------------------------------------------------- helpers
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function todayLaPaz() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5); }
  function isIso(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || ''); }
  function fmt(iso, opts) { return new Date(iso + 'T12:00:00Z').toLocaleDateString(T.locale, Object.assign({ timeZone: 'UTC' }, opts)); }
  function dayShort(iso) { return fmt(iso, { weekday: 'short', month: 'short', day: 'numeric' }); } // Sat, Nov 21 / sáb, 21 nov
  function dayNum(iso) { return fmt(iso, { month: 'short', day: 'numeric' }); } // Nov 21 / 21 nov
  function dayWd(iso) { return fmt(iso, { weekday: 'short' }).replace('.', '') + ' ' + +iso.slice(8, 10); } // Sat 21 / sáb 21
  function dayLong(iso) { return fmt(iso, { weekday: 'long', month: 'long', day: 'numeric' }); } // Saturday, November 21
  function rangeShort(q) { return q.from === q.to ? dayNum(q.from) : dayNum(q.from) + ' – ' + dayNum(q.to); }
  function rangeHead(q) { return q.from === q.to ? (ES ? 'el ' : 'on ') + dayShort(q.from) : rangeShort(q); }
  function rangeWa(q) { return q.from === q.to ? T.onDay(dayLong(q.from)) : T.between(dayLong(q.from), dayLong(q.to)); }
  function fmtTime(t) {
    if (!t || t === '00:00') return T.anyDeparture; // Bókun day-only products (Good Medicine) report 00:00
    var p = t.split(':'), h = +p[0], m = p[1] || '00';
    if (ES) return h + ':' + m;
    return ((h + 11) % 12 + 1) + ':' + m + (h < 12 ? ' am' : ' pm');
  }
  function priceNum(s) { var m = /\$\s?([\d,]+(?:\.\d+)?)/.exec(s || ''); return m ? parseFloat(m[1].replace(/,/g, '')) : null; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US') + ' MXN'; }
  function track(ev, params) { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, params || {})); } catch (e) {} }
  // v54: home and activity boxes send people to /offerings before results exist; remember the search so the
  // availability_results event there carries the right search_page. Arriving with a date otherwise counts as 'link'.
  var ORIGIN_KEY = 'vlp_av_origin';
  function rememberOrigin(q, page) { try { sessionStorage.setItem(ORIGIN_KEY, JSON.stringify({ from: q.from, to: q.to, guests: q.guests, page: page })); } catch (e) {} }
  function takeOrigin(q) {
    try {
      var o = JSON.parse(sessionStorage.getItem(ORIGIN_KEY) || 'null'); sessionStorage.removeItem(ORIGIN_KEY);
      if (o && o.from === q.from && o.to === q.to && +o.guests === +q.guests) return o.page;
    } catch (e) {}
    return 'link';
  }
  function waLink(text, slug) {
    var src = '';
    try { src = sessionStorage.getItem('vlp_wa_src') || ''; } catch (e) {}
    var pre = { google: 'gads-', instagram: 'web-ig-', facebook: 'web-fb-' }[src] || 'web-';
    var code = '[' + pre + 'avail-' + String(slug || 'offerings').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) + ']';
    return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(text + ' ' + code);
  }

  // ---------------------------------------------------------------- query (URL <-> state)
  function readQuery() {
    var p; try { p = new URLSearchParams(location.search); } catch (e) { return null; }
    var today = todayLaPaz();
    var from = p.get('from') || p.get('date') || p.get('fecha');
    if (!isIso(from)) return null;
    var to = p.get('to'); if (!isIso(to)) to = from;
    if (to < from) { var x = from; from = to; to = x; }
    if (to < today) return null;
    if (from < today) from = today;
    if (daysBetween(from, to) >= MAX_RANGE) to = addDays(from, MAX_RANGE - 1);
    var g = parseInt(p.get('guests') || p.get('personas') || '2', 10); if (!(g >= 1)) g = 2; if (g > 40) g = 40;
    var after = p.get('after') || ''; if (!/^\d{2}:\d{2}$/.test(after)) after = '';
    return { from: from, to: to, guests: g, after: after };
  }
  function writeQuery(q) {
    try {
      var p = new URLSearchParams(location.search);
      ['date', 'fecha', 'from', 'to', 'guests', 'personas', 'after'].forEach(function (k) { p.delete(k); });
      if (q) {
        if (q.from === q.to) p.set('date', q.from); else { p.set('from', q.from); p.set('to', q.to); }
        p.set('guests', q.guests);
        if (q.after) p.set('after', q.after);
      }
      var s = p.toString();
      history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash);
    } catch (e) {}
  }

  // ---------------------------------------------------------------- search box (shared by home + offerings)
  function buildBox(opts) {
    var today = todayLaPaz();
    var q = opts.q || { from: '', to: '', guests: 2, after: '' };
    var box = el('form', { class: 'vlp-av-box' + (opts.home ? ' vlp-av-home' : ' vlp-av-off'), 'aria-label': T.check, novalidate: '' });
    var html = '';
    if (opts.home) html += '<h2>' + esc(T.heading) + '</h2>';
    // Row 1: date (+ "to" when flexible) and guests side by side; row 2 (offerings only): departing after + tour type
    var guestsHtml = '<div class="vlp-av-lbl" role="group" aria-label="' + esc(T.guests) + '">' + esc(T.guests) + '<div class="vlp-av-step"><button type="button" data-step="-1" aria-label="' + esc(T.fewer) + '">−</button><span aria-live="polite">' + esc(T.guest(q.guests)) + '</span><button type="button" data-step="1" aria-label="' + esc(T.more) + '">+</button></div></div>';
    html += '<div class="vlp-av-row">' +
      '<label class="vlp-av-lbl">' + esc(T.date) + '<span class="vlp-av-field"><input class="vlp-av-input" type="date" name="from" min="' + today + '" value="' + (q.from || '') + '"><span class="vlp-av-ph">' + esc(T.choose) + '</span></span></label>' +
      '<label class="vlp-av-lbl vlp-av-tolbl"' + (q.to && q.to !== q.from ? '' : ' hidden') + '>' + esc(T.to) + '<span class="vlp-av-field"><input class="vlp-av-input" type="date" name="to" min="' + today + '" value="' + (q.to && q.to !== q.from ? q.to : '') + '"><span class="vlp-av-ph">' + esc(T.choose) + '</span></span></label>' +
      guestsHtml + '</div>';
    var checkHtml = '<label class="vlp-av-check"><input type="checkbox" name="flex"' + (q.to && q.to !== q.from ? ' checked' : '') + '>' + esc(T.flexible) + '</label>';
    if (opts.home) html += checkHtml;
    else {
      // Offerings: flexible dates and departure time sit behind "More search options"
      var openOpts = !!(q.after || (q.to && q.to !== q.from));
      html += '<button type="button" class="vlp-av-link vlp-av-moreopt" aria-expanded="' + openOpts + '">' + esc(T.moreOpts) + ' ▾ <span>' + esc(T.moreOptsHint) + '</span></button>' +
        '<div class="vlp-av-opts"' + (openOpts ? '' : ' hidden') + '>' + checkHtml +
        '<label class="vlp-av-lbl">' + esc(T.after) + '<select class="vlp-av-input" name="after" style="font-weight:500;color:#46525C">' +
        ['', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00'].map(function (t) {
          return '<option value="' + t + '"' + (q.after === t ? ' selected' : '') + '>' + esc(t ? fmtTime(t) : T.anyTime) + '</option>';
        }).join('') + '</select></label></div>';
    }
    html += '<button type="submit" class="vlp-av-btn">' + esc(T.check) + '</button>';
    if (!opts.home) html += '<button type="button" class="vlp-av-link vlp-av-clear"' + (opts.q ? '' : ' hidden') + '>' + esc(T.clear) + '</button>';
    box.innerHTML = html;

    var guests = q.guests;
    var fromIn = box.querySelector('[name=from]'), toIn = box.querySelector('[name=to]'), flex = box.querySelector('[name=flex]');
    var toLbl = box.querySelector('.vlp-av-tolbl'), gLbl = box.querySelector('.vlp-av-step span');
    function syncPh(inp) { inp.parentNode.classList.toggle('has-val', !!inp.value); }
    [fromIn, toIn].forEach(function (inp) {
      syncPh(inp);
      inp.addEventListener('input', function () { syncPh(inp); });
      inp.addEventListener('change', function () { syncPh(inp); });
      // Open the calendar wherever the field is clicked, not only on the calendar icon
      inp.addEventListener('click', function () { try { inp.showPicker(); } catch (e) {} });
    });
    fromIn.addEventListener('change', function () {
      if (fromIn.value) { toIn.min = fromIn.value; toIn.max = addDays(fromIn.value, MAX_RANGE - 1); if (toIn.value && toIn.value < fromIn.value) { toIn.value = ''; syncPh(toIn); } }
    });
    flex.addEventListener('change', function () { toLbl.hidden = !flex.checked; if (!flex.checked) { toIn.value = ''; syncPh(toIn); } });
    box.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () { guests = Math.min(40, Math.max(1, guests + +b.getAttribute('data-step'))); gLbl.textContent = T.guest(guests); });
    });
    box.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!fromIn.value) { fromIn.focus(); try { fromIn.showPicker(); } catch (x) {} return; }
      var from = fromIn.value, to = flex.checked && toIn.value ? toIn.value : from;
      if (to < from) { var x = from; from = to; to = x; }
      if (daysBetween(from, to) >= MAX_RANGE) to = addDays(from, MAX_RANGE - 1);
      var afterSel = box.querySelector('[name=after]');
      opts.onSearch({ from: from, to: to, guests: guests, after: afterSel ? afterSel.value : '' });
    });
    var clearBtn = box.querySelector('.vlp-av-clear');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      fromIn.value = ''; toIn.value = ''; flex.checked = false; toLbl.hidden = true; syncPh(fromIn); syncPh(toIn);
      clearBtn.hidden = true; opts.onClear();
    });
    box._showClear = function () { if (clearBtn) clearBtn.hidden = false; };
    var moreBtn = box.querySelector('.vlp-av-moreopt'), optsEl = box.querySelector('.vlp-av-opts');
    if (moreBtn) moreBtn.addEventListener('click', function () { optsEl.hidden = !optsEl.hidden; moreBtn.setAttribute('aria-expanded', String(!optsEl.hidden)); });
    // Put a query back into the form (used after the previous/next day buttons)
    box._set = function (nq) {
      fromIn.value = nq.from; syncPh(fromIn);
      var range = nq.to !== nq.from; flex.checked = range; toLbl.hidden = !range; toIn.value = range ? nq.to : ''; syncPh(toIn);
      guests = nq.guests; gLbl.textContent = T.guest(guests);
    };
    return box;
  }

  function addCss() { if (document.getElementById('vlp-av-css')) return; var s = el('style', { id: 'vlp-av-css' }); s.textContent = CSS; document.head.appendChild(s); }

  // ---------------------------------------------------------------- HOME
  function initHome() {
    var content = document.querySelector('.home-hero-content');
    if (!content) return;
    addCss();
    var box = buildBox({
      home: true,
      onSearch: function (q) {
        track('availability_search', { search_from: q.from, search_to: q.to, guests: q.guests, search_page: 'home' });
        rememberOrigin(q, 'home');
        var p = new URLSearchParams();
        if (q.from === q.to) p.set('date', q.from); else { p.set('from', q.from); p.set('to', q.to); }
        p.set('guests', q.guests);
        location.href = (ES ? '/es' : '') + '/offerings?' + p.toString();
      }
    });
    // The hero has a fixed height, so the box goes right below it, overlapping its bottom edge (as in the mockup)
    var hero = content.closest('.home-hero-full-bleed') || content.closest('.home-hero-card') || content;
    var wrap = el('div', { class: 'vlp-av-homewrap' });
    wrap.appendChild(box);
    hero.parentNode.insertBefore(wrap, hero.nextSibling);
    var cta = content.querySelector('.home-hero-cta');
    if (cta) { cta.classList.add('vlp-av-link', 'vlp-av-browse'); cta.classList.remove('home-hero-cta'); cta.textContent = T.browse; box.appendChild(cta); }
  }

  // ---------------------------------------------------------------- ACTIVITY PAGES (v53, Nov 4 2026)
  // /activities/<slug> and /es/activities/<slug>: a date + guests box under the title that sends people to
  // /offerings?activity=<slug>&date=…&guests=… (the activity's offers with live availability). The activity slugs
  // are the same as the /offerings activity chips.
  function initActivity() {
    var hero = document.querySelector('.detail-hero');
    if (!hero || !actSlug) return;
    addCss();
    var whale = actSlug === 'swimming-with-the-whale-sharks';
    if (whale) { initWhaleCalendar(hero); return; }   // v55: month calendar across all operators instead of the date box
    var title = whale ? (ES ? 'Qué tours de tiburón ballena tienen lugar en tu día?' : 'Which whale shark tours have space on your day?') : T.heading;
    var note = ES ? 'En vivo desde los calendarios de reserva de cada operador.' : "Live from the operators' booking calendars.";
    var box = buildBox({
      home: true,
      onSearch: function (q) {
        track('availability_search', { search_from: q.from, search_to: q.to, guests: q.guests, search_page: 'activity-' + actSlug });
        rememberOrigin(q, 'activity-' + actSlug);
        var p = new URLSearchParams();
        p.set('activity', actSlug);
        if (q.from === q.to) p.set('date', q.from); else { p.set('from', q.from); p.set('to', q.to); }
        p.set('guests', q.guests);
        location.href = (ES ? '/es' : '') + '/offerings?' + p.toString();
      }
    });
    var bh = box.querySelector('h2'); if (bh) bh.parentNode.removeChild(bh);
    var wrap = el('div', { class: 'vlp-av-actwrap' });
    wrap.innerHTML = '<h2 class="vlp-av-acth">' + esc(title) + '</h2><p class="vlp-av-actnote">' + esc(note) + '</p>';
    wrap.appendChild(box);
    hero.appendChild(wrap);
    var s = el('style', { id: 'vlp-av-actcss' });
    s.textContent = '.vlp-av-actwrap{max-width:792px;margin:20px 0 8px;box-sizing:border-box;font-family:"DM Sans",sans-serif}' +
      '.vlp-av-acth{font-size:20px;line-height:1.25;margin:0 0 4px;font-weight:600}' +
      '.vlp-av-actnote{margin:0 0 12px;font-size:15px;opacity:.75}' +
      '.vlp-av-actwrap .vlp-av-home{box-shadow:0 4px 16px rgba(23,32,42,.10)}';
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- WHALE SHARK CALENDAR (v55, Nov 8 2026)
  // /activities/swimming-with-the-whale-sharks (and /es): a month calendar of every whale shark operator's departures,
  // from the Worker's /month route. Each day shows how many operators have online space for the party (amber ring =
  // a departure listed as "call to book"). Picking a day lists the operators' trips with Book buttons to the offer page.
  // Good Medicine's Whale Shark After Hours shows only on days where another operator has online space and the boat is
  // free, below their trips, as an upgrade. Call-to-book departures get an "Ask about this departure" WhatsApp button
  // (Nov 8: the automated Notify me / waitlist was rolled back until Peter learns how operators handle call-to-book trips).
  function initWhaleCalendar(hero) {
    var MONTH_API = API.replace(/\/search$/, '/month');
    var W = ES ? {
      title: 'Qué operadores tienen lugar en tu día?', note: 'Todos los operadores de tiburón ballena con los que trabajamos, en vivo desde sus calendarios de reserva.',
      ops: function (n) { return n === 1 ? '1 operador con lugar' : n + ' operadores con lugar'; },
      legendOps: 'Operadores con lugar para reservar en línea', legendCall: 'Una salida que todavía no se puede reservar en línea',
      prev: 'Mes anterior', next: 'Mes siguiente', loading: 'Consultando los calendarios de los operadores…',
      failed: 'No pudimos consultar la disponibilidad en vivo en este momento.', seeAll: 'Ver todos los tours de tiburón ballena',
      sub: function (n, g) { return (n === 1 ? '1 operador con lugar' : n + ' operadores con lugar') + ' para ' + T.guest(g) + '.'; },
      noneOnline: 'Todavía no hay salidas para reservar en línea este día.', none: 'No hay salidas de tiburón ballena publicadas para este día.',
      closest: 'Fecha más cercana con lugar:', ask: 'Pregúntanos por WhatsApp', cantFind: 'No encuentras tu fecha?',
      book: 'Reservar', bookAt: function (t) { return 'Reservar ' + t; }, options: function (n) { return n + ' opciones'; },
      shared: 'COMPARTIDO', priv: 'PRIVADO', upgrade: 'MEJORA · HAZLO PRIVADO', upgradeNote: 'Solo tu grupo, en el catamarán privado de Good Medicine.',
      callNote: function (t) { return 'La salida de las ' + t + ' está publicada, pero todavía no se puede reservar en línea.'; },
      askDep: 'Preguntar por esta salida', waCall: function (op, what, t, d, g) { return 'Hola! Me interesa ' + what + ' con ' + op + ' a las ' + t + ' ' + d + ' para ' + T.guest(g) + '. Se puede reservar?'; }, noSpaceOthers: function (list) { return 'Sin lugar este día: ' + list + '.'; },
      waAsk: function (d, g) { return 'Hola! Busco un tour de tiburón ballena ' + d + ' para ' + T.guest(g) + '. Me pueden ayudar?'; },
      waUp: function (d, g) { return 'Hola! Me interesa Whale Shark After Hours ' + d + ' para ' + T.guest(g) + '. Está disponible?'; }
    } : {
      title: 'Who has space on your day?', note: "All whale shark operators we work with, live from their booking calendars.",
      ops: function (n) { return n === 1 ? '1 operator with space' : n + ' operators with space'; },
      legendOps: 'Operators with space you can book online', legendCall: "A departure that isn't bookable online yet",
      prev: 'Previous month', next: 'Next month', loading: "Checking the operators' calendars…",
      failed: "We couldn't check live availability just now.", seeAll: 'See all whale shark tours',
      sub: function (n, g) { return (n === 1 ? '1 operator with space' : n + ' operators with space') + ' for ' + T.guest(g) + '.'; },
      noneOnline: 'Nothing bookable online this day yet.', none: 'No whale shark departures are listed for this day.',
      closest: 'Closest date with space:', ask: 'Ask us on WhatsApp', cantFind: "Can't find your date?",
      book: 'Book', bookAt: function (t) { return 'Book ' + t; }, options: function (n) { return n + ' options'; },
      shared: 'SHARED', priv: 'PRIVATE', upgrade: 'UPGRADE · MAKE IT PRIVATE', upgradeNote: "Just your group, on Good Medicine's private catamaran.",
      callNote: function (t) { return t + ' departure is listed but not open for online booking yet.'; },
      askDep: 'Ask about this departure', waCall: function (op, what, t, d, g) { return "Hi! I'm interested in " + what + ' with ' + op + ' at ' + t + ' ' + d + ' for ' + T.guest(g) + '. Can it be booked?'; }, noSpaceOthers: function (list) { return 'No space this day: ' + list + '.'; },
      waAsk: function (d, g) { return "Hi! I'm looking for a whale shark tour " + d + ' for ' + T.guest(g) + '. Can you help?'; },
      waUp: function (d, g) { return "Hi! I'm interested in Whale Shark After Hours " + d + ' for ' + T.guest(g) + '. Is it available?'; }
    };
    var CSSW = [
      '.vlp-wc{max-width:1120px;margin:20px 0 8px;font-family:"DM Sans",sans-serif;color:#17202A;box-sizing:border-box}',
      '.vlp-wc *{box-sizing:border-box}',
      '.vlp-wc [hidden]{display:none!important}',
      '.vlp-wc-h{font-size:22px;line-height:1.25;margin:0 0 4px;font-weight:700}',
      '.vlp-wc-note{margin:0 0 14px;font-size:15px;opacity:.8}',
      '.vlp-wc-cols{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}',
      '.vlp-wc-cal{flex:1 1 340px;max-width:460px;background:#fff;border:1px solid #E5DFD1;border-radius:12px;padding:14px 12px;display:flex;flex-direction:column;gap:12px;box-shadow:0 4px 16px rgba(23,32,42,.08)}',
      '.vlp-wc-day{flex:999 1 420px;min-width:0;display:flex;flex-direction:column;gap:12px}',
      '.vlp-wc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.vlp-wc-nav{width:44px;height:44px;flex:none;border:1px solid #E5DFD1;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;color:#17202A;cursor:pointer;padding:0}',
      '.vlp-wc-nav:disabled{color:#A3ABB2;cursor:default}',
      '.vlp-wc-mo{font-size:17px;font-weight:700}',
      '.vlp-wc-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}',
      '.vlp-wc-wd{text-align:center;font-size:12px;font-weight:700;color:#46525C;padding:4px 0;text-transform:capitalize}',
      '.vlp-wc-c{height:54px;border:1px solid transparent;border-radius:8px;background:none;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3px;padding:6px 0 0;font:inherit;font-size:15px;color:#46525C;cursor:pointer}',
      '.vlp-wc-c:disabled{cursor:default}',
      '.vlp-wc-c.past{color:#A3ABB2}',
      '.vlp-wc-c.open{border-color:#CFE3D5;background:#F2F9F4;color:#17202A;font-weight:600}',
      '.vlp-wc-c.call{border-color:#E8D3AE;background:#FFFBF3;color:#17202A;font-weight:600}',
      '.vlp-wc-c.sel{border:2px solid #B51E66;background:#B51E66;color:#fff;font-weight:700;padding-top:5px}',
      '.vlp-wc-c:focus-visible,.vlp-wc-nav:focus-visible,.vlp-wc button:focus-visible,.vlp-wc a:focus-visible{outline:2px solid #B51E66;outline-offset:2px}',
      '.vlp-wc-mk{display:flex;align-items:center;gap:3px;min-height:18px}',
      '.vlp-wc-n{min-width:18px;height:18px;border-radius:999px;background:#1C6B3A;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}',
      '.vlp-wc-c.sel .vlp-wc-n{background:#fff;color:#B51E66}',
      '.vlp-wc-ring{width:8px;height:8px;border-radius:999px;border:2px solid #B56B00;flex:none}',
      '.vlp-wc-c.sel .vlp-wc-ring{border-color:#fff}',
      '.vlp-wc-leg{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#46525C}',
      '.vlp-wc-leg span{display:flex;align-items:center;gap:8px}.vlp-wc-leg i{width:18px;display:flex;justify-content:center;flex:none;font-style:normal}',
      '.vlp-wc-g{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:#46525C;border-top:1px solid #EFEAE0;padding-top:10px}',
      '.vlp-wc-step{display:flex;align-items:center;border:1px solid #E5DFD1;border-radius:8px;padding:2px;min-height:44px}',
      '.vlp-wc-step button{width:38px;height:38px;border:none;border-radius:6px;background:#F4EFE6;font:inherit;font-size:20px;font-weight:600;color:#17202A;cursor:pointer;padding:0;line-height:1}',
      '.vlp-wc-step span{min-width:84px;text-align:center;font-size:15px;color:#17202A}',
      '.vlp-wc-dh h2{margin:0;font-size:22px;font-weight:700;line-height:1.25;text-transform:none}',
      '.vlp-wc-dh p{margin:4px 0 0;font-size:14px;color:#46525C}',
      '.vlp-wc-card{background:#fff;border:1px solid #E5DFD1;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px}',
      '.vlp-wc-k{font-size:12px;font-weight:700;letter-spacing:.4px;color:#46525C;text-transform:uppercase}',
      '.vlp-wc-card h3{margin:0;font-size:18px;font-weight:600;line-height:1.3}',
      '.vlp-wc-pr{font-size:15px;font-weight:600}.vlp-wc-pr span{font-weight:400;font-size:14px;color:#46525C}',
      '.vlp-wc-btns{display:flex;gap:8px;flex-wrap:wrap}',
      '.vlp-wc-book{min-height:44px;display:inline-flex;align-items:center;background:#1D5FA8;color:#fff!important;border-radius:999px;padding:0 16px;font-size:15px;font-weight:600;text-decoration:none!important;white-space:nowrap}',
      '.vlp-wc-book:hover{background:#17508E}',
      '.vlp-wc-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 12px;border-top:1px solid #EFEAE0;padding-top:10px}',
      '.vlp-wc-rt{display:flex;flex-direction:column;gap:2px;flex:1 1 200px;min-width:0}.vlp-wc-row b{font-size:16px;font-weight:600}.vlp-wc-row small{font-size:14px;color:#46525C}.vlp-wc-row .vlp-wc-btns{flex:0 0 auto}',
      '.vlp-wc-tsdb{background:#FFF4E0;border-radius:8px;padding:9px 12px;font-size:13px;color:#6A4300;line-height:1.35}',
      '.vlp-wc-card.up{background:#F4EFE6}.vlp-wc-card.up .vlp-wc-k{color:#B51E66}',
      '.vlp-wc-card.cb{background:#FFFBF3;border-color:#E8D3AE}.vlp-wc-card.cb .vlp-wc-k{color:#7A4A00}.vlp-wc-cbn{font-size:14px;color:#6A4300;line-height:1.4}',
      '.vlp-wc-out{min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;font:inherit;font-size:15px;font-weight:600;text-decoration:none!important;cursor:pointer;background:#fff}',
      '.vlp-wc-out.mag{border:1.5px solid #B51E66;color:#B51E66!important}',
      '.vlp-wc-out.amb{border:1.5px solid #7A4A00;color:#7A4A00!important}',
      '.vlp-wc-out.grn{border:0;background:#0F7A3F;color:#fff!important}',
      '.vlp-wc-muted{margin:0;font-size:14px;color:#46525C;line-height:1.4}',
      '.vlp-wc-link{font:inherit;font-size:14px;font-weight:600;color:#B51E66;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}',
      '.vlp-wc-help{background:#F4EFE6;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px}.vlp-wc-help b{font-size:15px}'
    ].join('');
    var CH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>';

    var today = todayLaPaz();
    var p0; try { p0 = new URLSearchParams(location.search); } catch (e) { p0 = { get: function () { return null; } }; }
    var guests = parseInt(p0.get('guests') || p0.get('personas') || '2', 10); if (!(guests >= 1)) guests = 2; if (guests > 40) guests = 40;
    var sel = isIso(p0.get('date')) && p0.get('date') >= today ? p0.get('date') : '';
    var month = (sel || today).slice(0, 7);
    var minMonth = today.slice(0, 7), maxMonth = addMonths(minMonth, 5);
    var cache = {}, cur = null, searched = false, picked = !!sel;

    function addMonths(ym, n) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + String(m + 1).padStart(2, '0'); }
    function monthEnd(ym) { var d = new Date(ym + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); }
    function unitLabel(u) { return /person|persona/i.test(u || '') ? T.perPerson : u ? T.perGroup : ''; }
    function nm(o) { return ES ? (o.name_es || o.name) : o.name; }
    function offerHref(o, d) { return (ES ? '/es' : '') + '/offerings/' + o.slug + '?date=' + d + '&guests=' + guests; }

    // Everything for one day, for the current party size
    function dayInfo(d) {
      var out = { ops: {}, groups: [], calls: [], ups: [], none: [] };
      if (!cur) return out;
      var byOp = {};
      cur.offers.forEach(function (o) {
        if (!o.whale) return;
        if (!o.live) { // no own calendar (Whale Shark After Hours): decided below, once we know others have space
          if ((o.boat_free || []).indexOf(d) >= 0 && !(o.cap && o.cap < guests)) out.ups.push(o);
          return;
        }
        if (!o.ok || o.inquiry) return;
        if (o.type === 'private' && o.cap && o.cap < guests) return;
        var slots = ((o.days || {})[d] || []).filter(function (s) {
          if (s.s != null && s.s < guests) return false;
          if (s.s == null && o.type === 'shared' && o.cap && o.cap < guests) return false;
          return true;
        });
        if (slots.length) {
          out.ops[o.op] = 1;
          (byOp[o.op] = byOp[o.op] || []).push({ o: o, slots: slots });
          return;
        }
        var calls = ((o.calls || {})[d] || []);
        if (calls.length) out.calls.push({ o: o, t: calls[0].t });
      });
      var first = function (g) { return g.items.reduce(function (m, x) { var t = x.o.tsdb ? '99:99' : x.slots[0].t || '99:99'; return t < m ? t : m; }, '99:99'); };
      out.groups = Object.keys(byOp).map(function (op) { return { op: op, items: byOp[op] }; });
      out.groups.sort(function (a, b) { return first(a).localeCompare(first(b)) || a.op.localeCompare(b.op); });
      out.n = out.groups.length;
      if (!out.n) out.ups = []; // After Hours only next to another operator's whale shark trip
      cur.offers.forEach(function (o) { if (o.whale && o.live && o.ok && !o.inquiry && o.op && !out.ops[o.op] && out.none.indexOf(o.op) < 0) out.none.push(o.op); });
      return out;
    }

    // ------------------------------------------------ DOM
    addCss();
    var st = el('style', { id: 'vlp-wc-css' }); st.textContent = CSSW; document.head.appendChild(st);
    var wrap = el('section', { class: 'vlp-wc', 'aria-label': W.title });
    wrap.innerHTML = '<h2 class="vlp-wc-h">' + esc(W.title) + '</h2><p class="vlp-wc-note">' + esc(W.note) + '</p>' +
      '<div class="vlp-wc-cols"><div class="vlp-wc-cal">' +
        '<div class="vlp-wc-top"><button type="button" class="vlp-wc-nav" data-m="-1" aria-label="' + esc(W.prev) + '">' + CH + '</button>' +
        '<span class="vlp-wc-mo" aria-live="polite"></span>' +
        '<button type="button" class="vlp-wc-nav" data-m="1" aria-label="' + esc(W.next) + '">' + CH.replace('M15 6l-6 6 6 6', 'M9 6l6 6-6 6') + '</button></div>' +
        '<div class="vlp-wc-grid" role="group"></div>' +
        '<div class="vlp-wc-leg"><span><i><span class="vlp-wc-n">2</span></i>' + esc(W.legendOps) + '</span><span><i><span class="vlp-wc-ring"></span></i>' + esc(W.legendCall) + '</span></div>' +
        '<div class="vlp-wc-g">' + esc(T.guests.charAt(0) + T.guests.slice(1).toLowerCase()) +
          '<div class="vlp-wc-step" role="group" aria-label="' + esc(T.guests) + '"><button type="button" data-g="-1" aria-label="' + esc(T.fewer) + '">−</button><span aria-live="polite"></span><button type="button" data-g="1" aria-label="' + esc(T.more) + '">+</button></div></div>' +
      '</div><div class="vlp-wc-day" aria-live="polite"></div></div>';
    hero.appendChild(wrap);
    var gridEl = wrap.querySelector('.vlp-wc-grid'), moEl = wrap.querySelector('.vlp-wc-mo'), dayEl = wrap.querySelector('.vlp-wc-day');
    var gEl = wrap.querySelector('.vlp-wc-step span');
    wrap.querySelectorAll('.vlp-wc-nav').forEach(function (b) {
      b.addEventListener('click', function () { var m = addMonths(month, +b.getAttribute('data-m')); if (m < minMonth || m > maxMonth) return; month = m; sel = ''; load(); });
    });
    wrap.querySelectorAll('[data-g]').forEach(function (b) {
      b.addEventListener('click', function () { guests = Math.min(40, Math.max(1, guests + +b.getAttribute('data-g'))); syncUrl(); draw(); });
    });

    function syncUrl() {
      try {
        var p = new URLSearchParams(location.search);
        p.delete('date'); p.delete('guests');
        if (sel) p.set('date', sel);
        p.set('guests', guests);
        history.replaceState(history.state, '', location.pathname + '?' + p.toString() + location.hash);
      } catch (e) {}
    }

    function load() {
      var ym = month;
      var from = ym === minMonth ? today : ym + '-01', to = monthEnd(ym);
      drawGrid(true);
      dayEl.innerHTML = '<div class="vlp-av-spin">' + esc(W.loading) + '</div>';
      var got = cache[ym] ? Promise.resolve(cache[ym]) : fetch(MONTH_API + '?activity=whale&from=' + from + '&to=' + to, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || r.status); return j; }); });
      got.then(function (j) {
        cache[ym] = j;
        if (month !== ym) return;
        cur = j;
        if (!sel || sel.slice(0, 7) !== ym) { // first day with space this month, else the first day shown
          sel = '';
          for (var d = from; d <= to; d = addDays(d, 1)) if (dayInfo(d).n) { sel = d; break; }
          if (!sel) sel = from;
        }
        draw();
      }).catch(function () {
        if (month !== ym) return;
        cur = null; drawGrid(false);
        dayEl.innerHTML = '<div class="vlp-wc-help"><b>' + esc(W.failed) + '</b><button type="button" class="vlp-wc-link" style="align-self:flex-start">' + esc(T.retry) + '</button>' +
          '<a class="vlp-wc-out mag" href="' + (ES ? '/es' : '') + '/offerings?activity=swimming-with-the-whale-sharks">' + esc(W.seeAll) + '</a></div>';
        dayEl.querySelector('button').addEventListener('click', load);
      });
    }

    function draw() { gEl.textContent = T.guest(guests); drawGrid(false); drawDay(); }

    function drawGrid(loading) {
      gEl.textContent = T.guest(guests);
      moEl.textContent = fmt(month + '-15', { month: 'long', year: 'numeric' }).replace(/^./, function (x) { return x.toUpperCase(); });
      wrap.querySelector('[data-m="-1"]').disabled = month <= minMonth;
      wrap.querySelector('[data-m="1"]').disabled = month >= maxMonth;
      var first = month + '-01', last = monthEnd(month);
      var lead = new Date(first + 'T12:00:00Z').getUTCDay(); // 0 = Sunday
      var html = '';
      for (var i = 0; i < 7; i++) html += '<span class="vlp-wc-wd" aria-hidden="true">' + esc(fmt(addDays('2026-11-01', i), { weekday: 'short' }).replace('.', '').slice(0, 2)) + '</span>';
      for (i = 0; i < lead; i++) html += '<span></span>';
      for (var d = first; d <= last; d = addDays(d, 1)) {
        var n = +d.slice(8, 10);
        if (d < today) { html += '<button type="button" class="vlp-wc-c past" disabled>' + n + '<span class="vlp-wc-mk"></span></button>'; continue; }
        var inf = !loading && cur ? dayInfo(d) : { n: 0, calls: [] };
        var cls = d === sel && !loading ? 'sel' : inf.n ? 'open' : inf.calls.length ? 'call' : '';
        var mk = (inf.n ? '<span class="vlp-wc-n">' + inf.n + '</span>' : '') + (inf.calls.length ? '<span class="vlp-wc-ring"></span>' : '');
        var lbl = dayLong(d) + ': ' + (inf.n ? W.ops(inf.n) : W.noneOnline) + (inf.calls.length && inf.n ? '. ' + W.legendCall : '');
        html += '<button type="button" class="vlp-wc-c ' + cls + '" data-d="' + d + '"' + (loading ? ' disabled' : '') + (d === sel ? ' aria-pressed="true"' : '') +
          ' aria-label="' + esc(lbl) + '">' + n + '<span class="vlp-wc-mk">' + mk + '</span></button>';
      }
      gridEl.innerHTML = html;
      gridEl.querySelectorAll('[data-d]').forEach(function (b) {
        b.addEventListener('click', function () {
          sel = b.getAttribute('data-d'); picked = true; syncUrl(); draw();
          var inf = dayInfo(sel);
          if (!searched) { searched = true; track('availability_search', { search_from: sel, search_to: sel, guests: guests, search_page: 'activity-whale-calendar' }); }
          track('availability_results', { search_from: sel, search_to: sel, guests: guests, search_page: 'whale-calendar', results: inf.n });
          if (window.innerWidth < 768) dayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    function drawDay() {
      if (!cur || !sel) return;
      var inf = dayInfo(sel), d = sel, h = '';
      h += '<div class="vlp-wc-dh"><h2>' + esc(dayLong(d).replace(/^./, function (c) { return c.toUpperCase(); })) + '</h2>' +
        '<p>' + esc(inf.n ? W.sub(inf.n, guests) : inf.calls.length ? W.noneOnline : W.none) + '</p></div>';
      inf.groups.forEach(function (g) {
        var tsdb = g.items.some(function (x) { return x.o.tsdb; });
        if (g.items.length === 1) {
          var x = g.items[0], o = x.o;
          h += '<article class="vlp-wc-card"><span class="vlp-wc-k">' + esc(o.op) + ' · ' + esc(o.type === 'private' ? W.priv : W.shared) + '</span>' +
            '<h3>' + esc(nm(o)) + '</h3>' + priceHtml(o) + (tsdb ? '<div class="vlp-wc-tsdb">' + esc(T.tsdbNote) + '</div>' : '') +
            '<div class="vlp-wc-btns">' + bookBtns(o, x.slots, d) + '</div></article>';
        } else {
          h += '<article class="vlp-wc-card"><span class="vlp-wc-k">' + esc(g.op) + ' · ' + esc(W.options(g.items.length)) + '</span>' +
            (tsdb ? '<div class="vlp-wc-tsdb">' + esc(T.tsdbNote) + '</div>' : '') +
            g.items.map(function (x) {
              return '<div class="vlp-wc-row"><div class="vlp-wc-rt"><b>' + esc(nm(x.o)) + '</b><small>' + esc([x.o.price, unitLabel(x.o.unit)].filter(Boolean).join(' ')) + '</small></div>' +
                '<div class="vlp-wc-btns">' + bookBtns(x.o, x.slots, d) + '</div></div>';
            }).join('') + '</article>';
        }
      });
      inf.ups.forEach(function (o) {
        h += '<article class="vlp-wc-card up"><span class="vlp-wc-k">' + esc(W.upgrade) + '</span><h3>' + esc(nm(o)) + '</h3>' +
          '<p class="vlp-wc-muted">' + esc(W.upgradeNote) + '</p>' + priceHtml(o) +
          '<a class="vlp-wc-out mag whatsapp-link" data-wa-source="whale-calendar-upgrade" target="_blank" rel="noopener" href="' + esc(waLink(W.waUp(T.onDay(dayLong(d)), guests), o.slug)) + '">' + esc(T.bookWa) + '</a>' +
          '<a class="vlp-wc-link" href="' + esc(offerHref(o, d)) + '">' + esc(ES ? 'Ver detalles' : 'See details') + '</a></article>';
      });
      inf.calls.forEach(function (c, i) {
        var o = c.o;
        h += '<article class="vlp-wc-card cb"><span class="vlp-wc-k">' + esc(o.op) + ' · ' + esc(o.type === 'private' ? W.priv : W.shared) + '</span>' +
          '<h3>' + esc(nm(o)) + '</h3>' + priceHtml(o) + '<span class="vlp-wc-cbn">' + esc(W.callNote(fmtTime(c.t))) + '</span>' +
          '<a class="vlp-wc-out grn whatsapp-link" data-wa-source="whale-calendar-call" target="_blank" rel="noopener" href="' + esc(waLink(W.waCall(o.op, nm(o), fmtTime(c.t), T.onDay(dayLong(d)), guests), o.slug)) + '">' + WA_ICON + esc(W.askDep) + '</a></article>';
      });
      var noSpace = inf.none.filter(function (op) { return !inf.calls.some(function (c) { return c.o.op === op; }); });
      if (inf.n && noSpace.length) h += '<p class="vlp-wc-muted">' + esc(W.noSpaceOthers(noSpace.join(', '))) + '</p>';
      if (!inf.n) {
        var next = '';
        for (var x2 = addDays(d, 1); x2 <= monthEnd(month); x2 = addDays(x2, 1)) if (dayInfo(x2).n) { next = x2; break; }
        if (next) h += '<p class="vlp-wc-muted">' + esc(W.closest) + ' <button type="button" class="vlp-wc-link" data-go="' + next + '">' + esc(dayShort(next)) + '</button></p>';
      }
      h += '<div class="vlp-wc-help"><b>' + esc(W.cantFind) + '</b><a class="vlp-wc-out grn whatsapp-link" data-wa-source="whale-calendar" target="_blank" rel="noopener" href="' +
        esc(waLink(W.waAsk(T.onDay(dayLong(d)), guests), 'whale-calendar')) + '">' + WA_ICON + esc(W.ask) + '</a></div>';
      dayEl.innerHTML = h;
      dayEl.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { sel = b.getAttribute('data-go'); syncUrl(); draw(); }); });
    }

    function priceHtml(o) { return o.price ? '<span class="vlp-wc-pr">' + esc(o.price) + ' <span>' + esc(unitLabel(o.unit)) + '</span></span>' : ''; }
    function bookBtns(o, slots, d) {
      if (o.tsdb || !slots[0].t || slots[0].t === '00:00') return '<a class="vlp-wc-book" href="' + esc(offerHref(o, d)) + '">' + esc(W.book) + '</a>';
      return slots.map(function (s) {
        var t = fmtTime(s.t);
        if (o.type === 'shared' && s.s != null && s.s <= 5) t += ' · ' + T.left(s.s);
        return '<a class="vlp-wc-book" href="' + esc(offerHref(o, d)) + '">' + esc(W.bookAt(t)) + '</a>';
      }).join('');
    }

    load();
  }

  // ---------------------------------------------------------------- OFFERINGS
  var cards = [], grid, listWrap, box, sumEl, headEl, msgEl, moreEl, askEl;
  var data = null, q = null, showFull = false, pending = 0;
  var resultsFor = null;   // v54: search_page label for the next availability_results event (set by each new search)

  function slugOf(item) {
    var a = item.querySelector('a.offering-card') || item.querySelector('a[href*="/offerings/"]');
    if (!a) return '';
    return (a.getAttribute('href') || '').split('?')[0].replace(/\/+$/, '').split('/').pop();
  }
  function hiddenByFilters(c) { return c.el.style.display === 'none'; }

  function initOfferings() {
    var items = document.querySelectorAll('.offering-card-item');
    if (!items.length) return;
    addCss();
    grid = items[0].parentElement;
    listWrap = grid.parentElement;
    for (var i = 0; i < items.length; i++) cards.push({ el: items[i], slug: slugOf(items[i]) });

    landingCopy();
    q = readQuery();
    box = buildBox({ q: q, onSearch: function (nq) { q = nq; writeQuery(q); box._showClear(); track('availability_search', { search_from: q.from, search_to: q.to, guests: q.guests, search_page: 'offerings' }); resultsFor = 'offerings'; showSummary(); run(); }, onClear: clearAll });
    var root = document.querySelector('.offerings-filter-root');
    var chips = document.querySelector('[data-offerings-chips]');
    if (root && chips && chips.parentNode === root) root.insertBefore(box, chips); else listWrap.parentNode.insertBefore(box, listWrap);
    // Search summary shown instead of the form whenever a date is set (arriving from home, a shared link, or after a search)
    sumEl = el('section', { class: 'vlp-av-sum', hidden: '', 'aria-label': T.check });
    box.parentNode.insertBefore(sumEl, box);
    relabelCards();
    var afterSel = box.querySelector('[name=after]');
    afterSel.addEventListener('change', function () { if (q) { q.after = afterSel.value; writeQuery(q); render(); } });

    headEl = el('div', { class: 'vlp-av-head', hidden: '' });
    msgEl = el('div', { hidden: '' });
    listWrap.parentNode.insertBefore(headEl, listWrap);
    listWrap.parentNode.insertBefore(msgEl, listWrap);
    moreEl = el('div', { class: 'vlp-av-more', hidden: '' });
    askEl = el('section', { class: 'vlp-av-ask', hidden: '', 'aria-label': T.askTitle('') });
    listWrap.parentNode.insertBefore(moreEl, listWrap.nextSibling);
    listWrap.parentNode.insertBefore(askEl, moreEl.nextSibling);

    // Re-render when the other filters show/hide cards (they set inline display)
    var raf = 0;
    var mo = new MutationObserver(function () { if (!data) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(render); });
    cards.forEach(function (c) { mo.observe(c.el, { attributes: true, attributeFilter: ['style'] }); });
    document.addEventListener('vlp-request-ready', function () { if (data) render(); });

    if (q) { resultsFor = takeOrigin(q); showSummary(); run(); }
  }

  // Whale shark landing (v52, Nov 4 2026): /offerings?activity=swimming-with-the-whale-sharks (ads link here) gets its own
  // heading and intro, so the page reads as "live whale shark availability across operators". Other filters unchanged.
  function landingCopy() {
    var act = ''; try { act = new URLSearchParams(location.search).get('activity') || ''; } catch (e) {}
    if (act !== 'swimming-with-the-whale-sharks') return;
    var L = ES ? {
      h1: 'Nado con tiburón ballena en La Paz: disponibilidad en vivo',
      p: 'Elige tu fecha y cuántas personas son. Revisamos en vivo los calendarios de varios operadores locales de tiburón ballena y te mostramos qué salidas tienen lugar y a qué precio.',
      title: 'Tiburón ballena en La Paz: disponibilidad en vivo | Vamos a La Paz'
    } : {
      h1: 'Whale shark tours in La Paz: live availability',
      p: 'Pick your date and party size. We check the booking calendars of several local whale shark operators live and show you which departures have space, and the price.',
      title: 'Whale shark tours in La Paz: live availability | Vamos a La Paz'
    };
    var h = document.querySelector('.offerings-heading'), p = document.querySelector('.offerings-intro');
    if (h) h.textContent = L.h1;
    if (p) p.textContent = L.p;
    document.title = L.title;
  }

  function showSummary() {
    var single = q.from === q.to, today = todayLaPaz();
    var when = single ? fmt(q.from, { weekday: 'long', month: 'long', day: 'numeric' }) : rangeShort(q);
    var extra = T.guest(q.guests) + (q.after ? ' · ' + T.after2(fmtTime(q.after)) : '');
    var nav = '';
    if (single) {
      var prev = addDays(q.from, -1), next = addDays(q.from, 1);
      nav = '<div class="vlp-av-sumnav">' + (prev >= today ? '<button type="button" data-d="' + prev + '">← ' + esc(dayWd(prev)) + '</button>' : '') +
        '<button type="button" data-d="' + next + '">' + esc(dayWd(next)) + ' →</button></div>';
    }
    sumEl.innerHTML = '<div class="vlp-av-sumtxt"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B51E66" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path></svg>' +
      '<span><b class="vlp-av-long">' + esc(when) + '</b><b class="vlp-av-short">' + esc(single ? dayShort(q.from) : rangeShort(q)) + '</b><i class="vlp-av-dot"> · </i><span>' + esc(extra) + '</span></span></div>' + nav +
      '<button type="button" class="vlp-av-edit">' + esc(T.edit) + '</button>';
    sumEl.querySelectorAll('[data-d]').forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.getAttribute('data-d');
        q = { from: d, to: d, guests: q.guests, after: q.after };
        box._set(q); writeQuery(q);
        track('availability_search', { search_from: q.from, search_to: q.to, guests: q.guests, search_page: 'offerings-daynav' });
        resultsFor = 'offerings-daynav'; showSummary(); run();
      });
    });
    sumEl.querySelector('.vlp-av-edit').addEventListener('click', function () {
      sumEl.hidden = true; box.hidden = false;
      var f = box.querySelector('[name=from]'); if (f) f.focus();
    });
    sumEl.hidden = false; box.hidden = true;
  }

  // Price unit next to the price, "per tour" → "per group" (shown text only; the CMS field is unchanged), Spanish labels on /es
  function relabelCards() {
    cards.forEach(function (c) {
      var suf = c.el.querySelector('.offering-card-price-suffix');
      if (suf) {
        var t = suf.textContent.trim().toLowerCase();
        if (t === 'per tour') suf.textContent = T.perGroup;
        else if (t === 'per person') suf.textContent = T.perPerson;
      }
      if (ES) c.el.querySelectorAll('.offering-card-meta').forEach(function (m) {
        var t = m.textContent.trim();
        if (t === 'Private Tour') m.textContent = T.privTour; else if (t === 'Shared Tour') m.textContent = T.sharedTour;
      });
    });
  }

  function clearAll() {
    q = null; data = null; showFull = false; resultsFor = null; writeQuery(null);
    if (sumEl) { sumEl.hidden = true; sumEl.innerHTML = ''; } box.hidden = false;
    document.body.classList.remove('vlp-av-on');
    cards.forEach(function (c) {
      c.el.classList.remove('vlp-av-hide', 'vlp-av-full');
      var s = c.el.querySelector('.vlp-av-strip, .vlp-av-fulltag'); if (s) s.remove();
    });
    [headEl, msgEl, moreEl, askEl].forEach(function (e) { e.hidden = true; e.innerHTML = ''; });
  }

  function fetchRange(from, to) {
    return fetch(API + '?from=' + from + '&to=' + to, { headers: { Accept: 'application/json' } }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || r.status); return j; });
    });
  }

  function run() {
    var my = ++pending;
    data = null;
    document.body.classList.add('vlp-av-on');
    headEl.hidden = true; moreEl.hidden = true; askEl.hidden = true;
    msgEl.className = 'vlp-av-msg'; msgEl.hidden = false;
    msgEl.innerHTML = '<div class="vlp-av-spin" role="status">' + esc(T.checking(rangeHead(q).replace(/^(on|el) /, ''))) + '</div>';
    fetchRange(q.from, q.to).then(function (j) {
      if (my !== pending) return;
      data = j; msgEl.hidden = true; render();
    }).catch(function () {
      if (my !== pending) return;
      document.body.classList.remove('vlp-av-on');
      msgEl.className = 'vlp-av-warn'; msgEl.hidden = false;
      msgEl.innerHTML = esc(T.failed) + ' <button type="button" class="vlp-av-link">' + esc(T.retry) + '</button>';
      msgEl.querySelector('button').addEventListener('click', run);
    });
  }

  // open departures of one offer for the current query → {date: [slot]} (only days with something that fits)
  function openDays(o) {
    var out = {}, n = 0, g = q.guests;
    if (o.cap && o.cap < g && o.type === 'private') return { days: out, n: 0 };
    for (var d in o.days || {}) {
      if (d < q.from || d > q.to) continue;
      var list = o.days[d].filter(function (s) {
        if (s.s != null && s.s < g) return false;
        if (s.s == null && o.type === 'shared' && o.cap && o.cap < g) return false;
        if (q.after && s.t && s.t !== '00:00' && !o.tsdb && !o.inquiry && s.t < q.after) return false;
        return true;
      });
      if (list.length) { out[d] = list; n++; }
    }
    return { days: out, n: n };
  }

  function stripHtml(o, od) {
    var dates = Object.keys(od.days).sort();
    var single = q.from === q.to;
    if (o.tsdb) {
      if (single) return '<div class="vlp-av-tsdb"><b>' + esc(T.space) + ' · ' + esc(T.tsdb) + '</b><span>' + esc(T.tsdbNote) + '</span></div>';
      return '<div class="vlp-av-days">' + dates.slice(0, 6).map(function (d) {
        return '<div class="vlp-av-day"><b>' + esc(dayWd(d)) + '</b><span class="vlp-av-tsdbday">' + esc(T.space) + ' · ' + esc(T.tsdb) + '</span></div>';
      }).join('') + '</div>' + (dates.length > 6 ? '<span class="vlp-av-note">' + esc(T.moreDays(dates.length - 6)) + '</span>' : '') +
        '<span class="vlp-av-note" style="font-size:13px;color:#6A4300">' + esc(T.tsdbNote) + '</span>';
    }
    function chips(list) {
      // Day-only trips (no departure time, e.g. Good Medicine): no chip — the "AVAILABLE" caption already says it
      // Inquiry offers (calendar read, booked on WhatsApp, e.g. Miko): the calendar's start time is a placeholder
      list = list.filter(function (s) { return s.t && s.t !== '00:00' && !o.inquiry; });
      if (!list.length) return single ? '' : '<span class="vlp-av-chip">' + esc(T.anyDeparture) + '</span>';
      return list.map(function (s) {
        var t = fmtTime(s.t);
        if (o.type === 'shared' && s.s != null && s.s <= 5) t += ' · ' + T.left(s.s);
        return '<span class="vlp-av-chip">' + esc(t) + '</span>';
      }).join('');
    }
    var priv = o.type === 'private' ? '<span class="vlp-av-note">' + esc(T.privateNote) + '</span>' : '';
    if (o.inquiry && !rqOk(o.slug)) priv += '<span class="vlp-av-note vlp-av-wa">' + esc(T.bookWa) + '</span>';
    if (single && o.inquiry && rqOk(o.slug)) {
      return '<span class="vlp-av-cap">' + esc(T.available) + '</span><div class="vlp-av-chips">' + priv + '</div>' + rqButtons(o.slug, dates[0], true);
    }
    if (single) {
      return '<span class="vlp-av-cap">' + esc(o.type === 'shared' ? T.departures : T.available) + '</span><div class="vlp-av-chips">' + chips(od.days[dates[0]]) + priv + '</div>';
    }
    return '<div class="vlp-av-days">' + dates.slice(0, 6).map(function (d) {
      return '<div class="vlp-av-day"><b>' + esc(dayWd(d)) + '</b><div class="vlp-av-chips">' + chips(od.days[d]) + '</div></div>';
    }).join('') + '</div>' + (dates.length > 6 ? '<span class="vlp-av-note">' + esc(T.moreDays(dates.length - 6)) + '</span>' : '') + priv;
  }

  // Request to book (request.js, loaded separately): which offers allow it, and its texts
  function rqOk(slug) { return !!(window.VamosRequest && window.VamosRequest.isEligible(slug)); }
  function RQ() {
    return ES ? { req: 'Solicitar reserva', askWa: 'Preguntar por WhatsApp', reqShort: 'Retenemos el 20% de depósito, sin cobrar. Se cobra solo si el dueño confirma.',
        waShort: 'No estás seguro? Pregúntanos antes de comprometerte.', waQ: 'Dudas primero? Pregunta por WhatsApp',
        cardHelp: 'Tu tarjeta se retiene, no se cobra. El dueño confirma en 6 horas o se libera. Puedes cancelar la retención cuando quieras.' }
      : { req: 'Request to book', askWa: 'Ask on WhatsApp', reqShort: 'Pay a 20% deposit hold now. Charged only if the owner confirms.',
        waShort: 'Not sure yet? Chat with us before committing.', waQ: 'Questions first? Ask on WhatsApp',
        cardHelp: 'Your card is held, not charged. The owner confirms within 6 hours, or the hold is released. You can cancel your hold at any time.' };
  }
  function rqButtons(slug, date, onCard) {
    var o = (data && data.offers || []).filter(function (x) { return x.slug === slug; })[0] || {};
    var name = ES ? (o.name_es || o.name) : o.name;
    var msg = T.waOne((ES ? 'el ' : 'the ') + name + (o.boat ? ' (' + o.boat + ')' : ''), rangeWa(q), q.guests);
    return '<div class="vlp-av-rqcard">' +
      '<button type="button" class="vlp-av-rqbtn" data-vlp-request="' + esc(slug) + '" data-vlp-date="' + esc(date || '') + '" data-vlp-guests="' + q.guests + '">' + esc(RQ().req) + '</button>' +
      '<span class="vlp-av-rqnote">' + esc(RQ().cardHelp) + '</span>' +
      '<a class="vlp-av-wa vlp-av-waout whatsapp-link" data-wa-source="availability-card" target="_blank" rel="noopener" href="' + esc(waLink(msg, o.boat ? o.boat.replace(/\s+/g, '-') : slug)) + '">' + WA_ICON + esc(RQ().waQ) + '</a>' +
      '</div>';
  }

  function render() {
    if (!data || !q) return;
    var bySlug = {};
    data.offers.forEach(function (o) { bySlug[o.slug] = o; });
    var open = 0, full = 0, ask = [];
    cards.forEach(function (c) {
      var o = bySlug[c.slug], card = c.el;
      var old = card.querySelector('.vlp-av-strip, .vlp-av-fulltag'); if (old) old.remove();
      card.classList.remove('vlp-av-hide', 'vlp-av-full');
      if (!o) return;                      // not in Airtable's visible list: leave the card as it is
      if (!o.live) { card.classList.add('vlp-av-hide'); if (!hiddenByFilters(c)) ask.push({ c: c, o: o }); return; }
      if (!o.ok) return;                   // platform didn't answer: keep the card, no times
      var od = openDays(o);
      var body = card.querySelector('.offering-card-body') || card;
      if (od.n) {
        var s = el('div', { class: 'vlp-av-strip' }, stripHtml(o, od));
        body.appendChild(s);
        if (!hiddenByFilters(c)) open++;
      } else {
        if (!hiddenByFilters(c)) full++;
        if (showFull) { card.classList.add('vlp-av-full'); body.appendChild(el('span', { class: 'vlp-av-fulltag' }, esc(T.fullOn(rangeShort(q))))); }
        else card.classList.add('vlp-av-hide');
      }
    });

    headEl.hidden = !open;
    headEl.innerHTML = '<h2>' + esc(T.openOn('', open)) + '</h2><p>' + esc(T.sub(q.guests)) + '</p>';

    moreEl.hidden = !full;
    moreEl.innerHTML = esc(T.hidden(full, rangeHead(q))) + ' <button type="button" class="vlp-av-link" style="display:inline;padding:0">' + esc(showFull ? T.hideFull : T.showAnyway) + '</button>';
    var tb = moreEl.querySelector('button'); if (tb) tb.addEventListener('click', function () { showFull = !showFull; render(); });

    renderAsk(ask);

    // v54: once per search, after the first render (filter changes re-render without a new event)
    if (resultsFor) {
      track('availability_results', { search_from: q.from, search_to: q.to, guests: q.guests, search_page: resultsFor, results: open });
      resultsFor = null;
    }

    if (!open) renderNothing(); else if (!msgEl.classList.contains('vlp-av-warn')) msgEl.hidden = true;
  }

  function renderAsk(ask) {
    // Group by boat (offers without a boat stand alone); drop offers too small for the party
    var groups = {}, order = [];
    ask.forEach(function (a) {
      if (a.o.cap && a.o.cap < q.guests) return;
      var k = a.o.boat_id || a.o.slug;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(a);
    });
    if (!order.length) { askEl.hidden = true; askEl.innerHTML = ''; return; }
    // Boats we know are free come first
    function freeDays(list) {
      var f = {};
      list.forEach(function (a) { (a.o.boat_free || []).forEach(function (d) { if (d >= q.from && d <= q.to) f[d] = 1; }); });
      return Object.keys(f).sort();
    }
    order.sort(function (a, b) { return (freeDays(groups[b]).length ? 1 : 0) - (freeDays(groups[a]).length ? 1 : 0); });

    // Boats with a live calendar on another offer (Good Medicine): their inquiry-only offers show only when the boat is free
    var liveBoats = {};
    data.offers.forEach(function (x) { if (x.live && x.ok && x.boat_id) liveBoats[x.boat_id] = 1; });
    var rows = order.map(function (k) {
      var list = groups[k], o = list[0].o, free = freeDays(list);
      var hasBoatCalendar = !!(o.boat_id && liveBoats[o.boat_id]);
      if (hasBoatCalendar && !free.length) return '';   // boat has a calendar and is booked on these dates
      var img = list[0].c.el.querySelector('img');
      var src = img ? (img.currentSrc || img.src) : '';
      var maxCap = Math.max.apply(null, list.map(function (a) { return a.o.cap || 0; }));
      var name = function (x) { return ES ? (x.name_es || x.name) : x.name; };
      var title, line2, line3 = '', tripsHtml = '';
      if (list.length === 1) {
        title = name(o);
        line2 = [o.boat || o.op, maxCap ? T.upTo(maxCap) : ''].filter(Boolean).join(' · ');
        line3 = o.price ? '<strong>' + esc(o.price) + '</strong>' : '';
      } else {
        title = o.boat || o.op;
        line2 = [maxCap ? T.upTo(maxCap) : '', T.trips(list.length)].filter(Boolean).join(' · ');
        var nums = list.map(function (a) { return priceNum(a.o.price); }).filter(function (n) { return n; });
        if (nums.length) line3 = '<strong>' + esc(T.from + money(Math.min.apply(null, nums))) + '</strong>';
        tripsHtml = '<div class="vlp-av-trips">' + list.map(function (a) {
          var href = a.c.el.querySelector('a.offering-card') ? a.c.el.querySelector('a.offering-card').getAttribute('href') : (ES ? '/es' : '') + '/offerings/' + a.o.slug;
          return '<a href="' + esc(href) + '">' + esc(name(a.o)) + '</a>';
        }).join('') + '</div>';
      }
      if (free.length) line3 += '<em>' + esc(q.from === q.to ? T.boatFree : T.boatFreeOn(free.map(dayNum).join(', '))) + '</em>';
      var what = list.length === 1 ? (ES ? 'el ' : 'the ') + name(o) + (o.boat && o.boat !== name(o) ? (ES ? ' (' + o.boat + ')' : ' (' + o.boat + ')') : '') : (ES ? 'el ' : 'the ') + title;
      var msg = T.waOne(what, rangeWa(q), q.guests);
      var btn = free.length ? T.bookWa : T.askBtn(rangeShort(q));
      var rqSlug = null;
      list.forEach(function (a) { if (!rqSlug && rqOk(a.o.slug)) rqSlug = a.o.slug; });
      if (rqSlug) {
        return '<div class="vlp-av-askrow">' +
          '<div class="vlp-av-askrow-top">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '') +
          '<div class="vlp-av-askrow-txt"><b>' + esc(title) + '</b><span>' + esc(line2) + '</span>' + line3 + '</div></div>' +
          tripsHtml +
          '<div class="vlp-av-rq2">' +
          '<button type="button" class="vlp-av-rqbtn" data-vlp-request="' + esc(rqSlug) + '" data-vlp-date="' + (q.from === q.to ? q.from : '') + '" data-vlp-guests="' + q.guests + '">' + esc(RQ().req) + '</button>' +
          '<a class="vlp-av-wa vlp-av-waout whatsapp-link" data-wa-source="availability-ask" target="_blank" rel="noopener" href="' + esc(waLink(msg, o.boat ? o.boat.replace(/\s+/g, '-') : o.slug)) + '">' + WA_ICON + esc(RQ().askWa) + '</a>' +
          '</div><div class="vlp-av-rqhelp"><span>' + esc(RQ().reqShort) + '</span><span>' + esc(RQ().waShort) + '</span></div>' +
          '</div>';
      }
      return '<div class="vlp-av-askrow">' +
        '<div class="vlp-av-askrow-top">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy">' : '') +
        '<div class="vlp-av-askrow-txt"><b>' + esc(title) + '</b><span>' + esc(line2) + '</span>' + line3 + '</div></div>' +
        tripsHtml +
        '<a class="vlp-av-wa whatsapp-link" data-wa-source="availability-ask" target="_blank" rel="noopener" href="' + esc(waLink(msg, o.boat ? o.boat.replace(/\s+/g, '-') : o.slug)) + '">' + WA_ICON + esc(btn) + '</a>' +
        '</div>';
    }).filter(Boolean);
    if (!rows.length) { askEl.hidden = true; askEl.innerHTML = ''; return; }

    var SHOW = 3;
    askEl.innerHTML = '<h2>' + esc(T.askTitle(rangeShort(q))) + '</h2><p>' + esc(T.askIntro) + '</p>' +
      '<div class="vlp-av-askgrid">' + rows.map(function (r, i) { return i < SHOW ? r : r.replace('class="vlp-av-askrow"', 'class="vlp-av-askrow" hidden'); }).join('') + '</div>' +
      (rows.length > SHOW ? '<button type="button" class="vlp-av-link" style="align-self:center">' + esc(T.moreBoats(rows.length - SHOW)) + '</button>' : '');
    var more = askEl.querySelector(':scope > button');
    if (more) more.addEventListener('click', function () { askEl.querySelectorAll('.vlp-av-askrow[hidden]').forEach(function (r) { r.hidden = false; }); more.remove(); });
    askEl.hidden = false;
  }

  // Nothing open: suggest the closest dates (±3 days around the search) that do have space
  function renderNothing() {
    var my = pending;
    msgEl.className = 'vlp-av-msg'; msgEl.hidden = false;
    var findMsg = T.waFind(rangeWa(q), q.guests);
    var html = '<h2>' + esc(T.nothing(q.guests, rangeHead(q))) + '</h2><div class="vlp-av-near"></div>' +
      '<a class="vlp-av-wa whatsapp-link" data-wa-source="availability-none" target="_blank" rel="noopener" href="' + esc(waLink(findMsg, 'none')) + '">' + WA_ICON + esc(T.askFind(rangeShort(q))) + '</a>';
    msgEl.innerHTML = html;
    var today = todayLaPaz();
    var f = addDays(q.from, -3); if (f < today) f = today;
    var t = addDays(q.to, 3); if (daysBetween(f, t) >= MAX_RANGE) t = addDays(f, MAX_RANGE - 1);
    var visible = {};
    cards.forEach(function (c) { if (!hiddenByFilters(c)) visible[c.slug] = 1; });
    fetchRange(f, t).then(function (j) {
      if (my !== pending) return;
      var counts = {};
      j.offers.forEach(function (o) {
        if (!o.live || !o.ok || !visible[o.slug]) return;
        var save = q; q = { from: f, to: t, guests: save.guests, after: save.after };
        var od = openDays(o); q = save;
        Object.keys(od.days).forEach(function (d) { if (d < q.from || d > q.to) counts[d] = (counts[d] || 0) + 1; });
      });
      var ds = Object.keys(counts).sort(function (a, b) { return Math.abs(daysBetween(q.from, a)) - Math.abs(daysBetween(q.from, b)) || a.localeCompare(b); }).slice(0, 3).sort();
      var near = msgEl.querySelector('.vlp-av-near');
      if (!near || !ds.length) return;
      near.innerHTML = '<p>' + esc(T.nearby) + '</p><div class="vlp-av-dates">' + ds.map(function (d) {
        return '<button type="button" data-d="' + d + '">' + esc(dayShort(d)) + '<span>' + esc(T.nOpen(counts[d])) + '</span></button>';
      }).join('') + '</div>';
      near.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var d = b.getAttribute('data-d');
          q = { from: d, to: d, guests: q.guests, after: q.after };
          var fi = box.querySelector('[name=from]'); fi.value = d; fi.parentNode.classList.add('has-val');
          var fx = box.querySelector('[name=flex]'); fx.checked = false; box.querySelector('.vlp-av-tolbl').hidden = true;
          writeQuery(q); resultsFor = 'offerings-nearby'; run(); window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
        });
      });
    }).catch(function () {});
  }

  function init() { if (isOfferings) initOfferings(); else if (actSlug) initActivity(); else initHome(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
