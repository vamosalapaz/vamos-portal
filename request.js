/* Vamos a La Paz — Request to book (Oct 30, 2026)
   Card-hold booking requests for private-owner boats (approved mockup "Vamos request to book").
   - Loads the offers that allow it from the vamos-requests Worker (/eligible).
   - Offer pages (/offerings/<slug>, /es/offerings/<slug>): adds "Request to book" + helper text beside the WhatsApp button.
   - Any element with data-vlp-request="<slug>" (availability results) opens the form; data-vlp-date / data-vlp-guests prefill it.
   - The form posts to /request and sends the traveller to Stripe for the card hold.
   Exposes window.VamosRequest = { ready: Promise, isEligible(slug), open(slug, opts) } and fires "vlp-request-ready". */
(function () {
  if (window.VamosRequest) return;
  var API = 'https://vamos-requests.solitary-wind-dfb8.workers.dev';
  var ES = /^\/es(\/|$)/.test(location.pathname) || (document.documentElement.lang || '').slice(0, 2) === 'es';
  var PINK = '#B51E66', INK = '#17202A', MUTED = '#46525C', LINE = '#E5DFD1', SAND = '#F4EFE6';
  var T = ES ? {
    req: 'Solicitar reserva', reqHelp: 'Retenemos el 20% de depósito en tu tarjeta, sin cobrarlo. El dueño confirma en 6 horas o se libera.',
    reqHelpN: function (p) { return 'Retenemos el ' + p + '% de depósito en tu tarjeta, sin cobrarlo. El dueño confirma en 6 horas o se libera.'; },
    waHelp: '¿Dudas? Escríbenos antes de comprometerte.'.replace(/[¿¡]/g, ''),
    title: 'Solicitar reserva', sub: 'barco privado, solo tu grupo', trip: 'VIAJE', date: 'FECHA', guests: 'PERSONAS', nights: 'NOCHES',
    name: 'TU NOMBRE', namePh: 'Nombre completo', wa: 'NÚMERO DE WHATSAPP', waHint: 'Te escribimos aquí en cuanto el dueño responda.',
    note: 'ALGO QUE DEBA SABER EL DUEÑO (OPCIONAL)', notePh: 'Niños a bordo, un cumpleaños, hora de salida preferida…',
    price: 'Precio del viaje', dep: function (p) { return 'Depósito que retenemos hoy (' + p + '%)'; }, bal: 'Saldo, se paga al capitán el día del viaje',
    how: 'Cómo funciona', h1: 'Retenemos el depósito en tu tarjeta. Todavía no se cobra.', h2: 'El dueño confirma tu fecha en un máximo de 6 horas.',
    h3: 'Si confirma, cobramos el depósito y tu viaje queda reservado. Si no, liberamos la retención y te mandamos otros barcos libres ese día.',
    h4: 'Si cambias de opinión mientras esperas, cancela tu solicitud desde la siguiente página y se libera la retención.',
    go: 'Continuar a la retención con tarjeta', foot: 'Página segura de Stripe. Prefieres transferencia, OXXO o efectivo? ', footWa: 'Escríbenos por WhatsApp',
    close: 'Cerrar', sending: 'Un momento…', perGuest: function (n, a) { return n + ' personas extra × ' + a; }, perNight: function (n) { return n + (n === 1 ? ' noche' : ' noches'); },
    errs: { date: 'Elige una fecha a partir de mañana.', guests: 'Revisa el número de personas.', contact: 'Escribe tu nombre y un número de WhatsApp con lada.',
      booked: 'Ese día ya está ocupado. Prueba otra fecha o escríbenos.', not_available: 'Esta experiencia ya no acepta solicitudes en línea. Escríbenos por WhatsApp.',
      off: 'Las solicitudes en línea están pausadas. Escríbenos por WhatsApp.', other: 'No se pudo enviar. Revisa tu conexión e inténtalo otra vez.' },
    waMsg: function (t, d, g) { return 'Hola! Me interesa ' + t + (d ? ' el ' + d : '') + (g ? ' para ' + g + ' personas' : '') + '. Lo vi en vamosalapaz.com'; },
  } : {
    req: 'Request to book', reqHelp: 'We hold a 20% deposit on your card, not charged. The owner confirms within 6 hours, or the hold is released.',
    reqHelpN: function (p) { return 'We hold a ' + p + '% deposit on your card, not charged. The owner confirms within 6 hours, or the hold is released.'; },
    waHelp: 'Questions first? Chat with us before committing.',
    title: 'Request to book', sub: 'private boat, just your group', trip: 'TRIP', date: 'DATE', guests: 'GUESTS', nights: 'NIGHTS',
    name: 'YOUR NAME', namePh: 'Full name', wa: 'WHATSAPP NUMBER', waHint: "We'll message you here as soon as the owner answers.",
    note: 'ANYTHING THE OWNER SHOULD KNOW? (OPTIONAL)', notePh: 'Kids on board, a birthday, preferred start time…',
    price: 'Trip price', dep: function (p) { return 'Deposit to hold today (' + p + '%)'; }, bal: 'Balance, paid to the captain on the day',
    how: 'How it works', h1: "We place a hold for the deposit on your card. You're not charged yet.", h2: 'The owner confirms your date within 6 hours.',
    h3: "Confirmed: the deposit is charged and your trip is booked. Not confirmed: the hold is released and we send you other boats free that day.",
    h4: 'Changed your mind while you wait? Cancel your request from the next page and the hold is released.',
    go: 'Continue to card hold', foot: 'Secure card page by Stripe. Prefer transfer, OXXO or cash? ', footWa: 'Ask us on WhatsApp',
    close: 'Close', sending: 'One moment…', perGuest: function (n, a) { return n + ' extra guests × ' + a; }, perNight: function (n) { return n + (n === 1 ? ' night' : ' nights'); },
    errs: { date: 'Pick a date from tomorrow on.', guests: 'Check the number of guests.', contact: 'Add your name and a WhatsApp number with country code.',
      booked: 'That day is already booked. Try another date or message us.', not_available: "This experience no longer takes online requests. Message us on WhatsApp.",
      off: 'Online requests are paused right now. Message us on WhatsApp.', other: "Couldn't send. Check your connection and try again." },
    waMsg: function (t, d, g) { return 'Hi! I\'m interested in ' + t + (d ? ' on ' + d : '') + (g ? ' for ' + g + ' guests' : '') + '. I saw it on vamosalapaz.com'; },
  };
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
    offers = (j && j.offers) || [];
    offers.forEach(function (o) { bySlug[o.slug] = o; });
  }).catch(function () { offers = []; }).then(function () {
    try { document.dispatchEvent(new CustomEvent('vlp-request-ready')); } catch (e) {}
    offerPage();
  });

  function quote(id) {
    if (!quotes[id]) quotes[id] = fetch(API + '/quote?id=' + encodeURIComponent(id)).then(function (r) { return r.json(); });
    return quotes[id];
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
      '.vlp-rq-ov{position:fixed;inset:0;background:rgba(23,32,42,.5);z-index:99999;display:flex;align-items:flex-end;justify-content:center}',
      '@media(min-width:640px){.vlp-rq-ov{align-items:center}}',
      '.vlp-rq{background:#fff;width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:18px 16px 24px;box-sizing:border-box;font-family:"DM Sans",system-ui,sans-serif;color:' + INK + '}',
      '@media(min-width:640px){.vlp-rq{border-radius:16px}}',
      '.vlp-rq h2{margin:0;font-size:24px;line-height:1.2;font-weight:700}.vlp-rq .sub{margin:2px 0 14px;color:' + MUTED + ';font-size:15px}',
      '.vlp-rq label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:' + MUTED + ';margin:0 0 14px}',
      '.vlp-rq input,.vlp-rq select,.vlp-rq textarea{min-height:48px;border:1px solid #C9C1AE;border-radius:8px;padding:0 12px;font:inherit;font-size:16px;color:' + INK + ';background:#fff;box-sizing:border-box;width:100%}',
      '.vlp-rq textarea{padding:10px 12px;min-height:72px;resize:none}',
      '.vlp-rq .row{display:flex;gap:10px}.vlp-rq .row>label{flex:1 1 0;min-width:0}.vlp-rq .row>label.sm{flex:0 0 104px}',
      '.vlp-rq .hint{font-weight:400;font-size:13px;line-height:1.4}',
      '.vlp-rq .sum{background:' + SAND + ';border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;margin:0 0 16px}',
      '.vlp-rq .sum div{display:flex;justify-content:space-between;gap:12px;font-size:15px}.vlp-rq .sum .mut{font-size:14px;color:' + MUTED + '}',
      '.vlp-rq h3{font-size:17px;margin:0 0 8px}.vlp-rq .st{display:flex;gap:10px;font-size:14px;line-height:1.4;margin:0 0 8px}',
      '.vlp-rq .st i{flex:none;width:24px;height:24px;border-radius:999px;background:' + PINK + ';color:#fff;font-style:normal;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}',
      '.vlp-rq .go{width:100%;min-height:52px;font-size:16px;font-weight:700;margin-top:8px}.vlp-rq .go[disabled]{opacity:.6}',
      '.vlp-rq .foot{font-size:13px;color:' + MUTED + ';text-align:center;line-height:1.4;margin:10px 0 0}.vlp-rq .foot a{color:' + PINK + ';font-weight:600}',
      '.vlp-rq .err{background:#FDE8EC;color:#8A1C33;border-radius:10px;padding:10px 12px;font-size:14px;margin:0 0 12px}',
      '.vlp-rq .x{float:right;background:none;border:0;font-size:28px;line-height:1;color:' + MUTED + ';cursor:pointer;padding:0 4px;min-width:44px;min-height:44px}',
    ].join('');
    document.head.appendChild(s);
  }

  // ---------- the form ----------
  function open(slug, opts) {
    opts = opts || {};
    var first = bySlug[slug];
    if (!first) return;
    css();
    track('request_to_book_open', { offering: slug });
    var siblings = offers.filter(function (o) { return o.boat && o.boat === first.boat; });
    if (!siblings.length) siblings = [first];
    var cur = first, q = null;
    var ov = el('div', { class: 'vlp-rq-ov', onclick: function (e) { if (e.target === ov) shut(); } });
    var box = el('div', { class: 'vlp-rq', role: 'dialog', 'aria-modal': 'true', 'aria-label': T.title });
    function shut() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') shut(); }
    document.addEventListener('keydown', onKey);

    var tripSel = el('select', { onchange: function () { cur = bySlug[tripSel.value]; load(); } },
      siblings.map(function (o) { return el('option', { value: o.slug, selected: o.slug === slug ? 'selected' : null, text: ES ? o.nameEs : o.name }); }));
    var minDate = addDays(todayLaPaz(), 1);
    var dateIn = el('input', { type: 'date', min: minDate, value: opts.date && opts.date >= minDate ? opts.date : '', required: 'required', onchange: calc });
    var guestsIn = el('input', { type: 'number', inputmode: 'numeric', min: '1', value: opts.guests || '2', onchange: calc, oninput: calc });
    var nightsIn = el('input', { type: 'number', inputmode: 'numeric', min: '1', max: '14', value: '1', onchange: calc, oninput: calc });
    var nightsLbl = el('label', { class: 'sm' }, [T.nights, nightsIn]);
    var nameIn = el('input', { autocomplete: 'name', placeholder: T.namePh });
    var phoneIn = el('input', { type: 'tel', autocomplete: 'tel', placeholder: ES ? '+52 612 123 4567' : '+1 206 555 0100' });
    var noteIn = el('textarea', { rows: '3', placeholder: T.notePh });
    var sum = el('div', { class: 'sum' });
    var err = el('div');
    var go = el('button', { type: 'submit', class: 'vlp-rq-btn go', text: T.go });
    var foot = el('p', { class: 'foot' }, [T.foot, el('a', { class: 'whatsapp-link', 'data-wa-source': 'request-form', target: '_blank', rel: 'noopener', href: waHref(T.waMsg(ES ? cur.nameEs : cur.name, '', '')), text: T.footWa })]);
    var form = el('form', { onsubmit: submit }, [
      siblings.length > 1 ? el('label', null, [T.trip, tripSel]) : null,
      el('div', { class: 'row' }, [el('label', null, [T.date, dateIn]), el('label', { class: 'sm' }, [T.guests, guestsIn]), nightsLbl]),
      el('label', null, [T.name, nameIn]),
      el('label', null, [T.wa, phoneIn, el('span', { class: 'hint', text: T.waHint })]),
      el('label', null, [T.note, noteIn]),
      sum,
      el('h3', { text: T.how }),
      el('div', { class: 'st' }, [el('i', { text: '1' }), el('span', { text: T.h1 })]),
      el('div', { class: 'st' }, [el('i', { text: '2' }), el('span', { text: T.h2 })]),
      el('div', { class: 'st' }, [el('i', { text: '3' }), el('span', { text: T.h3 })]),
      el('p', { class: 'hint', style: 'font-size:13px;color:' + MUTED + ';margin:0 0 8px', text: T.h4 }),
      err, go, foot,
    ]);
    var head = el('h2', { text: T.title });
    var sub = el('p', { class: 'sub' });
    box.appendChild(el('button', { type: 'button', class: 'x', 'aria-label': T.close, text: '×', onclick: shut }));
    box.appendChild(head); box.appendChild(sub); box.appendChild(form);
    ov.appendChild(box); document.body.appendChild(ov);
    (dateIn.value ? nameIn : dateIn).focus();

    function load() {
      sub.textContent = (cur.boat ? cur.boat + ' · ' : '') + T.sub;
      nightsLbl.style.display = cur.perNight ? '' : 'none';
      guestsIn.max = String(cur.capacity || 40);
      sum.innerHTML = ''; sum.appendChild(el('div', { class: 'mut', text: T.sending }));
      quote(cur.id).then(function (j) { if (j && j.ok) { q = j; calc(); } else { q = null; err.innerHTML = ''; err.appendChild(el('p', { class: 'err', text: T.errs.not_available })); go.disabled = true; } });
    }
    function calc() {
      if (!q) return;
      var g = Math.max(1, Math.min(q.capacity, Math.round(+guestsIn.value || 1)));
      var n = q.perNight ? Math.max(1, Math.min(14, Math.round(+nightsIn.value || 1))) : 1;
      var extraN = q.included && q.extraEach && g > q.included ? g - q.included : 0;
      var price = q.base * n + extraN * q.extraEach, dep = Math.round(price * q.depositPct), pct = Math.round(q.depositPct * 100);
      sum.innerHTML = '';
      var rows = [[T.price + (q.perNight ? ' (' + T.perNight(n) + ')' : ''), money(price), '']];
      if (extraN) rows.push([T.perGuest(extraN, money(q.extraEach)), '', 'mut']);
      rows.push([T.dep(pct), money(dep), 'b']);
      rows.push([T.bal, money(price - dep), 'mut']);
      rows.forEach(function (r) { sum.appendChild(el('div', { class: r[2] === 'mut' ? 'mut' : '' }, [el('span', { text: r[0] }), el(r[2] === 'b' ? 'b' : 'span', { text: r[1] })])); });
      foot.querySelector('a').href = waHref(T.waMsg(ES ? cur.nameEs : cur.name, dayLong(dateIn.value), g));
    }
    function submit(e) {
      e.preventDefault();
      err.innerHTML = '';
      var body = { offeringId: cur.id, date: dateIn.value, guests: +guestsIn.value, nights: cur.perNight ? +nightsIn.value : '',
        name: nameIn.value.trim(), phone: phoneIn.value.trim(), note: noteIn.value.trim(), lang: ES ? 'es' : 'en', page: location.href.split('#')[0] };
      if (!body.date || body.date < minDate) return fail('date');
      if (!(body.guests >= 1 && body.guests <= (cur.capacity || 40))) return fail('guests');
      if (!body.name || body.phone.replace(/\D/g, '').length < 10) return fail('contact');
      go.disabled = true; go.textContent = T.sending;
      track('request_to_book_submit', { offering: cur.slug, guests: body.guests, trip_date: body.date });
      fetch(API + '/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok && j.url) location.href = j.url; else fail((j && j.error) || 'other'); })
        .catch(function () { fail('other'); });
    }
    function fail(code) {
      go.disabled = false; go.textContent = T.go;
      err.innerHTML = '';
      err.appendChild(el('p', { class: 'err', text: T.errs[code] || T.errs.other }));
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
    var wa = document.querySelector('a.whatsapp-link[data-wa-source^="offer"]') || document.querySelector('main a.whatsapp-link, .offering a.whatsapp-link, a.whatsapp-link');
    if (!wa) return;
    css();
    var p = new URLSearchParams(location.search);
    var btn = el('button', { type: 'button', class: 'vlp-rq-btn', 'data-vlp-request': m[1], 'data-vlp-date': p.get('date') || '', 'data-vlp-guests': p.get('guests') || '', text: T.req });
    var block = el('div', { class: 'vlp-rq-block' }, [btn, el('span', { class: 'vlp-rq-help', text: T.reqHelp })]);
    wa.parentNode.insertBefore(block, wa);
    var helpWa = el('span', { class: 'vlp-rq-help', style: 'text-align:center', text: T.waHelp });
    if (wa.nextSibling) wa.parentNode.insertBefore(helpWa, wa.nextSibling); else wa.parentNode.appendChild(helpWa);
  }

  window.VamosRequest = { ready: ready, isEligible: function (slug) { return !!bySlug[slug]; }, open: open, T: T };
})();
