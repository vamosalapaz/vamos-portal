/* Vamos a La Paz — Request to book (Oct 30, 2026; Nov 4: live boat calendar on the offer page and in the form;
   Nov 5: Book Now offers (deposit charged at checkout, confirmed instantly; "Preview" ones only with ?booknow=1), large-group
   and extra-night pricing, multi-day trips need every day free, and the Bókun widget is hidden on Book Now offer pages;
   Nov 5 pm: form tidy-up — calendar collapses to the picked date, − / + steppers, country code on WhatsApp, pinned header,
   sticky deposit + pay bar, page behind locked, short extras line, cancellation shown as a reassurance box)
   Nov 13, 2026: the online booking button on offer pages (.vlp-book-btn from the widget embed code) reads "Book now" /
   "Reservar ahora" instead of "Check availability" / "Ver disponibilidad" (the note under it already says it's instant).
   Card-hold booking requests for private-owner boats (approved mockup "Vamos request to book").
   - Loads the offers that allow it from the vamos-requests Worker (/eligible).
   - Offer pages (/offerings/<slug>, /es/offerings/<slug>): adds "Request to book" + helper text beside the WhatsApp button.
   - Any element with data-vlp-request="<slug>" (availability results) opens the form; data-vlp-date / data-vlp-guests prefill it.
   - The form posts to /request and sends the traveller to Stripe for the card hold.
   Exposes window.VamosRequest = { ready: Promise, isEligible(slug), open(slug, opts) } and fires "vlp-request-ready". */
