/* Vamos a La Paz — customer booking page (/reserva?k=<page token>[&pagado=1])
   Source: github.com/vamosalapaz/vamos-portal (reserva.js), served via jsDelivr tagged releases.
   Shows the trip, the price (IVA included), how to pay the deposit (card via a one-time Stripe link, or bank transfer
   with the booking number as reference) and the cancellation terms. Once the deposit is paid it shows the captain's
   name and WhatsApp (Save contact, Copy number, WhatsApp); the server only sends those after the deposit.
   v26: first release. Never calls the booking an invoice ("Reservación VLP-xxxx"). */
(function () {
  'use strict';

  var HOOK = 'https://hook.us2.make.com/vrn9xcbptiqnnl1aniuccma1j8pxjtgx';
  var VAMOS_WA = '526122194779';
  var BRAND = '#B51E66', INK = '#061A2E';
  var C = { foam: '#F3EFE6', aqua: '#00C6C0', pacific: '#156AB3', gulf: '#0B4F6C', lima: '#B5C62E', orange: '#E65A37', gold: '#F3B53F' };
  var LOGO = 'https://s3.amazonaws.com/webflow-prod-assets/6a94d97df3061a3b48890971/6ab313cdb43ef771290ceace_download.png';
  var qs = new URLSearchParams(location.search);
  var TOKEN = qs.get('k') || '';
  var JUST_PAID = qs.get('pagado') === '1';

  var T = {
    es: {
      booking: 'Reservación', hi: 'Hola', ready: 'tu viaje está listo para reservar',
      confirmed: '¡Tu viaje está reservado!', thanks: '¡Gracias! Estamos confirmando tu pago…',
      thanksText: 'Esto tarda unos segundos. Puedes cerrar esta página; te escribiremos por WhatsApp.',
      guests: 'personas', meet: 'Punto de encuentro', directions: 'Cómo llegar', by: '',
      total: 'Precio total', iva: 'IVA incluido', deposit: 'Anticipo para reservar', balanceOwner: 'Saldo, se paga al capitán el día del viaje antes de zarpar',
      balanceVamos: 'Saldo, se paga el día del viaje', paid: 'Pagado', balanceLeft: 'Saldo pendiente',
      payTitle: 'Paga el anticipo', payCard: 'Pagar con tarjeta', orTransfer: 'O por transferencia bancaria',
      bank: 'Banco', holder: 'Titular', clabe: 'CLABE', ref: 'Concepto / referencia', amount: 'Monto', copy: 'Copiar', copied: 'Copiado',
      receipt: 'Enviar comprobante por WhatsApp', receiptMsg: 'Hola, te envío el comprobante de la transferencia del anticipo de la reservación ',
      securedBy: 'El anticipo asegura tu lugar; el saldo se paga el día del viaje.',
      captain: 'Tu capitán', save: 'Guardar contacto', copyNum: 'Copiar número', chat: 'WhatsApp',
      captainNote: 'Puedes escribirle directamente para coordinar el día del viaje. Cambios o cancelaciones, por favor con Vamos a La Paz.',
      note: 'Nota', cancel: 'Cancelación', weather: 'Si Capitanía de Puerto cierra el puerto por mal tiempo, te reembolsamos el anticipo completo.',
      questions: '¿Preguntas? Escríbenos por WhatsApp', questionsMsg: 'Hola, tengo una pregunta sobre mi reservación ',
      cancelled: 'Esta reservación fue cancelada. Si tienes dudas, escríbenos por WhatsApp.',
      invalid: 'Este enlace no es válido o ya no está disponible.', loading: 'Cargando…',
      linkPending: 'El pago con tarjeta estará disponible en unos minutos. Mientras tanto puedes pagar por transferencia.',
      paidFull: 'Pagado por completo. ¡Nos vemos pronto!', paidDeposit: 'Recibimos tu anticipo.'
    },
    en: {
      booking: 'Booking', hi: 'Hi', ready: 'your trip is ready to book',
      confirmed: 'Your trip is booked!', thanks: 'Thank you! We\'re confirming your payment…',
      thanksText: 'This takes a few seconds. You can close this page; we\'ll message you on WhatsApp.',
      guests: 'guests', meet: 'Meeting point', directions: 'Directions', by: '',
      total: 'Total price', iva: 'IVA (Mexican VAT) included', deposit: 'Deposit to book', balanceOwner: 'Balance, paid to the captain on the day before departure',
      balanceVamos: 'Balance, paid on the day', paid: 'Paid', balanceLeft: 'Balance due',
      payTitle: 'Pay the deposit', payCard: 'Pay by card', orTransfer: 'Or by bank transfer (Mexico)',
      bank: 'Bank', holder: 'Account holder', clabe: 'CLABE', ref: 'Reference', amount: 'Amount', copy: 'Copy', copied: 'Copied',
      receipt: 'Send the receipt on WhatsApp', receiptMsg: 'Hi, here is the transfer receipt for the deposit on booking ',
      securedBy: 'The deposit secures your spot; the balance is paid on the day.',
      captain: 'Your captain', save: 'Save contact', copyNum: 'Copy number', chat: 'WhatsApp',
      captainNote: 'Feel free to message them directly to coordinate the day. Changes or cancellations, please through Vamos a La Paz.',
      note: 'Note', cancel: 'Cancellation', weather: 'If the Port Captain closes the port for weather, we refund your full deposit.',
      questions: 'Questions? Message us on WhatsApp', questionsMsg: 'Hi, I have a question about my booking ',
      cancelled: 'This booking was cancelled. If you have questions, message us on WhatsApp.',
      invalid: 'This link is not valid or is no longer available.', loading: 'Loading…',
      linkPending: 'Card payment will be available in a few minutes. Meanwhile you can pay by bank transfer.',
      paidFull: 'Paid in full. See you soon!', paidDeposit: 'We received your deposit.'
    }
  };
  var L = T.es, lang = 'es', inv = null, bank = {}, root, tries = 0;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function get() {
    return fetch(HOOK, { method: 'POST', body: new URLSearchParams({ action: 'get', t: TOKEN }) })
      .then(function (r) { return r.text(); })
      .then(function (t) { try { return JSON.parse(t); } catch (e) { return { ok: false }; } });
  }
  function money(n) { return '$' + (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' MXN'; }
  function day(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function first(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function clean(s) { return String(s || '').replace(/^[\s,]+|[\s,]+$/g, ''); }
  function wa(num, text) { return 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function copyBtn(value, label) {
    return h('button', { class: 'cp', type: 'button', onclick: function (e) {
      var b = e.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(value) : Promise.reject()).then(function () { b.textContent = L.copied; setTimeout(function () { b.textContent = label || L.copy; }, 1800); }, function () { prompt(label || L.copy, value); });
    } }, [label || L.copy]);
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vr{max-width:520px;margin:0 auto;padding:0 16px 72px;font-family:"DM Sans",system-ui,sans-serif;color:' + INK + ';font-size:17px;line-height:1.5}',
      '.vr-top{display:flex;justify-content:center;padding:18px 0 12px}.vr-top img{height:46px;width:auto;display:block}',
      '.vr-stripe{display:flex;height:5px;border-radius:3px;overflow:hidden;margin:0 0 20px}.vr-stripe i{flex:1}',
      '.vr .eyebrow{font-size:13px;letter-spacing:.02em;color:#5b6772;margin:0 0 6px}',
      '.vr h1{font-size:26px;line-height:1.2;margin:0 0 14px;font-weight:600;color:' + C.gulf + '}',
      '.vr h2{font-size:15px;font-weight:600;margin:14px 0 4px;color:' + C.pacific + '}.vr h2:first-child{margin-top:0}',
      '.vr .card{background:#fff;border:1px solid #e3ddd2;border-radius:16px;padding:16px;margin:0 0 12px}',
      '.vr .trip-card{border-left:5px solid ' + C.aqua + '}.vr .money-card{border-left:5px solid ' + C.gold + '}.vr .pay-card{border-left:5px solid ' + BRAND + '}.vr .cap-card{border-left:5px solid ' + C.lima + '}',
      '.vr .trip{font-weight:600;font-size:19px;margin:0 0 4px}',
      '.vr .muted{color:#5b6772;margin:2px 0 0}',
      '.vr .money{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid #f0ebe3}.vr .money:first-child{border-top:0}',
      '.vr .money b{white-space:nowrap}.vr .money.total{font-size:19px;color:' + C.gulf + '}.vr .money.total b{font-size:21px}',
      '.vr .iva{font-size:13px;color:#5b6772;margin:-4px 0 6px;text-align:right}',
      '.vr .pre{white-space:pre-wrap;color:#3c4954;margin:0}',
      '.vr .btn{display:block;width:100%;box-sizing:border-box;text-align:center;border:0;border-radius:14px;padding:15px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;margin-top:12px}',
      '.vr .pri{background:' + BRAND + ';color:#fff}.vr .wa{background:#1f9d55;color:#fff}.vr .sec{background:#fff;color:' + INK + ';border:1px solid #c9c1b4}',
      '.vr .kv{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #f0ebe3}.vr .kv:first-of-type{border-top:0}',
      '.vr .kv span{color:#5b6772;font-size:14px}.vr .kv b{display:block;word-break:break-all;font-size:16px}',
      '.vr .cp{flex:0 0 auto;background:#fff;border:1px solid #c9c1b4;border-radius:10px;padding:6px 10px;font:inherit;font-size:14px;cursor:pointer;color:' + INK + '}',
      '.vr .or{font-size:15px;font-weight:600;color:' + C.gulf + ';margin:18px 0 4px}',
      '.vr .row3{display:flex;gap:8px;flex-wrap:wrap}.vr .row3 .btn{flex:1 1 30%;margin-top:0;padding:12px 8px;font-size:15px}',
      '.vr .nm{font-weight:600;font-size:19px;margin:0}.vr .ph{color:#3c4954;margin:2px 0 10px}',
      '.vr .msg{border-radius:12px;padding:12px 14px;margin:0 0 12px}',
      '.vr .ok{background:#dcf6f5;color:' + C.gulf + '}.vr .warn{background:#fdf1e1;color:#7a4b00}',
      '.vr a.map{color:' + C.pacific + ';font-weight:600}'
    ].join('');
    document.head.appendChild(s);
  }

  function mount() {
    css();
    root = h('div', { class: 'vr' });
    document.body.style.background = C.foam;
    var nav = document.querySelector('.w-nav, header, nav'), anchor = document.querySelector('main') || document.body;
    if (nav && nav.parentNode === anchor) nav.insertAdjacentElement('afterend', root); else anchor.appendChild(root);
    var shell = root; root = h('div');
    var stripe = h('div', { class: 'vr-stripe' });
    [C.aqua, C.pacific, C.lima, C.gold, C.orange, BRAND].forEach(function (c) { stripe.appendChild(h('i', { style: 'background:' + c })); });
    shell.appendChild(h('div', { class: 'vr-top' }, [h('img', { src: LOGO, alt: 'Vamos a La Paz' })]));
    shell.appendChild(stripe);
    shell.appendChild(root);
    root.appendChild(h('p', { class: 'muted', text: L.loading }));
    if (!TOKEN) return fail();
    load();
  }
  function load() {
    get().then(function (r) {
      inv = r && r.ok && r.inv;
      if (!inv || !inv.fields) return fail();
      bank = r.bank || {};
      lang = inv.fields.Language === 'English' ? 'en' : 'es'; L = T[lang];
      document.documentElement.lang = lang;
      render();
      // Coming back from Stripe: the payment webhook can lag a few seconds behind the redirect.
      if (JUST_PAID && !depositPaid() && tries < 6) { tries++; setTimeout(load, 4000); }
    }, fail);
  }
  function fail() { root.innerHTML = ''; root.appendChild(h('p', { class: 'msg warn', text: T.es.invalid + ' / ' + T.en.invalid })); }

  function f() { return inv.fields; }
  function depositPaid() { var x = f(); return x.Status === 'Deposit paid' || x.Status === 'Paid in full'; }

  function render() {
    var x = f(), st = x.Status;
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'eyebrow', text: 'Vamos a La Paz · ' + L.booking + ' ' + (x['Invoice number'] || '') }));
    if (st === 'Cancelled') {
      root.appendChild(h('p', { class: 'msg warn', text: L.cancelled }));
      root.appendChild(h('a', { class: 'btn wa', href: wa(VAMOS_WA, L.questionsMsg + (x['Invoice number'] || '')) }, [L.questions]));
      return;
    }
    var paid = depositPaid();
    if (paid) root.appendChild(h('h1', { text: L.confirmed }));
    else if (JUST_PAID) { root.appendChild(h('h1', { text: L.thanks })); root.appendChild(h('p', { class: 'muted', style: 'margin:-6px 0 14px', text: L.thanksText })); }
    else root.appendChild(h('h1', { text: L.hi + ' ' + first(x['Billed to']) + ', ' + L.ready }));

    if (paid) root.appendChild(h('p', { class: 'msg ok', text: st === 'Paid in full' ? L.paidFull : L.paidDeposit }));
    if (paid) { var cap = captainCard(); if (cap) root.appendChild(cap); }
    root.appendChild(tripCard());
    root.appendChild(moneyCard(paid));
    if (!paid && !JUST_PAID) root.appendChild(payCard());
    root.appendChild(termsCard());
    root.appendChild(h('a', { class: 'btn sec', href: wa(VAMOS_WA, L.questionsMsg + (x['Invoice number'] || '')) }, [L.questions]));
  }

  function tripCard() {
    var x = f();
    var dates = day(x['Trip date']) + (x['End date'] && x['End date'] > x['Trip date'] ? ' – ' + day(x['End date']) : '');
    var meet = [x['Meeting point'], x['Meeting time']].filter(Boolean).join(', ');
    return h('div', { class: 'card trip-card' }, [
      h('p', { class: 'trip', text: x.Trip || '' }),
      x.Provider ? h('p', { class: 'muted', text: x.Provider }) : null,
      h('p', { class: 'muted', text: [dates, x.Duration].filter(Boolean).join(' · ') }),
      x.Guests ? h('p', { class: 'muted', text: x.Guests + ' ' + L.guests }) : null,
      meet ? h('p', { class: 'muted' }, [L.meet + ': ' + meet + (x['Meeting map link'] ? ' · ' : ''),
        x['Meeting map link'] ? h('a', { class: 'map', href: x['Meeting map link'], target: '_blank', rel: 'noopener' }, [L.directions]) : null]) : null
    ]);
  }

  function moneyCard(paid) {
    var x = f(), price = Number(x['Trip price']) || 0, dep = Number(x.Deposit) || 0, got = Number(x['Amount paid']) || 0;
    var owner = x['Balance collected by'] === 'Owner';
    var m = h('div', { class: 'card money-card' });
    m.appendChild(h('div', { class: 'money total' }, [h('span', { text: L.total }), h('b', { text: money(price) })]));
    m.appendChild(h('p', { class: 'iva', text: L.iva }));
    m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.deposit }), h('b', { text: money(dep) })]));
    if (owner) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.balanceOwner }), h('b', { text: money(price - dep) })]));
    else {
      if (got > 0) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.paid }), h('b', { text: money(got) })]));
      m.appendChild(h('div', { class: 'money' }, [h('span', { text: got > 0 ? L.balanceLeft : L.balanceVamos }), h('b', { text: money(Math.max(0, price - Math.max(got, 0))) })]));
    }
    return m;
  }

  function payCard() {
    var x = f(), dep = Number(x.Deposit) || 0, num = x['Invoice number'] || '';
    var card = h('div', { class: 'card pay-card' });
    card.appendChild(h('h2', { text: L.payTitle + ' · ' + money(dep) }));
    var link = x['Stripe payment link'], linkOk = link && Number(x['Payment link amount']) === dep;
    if (linkOk) card.appendChild(h('a', { class: 'btn pri', href: link }, [L.payCard + ' · ' + money(dep)]));
    else card.appendChild(h('p', { class: 'msg warn', text: L.linkPending }));
    if (bank.CLABE) {
      card.appendChild(h('p', { class: 'or', text: L.orTransfer }));
      [[L.bank, bank.Bank], [L.holder, bank['Account holder']], [L.clabe, bank.CLABE, true], [L.ref, num, true], [L.amount, money(dep)]].forEach(function (r) {
        if (!r[1]) return;
        card.appendChild(h('div', { class: 'kv' }, [h('div', null, [h('span', { text: r[0] }), h('b', { text: r[1] })]), r[2] ? copyBtn(String(r[1]).replace(/\s/g, '')) : null]));
      });
      if (bank['Extra note']) card.appendChild(h('p', { class: 'muted', style: 'font-size:14px', text: bank['Extra note'] }));
      card.appendChild(h('a', { class: 'btn wa', href: wa(VAMOS_WA, L.receiptMsg + num) }, [L.receipt]));
    }
    card.appendChild(h('p', { class: 'muted', style: 'font-size:14px;margin-top:10px', text: L.securedBy }));
    return card;
  }

  // Captain's contact: the server only includes it once the deposit is paid and the owner has confirmed.
  function captainCard() {
    var raw = clean(f()['Shared owner contact']);
    if (!raw) return null;
    var parts = raw.split('|'), nm = clean(parts[0]), ph = clean(parts[1]);
    if (!ph) return null;
    var d = ph.replace(/\D/g, ''); if (d.length === 10) d = '52' + d;
    return h('div', { class: 'card cap-card' }, [
      h('h2', { text: L.captain }), h('p', { class: 'nm', text: nm }), h('p', { class: 'ph', text: ph }),
      h('div', { class: 'row3' }, [
        h('a', { class: 'btn pri', href: HOOK + '?action=vcard&t=' + encodeURIComponent(TOKEN) }, [L.save]),
        copyBtnBig(ph),
        h('a', { class: 'btn wa', href: wa(d) }, [L.chat])
      ]),
      h('p', { class: 'muted', style: 'font-size:14px;margin-top:10px', text: L.captainNote })
    ]);
  }
  function copyBtnBig(ph) {
    return h('button', { class: 'btn sec', type: 'button', onclick: function (e) {
      var b = e.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(ph) : Promise.reject()).then(function () { b.textContent = L.copied; }, function () { prompt(L.copyNum, ph); });
    } }, [L.copyNum]);
  }

  function termsCard() {
    var x = f(), t = h('div', { class: 'card' });
    if (x['Note to customer']) { t.appendChild(h('h2', { text: L.note })); t.appendChild(h('p', { class: 'pre', text: x['Note to customer'] })); }
    t.appendChild(h('h2', { text: L.cancel }));
    t.appendChild(h('p', { class: 'pre', text: [x['Cancellation policy'], L.weather].filter(Boolean).join('\n') }));
    return t;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
