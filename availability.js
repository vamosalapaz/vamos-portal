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
   v51: first release (Oct 29, 2026). */
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
  if (!isOfferings && !isHome) return;

  var T = ES ? {
    heading: 'Quién tiene lugar en tu día?', date: 'FECHA', to: 'HASTA', guests: 'PERSONAS', flexible: 'Mis fechas son flexibles (hasta 14 días)',
    check: 'Consultar disponibilidad', browse: 'O ver todos los tours y actividades', after: 'SALIDA DESPUÉS DE', anyTime: 'Cualquier hora',
    clear: 'Quitar fecha', choose: 'Elige una fecha', fewer: 'Menos personas', more: 'Más personas',
    guest: function (n) { return n + (n === 1 ? ' persona' : ' personas'); },
    checking: function (d) { return 'Consultando disponibilidad en vivo para ' + d + '…'; },
    openOn: function (d, n) { return 'Disponibles ' + d + ' · ' + n; },
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
    heading: 'Who has space on your day?', date: 'DATE', to: 'TO', guests: 'GUESTS', flexible: 'My dates are flexible (up to 14 days)',
    check: 'Check availability', browse: 'Or browse all tours & activities', after: 'DEPARTING AFTER', anyTime: 'Any time',
    clear: 'Clear date', choose: 'Choose a date', fewer: 'Fewer guests', more: 'More guests',
    guest: function (n) { return n + (n === 1 ? ' guest' : ' guests'); },
    checking: function (d) { return 'Checking live availability for ' + d + '…'; },
    openOn: function (d, n) { return 'Open ' + d + ' · ' + n; },
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
    '.vlp-av-field.has-val .vlp-av-ph{display:none}',
    '.vlp-av-field:not(.has-val) .vlp-av-input{color:transparent}',
    '.vlp-av-field:not(.has-val) .vlp-av-input:focus{color:#17202A}',
    '.vlp-av-step{display:flex;align-items:center;justify-content:space-between;border:1px solid #E5DFD1;border-radius:8px;padding:2px;min-height:48px}',
    '.vlp-av-step button{width:38px;height:42px;flex:none;border:none;border-radius:6px;background:#F4EFE6;font:inherit;font-size:22px;font-weight:600;color:#17202A;cursor:pointer;line-height:1;padding:0}',
    '.vlp-av-step span{font-size:15px;font-weight:600;letter-spacing:0;color:#17202A;white-space:nowrap;padding:0 4px}',
    '.vlp-av-check{display:flex;align-items:center;gap:10px;font-size:15px;color:#17202A;min-height:40px;font-weight:400;letter-spacing:0;cursor:pointer;margin:0}',
    '.vlp-av-check input{width:22px;height:22px;accent-color:#B51E66;margin:0}',
    '.vlp-av-btn{min-height:50px;display:flex;align-items:center;justify-content:center;background:#B51E66;color:#fff!important;border:none;border-radius:999px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none;width:100%}',
    '.vlp-av-btn:hover{background:#9C1958}',
    '.vlp-av-link{font-size:14px;font-weight:600;color:#B51E66;background:none;border:none;padding:4px 0;font-family:inherit;cursor:pointer;text-decoration:underline;align-self:flex-start}',
    '.vlp-av-box h2{margin:0;font-size:18px;font-weight:700;line-height:1.25;color:#17202A}',
    '.vlp-av-box .offerings-select-wrap{margin:0}',
    '.vlp-av-on [data-offerings-count]{display:none!important}',
    '.vlp-av-hide{display:none!important}',
    '.vlp-av-head{display:flex;flex-direction:column;gap:4px;margin:4px 0 14px;font-family:"DM Sans",sans-serif}',
    '.vlp-av-head h2{margin:0;font-size:21px;font-weight:700;color:#17202A;line-height:1.25}',
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
    '.vlp-av-dates{display:flex;flex-direction:column;gap:8px}',
    '.vlp-av-dates button{min-height:48px;display:flex;align-items:center;justify-content:space-between;border:1px solid #1C6B3A;border-radius:8px;padding:0 14px;background:#fff;font:inherit;font-size:15px;font-weight:600;color:#17202A;cursor:pointer}',
    '.vlp-av-dates button span{color:#1C6B3A;font-size:14px}',
    '.vlp-av-home{margin:18px 0 6px;text-align:left;max-width:440px;width:100%}',
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
  function dayWd(iso) { return fmt(iso, { weekday: 'short', day: 'numeric' }); } // Sat 21 / sáb 21
  function dayLong(iso) { return fmt(iso, { weekday: 'long', month: 'long', day: 'numeric' }); } // Saturday, November 21
  function rangeShort(q) { return q.from === q.to ? dayNum(q.from) : dayNum(q.from) + ' – ' + dayNum(q.to); }
  function rangeHead(q) { return q.from === q.to ? (ES ? 'el ' : 'on ') + dayShort(q.from) : rangeShort(q); }
  function rangeWa(q) { return q.from === q.to ? T.onDay(dayLong(q.from)) : T.between(dayLong(q.from), dayLong(q.to)); }
  function fmtTime(t) {
    if (!t) return T.anyDeparture;
    var p = t.split(':'), h = +p[0], m = p[1] || '00';
    if (ES) return h + ':' + m;
    return ((h + 11) % 12 + 1) + ':' + m + (h < 12 ? ' am' : ' pm');
  }
  function priceNum(s) { var m = /\$\s?([\d,]+(?:\.\d+)?)/.exec(s || ''); return m ? parseFloat(m[1].replace(/,/g, '')) : null; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US') + ' MXN'; }
  function track(ev, params) { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, params || {})); } catch (e) {} }
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
    var box = el('form', { class: 'vlp-av-box' + (opts.home ? ' vlp-av-home' : ''), 'aria-label': T.check, novalidate: '' });
    var html = '';
    if (opts.home) html += '<h2>' + esc(T.heading) + '</h2>';
    html += '<div class="vlp-av-row">' +
      '<label class="vlp-av-lbl">' + esc(T.date) + '<span class="vlp-av-field"><input class="vlp-av-input" type="date" name="from" min="' + today + '" value="' + (q.from || '') + '"><span class="vlp-av-ph">' + esc(T.choose) + '</span></span></label>' +
      '<label class="vlp-av-lbl vlp-av-tolbl"' + (q.to && q.to !== q.from ? '' : ' hidden') + '>' + esc(T.to) + '<span class="vlp-av-field"><input class="vlp-av-input" type="date" name="to" min="' + today + '" value="' + (q.to && q.to !== q.from ? q.to : '') + '"><span class="vlp-av-ph">' + esc(T.choose) + '</span></span></label>' +
      '</div>' +
      '<label class="vlp-av-check"><input type="checkbox" name="flex"' + (q.to && q.to !== q.from ? ' checked' : '') + '>' + esc(T.flexible) + '</label>' +
      '<div class="vlp-av-row">' +
      '<div class="vlp-av-lbl" role="group" aria-label="' + esc(T.guests) + '">' + esc(T.guests) + '<div class="vlp-av-step"><button type="button" data-step="-1" aria-label="' + esc(T.fewer) + '">−</button><span aria-live="polite">' + esc(T.guest(q.guests)) + '</span><button type="button" data-step="1" aria-label="' + esc(T.more) + '">+</button></div></div>';
    if (!opts.home) {
      html += '<label class="vlp-av-lbl">' + esc(T.after) + '<select class="vlp-av-input" name="after" style="font-weight:500;color:#46525C">' +
        ['', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00'].map(function (t) {
          return '<option value="' + t + '"' + (q.after === t ? ' selected' : '') + '>' + esc(t ? fmtTime(t) : T.anyTime) + '</option>';
        }).join('') + '</select></label>';
    }
    html += '</div><div class="vlp-av-slot"></div>' +
      '<button type="submit" class="vlp-av-btn">' + esc(T.check) + '</button>';
    if (!opts.home) html += '<button type="button" class="vlp-av-link vlp-av-clear"' + (opts.q ? '' : ' hidden') + '>' + esc(T.clear) + '</button>';
    box.innerHTML = html;

    var guests = q.guests;
    var fromIn = box.querySelector('[name=from]'), toIn = box.querySelector('[name=to]'), flex = box.querySelector('[name=flex]');
    var toLbl = box.querySelector('.vlp-av-tolbl'), gLbl = box.querySelector('.vlp-av-step span');
    function syncPh(inp) { inp.parentNode.classList.toggle('has-val', !!inp.value); }
    [fromIn, toIn].forEach(function (inp) { syncPh(inp); inp.addEventListener('input', function () { syncPh(inp); }); inp.addEventListener('change', function () { syncPh(inp); }); });
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
        var p = new URLSearchParams();
        if (q.from === q.to) p.set('date', q.from); else { p.set('from', q.from); p.set('to', q.to); }
        p.set('guests', q.guests);
        location.href = (ES ? '/es' : '') + '/offerings?' + p.toString();
      }
    });
    var sub = content.querySelector('.home-hero-subtitle');
    var cta = content.querySelector('.home-hero-cta');
    if (sub && sub.nextSibling) content.insertBefore(box, sub.nextSibling); else content.appendChild(box);
    if (cta) { cta.classList.add('vlp-av-link', 'vlp-av-browse'); cta.classList.remove('home-hero-cta'); cta.textContent = T.browse; box.appendChild(cta); }
  }

  // ---------------------------------------------------------------- OFFERINGS
  var cards = [], grid, listWrap, box, headEl, msgEl, moreEl, askEl;
  var data = null, q = null, showFull = false, pending = 0;

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

    q = readQuery();
    box = buildBox({ q: q, onSearch: function (nq) { q = nq; writeQuery(q); box._showClear(); track('availability_search', { search_from: q.from, search_to: q.to, guests: q.guests, search_page: 'offerings' }); run(); }, onClear: clearAll });
    var root = document.querySelector('.offerings-filter-root');
    var chips = document.querySelector('[data-offerings-chips]');
    if (root && chips && chips.parentNode === root) root.insertBefore(box, chips); else listWrap.parentNode.insertBefore(box, listWrap);
    // Move the existing Tour type dropdown (handled by the filter script) into the box, next to "departing after"
    var typeSel = document.querySelector('[data-offerings-tourtype]');
    var typeWrap = typeSel && typeSel.closest('.offerings-select-wrap');
    if (typeWrap) box.querySelector('.vlp-av-slot').appendChild(typeWrap);
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

    if (q) run();
  }

  function clearAll() {
    q = null; data = null; showFull = false; writeQuery(null);
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
        if (q.after && s.t && !o.tsdb && s.t < q.after) return false;
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
      return list.map(function (s) {
        var t = fmtTime(s.t);
        if (o.type === 'shared' && s.s != null && s.s <= 5) t += ' · ' + T.left(s.s);
        return '<span class="vlp-av-chip">' + esc(t) + '</span>';
      }).join('');
    }
    var priv = o.type === 'private' ? '<span class="vlp-av-note">' + esc(T.privateNote) + '</span>' : '';
    if (single) {
      return '<span class="vlp-av-cap">' + esc(o.type === 'shared' ? T.departures : T.available) + '</span><div class="vlp-av-chips">' + chips(od.days[dates[0]]) + priv + '</div>';
    }
    return '<div class="vlp-av-days">' + dates.slice(0, 6).map(function (d) {
      return '<div class="vlp-av-day"><b>' + esc(dayWd(d)) + '</b><div class="vlp-av-chips">' + chips(od.days[d]) + '</div></div>';
    }).join('') + '</div>' + (dates.length > 6 ? '<span class="vlp-av-note">' + esc(T.moreDays(dates.length - 6)) + '</span>' : '') + priv;
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
    headEl.innerHTML = '<h2>' + esc(T.openOn(rangeHead(q), open)) + '</h2><p>' + esc(T.sub(q.guests)) + '</p>';

    moreEl.hidden = !full;
    moreEl.innerHTML = esc(T.hidden(full, rangeHead(q))) + ' <button type="button" class="vlp-av-link" style="display:inline;padding:0">' + esc(showFull ? T.hideFull : T.showAnyway) + '</button>';
    var tb = moreEl.querySelector('button'); if (tb) tb.addEventListener('click', function () { showFull = !showFull; render(); });

    renderAsk(ask);

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

    var rows = order.map(function (k) {
      var list = groups[k], o = list[0].o, free = freeDays(list);
      var hasBoatCalendar = list.some(function (a) { return a.o.boat_free; });
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
          writeQuery(q); run(); window.scrollTo({ top: box.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
        });
      });
    }).catch(function () {});
  }

  function init() { if (isOfferings) initOfferings(); else initHome(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