(function () {
  if (window.VamosRequest) return;
  var API = 'https://vamos-requests.solitary-wind-dfb8.workers.dev';
  var AV = 'https://vamos-availability.solitary-wind-dfb8.workers.dev';
  var ES = /^\/es(\/|$)/.test(location.pathname) || (document.documentElement.lang || '').slice(0, 2) === 'es';
  var PINK = '#B51E66', INK = '#17202A', MUTED = '#46525C', LINE = '#E5DFD1', SAND = '#F4EFE6';
  var T = ES ? {
    req: 'Solicitar reserva', cardT: 'Reserva directo con el dueño', reqHelp: 'Retenemos el 20% de depósito en tu tarjeta, sin cobrarlo. El dueño confirma en 6 horas o se libera. Puedes cancelar la retención cuando quieras.',
    reqHelpN: function (p) { return 'Retenemos el ' + p + '% de depósito en tu tarjeta, sin cobrarlo. El dueño confirma en 6 horas o se libera. Puedes cancelar la retención cuando quieras.'; },
    waHelp: '¿Dudas? Escríbenos antes de comprometerte.'.replace(/[¿¡]/g, ''),
    title: 'Solicitar reserva', sub: 'barco privado, solo tu grupo', trip: 'VIAJE', date: 'FECHA', guests: 'PERSONAS', nights: 'NOCHES',
    name: 'TU NOMBRE', namePh: 'Nombre completo', wa: 'NÚMERO DE WHATSAPP', waHint: 'Te escribimos aquí en cuanto el dueño responda.',
    note: 'ALGO QUE DEBA SABER EL DUEÑO (OPCIONAL)', notePh: 'Niños a bordo, un cumpleaños, hora de salida preferida…',
    calT: 'Elige tu fecha', calHelp: 'Calendario del barco en vivo. Los días ocupados no se pueden elegir.', calFree: 'Libre', calBooked: 'Ocupado',
    calPick: function (d) { return 'Solicitar reserva · ' + d; }, calErr: 'No pudimos cargar el calendario. Elige una fecha y el dueño la confirma.', calNone: 'Sin fechas libres en este mes.',
    prevM: 'Mes anterior', nextM: 'Mes siguiente', reqHelpG: 'Retenemos un depósito en tu tarjeta, sin cobrarlo. El dueño confirma en 6 horas o se libera. Puedes cancelar la retención cuando quieras.', depG: 'Depósito que retenemos hoy',
    price: 'Precio del viaje', dep: function (p) { return 'Depósito que retenemos hoy (' + p + '%)'; }, bal: 'Saldo, se paga al capitán el día del viaje',
    how: 'Cómo funciona', h1: 'Retenemos el depósito en tu tarjeta. Todavía no se cobra.', h2: 'El dueño confirma tu fecha en un máximo de 6 horas.',
    h3: 'Si confirma, cobramos el depósito y tu viaje queda reservado. Si no, liberamos la retención y te mandamos otros barcos libres ese día.',
    h4: 'Si cambias de opinión mientras esperas, cancela tu solicitud desde la siguiente página y se libera la retención.',
    go: 'Continuar a la retención con tarjeta', foot: 'Página segura de Stripe. Prefieres transferencia, OXXO o efectivo? ', footWa: 'Escríbenos por WhatsApp',
    close: 'Cerrar', sending: 'Un momento…', change: 'Cambiar', calSel: 'Tu fecha', selDate: 'Fecha de tu viaje', fewer: 'Menos', more: 'Más', ccOther: 'Otro (escribe +código)', depBar: 'DEPÓSITO QUE RETENEMOS HOY', pctOf: function (p) { return p + '% del total'; }, perGuest: function (n, a) { return n + ' personas extra × ' + a; }, perNight: function (n) { return n + (n === 1 ? ' noche' : ' noches'); },
    errs: { date: 'Elige una fecha a partir de mañana.', guests: 'Revisa el número de personas.', contact: 'Escribe tu nombre y un número de WhatsApp con lada.',
      booked: 'Ese día ya está ocupado. Prueba otra fecha o escríbenos.', not_available: 'Esta experiencia ya no acepta solicitudes en línea. Escríbenos por WhatsApp.',
      off: 'Las solicitudes en línea están pausadas. Escríbenos por WhatsApp.', other: 'No se pudo enviar. Revisa tu conexión e inténtalo otra vez.' },
    waMsg: function (t, d, g) { return 'Hola! Me interesa ' + t + (d ? ' el ' + d : '') + (g ? ' para ' + g + ' personas' : '') + '. Lo vi en vamosalapaz.com'; },
    bn: { req: 'Reservar ahora', cardT: 'Reserva en línea, confirmación inmediata', reqHelp: 'Paga un depósito del 20% y tu fecha queda confirmada al instante. El saldo se paga el día del viaje, antes de zarpar.',
      reqHelpD: function (p, a) { return 'Paga hoy un depósito del ' + p + '% (desde ' + a + ') y tu fecha queda confirmada al instante. El saldo se paga el día del viaje, antes de zarpar.'; },
      reqHelpN: function (p) { return 'Paga un depósito del ' + p + '% y tu fecha queda confirmada al instante. El saldo se paga el día del viaje, antes de zarpar.'; },
      title: 'Reservar ahora', waHint: 'Te mandamos tu confirmación aquí.', note: 'ALGO QUE DEBAMOS SABER (OPCIONAL)',
      calPick: function (d) { return 'Reservar · ' + d; }, calErr: 'No pudimos cargar el calendario. Escríbenos por WhatsApp para reservar.',
      dep: function (p) { return 'Depósito a pagar hoy (' + p + '%)'; }, depG: 'Depósito a pagar hoy', bal: 'Saldo, el día del viaje antes de zarpar', depBar: 'DEPÓSITO A PAGAR HOY',
      h1: 'Pagas el depósito con tarjeta en la página segura de Stripe.', h2: 'Tu fecha queda confirmada al instante y te mandamos tu reservación por WhatsApp.',
      h3: 'El saldo se paga el día del viaje, antes de zarpar.', h4: '', go: 'Continuar al pago seguro', addT: 'Haz tu viaje aún mejor', addWa: 'Escríbenos por WhatsApp',
      addShort: 'Menú mejorado, chef privado o algo especial: lo arreglamos contigo por WhatsApp después de reservar.', addMore: 'Ver precios de extras', addLine: 'Menú mejorado y otros extras: agrégalos después de reservar, por WhatsApp.', nightsErr: 'Uno de los días de tu viaje ya está ocupado. Prueba otra fecha o menos noches.' },
  } : {
    req: 'Request to book', cardT: 'Book directly with the owner', reqHelp: 'We hold a 20% deposit on your card, not charged. The owner confirms within 6 hours, or the hold is released. You can cancel your hold at any time.',
    reqHelpN: function (p) { return 'We hold a ' + p + '% deposit on your card, not charged. The owner confirms within 6 hours, or the hold is released. You can cancel your hold at any time.'; },
    waHelp: 'Questions first? Chat with us before committing.',
    title: 'Request to book', sub: 'private boat, just your group', trip: 'TRIP', date: 'DATE', guests: 'GUESTS', nights: 'NIGHTS',
    name: 'YOUR NAME', namePh: 'Full name', wa: 'WHATSAPP NUMBER', waHint: "We'll message you here as soon as the owner answers.",
    note: 'ANYTHING THE OWNER SHOULD KNOW? (OPTIONAL)', notePh: 'Kids on board, a birthday, preferred start time…',
    calT: 'Pick your date', calHelp: "The boat's live calendar. Booked days can't be picked.", calFree: 'Free', calBooked: 'Booked',
    calPick: function (d) { return 'Request to book · ' + d; }, calErr: "Couldn't load the calendar. Pick a date and the owner will confirm it.", calNone: 'No free dates this month.',
    prevM: 'Previous month', nextM: 'Next month', reqHelpG: 'We hold a deposit on your card, not charged. The owner confirms within 6 hours, or the hold is released. You can cancel your hold at any time.', depG: 'Deposit to hold today',
    price: 'Trip price', dep: function (p) { return 'Deposit to hold today (' + p + '%)'; }, bal: 'Balance, paid to the captain on the day',
    how: 'How it works', h1: "We place a hold for the deposit on your card. You're not charged yet.", h2: 'The owner confirms your date within 6 hours.',
    h3: "Confirmed: the deposit is charged and your trip is booked. Not confirmed: the hold is released and we send you other boats free that day.",
    h4: 'Changed your mind while you wait? Cancel your request from the next page and the hold is released.',
    go: 'Continue to card hold', foot: 'Secure card page by Stripe. Prefer transfer, OXXO or cash? ', footWa: 'Ask us on WhatsApp',
    close: 'Close', sending: 'One moment…', change: 'Change', calSel: 'Your date', selDate: 'Selected trip date', fewer: 'Fewer', more: 'More', ccOther: 'Other (type +code)', depBar: 'DEPOSIT TO HOLD TODAY', pctOf: function (p) { return p + '% of total'; }, perGuest: function (n, a) { return n + ' extra guests × ' + a; }, perNight: function (n) { return n + (n === 1 ? ' night' : ' nights'); },
    errs: { date: 'Pick a date from tomorrow on.', guests: 'Check the number of guests.', contact: 'Add your name and a WhatsApp number with country code.',
      booked: 'That day is already booked. Try another date or message us.', not_available: "This experience no longer takes online requests. Message us on WhatsApp.",
      off: 'Online requests are paused right now. Message us on WhatsApp.', other: "Couldn't send. Check your connection and try again." },
    waMsg: function (t, d, g) { return 'Hi! I\'m interested in ' + t + (d ? ' on ' + d : '') + (g ? ' for ' + g + ' guests' : '') + '. I saw it on vamosalapaz.com'; },
    bn: { req: 'Book now', cardT: 'Book online, confirmed instantly', reqHelp: 'Pay a 20% deposit now and your date is confirmed right away. The balance is due on the day of your trip, before departure.',
      reqHelpD: function (p, a) { return 'Pay a ' + p + '% deposit today (from ' + a + ') and your date is confirmed right away. The balance is due on the day of your trip, before departure.'; },
      reqHelpN: function (p) { return 'Pay a ' + p + '% deposit now and your date is confirmed right away. The balance is due on the day of your trip, before departure.'; },
      title: 'Book now', waHint: "We'll send your confirmation here.", note: 'ANYTHING WE SHOULD KNOW? (OPTIONAL)',
      calPick: function (d) { return 'Book now · ' + d; }, calErr: "Couldn't load the calendar. Message us on WhatsApp to book.",
      dep: function (p) { return 'Deposit due today (' + p + '%)'; }, depG: 'Deposit due today', bal: 'Balance, due on the day before departure', depBar: 'DEPOSIT DUE TODAY',
      h1: "You pay the deposit by card on Stripe's secure page.", h2: 'Your date is confirmed instantly and we send your booking on WhatsApp.',
      h3: 'The balance is due on the day of your trip, before departure.', h4: '', go: 'Continue to secure payment', addT: 'Want to make your trip even better?', addWa: 'Message us on WhatsApp',
      addShort: 'Upgrade your menu, add a private chef or request something special. We arrange extras with you on WhatsApp after booking.', addMore: 'See extras pricing', addLine: 'Upgraded menu and other extras: add them after booking on WhatsApp.', nightsErr: 'One of the days of your trip is already booked. Try another date or fewer nights.' },
  };
  // Book Now offers set to "Preview" only show with ?booknow=1 (remembered for the visit).
  var PREVIEW = false;
  try { if (/[?&]booknow=1/.test(location.search)) sessionStorage.setItem('vlp-booknow', '1'); PREVIEW = sessionStorage.getItem('vlp-booknow') === '1'; } catch (e) { PREVIEW = /[?&]booknow=1/.test(location.search); }
  function isBN(o) { return !!o && (o.bookNow === 'Live' || (o.bookNow === 'Preview' && PREVIEW)); }
  function tx(o, k) { return isBN(o) && T.bn[k] !== undefined ? T.bn[k] : T[k]; }
  var offers = [], bySlug = {}, quotes = {};

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US') + ' MXN'; }
  function todayLaPaz() { return new Date(Date.now() - 7 * 3600e3).toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dayLong(iso) { return iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString(ES ? 'es-MX' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : ''; }
  function track(ev, p) { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, p || {})); } catch (e) {} }
  function waHref(text) { return 'https://wa.me/526122903605?text=' + encodeURIComponent(text.replace(/[¿¡]/g, '') + ' [web-request]'); }

  var ready = fetch(API + '/eligible').then(function (r) { return r.json(); }).then(function (j) {
    offers = ((j && j.offers) || []).filter(function (o) { return o.bookNow !== 'Preview' || PREVIEW; });
    offers.forEach(function (o) { bySlug[o.slug] = o; });
  }).catch(function () { offers = []; }).then(function () {
    try { document.dispatchEvent(new CustomEvent('vlp-request-ready')); } catch (e) {}
    offerPage();
  });

  function quote(id) {
    if (!quotes[id]) quotes[id] = fetch(API + '/quote?id=' + encodeURIComponent(id)).then(function (r) { return r.json(); });
    return quotes[id];
  }

  // ---------- live boat calendar (Nov 4, 2026) ----------
  // vamos-availability /calendar?slug= → { live, open: [YYYY-MM-DD], from, to }. Offers with their own calendar (Miko's
  // FareHarbor) or a boat calendar (Whale Shark After Hours on Good Medicine's Bókun days) get a month view where booked
  // days can't be picked. Offers without one keep the plain date field.
  var cals = {};
  function calendarFor(slug) {
    if (!cals[slug]) cals[slug] = fetch(AV + '/calendar?slug=' + encodeURIComponent(slug)).then(function (r) { return r.json(); })
      .then(function (j) { return j && j.live ? { open: new Set(j.open || []), from: j.from, to: j.to } : null; })
      .catch(function () { return null; });
    return cals[slug];
  }
  function dayShort(iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString(ES ? 'es-MX' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  // Month grid. cal = {open:Set, from, to}; picked = YYYY-MM-DD or ''; onPick(iso).
  function calWidget(cal, picked, onPick) {
    var wrap = el('div', { class: 'vlp-cal' });
    var first = picked && cal.open.has(picked) ? picked : (Array.from(cal.open).sort()[0] || cal.from);
    var ym = first.slice(0, 7);
    var minYm = cal.from.slice(0, 7), maxYm = cal.to.slice(0, 7);
    var monStart = ES; // lunes first on /es, Sunday first in English
    function shiftYm(v, n) { var y = +v.slice(0, 4), m = +v.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + String(m + 1).padStart(2, '0'); }
    function draw() {
      wrap.innerHTML = '';
      var title = new Date(ym + '-15T12:00:00Z').toLocaleDateString(ES ? 'es-MX' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      var prev = el('button', { type: 'button', class: 'nav', 'aria-label': T.prevM, text: '‹', disabled: ym <= minYm ? 'disabled' : null, onclick: function () { ym = shiftYm(ym, -1); draw(); } });
      var next = el('button', { type: 'button', class: 'nav', 'aria-label': T.nextM, text: '›', disabled: ym >= maxYm ? 'disabled' : null, onclick: function () { ym = shiftYm(ym, 1); draw(); } });
      wrap.appendChild(el('div', { class: 'hd' }, [prev, el('strong', { text: title.charAt(0).toUpperCase() + title.slice(1) }), next]));
      var grid = el('div', { class: 'gr', role: 'grid' });
      var wd = monStart ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      wd.forEach(function (w) { grid.appendChild(el('span', { class: 'wd', text: w })); });
      var d1 = new Date(ym + '-01T12:00:00Z'), lead = d1.getUTCDay(); if (monStart) lead = (lead + 6) % 7;
      for (var i = 0; i < lead; i++) grid.appendChild(el('span'));
      var any = false;
      for (var d = new Date(d1); d.toISOString().slice(0, 7) === ym; d.setUTCDate(d.getUTCDate() + 1)) {
        var iso = d.toISOString().slice(0, 10), inRange = iso >= cal.from && iso <= cal.to, free = inRange && cal.open.has(iso);
        if (free) any = true;
        (function (iso, free, inRange) {
          grid.appendChild(el('button', { type: 'button', class: 'dy' + (free ? ' free' : inRange ? ' booked' : ' out') + (iso === picked ? ' on' : ''),
            disabled: free ? null : 'disabled', 'aria-label': dayLong(iso) + (free ? '' : ' · ' + T.calBooked), 'aria-pressed': iso === picked ? 'true' : 'false',
            text: String(+iso.slice(8)), onclick: function () { picked = iso; draw(); onPick(iso); } }));
        })(iso, free, inRange);
      }
      wrap.appendChild(grid);
      if (!any) wrap.appendChild(el('p', { class: 'none', text: T.calNone }));
      wrap.appendChild(el('div', { class: 'lg' }, [el('span', { class: 'k free' }), T.calFree, el('span', { class: 'k booked' }), T.calBooked, el('span', { class: 'k on' }), T.calSel]));
    }
    draw();
    return wrap;
  }

  // ---------- styles ----------
  function css() {
    if (document.getElementById('vlp-rq-css')) return;
    var s = el('style', { id: 'vlp-rq-css' });
    s.textContent = [
      '.vlp-rq-btn{display:flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border:0;border-radius:999px;background:' + PINK + ';color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;box-sizing:border-box}',
      '.vlp-rq-btn:hover{background:#8E1550;color:#fff}',
      '.vlp-rq-help{display:block;font-size:13px;line-height:1.4;color:' + MUTED + ';margin:6px 0 0}',
      '.vlp-rq-block{display:flex;flex-direction:column;gap:6px;margin:0 0 14px}',
      '.vlp-rq-btn.alt{background:transparent;color:' + PINK + ';border:2px solid ' + PINK + '}',
      '.vlp-rq-btn.alt:hover{background:' + PINK + ';color:#fff}',
      '.vlp-rq-card{display:flex;align-items:center;gap:16px;justify-content:space-between;background:' + SAND + ';border:1px solid ' + LINE + ';border-left:4px solid ' + PINK + ';border-radius:12px;padding:14px 16px;margin:18px 0}',
      '.vlp-rq-card strong{display:block;font-size:16px;color:' + INK + ';margin:0 0 2px}',
      '.vlp-rq-card .vlp-rq-help{margin:0}',
      '.vlp-rq-card .vlp-rq-btn{flex:0 0 auto;min-width:170px}',
      '@media (max-width:600px){.vlp-rq-card{flex-direction:column;align-items:stretch}.vlp-rq-card .vlp-rq-btn{width:100%}}',
      '.vlp-rq-ov{position:fixed;inset:0;background:rgba(23,32,42,.5);z-index:99999;display:flex;align-items:flex-end;justify-content:center}',
      '@media(min-width:640px){.vlp-rq-ov{align-items:center}}',
      '.vlp-rq{background:#fff;width:100%;max-width:480px;max-height:92vh;max-height:92dvh;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border-radius:16px 16px 0 0;padding:0 16px;box-sizing:border-box;font-family:"DM Sans",system-ui,sans-serif;color:' + INK + '}',
      '@media(min-width:640px){.vlp-rq{border-radius:16px}}',
      '.vlp-rq h2{margin:0;font-size:24px;line-height:1.2;font-weight:700}.vlp-rq .sub{margin:2px 0 14px;color:' + MUTED + ';font-size:15px}',
      '.vlp-rq label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:' + MUTED + ';margin:0 0 14px}',
      '.vlp-rq input,.vlp-rq select,.vlp-rq textarea{min-height:48px;border:1px solid #C9C1AE;border-radius:8px;padding:0 12px;font:inherit;font-size:16px;color:' + INK + ';background:#fff;box-sizing:border-box;width:100%}',
      '.vlp-rq textarea{padding:10px 12px;min-height:72px;resize:none}',
      '.vlp-rq .row{display:flex;flex-wrap:wrap;gap:0 10px}.vlp-rq .row>label{flex:1 1 0;min-width:0}.vlp-rq .row>label.sm{flex:0 0 auto}',
      '.vlp-rq .hdr{position:sticky;top:0;z-index:3;background:#fff;margin:0 -16px;padding:14px 16px 8px}.vlp-rq .hdr .sub{margin:2px 0 0}',
      '.vlp-rq .stp{display:flex;align-items:center;border:1px solid #C9C1AE;border-radius:8px;min-height:48px;width:144px;box-sizing:border-box}',
      '.vlp-rq .stp button{flex:none;width:46px;height:46px;border:0;background:none;font:inherit;font-size:22px;line-height:1;color:' + PINK + ';cursor:pointer;padding:0}.vlp-rq .stp button[disabled]{color:#C9C1AE;cursor:default}',
      '.vlp-rq .stp input{border:0;min-height:44px;padding:0;text-align:center;width:50px;flex:1 1 auto;-moz-appearance:textfield;appearance:textfield}.vlp-rq .stp input::-webkit-inner-spin-button,.vlp-rq .stp input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}',
      '.vlp-rq .ph{display:flex;gap:8px}.vlp-rq .ph select{flex:0 0 112px;width:112px;padding:0 6px}.vlp-rq .ph input{flex:1 1 auto;min-width:0}',
      '.vlp-rq .ds{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid ' + LINE + ';border-left:4px solid ' + PINK + ';border-radius:12px;padding:10px 12px 10px 14px;margin:6px 0 14px}',
      '.vlp-rq .ds strong{display:block;font-size:16px;color:' + INK + '}.vlp-rq .ds span{font-size:13px;color:' + MUTED + '}',
      '.vlp-rq .ds button{flex:none;min-height:44px;padding:0 14px;border:1px solid ' + PINK + ';border-radius:999px;background:#fff;color:' + PINK + ';font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
      '.vlp-rq .cx{display:flex;gap:10px;background:#EAF6EE;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45;color:#1E4D30;margin:4px 0 14px}.vlp-rq .cx i{flex:none;font-style:normal;font-weight:700;color:#1E6B3A}.vlp-rq .cx b{display:block;color:#17402A}',
      '.vlp-rq .bar{position:sticky;bottom:0;z-index:3;background:#fff;border-top:1px solid ' + LINE + ';margin:8px -16px 0;padding:10px 16px calc(12px + env(safe-area-inset-bottom));box-shadow:0 -6px 16px rgba(23,32,42,.06)}',
      '.vlp-rq .bar .dl{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 6px}.vlp-rq .bar .dl small{font-size:12px;font-weight:700;letter-spacing:.04em;color:' + MUTED + '}',
      '.vlp-rq .bar .dl b{font-size:18px;color:' + INK + '}.vlp-rq .bar .dl em{font-style:normal;font-size:13px;color:' + MUTED + ';margin-left:6px}.vlp-rq .bar .go{margin-top:0}.vlp-rq .bar .err{margin:0 0 8px}',
      '.vlp-rq .add details{margin:6px 0 0}.vlp-rq .add summary{cursor:pointer;color:' + PINK + ';font-weight:600}.vlp-rq .add details p{margin:6px 0 0}',
      '.vlp-rq .hint{font-weight:400;font-size:13px;line-height:1.4}',
      '.vlp-rq .sum{background:' + SAND + ';border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;margin:0 0 16px}',
      '.vlp-rq .sum div{display:flex;justify-content:space-between;gap:12px;font-size:15px}.vlp-rq .sum .mut{font-size:14px;color:' + MUTED + '}',
      '.vlp-rq h3{font-size:17px;margin:0 0 8px}.vlp-rq .st{display:flex;gap:10px;font-size:14px;line-height:1.4;margin:0 0 8px}',
      '.vlp-rq .st i{flex:none;width:24px;height:24px;border-radius:999px;background:' + PINK + ';color:#fff;font-style:normal;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}',
      '.vlp-rq .go{width:100%;min-height:52px;font-size:16px;font-weight:700;margin-top:8px}.vlp-rq .go[disabled]{opacity:.6}',
      '.vlp-rq .foot{font-size:13px;color:' + MUTED + ';text-align:center;line-height:1.4;margin:10px 0 0}.vlp-rq .foot a{color:' + PINK + ';font-weight:600}',
      '.vlp-rq .add{border:1px dashed #C9C1AE;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45;color:' + MUTED + ';margin:0 0 16px}.vlp-rq .add b{display:block;color:' + INK + ';font-size:15px;margin:0 0 4px}.vlp-rq .add a{color:' + PINK + ';font-weight:600}',
      '.vlp-rq .err{background:#FDE8EC;color:#8A1C33;border-radius:10px;padding:10px 12px;font-size:14px;margin:0 0 12px}',
      '.vlp-cal{background:#fff;border:1px solid ' + LINE + ';border-radius:12px;padding:10px 10px 8px;max-width:360px;font-family:"DM Sans",system-ui,sans-serif;color:' + INK + '}',
      '.vlp-cal .hd{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px}.vlp-cal .hd strong{font-size:16px}',
      '.vlp-cal .nav{width:44px;height:44px;border:0;background:none;font-size:26px;line-height:1;color:' + PINK + ';cursor:pointer;border-radius:999px}.vlp-cal .nav[disabled]{color:#C9C1AE;cursor:default}',
      '.vlp-cal .gr{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}',
      '.vlp-cal .wd{font-size:12px;font-weight:600;color:' + MUTED + ';text-align:center;padding:2px 0}',
      '.vlp-cal .dy{height:42px;border:0;border-radius:8px;font:inherit;font-size:15px;cursor:pointer;padding:0}',
      '.vlp-cal .dy.free{background:#EAF6EE;color:#1E6B3A;font-weight:600}.vlp-cal .dy.free:hover{background:#D3EEDC}',
      '.vlp-cal .dy.booked{background:#F1ECE2;color:#9A9080;text-decoration:line-through;cursor:not-allowed}',
      '.vlp-cal .dy.out{background:transparent;color:#D8D2C4;cursor:default}',
      '.vlp-cal .dy.on{background:' + PINK + ';color:#fff}',
      '.vlp-cal .lg{display:flex;align-items:center;gap:6px;font-size:12px;color:' + MUTED + ';margin:8px 2px 0}.vlp-cal .k{width:12px;height:12px;border-radius:3px;display:inline-block;margin-left:6px}.vlp-cal .k:first-child{margin-left:0}',
      '.vlp-cal .k.free{background:#EAF6EE;border:1px solid #9FD3B1}.vlp-cal .k.booked{background:#F1ECE2;border:1px solid #D8D2C4}.vlp-cal .k.on{background:' + PINK + '}',
      '.vlp-cal .none{font-size:13px;color:' + MUTED + ';margin:6px 2px 0}',
      '.vlp-rq-card.has-cal{flex-direction:column;align-items:stretch}.vlp-rq-card.has-cal .vlp-cal{margin:4px 0 2px}',
      '.vlp-rq-card.has-cal .vlp-rq-btn{align-self:flex-start;min-width:240px}@media (max-width:600px){.vlp-rq-card.has-cal .vlp-rq-btn{align-self:stretch}.vlp-cal{max-width:none}}',
      '.vlp-rq .vlp-cal{margin:0 0 14px;max-width:none}',
      '.vlp-rq .x{float:right;background:none;border:0;font-size:28px;line-height:1;color:' + MUTED + ';cursor:pointer;padding:0 4px;min-width:44px;min-height:44px;margin:-6px -8px 0 0}',
    ].join('');
    document.head.appendChild(s);
  }

  // ---------- the form ----------
  function open(slug, opts) {
    opts = opts || {};
    var first = bySlug[slug];
    if (!first) return;
    css();
    track(isBN(first) ? 'book_now_open' : 'request_to_book_open', { offering: slug });
    var siblings = offers.filter(function (o) { return o.boat && o.boat === first.boat; });
    if (!siblings.length) siblings = [first];
    var cur = first, q = null, curCal = null;
    var ov = el('div', { class: 'vlp-rq-ov', onclick: function (e) { if (e.target === ov) shut(); } });
    var box = el('div', { class: 'vlp-rq', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.title });
    // Lock the page behind the modal (Nov 5): only the modal scrolls.
    var lockH = document.documentElement.style.overflow, lockB = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    function shut() { ov.remove(); document.removeEventListener('keydown', onKey); document.documentElement.style.overflow = lockH; document.body.style.overflow = lockB; }
    function onKey(e) { if (e.key === 'Escape') shut(); }
    document.addEventListener('keydown', onKey);

    var tripSel = el('select', { onchange: function () { cur = bySlug[tripSel.value]; load(); } },
      siblings.map(function (o) { return el('option', { value: o.slug, selected: o.slug === slug ? 'selected' : null, text: ES ? o.nameEs : o.name }); }));
    var minDate = addDays(todayLaPaz(), 1);
    var dateIn = el('input', { type: 'date', min: minDate, value: opts.date && opts.date >= minDate ? opts.date : '', required: 'required', onchange: calc });
    var guestsIn = el('input', { type: 'number', inputmode: 'numeric', min: '1', value: opts.guests || '2', 'aria-label': T.guests, onchange: calc, oninput: calc });
    var nightsIn = el('input', { type: 'number', inputmode: 'numeric', min: '1', max: '14', value: '1', 'aria-label': T.nights, onchange: calc, oninput: calc });
    // − / + steppers (Nov 5); the number stays typeable.
    function stepper(inp) {
      function bump(d) { var mx = +inp.max || 40, v = Math.max(1, Math.min(mx, Math.round(+inp.value || 1) + d)); inp.value = String(v); calc(); }
      var minus = el('button', { type: 'button', 'aria-label': T.fewer, text: '−', onclick: function () { bump(-1); } });
      var plus = el('button', { type: 'button', 'aria-label': T.more, text: '+', onclick: function () { bump(1); } });
      inp._sync = function () { var v = Math.round(+inp.value || 1); minus.disabled = v <= 1; plus.disabled = v >= (+inp.max || 40); };
      return el('div', { class: 'stp' }, [minus, inp, plus]);
    }
    var nightsLbl = el('label', { class: 'sm' }, [T.nights, stepper(nightsIn)]);
    var nameIn = el('input', { autocomplete: 'name', placeholder: T.namePh });
    // WhatsApp number with a country code (Nov 5). Typing a number that starts with + or 00 overrides the selector.
    var CC = [['52', 'MX +52'], ['1', 'US/CA +1'], ['44', 'UK +44'], ['34', 'ES +34'], ['49', 'DE +49'], ['33', 'FR +33'], ['39', 'IT +39'], ['31', 'NL +31'], ['41', 'CH +41'],
      ['54', 'AR +54'], ['55', 'BR +55'], ['56', 'CL +56'], ['57', 'CO +57'], ['51', 'PE +51'], ['61', 'AU +61'], ['', T.ccOther]];
    var ccSel = el('select', { 'aria-label': T.wa, autocomplete: 'tel-country-code' }, CC.map(function (c) { return el('option', { value: c[0], selected: c[0] === (ES ? '52' : '1') ? 'selected' : null, text: c[1] }); }));
    var phoneIn = el('input', { type: 'tel', autocomplete: 'tel-national', placeholder: ES ? '612 123 4567' : '206 555 0100' });
    ccSel.addEventListener('change', function () { phoneIn.placeholder = ccSel.value ? (ccSel.value === '52' ? '612 123 4567' : ccSel.value === '1' ? '206 555 0100' : '') : '+'; });
    function fullPhone() {
      var v = phoneIn.value.trim(), d = v.replace(/\D/g, '');
      if (/^\s*(\+|00)/.test(v)) return '+' + d.replace(/^00/, '');
      if (!ccSel.value) return d ? '+' + d : '';
      if (d.indexOf(ccSel.value) === 0 && d.length > 10) return '+' + d; // they typed the code too
      return d ? '+' + ccSel.value + d : '';
    }
    var noteIn = el('textarea', { rows: '3', placeholder: T.notePh });
    var waHintEl = el('span', { class: 'hint', text: T.waHint }), noteLblText = document.createTextNode(T.note);
    var h1El = el('span', { text: T.h1 }), h2El = el('span', { text: T.h2 }), h3El = el('span', { text: T.h3 }), h4El = el('p', { class: 'hint', style: 'font-size:13px;color:' + MUTED + ';margin:0 0 8px', text: T.h4 });
    var sum = el('div', { class: 'sum' });
    var addBox = el('div', { class: 'add', style: 'display:none' });
    var dateLbl = el('label', null, [T.date, dateIn]);
    var calSlot = el('div'), calOpen = false;
    var err = el('div');
    var go = el('button', { type: 'submit', class: 'vlp-rq-btn go', text: T.go });
    // Sticky bar at the bottom of the modal (Nov 5): deposit due today + the pay button.
    var barAmt = el('b'), barPct = el('em'), barLbl = el('small');
    var bar = el('div', { class: 'bar' }, [err, el('div', { class: 'dl' }, [barLbl, el('span', null, [barAmt, barPct])]), go]);
    var foot = el('p', { class: 'foot' }, [T.foot, el('a', { class: 'whatsapp-link', 'data-wa-source': 'request-form', target: '_blank', rel: 'noopener', href: waHref(T.waMsg(ES ? cur.nameEs : cur.name, '', '')), text: T.footWa })]);
    var form = el('form', { onsubmit: submit }, [
      siblings.length > 1 ? el('label', null, [T.trip, tripSel]) : null,
      calSlot,
      el('div', { class: 'row' }, [dateLbl, el('label', { class: 'sm' }, [T.guests, stepper(guestsIn)]), nightsLbl]),
      el('label', null, [T.name, nameIn]),
      el('label', null, [T.wa, el('div', { class: 'ph' }, [ccSel, phoneIn]), waHintEl]),
      el('label', null, [noteLblText, noteIn]),
      sum, addBox,
      el('h3', { text: T.how }),
      el('div', { class: 'st' }, [el('i', { text: '1' }), h1El]),
      el('div', { class: 'st' }, [el('i', { text: '2' }), h2El]),
      el('div', { class: 'st' }, [el('i', { text: '3' }), h3El]),
      h4El,
      foot, bar,
    ]);
    var head = el('h2', { text: T.title });
    var sub = el('p', { class: 'sub' });
    // Header (title + close) stays pinned while the modal scrolls.
    box.appendChild(el('div', { class: 'hdr' }, [el('button', { type: 'button', class: 'x', 'aria-label': T.close, text: '×', onclick: shut }), head, sub]));
    box.appendChild(form);
    ov.appendChild(box); document.body.appendChild(ov);
    if (!dateIn.value) try { dateIn.focus({ preventScroll: true }); } catch (e) {}

    function load() {
      sub.textContent = (cur.boat ? cur.boat + ' · ' : '') + T.sub;
      head.textContent = tx(cur, 'title'); go.textContent = tx(cur, 'go'); box.setAttribute('aria-label', tx(cur, 'title'));
      waHintEl.textContent = tx(cur, 'waHint'); noteLblText.textContent = tx(cur, 'note');
      h1El.textContent = tx(cur, 'h1'); h2El.textContent = tx(cur, 'h2'); h3El.textContent = tx(cur, 'h3'); h4El.textContent = tx(cur, 'h4');
      nightsLbl.style.display = cur.perNight ? '' : 'none';
      guestsIn.max = String(cur.capacity || 40);
      sum.innerHTML = ''; sum.appendChild(el('div', { class: 'mut', text: T.sending }));
      calSlot.innerHTML = '';
      calendarFor(cur.slug).then(function (cal) {
        curCal = cal;
        dateLbl.style.display = cal ? 'none' : '';
        if (!cal) { calSlot.innerHTML = ''; return; }
        if (dateIn.value && !cal.open.has(dateIn.value)) dateIn.value = '';
        calOpen = !dateIn.value;
        drawCal();
      });
      quote(cur.id).then(function (j) { if (j && j.ok) { q = j;
        // Book Now: the cancellation policy is shown as a reassurance box (first line bold), not small print.
        h4El.className = 'hint'; h4El.innerHTML = '';
        var cx = isBN(cur) ? String((ES ? j.cancellation : j.cancellationEn) || '').split('\n').filter(Boolean) : [];
        if (cx.length) { h4El.className = 'cx'; h4El.removeAttribute('style'); h4El.appendChild(el('i', { text: '✓' })); h4El.appendChild(el('div', null, [el('b', { text: cx[0] })].concat(cx.slice(1).map(function (l) { return el('span', { text: l + ' ' }); })))); }
        else h4El.textContent = tx(cur, 'h4');
        // Book Now: extras (upgraded menu…) are arranged afterwards on WhatsApp. Short line here; full prices one tap away.
        var add = isBN(cur) ? (ES ? j.addOnsEs : j.addOns) : '';
        addBox.innerHTML = ''; addBox.style.display = add ? '' : 'none';
        if (add) {
          addBox.appendChild(el('b', { text: T.bn.addT }));
          addBox.appendChild(el('span', { text: T.bn.addShort + ' ' }));
          addBox.appendChild(el('a', { class: 'whatsapp-link', 'data-wa-source': 'request-addons', target: '_blank', rel: 'noopener', href: waHref(T.waMsg(ES ? cur.nameEs : cur.name, '', '')), text: T.bn.addWa }));
          addBox.appendChild(el('details', null, [el('summary', { text: T.bn.addMore }), el('p', { text: add })]));
        }
        calc(); } else { q = null; err.innerHTML = ''; err.appendChild(el('p', { class: 'err', text: T.errs.not_available })); go.disabled = true; } });
    }
    function drawCal() {
      calSlot.innerHTML = '';
      if (!curCal) return;
      calSlot.appendChild(el('label', { style: 'margin:0 0 6px' }, [T.date]));
      if (calOpen || !dateIn.value) {
        calSlot.appendChild(calWidget(curCal, dateIn.value, function (iso) { dateIn.value = iso; calOpen = false; drawCal(); calc(); }));
        return;
      }
      var d = dayLong(dateIn.value);
      calSlot.appendChild(el('div', { class: 'ds' }, [
        el('div', null, [el('strong', { text: d.charAt(0).toUpperCase() + d.slice(1) + (ES ? ' de ' : ', ') + dateIn.value.slice(0, 4) }), el('span', { text: T.selDate })]),
        el('button', { type: 'button', text: T.change, onclick: function () { calOpen = true; drawCal(); } })]));
    }
    function calc() {
      guestsIn._sync && guestsIn._sync(); nightsIn._sync && nightsIn._sync();
      if (!q) return;
      var g = Math.max(1, Math.min(q.capacity, Math.round(+guestsIn.value || 1)));
      var n = q.perNight ? Math.max(1, Math.min(14, Math.round(+nightsIn.value || 1))) : 1;
      var extraN = q.extraEach && g > (q.included || 0) ? g - (q.included || 0) : 0;
      var tierBase = q.largeFrom && q.largePrice && g >= q.largeFrom ? q.largePrice : q.base;
      var nightsTotal = q.perNight && q.extraNight ? tierBase + (n - 1) * q.extraNight : tierBase * n;
      var price = nightsTotal + extraN * q.extraEach, dep = q.depositFixed ? Math.min(price, q.depositFixed) : Math.round(price * q.depositPct), pct = Math.round(q.depositPct * 100);
      sum.innerHTML = '';
      var rows = [[T.price + (q.perNight ? ' (' + T.perNight(n) + ')' : ''), money(price), '']];
      if (extraN) rows.push([T.perGuest(extraN, money(q.extraEach)), '', 'mut']);
      rows.push([q.depositFixed ? tx(cur, 'depG') : tx(cur, 'dep')(pct), money(dep), 'b']);
      rows.push([tx(cur, 'bal'), money(price - dep), 'mut']);
      rows.forEach(function (r) { sum.appendChild(el('div', { class: r[2] === 'mut' ? 'mut' : '' }, [el('span', { text: r[0] }), el(r[2] === 'b' ? 'b' : 'span', { text: r[1] })])); });
      barLbl.textContent = tx(cur, 'depBar'); barAmt.textContent = money(dep); barPct.textContent = q.depositFixed ? '' : T.pctOf(pct);
      foot.querySelector('a').href = waHref(T.waMsg(ES ? cur.nameEs : cur.name, dayLong(dateIn.value), g));
    }
    function submit(e) {
      e.preventDefault();
      err.innerHTML = '';
      var body = { offeringId: cur.id, date: dateIn.value, guests: +guestsIn.value, nights: cur.perNight ? +nightsIn.value : '',
        name: nameIn.value.trim(), phone: fullPhone(), note: noteIn.value.trim(), lang: ES ? 'es' : 'en', page: location.href.split('#')[0] };
      if (!body.date || body.date < minDate) return fail('date');
      if (curCal && !curCal.open.has(body.date)) return fail('booked');
      if (curCal && cur.perNight) for (var dd = body.date, k = 0; k <= (+body.nights || 1); k++, dd = addDays(dd, 1)) if (!curCal.open.has(dd) && dd <= curCal.to) return fail('nights');
      if (!(body.guests >= 1 && body.guests <= (cur.capacity || 40))) return fail('guests');
      if (!body.name || body.phone.replace(/\D/g, '').length < 10 || phoneIn.value.replace(/\D/g, '').length < 7) return fail('contact');
      go.disabled = true; go.textContent = T.sending;
      track(isBN(cur) ? 'book_now_submit' : 'request_to_book_submit', { offering: cur.slug, guests: body.guests, trip_date: body.date });
      fetch(API + '/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok && j.url) location.href = j.url; else fail((j && j.error) || 'other'); })
        .catch(function () { fail('other'); });
    }
    function fail(code) {
      go.disabled = false; go.textContent = tx(cur, 'go');
      err.innerHTML = '';
      err.appendChild(el('p', { class: 'err', text: code === 'nights' ? T.bn.nightsErr : T.errs[code] || T.errs.other }));
      err.scrollIntoView({ block: 'nearest' });
    }
    load();
  }

  // Clicks on any [data-vlp-request] (availability results) open the form.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-vlp-request]');
    if (!b) return;
    e.preventDefault();
    open(b.getAttribute('data-vlp-request'), { date: b.getAttribute('data-vlp-date') || '', guests: b.getAttribute('data-vlp-guests') || '' });
  });

  // Offer page: "Request to book" + helper above the WhatsApp button.
  function offerPage() {
    var m = /^\/(?:es\/)?offerings\/([^\/?#]+)/.exec(location.pathname);
    if (!m || !bySlug[m[1]] || document.querySelector('.vlp-rq-block')) return;
    var wa = document.querySelector('a.offering-detail-whatsapp-btn, a.whatsapp-link[data-wa-source^="offer"]') ||
      [].filter.call(document.querySelectorAll('a[href*="wa.me/"]'), function (a) { return !a.closest('.sticky-whatsapp-btn') && !/sticky/.test(a.className); })[0];
    if (!wa) return;
    css();
    var p = new URLSearchParams(location.search);
    var me = bySlug[m[1]];
    function mk(cls) { return el('button', { type: 'button', class: cls, 'data-vlp-request': m[1], 'data-vlp-date': p.get('date') || '', 'data-vlp-guests': p.get('guests') || '', text: tx(me, 'req') }); }
    // Book Now replaces the Bókun widget on this page (the widget stays in the CMS, so switching back is one field).
    // (CSS rule, because Bókun's loader replaces its own element after we run.)
    if (isBN(me)) { var hide = el('style', { text: '.offering-detail-widget-block,.bokunWidget,.vlp-book-note{display:none!important}' }); document.head.appendChild(hide); }
    // Top: card under the trip facts (duration, boat, capacity, price).
    var facts = document.querySelector('.offering-detail-facts-row');
    if (facts) {
      var card = el('div', { class: 'vlp-rq-card' }, [el('div', null, [el('strong', { text: tx(me, 'cardT') }), el('span', { class: 'vlp-rq-help', text: tx(me, 'reqHelp') })]), mk('vlp-rq-btn')]);
      facts.parentNode.insertBefore(card, facts.nextSibling);
      var topBtn = card.querySelector('.vlp-rq-btn');
      calendarFor(m[1]).then(function (cal) {
        if (!cal) return;
        var want = p.get('date') && cal.open.has(p.get('date')) ? p.get('date') : '';
        function pick(iso) {
          document.querySelectorAll('[data-vlp-request="' + m[1] + '"]').forEach(function (b) { b.setAttribute('data-vlp-date', iso); });
          topBtn.textContent = tx(me, 'calPick')(dayShort(iso));
        }
        card.classList.add('has-cal');
        card.insertBefore(el('div', null, [el('strong', { text: T.calT }), el('span', { class: 'vlp-rq-help', text: T.calHelp })]), topBtn);
        card.insertBefore(calWidget(cal, want, pick), topBtn);
        if (want) pick(want);
      });
      quote(bySlug[m[1]].id).then(function (j) { if (j && j.ok && isBN(me) && (j.addOns || j.addOnsEs)) card.firstChild.appendChild(el('span', { class: 'vlp-rq-help', style: 'margin-top:6px', text: T.bn.addLine })); });
      // Book Now: name the deposit amount (from the lowest price) before the customer opens the form (Nov 5).
      quote(bySlug[m[1]].id).then(function (j) {
        if (!(j && j.ok && isBN(me) && !j.depositFixed && j.base && j.depositPct)) return;
        var help = card.firstChild.querySelector('.vlp-rq-help');
        if (help) help.textContent = T.bn.reqHelpD(Math.round(j.depositPct * 100), money(Math.round(j.base * j.depositPct)));
      });
      quote(bySlug[m[1]].id).then(function (j) { if (j && j.ok && j.depositFixed) [].forEach.call(document.querySelectorAll('.vlp-rq-help'), function (h) { if (h.textContent === T.reqHelp) h.textContent = T.reqHelpG; }); });
    }
    // Bottom: outlined button above the WhatsApp button.
    var block = el('div', { class: 'vlp-rq-block' }, facts ? [mk('vlp-rq-btn alt')] : [mk('vlp-rq-btn'), el('span', { class: 'vlp-rq-help', text: tx(me, 'reqHelp') })]);
    wa.parentNode.insertBefore(block, wa);
    var helpWa = el('span', { class: 'vlp-rq-help', style: 'text-align:center', text: T.waHelp });
    if (wa.nextSibling) wa.parentNode.insertBefore(helpWa, wa.nextSibling); else wa.parentNode.appendChild(helpWa);
  }

  window.VamosRequest = { ready: ready, isEligible: function (slug) { return !!bySlug[slug]; }, isBookNow: function (slug) { return isBN(bySlug[slug]); }, open: open, T: T };
})();

/* Nov 13, 2026: "Book now" label on the online booking button (FareHarbor / Bókun widget embeds render .vlp-book-btn). */
(function () {
  'use strict';
  function relabel() {
    var es = /^es/i.test(document.documentElement.lang || '') || /^\/es(\/|$)/.test(location.pathname);
    var btns = document.querySelectorAll('.vlp-book-btn');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (!/disponib|availability/i.test(b.textContent || '')) continue; // only the generic label; custom labels stay
      b.setAttribute('data-es', 'Reservar ahora');
      b.textContent = es ? 'Reservar ahora' : 'Book now';
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', relabel); else relabel();
  window.addEventListener('load', relabel);
})();
