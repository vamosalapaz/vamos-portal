/* Vamos a La Paz — owner booking confirmation (/confirmar?k=<confirmation token>)
   Source: github.com/vamosalapaz/vamos-portal (confirm.js), served via jsDelivr tagged releases.
   The owner reviews a managed booking (same trip details the customer gets, plus deposit / balance / commission),
   ticks agree and types their name, or asks for a change. Never linked from anything a customer sees.
   v22: first release. v23: total trip price, Vamos logo and palette. v24: commission line without timing; ignore a Last day before the trip date.
   v25: once the owner has agreed and the customer's deposit is paid, shows the customer's name and WhatsApp with
   Save contact (vCard), Copy number and WhatsApp buttons. The number only ever arrives from the server after the deposit. */
(function () {
  'use strict';

  var HOOK = 'https://hook.us2.make.com/5fjztbglh5n2romv2hd5hcj5flg43zg4';
  var PETER_WA = '526122194779';
  var TERMS = 'conf-2026-10';
  var BRAND = '#B51E66', INK = '#061A2E';
  var C = { foam: '#F3EFE6', aqua: '#00C6C0', pacific: '#156AB3', gulf: '#0B4F6C', lima: '#B5C62E', orange: '#E65A37', gold: '#F3B53F' };
  var LOGO = 'https://s3.amazonaws.com/webflow-prod-assets/6a94d97df3061a3b48890971/6ab313cdb43ef771290ceace_download.png';
  var TOKEN = new URLSearchParams(location.search).get('k') || '';

  var T = {
    es: {
      title: 'Confirmación de reservación', hi: 'Hola', ask: '¿confirmas este viaje?',
      intro: 'Vamos a La Paz tiene un cliente para tu embarcación. Revisa los detalles: son los mismos que recibe el cliente.',
      guests: 'personas', lead: 'a nombre de', meet: 'Punto de encuentro',
      total: 'Precio total del viaje', depositYou: 'Te enviamos el anticipo', balanceYou: 'Cobras al cliente el día del viaje', commission: 'Comisión de Vamos',
      purchase: 'Vamos te paga', includes: 'Incluye', cancel: 'Cancelación', pay: 'Pago', note: 'Nota de Peter',
      agreeText: 'Acepto prestar este viaje con estos términos, conforme a mi acuerdo de socio con Vamos a La Paz.',
      name: 'Tu nombre completo (tu firma)', confirm: 'Confirmar viaje', change: 'Pedir un cambio',
      changeAsk: '¿Qué hay que cambiar?', send: 'Enviar', back: 'Volver',
      needAgree: 'Marca la casilla y escribe tu nombre completo.', needNote: 'Escribe qué hay que cambiar.',
      doneTitle: '¡Listo! Confirmaste el viaje.', doneText: 'Guarda este enlace: aquí puedes volver a ver tu confirmación.',
      tellPeter: 'Avisarle a Peter por WhatsApp', changeDone: 'Enviamos tu solicitud de cambio.',
      changeDoneText: 'Peter te enviará una nueva confirmación con el cambio.',
      signedBy: 'Confirmado por', on: 'el', requested: 'Pediste este cambio:',
      superseded: 'Esta confirmación fue reemplazada por una más reciente. Revisa el último mensaje de Peter.',
      cancelled: 'Esta reservación fue cancelada.', invalid: 'Este enlace no es válido o ya no está disponible.',
      error: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.', loading: 'Cargando…', saving: 'Guardando…',
      waAgreed: 'Hola Peter, confirmé la reservación ', waChange: 'Hola Peter, pedí un cambio en la reservación ',
      yourGuest: 'Tu cliente', save: 'Guardar contacto', copyNum: 'Copiar número', chat: 'WhatsApp', copied: 'Número copiado',
      notYet: 'Te compartiremos el nombre y WhatsApp de tu cliente en cuanto pague el anticipo.',
      guestNote: 'Coordínense directamente para el día del viaje. Cambios o cancelaciones, por favor a través de Vamos a La Paz.'
    },
    en: {
      title: 'Booking confirmation', hi: 'Hi', ask: 'can you confirm this trip?',
      intro: 'Vamos a La Paz has a customer for your boat. Please review the details: they are the same ones the customer gets.',
      guests: 'guests', lead: 'booked by', meet: 'Meeting point',
      total: 'Total trip price', depositYou: 'We send you the deposit', balanceYou: 'You collect from the customer on the day', commission: 'Vamos commission',
      purchase: 'Vamos pays you', includes: 'Included', cancel: 'Cancellation', pay: 'Payment', note: 'Note from Peter',
      agreeText: 'I agree to provide this trip on these terms, under my partner agreement with Vamos a La Paz.',
      name: 'Your full name (your signature)', confirm: 'Confirm trip', change: 'Ask for a change',
      changeAsk: 'What needs to change?', send: 'Send', back: 'Back',
      needAgree: 'Tick the box and type your full name.', needNote: 'Write what needs to change.',
      doneTitle: 'Done! You confirmed the trip.', doneText: 'Keep this link: you can come back to see your confirmation here.',
      tellPeter: 'Let Peter know on WhatsApp', changeDone: 'Your change request was sent.',
      changeDoneText: 'Peter will send you a new confirmation with the change.',
      signedBy: 'Confirmed by', on: 'on', requested: 'You asked for this change:',
      superseded: 'This confirmation was replaced by a newer one. Please check Peter\'s latest message.',
      cancelled: 'This booking was cancelled.', invalid: 'This link is not valid or is no longer available.',
      error: 'Could not save. Check your connection and try again.', loading: 'Loading…', saving: 'Saving…',
      waAgreed: 'Hi Peter, I confirmed booking ', waChange: 'Hi Peter, I asked for a change to booking ',
      yourGuest: 'Your customer', save: 'Save contact', copyNum: 'Copy number', chat: 'WhatsApp', copied: 'Number copied',
      notYet: 'We\'ll share your customer\'s name and WhatsApp as soon as they pay the deposit.',
      guestNote: 'Coordinate the day of the trip directly. Changes or cancellations, please through Vamos a La Paz.'
    }
  };
  var L = T.es, lang = 'es', conf = null, root;

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
  function post(params) {
    var body = new URLSearchParams();
    Object.keys(params).forEach(function (k) { body.append(k, params[k] == null ? '' : String(params[k])); });
    return fetch(HOOK, { method: 'POST', body: body }).then(function (r) { return r.text(); }).then(function (t) {
      try { return JSON.parse(t); } catch (e) { return { ok: false, error: 'parse' }; }
    });
  }
  function money(n) { return '$' + (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' MXN'; }
  function day(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function stamp(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mazatlan' });
  }
  function first(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function num() { return String(conf.fields.Confirmation || '').split('·')[0].trim(); }
  function plain(s) { return String(s || '').replace(/\*\*|__/g, '').trim(); }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vc{max-width:520px;margin:0 auto;padding:0 16px 72px;font-family:"DM Sans",system-ui,sans-serif;color:' + INK + ';font-size:17px;line-height:1.5}',
      '.vc-top{display:flex;justify-content:center;padding:18px 0 12px}.vc-top img{height:46px;width:auto;display:block}',
      '.vc-stripe{display:flex;height:5px;border-radius:3px;overflow:hidden;margin:0 0 20px}.vc-stripe i{flex:1}',
      '.vc .card.trip-card{border-left:5px solid ' + C.aqua + '}',
      '.vc .card.money-card{border-left:5px solid ' + C.gold + '}',
      '.vc .money.total{font-size:19px;color:' + C.gulf + ';padding-bottom:10px}.vc .money.total b{font-size:21px}',
      '.vc h1{color:' + C.gulf + '}',
      '.vc h2{color:' + C.pacific + '}',
      '.vc .eyebrow{font-size:13px;letter-spacing:.02em;color:#5b6772;margin:0 0 6px}',
      '.vc h1{font-size:26px;line-height:1.2;margin:0 0 8px;font-weight:600}',
      '.vc .intro{color:#3c4954;margin:0 0 18px}',
      '.vc .card{background:#fff;border:1px solid #e3ddd2;border-radius:16px;padding:16px;margin:0 0 12px}',
      '.vc .trip{font-weight:600;font-size:19px;margin:0 0 4px}',
      '.vc .muted{color:#5b6772;margin:2px 0 0}',
      '.vc .money{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid #f0ebe3}.vc .money:first-child{border-top:0}',
      '.vc .money b{white-space:nowrap}',
      '.vc h2{font-size:15px;font-weight:600;margin:14px 0 4px}.vc h2:first-child{margin-top:0}',
      '.vc .pre{white-space:pre-wrap;color:#3c4954;margin:0}',
      '.vc .agree{display:flex;gap:10px;align-items:flex-start;font-size:16px;margin:4px 0 12px}',
      '.vc .agree input{width:22px;height:22px;margin-top:2px;flex:0 0 22px;accent-color:' + BRAND + '}',
      '.vc input[type=text],.vc textarea{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:12px;border:1px solid #c9c1b4;border-radius:12px;background:#fff;color:' + INK + '}',
      '.vc textarea{min-height:110px}',
      '.vc label.small{display:block;font-size:14px;color:#5b6772;margin:0 0 6px}',
      '.vc .btn{display:block;width:100%;box-sizing:border-box;text-align:center;border:0;border-radius:14px;padding:15px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;margin-top:14px}',
      '.vc .pri{background:' + BRAND + ';color:#fff}.vc .pri[disabled]{opacity:.55}',
      '.vc .wa{background:#1f9d55;color:#fff}',
      '.vc .link{background:none;border:0;color:#3c4954;text-decoration:underline;font:inherit;font-size:16px;cursor:pointer;display:block;margin:16px auto 0}',
      '.vc .msg{border-radius:12px;padding:12px 14px;margin:0 0 12px}',
      '.vc .guest{border-left:5px solid ' + BRAND + '}.vc .guest .nm{font-weight:600;font-size:19px;margin:0}.vc .guest .ph{color:#3c4954;margin:2px 0 10px}',
      '.vc .row3{display:flex;gap:8px;flex-wrap:wrap}.vc .row3 .btn{flex:1 1 30%;margin-top:0;padding:12px 8px;font-size:15px}',
      '.vc .sec{background:#fff;color:' + INK + ';border:1px solid #c9c1b4}',
      '.vc .ok{background:#dcf6f5;color:' + C.gulf + '}.vc .warn{background:#fdf1e1;color:#7a4b00}.vc .err{background:#fde8ec;color:#8a1c33}'
    ].join('');
    document.head.appendChild(s);
  }

  function mount() {
    css();
    root = h('div', { class: 'vc' });
    document.body.style.background = C.foam;
    var nav = document.querySelector('.w-nav, header, nav'), anchor = document.querySelector('main') || document.body;
    if (nav && nav.parentNode === anchor) nav.insertAdjacentElement('afterend', root); else anchor.appendChild(root);
    var shell = root; root = h('div');
    var stripe = h('div', { class: 'vc-stripe' });
    [C.aqua, C.pacific, C.lima, C.gold, C.orange, BRAND].forEach(function (c) { stripe.appendChild(h('i', { style: 'background:' + c })); });
    shell.appendChild(h('div', { class: 'vc-top' }, [h('img', { src: LOGO, alt: 'Vamos a La Paz' })]));
    shell.appendChild(stripe);
    shell.appendChild(root);
    root.appendChild(h('p', { class: 'muted', text: L.loading }));
    if (!TOKEN) return fail();
    post({ action: 'get', t: TOKEN }).then(function (r) {
      conf = r && r.ok && r.conf && r.conf[0];
      if (!conf) return fail();
      lang = conf.fields.Language === 'English' ? 'en' : 'es'; L = T[lang];
      document.documentElement.lang = lang;
      render();
    }, fail);
  }
  function fail() { root.innerHTML = ''; root.appendChild(h('p', { class: 'msg warn', text: T.es.invalid + ' / ' + T.en.invalid })); }

  function details() {
    var f = conf.fields, wrap = h('div');
    var dates = day(f['Trip date']) + (f['End date'] && f['End date'] > f['Trip date'] ? ' – ' + day(f['End date']) : '');
    wrap.appendChild(h('div', { class: 'card trip-card' }, [
      h('p', { class: 'trip', text: f.Trip || '' }),
      h('p', { class: 'muted', text: [f.Boat, dates, f.Duration].filter(Boolean).join(' · ') }),
      h('p', { class: 'muted', text: (f.Guests ? f.Guests + ' ' + L.guests : '') + (f['Lead guest'] ? ' · ' + L.lead + ' ' + f['Lead guest'] : '') }),
      (f['Meeting point'] || f['Meeting time']) ? h('p', { class: 'muted', text: L.meet + ': ' + [f['Meeting point'], f['Meeting time']].filter(Boolean).join(', ') }) : null
    ]));
    var m = h('div', { class: 'card money-card' });
    if (f['Trip price']) m.appendChild(h('div', { class: 'money total' }, [h('span', { text: L.total }), h('b', { text: money(f['Trip price']) })]));
    if (f['Balance owner collects'] || f['Commission to Vamos']) {
      if (f['Deposit to owner']) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.depositYou }), h('b', { text: money(f['Deposit to owner']) })]));
      if (f['Balance owner collects']) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.balanceYou }), h('b', { text: money(f['Balance owner collects']) })]));
      if (f['Commission to Vamos']) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.commission }), h('b', { text: money(f['Commission to Vamos']) })]));
    } else if (f['Purchase price']) {
      m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.purchase }), h('b', { text: money(f['Purchase price']) })]));
    }
    if (m.childNodes.length) wrap.appendChild(m);
    var t = h('div', { class: 'card' });
    [[L.includes, plain(f["What's included"])], [L.cancel, f['Cancellation policy']], [L.pay, f['Payment terms']], [L.note, f['Note to owner']]].forEach(function (kv) {
      if (kv[1]) { t.appendChild(h('h2', { text: kv[0] })); t.appendChild(h('p', { class: 'pre', text: kv[1] })); }
    });
    if (t.childNodes.length) wrap.appendChild(t);
    return wrap;
  }
  function header(title) {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'eyebrow', text: 'Vamos a La Paz · ' + L.title + ' ' + num() }));
    if (title) root.appendChild(h('h1', { text: title }));
  }
  // Customer contact, only present once the deposit is paid (the server sends nothing before that).
  function guestCard() {
    var raw = conf.fields['Shared customer contact'];
    if (!raw) return h('p', { class: 'msg warn', text: L.notYet });
    var parts = String(raw).split('|'), nm = (parts[0] || '').trim(), ph = (parts[1] || '').trim();
    var digits = ph.replace(/\D/g, ''); if (digits.length === 10) digits = '52' + digits;
    var card = h('div', { class: 'card guest' }, [
      h('h2', { text: L.yourGuest }), h('p', { class: 'nm', text: nm }), h('p', { class: 'ph', text: ph }),
      h('div', { class: 'row3' }, [
        h('a', { class: 'btn pri', href: HOOK + '?action=vcard&t=' + encodeURIComponent(TOKEN) }, [L.save]),
        h('button', { class: 'btn sec', type: 'button', onclick: function (e) {
          var b = e.currentTarget;
          (navigator.clipboard ? navigator.clipboard.writeText(ph) : Promise.reject()).then(function () { b.textContent = L.copied; }, function () { prompt(L.copyNum, ph); });
        } }, [L.copyNum]),
        h('a', { class: 'btn wa', href: 'https://wa.me/' + digits }, [L.chat])
      ]),
      h('p', { class: 'muted', style: 'font-size:14px;margin-top:10px', text: L.guestNote })
    ]);
    return card;
  }
  function waButton(text) {
    return h('a', { class: 'btn wa', href: 'https://wa.me/' + PETER_WA + '?text=' + encodeURIComponent(text) }, [L.tellPeter]);
  }

  function render() {
    var f = conf.fields, st = f.Status;
    if (st === 'Superseded' || st === 'Cancelled') { header(); root.appendChild(h('p', { class: 'msg warn', text: st === 'Superseded' ? L.superseded : L.cancelled })); return; }
    if (st === 'Agreed') {
      header(L.doneTitle);
      root.appendChild(h('p', { class: 'msg ok', text: L.signedBy + ' ' + (f['Signed by'] || '') + (f['Responded at'] ? ' ' + L.on + ' ' + stamp(f['Responded at']) : '') }));
      root.appendChild(guestCard());
      root.appendChild(details());
      return;
    }
    if (st === 'Changes requested') {
      header(L.changeDone);
      root.appendChild(h('p', { class: 'msg warn', text: L.requested + ' ' + (f['Change request'] || '') }));
      root.appendChild(h('p', { class: 'intro', text: L.changeDoneText }));
      root.appendChild(details());
      return;
    }
    header(L.hi + ' ' + first(f['Owner name']) + ', ' + L.ask);
    root.appendChild(h('p', { class: 'intro', text: L.intro }));
    root.appendChild(details());

    var box = h('div', { class: 'card' });
    var cb = h('input', { type: 'checkbox', id: 'vc-ok' });
    box.appendChild(h('label', { class: 'agree', for: 'vc-ok' }, [cb, h('span', { text: L.agreeText })]));
    box.appendChild(h('label', { class: 'small', for: 'vc-name', text: L.name }));
    var nm = h('input', { type: 'text', id: 'vc-name', autocomplete: 'name' });
    box.appendChild(nm);
    var err = h('div');
    box.appendChild(err);
    var btn = h('button', { class: 'btn pri', type: 'button', onclick: function () {
      err.innerHTML = '';
      if (!cb.checked || nm.value.trim().split(/\s+/).length < 2) { err.appendChild(h('p', { class: 'msg err', text: L.needAgree })); return; }
      btn.disabled = true; btn.textContent = L.saving;
      post({ action: 'agree', t: TOKEN, name: nm.value.trim(), terms: TERMS, ua: navigator.userAgent }).then(function (r) {
        if (r.ok) { conf.fields.Status = 'Agreed'; conf.fields['Signed by'] = nm.value.trim(); conf.fields['Responded at'] = new Date().toISOString(); return agreedScreen(); }
        if (r.error === 'state') return mount();
        btn.disabled = false; btn.textContent = L.confirm; err.appendChild(h('p', { class: 'msg err', text: L.error }));
      }, function () { btn.disabled = false; btn.textContent = L.confirm; err.appendChild(h('p', { class: 'msg err', text: L.error })); });
    } }, [L.confirm]);
    box.appendChild(btn);
    root.appendChild(box);
    root.appendChild(h('button', { class: 'link', type: 'button', onclick: changeScreen }, [L.change]));
  }

  function agreedScreen() {
    header(L.doneTitle);
    root.appendChild(h('p', { class: 'intro', text: L.doneText }));
    root.appendChild(waButton(L.waAgreed + num() + ' (' + day(conf.fields['Trip date']) + ') ✅'));
    root.appendChild(guestCard());
    root.appendChild(details());
    window.scrollTo(0, 0);
  }
  function changeScreen() {
    header(L.change);
    var box = h('div', { class: 'card' });
    box.appendChild(h('label', { class: 'small', for: 'vc-note', text: L.changeAsk }));
    var ta = h('textarea', { id: 'vc-note' });
    box.appendChild(ta);
    var err = h('div'); box.appendChild(err);
    var btn = h('button', { class: 'btn pri', type: 'button', onclick: function () {
      err.innerHTML = '';
      var note = ta.value.trim();
      if (!note) { err.appendChild(h('p', { class: 'msg err', text: L.needNote })); return; }
      btn.disabled = true; btn.textContent = L.saving;
      post({ action: 'change', t: TOKEN, note: note }).then(function (r) {
        if (r.ok) {
          conf.fields.Status = 'Changes requested'; conf.fields['Change request'] = note;
          header(L.changeDone);
          root.appendChild(h('p', { class: 'intro', text: L.changeDoneText }));
          root.appendChild(waButton(L.waChange + num() + ': ' + note));
          return;
        }
        if (r.error === 'state') return mount();
        btn.disabled = false; btn.textContent = L.send; err.appendChild(h('p', { class: 'msg err', text: L.error }));
      }, function () { btn.disabled = false; btn.textContent = L.send; err.appendChild(h('p', { class: 'msg err', text: L.error })); });
    } }, [L.send]);
    box.appendChild(btn);
    root.appendChild(box);
    root.appendChild(h('button', { class: 'link', type: 'button', onclick: render }, [L.back]));
    window.scrollTo(0, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
