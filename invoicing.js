/* Vamos a La Paz — invoicing screen (/invoicing?k=<admin key>[&inquiry=rec…][&invoice=rec…][&phone=…])
   Source: github.com/vamosalapaz/vamos-portal (invoicing.js), served via jsDelivr tagged releases.
   v1 (Oct 2026): create a managed-booking invoice from an inquiry or a WhatsApp number, owner sign-off by WhatsApp.
   v2: WhatsApp buttons use wa.me (WhatsApp then offers to switch to WhatsApp Business); experiences whose boat has
       no owner on file let you type the owner's name and number, or skip sign-off.
   v3: meeting point required; Edit on the tracking screen (re-sends the owner a fresh confirmation);
       owner sign-off status (sent / confirmed / change requested) recorded and shown; links to the owner's /confirmar page.
   v4: Vamos logo + palette; iPhone date fields no longer overlap; Last day defaults to the trip date and can't be earlier.
   v5: an old Last day earlier than the trip date is ignored when editing; owner payment terms no longer say when the commission is paid.
   v6 (release v26): send to the customer (one-time Stripe card link made automatically, /reserva page, WhatsApp / Copy / Email),
       Mark paid (transfer or cash), pass the deposit to the owner, settle at the dock (balance + commission), cancel or port closed.
   v7 (release v27): boat/operator first, then its experiences; "Other (type it)" for unlisted trips; quick payments (a description
       and an amount, standalone or attached to a booking as an extra); phone hint for non-Mexican numbers.
   v8 (release v28): the send step is only green when a message was actually sent from this screen; customer fields
       support iPhone AutoFill Contact (and a Choose from contacts button where the browser has a contact picker).
   v9 (release v29): the phone field says how the number will be read; a 10-digit number gets a one-tap +1 (US/Canada) switch.
   v10 (release v30): meeting time uses the phone's time picker (15-minute steps), saved as "8:30 am".
   v11 (release v31): the blank link opens a home dashboard: Bookings (search, Needs you, upcoming/past/cancelled),
       Calendar (Vamos trips Google calendar, tap for contacts) and Numbers (this month / 3 / 6 / 12 months, chart).
       New booking: ?new=1, new quick payment: ?new=quick. The header links back to All bookings.
   v12 (release v32): Reschedule (new date/time, why; payments carry over; calendar, customer page and owner confirmation
       follow; one-tap WhatsApp to customer and owner). The calendar tab hides events of cancelled or deleted bookings.
   v13 (release v33): Numbers has So far / Ahead. Ahead = booked trips from today: expected revenue (Good Medicine net +
       Vamos commissions), Good Medicine balances still to collect, commissions expected, by month; plus what is not counted yet.
   v14 (release v34): Numbers has an MXN / USD switch (USD at today's rate, remembered on the phone).
   v15 (release v35): optional Expenses & margin on Numbers (So far: actual expenses, margin, where the money went;
       Ahead: estimated costs from the last 3 months' average and projected margin). */
(function () {
  'use strict';

  var HOOK_DATA = 'https://hook.us2.make.com/sj7umgqbg14kim902rg0ochd4ny6i72f';
  var HOOK_CREATE = 'https://hook.us2.make.com/4vs20d3adxqy8nnc1hftzito01rn933q';
  var HOOK_ACTIONS = 'https://hook.us2.make.com/f4uho6gwh1mu94gu4b4y5kbb86if4prm';
  var SITE = 'https://vamosalapaz.com';
  var PINK = '#B51E66';           // Bugambilia
  var C = { navy: '#061A2E', foam: '#F3EFE6', aqua: '#00C6C0', pacific: '#156AB3', gulf: '#0B4F6C', lima: '#B5C62E', orange: '#E65A37', gold: '#F3B53F' };
  var CUSTOM = '__custom';
  var PHONE_HINT = 'Mexican numbers: 10 digits. Others: start with + and the country code (+1 for US and Canada).';
  var LOGO = 'https://s3.amazonaws.com/webflow-prod-assets/6a94d97df3061a3b48890971/6ab313cdb43ef771290ceace_download.png';

  var qs = new URLSearchParams(location.search);
  var KEY = qs.get('k') || '';
  var state = { data: null, customerId: '', inquiry: null, form: {}, busy: false };

  /* ---------- tiny helpers ---------- */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function post(url, params) {
    var body = new URLSearchParams();
    Object.keys(params).forEach(function (k) { body.append(k, params[k] == null ? '' : String(params[k])); });
    return fetch(url, { method: 'POST', body: body }).then(function (r) {
      return r.text().then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { throw new Error('The server sent something unexpected. Try again.'); }
        if (!j.ok) throw new Error(j.error === 'key' ? 'This link is not valid. Use the link from your inquiry email.' : 'Saving failed (' + j.error + '). Nothing was sent; try again.');
        return j;
      });
    });
  }
  function money(n) { n = Number(n) || 0; return '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 }); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function waNumber(phone) { var d = digits(phone); if (d.length === 10) d = '52' + d; return d; }
  function first(name) { return String(name || '').trim().split(/\s+/)[0] || ''; }
  function shortName(name) { var p = String(name || '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0) + '.' : (p[0] || ''); }
  function ids(v) { return Array.isArray(v) ? v : String(v || '').split(/[\s,]+/).filter(Boolean); }
  function byId(list) { var m = {}; (list || []).forEach(function (r) { m[r.id] = r; }); return m; }
  function lowPrice(range) { var m = String(range || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }
  function plain(md) { return String(md || '').replace(/\*\*|__|\*|_|#+\s?/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
  // Meeting time: the form uses a native time picker (HH:MM); the booking stores friendly text ("8:30 am").
  function toTimeInput(text) {
    var m = String(text || '').toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m|p\.?\s?m)?/);
    if (!m) return '';
    var hh = Number(m[1]), mm = m[2] || '00', ap = m[3] ? m[3].charAt(0) : '';
    if (ap === 'p' && hh < 12) hh += 12; if (ap === 'a' && hh === 12) hh = 0;
    return hh > 23 ? '' : (hh < 10 ? '0' : '') + hh + ':' + mm;
  }
  function fromTimeInput(v) {
    var m = String(v || '').match(/^(\d{2}):(\d{2})/);
    if (!m) return '';
    var hh = Number(m[1]), ap = hh >= 12 ? 'pm' : 'am', h12 = hh % 12 || 12;
    return h12 + ':' + m[2] + ' ' + ap;
  }
  function fmtDate(iso, lang) {
    if (!iso) return '';
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(lang === 'English' ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  var CANCEL_ES = {
    'Free cancellation up to 24 hours before': 'Cancelación gratuita hasta 24 horas antes.',
    'Free cancellation up to 48 hours before': 'Cancelación gratuita hasta 48 horas antes.',
    'Free cancellation up to 7 days before': 'Cancelación gratuita hasta 7 días antes.',
    'Free cancellation up to 14 days before': 'Cancelación gratuita hasta 14 días antes.',
    'Non-refundable': 'No reembolsable.'
  };
  function cancellationText(o, lang) {
    var f = o.fields, p = f['Cancellation policy'] || '', es = lang !== 'English';
    var line = p && p !== 'Custom (see notes)' ? (es ? (CANCEL_ES[p] || p) : p + '.') : '';
    var notes = es ? (f['Cancellation notes (ES)'] || f['Cancellation notes']) : (f['Cancellation notes'] || f['Cancellation notes (ES)']);
    return [line, notes || ''].filter(Boolean).join('\n');
  }
  function paymentTerms(lang, dep, bal, com) {
    if (lang === 'English') return 'We send you the full deposit (' + money(dep) + ') as soon as the customer pays it; it secures the booking. On the day you collect the balance (' + money(bal) + ') directly from the customer before departure, and you pay Vamos its commission (' + money(com) + '). If the customer cancels, you keep the deposit and no commission is due. If the Port Captain closes the port, you return the deposit to Vamos and we refund the customer.';
    return 'Te enviamos el anticipo completo (' + money(dep) + ') en cuanto el cliente lo paga; asegura la reservación. El día del viaje cobras el saldo (' + money(bal) + ') directamente al cliente, antes de zarpar, y nos pagas la comisión de Vamos (' + money(com) + '). Si el cliente cancela, te quedas con el anticipo y no hay comisión. Si Capitanía cierra el puerto, nos devuelves el anticipo y nosotros se lo reembolsamos al cliente.';
  }

  /* ---------- offering context (owner, boat, business line) ---------- */
  function ctx(offeringId) {
    var d = state.data, o = d.maps.off[offeringId];
    if (!o) return null;
    var f = o.fields;
    var boat = d.maps.boat[ids(f.Boat)[0]] || null;
    var op = d.maps.op[ids(f.Operator)[0]] || null;
    var placeholder = !!(op && op.fields['Placeholder operator']);
    var partnerIds = ids(f['Partner Admin Record IDs']);
    var partners = partnerIds.map(function (id) { return d.maps.pa[id]; }).filter(Boolean);
    var owner = partners.filter(function (p) { return p.fields['Primary Contact']; })[0] || partners[0] || null;
    var opsId = placeholder ? (owner && owner.id) : (op && op.id);
    var mirror = (d.mirror || []).filter(function (m) { return m.fields['Operations record ID'] === opsId; })[0] || null;
    var gm = (mirror && mirror.fields['Business line'] === 'Good Medicine direct') || /good medicine/i.test(op ? op.fields.Name : '');
    var comPct = owner && owner.fields['Commission %'] ? Number(owner.fields['Commission %']) : 0.15;
    return { o: o, f: f, boat: boat, op: op, placeholder: placeholder, owner: owner, opsId: opsId, mirror: mirror, gm: gm, comPct: comPct };
  }

  /* ---------- styles ---------- */
  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vi{max-width:560px;margin:0 auto;padding:0 16px 64px;font-family:"DM Sans",system-ui,sans-serif;color:' + C.navy + ';font-size:16px;line-height:1.45}',
      '.vi-top{display:flex;align-items:center;justify-content:space-between;padding:14px 0 10px}.vi-top img{height:38px;width:auto;display:block}.vi-top span{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:' + C.gulf + '}',
      '.vi-stripe{display:flex;height:5px;border-radius:3px;overflow:hidden;margin:0 0 18px}.vi-stripe i{flex:1}',
      '.vi .card{border-left:4px solid ' + C.aqua + '}',
      '.vi input[type=date],.vi input[type=time]{-webkit-appearance:none;appearance:none;min-width:0;display:block;min-height:44px;line-height:1.2}',
      '.vi h1{font-size:24px;margin:0 0 4px;font-weight:600}',
      '.vi .sub{color:#5a6670;font-size:14px;margin:0 0 18px}',
      '.vi .card{background:#fff;border:1px solid #e4e1dc;border-radius:14px;padding:14px;margin:0 0 12px}',
      '.vi label{display:block;font-size:13px;color:#5a6670;margin:12px 0 4px}',
      '.vi input,.vi select,.vi textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1px solid #cfcac2;border-radius:10px;background:#fff;color:#1d2731}',
      '.vi textarea{min-height:64px}',
      '.vi input:focus,.vi select:focus,.vi textarea:focus{outline:2px solid ' + PINK + ';outline-offset:1px}',
      '.vi .row{display:flex;gap:10px}.vi .row>div{flex:1;min-width:0}',
      '.vi .hint{font-size:13px;color:#7a858c;margin-top:4px}',
      '.vi .btn{display:block;width:100%;box-sizing:border-box;text-align:center;border:0;border-radius:12px;padding:14px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}',
      '.vi .pri{background:' + PINK + ';color:#fff;margin-top:18px}',
      '.vi .pri[disabled]{opacity:.5;cursor:default}',
      '.vi .sec{background:#fff;color:#1d2731;border:1px solid #cfcac2;margin-top:8px;font-weight:500}',
      '.vi .link{background:none;border:0;color:#5a6670;text-decoration:underline;font:inherit;font-size:14px;cursor:pointer;display:block;margin:12px auto 0}',
      '.vi .seg{display:flex;border:1px solid #cfcac2;border-radius:10px;overflow:hidden}.vi .seg button{flex:1;border:0;background:#fff;padding:9px;font:inherit;font-size:15px;cursor:pointer}.vi .seg button.on{background:#1d2731;color:#fff}',
      '.vi .known{background:#eef6ef;color:#225c2e;border-radius:10px;padding:8px 10px;font-size:14px;margin-top:8px}',
      '.vi .warn{background:#fdf3e2;color:#7a4b00;border-radius:10px;padding:10px 12px;font-size:14px}',
      '.vi .err{background:#fde8ec;color:#8a1c33;border-radius:10px;padding:10px 12px;font-size:14px;margin-top:12px}',
      '.vi .step{display:flex;gap:12px;padding:12px 0;border-top:1px solid #eee9e2}.vi .step:first-child{border-top:0}',
      '.vi .dot{flex:0 0 22px;height:22px;border-radius:50%;border:2px solid #cfcac2;box-sizing:border-box;margin-top:2px}',
      '.vi .dot.done{background:' + C.aqua + ';border-color:' + C.aqua + '}.vi .dot.now{border-color:' + PINK + ';background:#f7dbe8}',
      '.vi h1{color:' + C.gulf + '}',
      '.vi .step b{display:block}.vi .step .small{font-size:14px;color:#5a6670}',
      '.vi .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.vi .btns .btn{width:auto;padding:9px 14px;margin:0;font-size:15px}',
      '.vi .kv{display:flex;justify-content:space-between;gap:12px;padding:3px 0;font-size:15px}.vi .kv span:first-child{color:#5a6670}',
      '.vi-top a.vi-home{font-size:14px;color:' + C.gulf + ';text-decoration:none;font-weight:600}',
      '.vi .seg.tight button{font-size:14px;padding:9px 4px;white-space:nowrap}.vi .dash-tabs{margin:0 0 6px}.vi .dash-tabs button{font-weight:600}',
      '.vi .dash-meta{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#7a858c;margin:0 0 12px}',
      '.vi .dash-h{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:' + C.gulf + ';margin:18px 0 8px;font-weight:700}',
      '.vi input[type=search]{margin:0 0 4px}',
      '.vi a.brow{display:block;text-decoration:none;color:inherit;margin:0 0 8px}',
      '.vi .brow-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;color:#5a6670;margin:0 0 2px}',
      '.vi .brow-need{font-size:14px;color:#5a6670;margin-top:4px}.vi .brow-need.act{color:' + PINK + ';font-weight:600}',
      '.vi .pill{font-size:12px;border-radius:99px;padding:2px 9px;white-space:nowrap;font-weight:600}',
      '.vi .ev{padding:0;overflow:hidden;margin:0 0 8px}.vi .ev-head{display:block;width:100%;background:none;border:0;font:inherit;color:inherit;text-align:left;padding:12px 14px;cursor:pointer}',
      '.vi .ev-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 2px}.vi .ev-time{font-size:13px;color:#5a6670}.vi .ev-title{display:block;font-weight:600}',
      '.vi .ev-detail{padding:0 14px 14px;border-top:1px solid #eee9e2}.vi .ev-detail .kv{font-size:14px}.vi .ev-detail .kv span:last-child{text-align:right;overflow-wrap:anywhere}',
      '.vi .tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}.vi .tile{background:#fff;border:1px solid #e4e1dc;border-radius:12px;padding:10px 12px}',
      '.vi .tile span{display:block;font-size:12px;color:#5a6670}.vi .tile b{display:block;font-size:22px;color:' + C.navy + ';margin:2px 0}.vi .tile small{font-size:12px;color:#7a858c}',
      '.vi .kv.mth{font-size:13.5px;gap:6px}.vi .kv.mth span{flex:1;text-align:right;white-space:nowrap}.vi .kv.mth span:first-child{text-align:left;color:#1d2731}.vi .kv.mth.dim{opacity:.5}',
      '.vi .chip{border:1px solid #cfcac2;background:#fff;color:#1d2731;border-radius:99px;padding:7px 14px;font:inherit;font-size:14px;cursor:pointer}.vi .chip.on{background:#fdeee8;border-color:' + C.orange + ';color:#8a2f14;font-weight:600}',
      '.vi .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1d2731;color:#fff;padding:10px 16px;border-radius:10px;font-size:15px;z-index:99}'
    ].join('');
    document.head.appendChild(s);
  }
  function toast(msg) { var t = h('div', { class: 'toast', text: msg }); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  function copy(text) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Copied'); }, function () { prompt('Copy this:', text); }); }
  function openWhatsApp(phone, text) {
    // wa.me universal link: iOS opens WhatsApp, which offers a one-tap switch to WhatsApp Business.
    location.href = 'https://wa.me/' + waNumber(phone) + '?text=' + encodeURIComponent(text);
  }

  /* ---------- root ---------- */
  var root;
  function mount() {
    css();
    root = h('div', { class: 'vi' });
    document.body.style.background = C.foam;
    var anchor = document.querySelector('main') || document.body;
    var nav = document.querySelector('.w-nav, header, nav');
    if (nav && nav.parentNode === anchor) nav.insertAdjacentElement('afterend', root); else anchor.appendChild(root);
    var shell = root; root = h('div');
    var stripe = h('div', { class: 'vi-stripe' });
    [C.aqua, C.pacific, C.lima, C.gold, C.orange, PINK].forEach(function (c) { stripe.appendChild(h('i', { style: 'background:' + c })); });
    var home = !qs.get('inquiry') && !qs.get('invoice') && !qs.get('phone') && !qs.get('new');
    shell.appendChild(h('div', { class: 'vi-top' }, [h('a', { href: KEY ? homeUrl() : '#', 'aria-label': 'All bookings' }, [h('img', { src: LOGO, alt: 'Vamos a La Paz' })]), home ? h('span', { text: 'Invoicing' }) : h('a', { class: 'vi-home', href: homeUrl(), text: '← All bookings' })]));
    shell.appendChild(stripe);
    shell.appendChild(root);
    if (!KEY) { root.appendChild(h('p', { class: 'warn', text: 'This page needs your private invoicing link. Open it from an inquiry email.' })); return; }
    root.appendChild(h('p', { class: 'sub', text: 'Loading…' }));
    if (home) { renderHome(); return; }
    load(qs.get('inquiry'), qs.get('invoice')).catch(showFatal);
  }
  function showFatal(e) { root.innerHTML = ''; root.appendChild(h('p', { class: 'err', text: e.message || String(e) })); }

  function load(inquiryId, invoiceId) {
    return post(HOOK_DATA, { k: KEY, action: 'load', inquiry: inquiryId || '', invoice: invoiceId || '' }).then(function (d) {
      d.maps = { off: byId(d.offerings), boat: byId(d.boats), pa: byId(d.partners), op: byId(d.operators) };
      state.data = d;
      if (d.invoice && d.invoice.length) return renderInvoice(d.invoice[0]);
      state.inquiry = d.inquiry && d.inquiry[0] || null;
      if (!state.inquiry && qs.get('new') === 'quick') return renderQuick({});
      renderForm();
    });
  }

  /* ---------- create form ---------- */
  function renderForm(edit) {
    var d = state.data, inq = edit ? null : state.inquiry, f;
    state.edit = edit || null;
    state.busy = false;
    if (edit) {
      var e = edit.inv.fields;
      f = { Name: e['Billed to'], Phone: e.Phone, Email: e.Email, Language: e.Language, 'Offering record ID': e['Offering record ID'],
            'Requested date': e['Trip date'], Guests: e.Guests };
      state.customerId = e.Customer ? ids(e.Customer)[0] : '';
    } else {
      f = inq ? inq.fields : {};
      state.customerId = inq && f.Customer ? ids(f.Customer)[0] : '';
    }
    root.innerHTML = '';
    root.appendChild(h('h1', { text: edit ? 'Edit ' + (edit.inv.fields['Invoice number'] || 'invoice') : 'New invoice' }));
    root.appendChild(h('p', { class: 'sub', text: edit ? (edit.conf && edit.conf.fields.Status === 'Agreed' ? 'The owner already confirmed; saving sends them a fresh confirmation.' : 'Change anything, then save.') : inq ? 'From website inquiry' + (f['Received at'] ? ', ' + new Date(f['Received at']).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '') : 'Started from WhatsApp or by hand' }));

    var lang = f.Language || 'Español';
    var form = h('form', { autocomplete: 'on', onsubmit: function (e) { e.preventDefault(); } });
    if (!edit && !inq) form.appendChild(modeSwitch('booking'));
    // customer
    var cust = h('div', { class: 'card' });
    cust.appendChild(h('label', { for: 'vi-name', text: 'Customer name' }));
    cust.appendChild(h('input', { id: 'vi-name', name: 'name', value: f.Name || '', autocomplete: 'name' }));
    cust.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-phone', text: 'WhatsApp number' }), h('input', { id: 'vi-phone', name: 'tel', type: 'tel', autocomplete: 'tel', value: f.Phone || qs.get('phone') || '', onblur: lookupPhone, onchange: function () { phoneHint(); lookupPhone(); }, oninput: phoneHint })]),
      h('div', null, [h('label', { for: 'vi-email', text: 'Email (optional)' }), h('input', { id: 'vi-email', name: 'email', type: 'email', autocomplete: 'email', value: f.Email || '' })])
    ]));
    cust.appendChild(h('div', { class: 'hint', id: 'vi-phonehint' }));
    if (!edit) cust.appendChild(contactsHelp());
    setTimeout(phoneHint, 0);
    cust.appendChild(h('div', { id: 'vi-known' }));
    cust.appendChild(h('label', { text: 'Customer language' }));
    var seg = h('div', { class: 'seg', id: 'vi-lang' });
    ['Español', 'English'].forEach(function (l) {
      seg.appendChild(h('button', { type: 'button', class: l === lang ? 'on' : '', text: l, onclick: function () {
        Array.prototype.forEach.call(seg.children, function (b) { b.className = b.textContent === l ? 'on' : ''; });
        state.form.lang = l; langHint(); if ($('#vi-grp') && $('#vi-grp').value && $('#vi-grp').value !== CUSTOM) fillExperiences($('#vi-off').value); else refresh();
      } }));
    });
    state.form.lang = lang;
    cust.appendChild(seg);
    cust.appendChild(h('div', { class: 'hint', id: 'vi-langhint' }));
    if (f.Message) cust.appendChild(h('p', { class: 'hint', text: '“' + f.Message + '”' }));
    form.appendChild(cust);

    // trip
    var trip = h('div', { class: 'card' });
    trip.appendChild(h('label', { for: 'vi-grp', text: 'Boat or operator' }));
    var grp = h('select', { id: 'vi-grp', onchange: function () { fillExperiences(''); } });
    grp.appendChild(h('option', { value: '', text: 'Choose a boat or operator' }));
    groups().forEach(function (g) { grp.appendChild(h('option', { value: g.key, text: g.label + ' (' + g.items.length + ')' })); });
    grp.appendChild(h('option', { value: CUSTOM, text: 'Other (type it)' }));
    trip.appendChild(grp);
    trip.appendChild(h('div', { id: 'vi-offwrap', style: 'display:none' }, [h('label', { for: 'vi-off', text: 'Experience' }), h('select', { id: 'vi-off', onchange: function () { applyOffering(true); } })]));
    trip.appendChild(h('div', { id: 'vi-customwrap', style: 'display:none' }, [
      h('label', { for: 'vi-ctrip', text: 'What is the trip? (the customer sees this)' }), h('input', { id: 'vi-ctrip', placeholder: 'Private sunset cruise' }),
      h('label', { for: 'vi-cdur', text: 'Duration (optional)' }), h('input', { id: 'vi-cdur', placeholder: '3 hours' }),
      h('label', { for: 'vi-ccan', text: 'Cancellation terms (optional, the customer sees this)' }), h('textarea', { id: 'vi-ccan' })
    ]));
    trip.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-date', text: 'Date' }), h('input', { id: 'vi-date', type: 'date', value: f['Requested date'] || '', onchange: syncEnd })]),
      h('div', null, [h('label', { for: 'vi-guests', text: 'Guests' }), h('input', { id: 'vi-guests', type: 'number', inputmode: 'numeric', min: '1', value: f.Guests || '' })])
    ]));
    trip.appendChild(h('label', { for: 'vi-end', text: 'Last day (multi-day trips only)' }));
    trip.appendChild(h('input', { id: 'vi-end', type: 'date', value: f['Requested date'] || '' }));
    form.appendChild(trip);

    // shown only when the experience's boat has no owner in Partner Admin
    var own = h('div', { class: 'card', id: 'vi-owncard', style: 'display:none' });
    own.appendChild(h('p', { class: 'warn', id: 'vi-ownwarn' }));
    own.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-oname', text: 'Owner name' }), h('input', { id: 'vi-oname' })]),
      h('div', null, [h('label', { for: 'vi-ophone', text: 'Owner WhatsApp' }), h('input', { id: 'vi-ophone', type: 'tel' })])
    ]));
    own.appendChild(h('label', { for: 'vi-olang', text: 'Owner language' }));
    var ol = h('select', { id: 'vi-olang' }); ['Español', 'English'].forEach(function (l) { ol.appendChild(h('option', { value: l, text: l })); });
    own.appendChild(ol);
    form.appendChild(own);

    // money
    var mon = h('div', { class: 'card' });
    mon.appendChild(h('label', { for: 'vi-price', text: 'Trip price (MXN, IVA included)' }));
    mon.appendChild(h('input', { id: 'vi-price', type: 'number', inputmode: 'numeric', oninput: function () { recalc('price'); } }));
    mon.appendChild(h('div', { class: 'hint', id: 'vi-range' }));
    mon.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-dep', text: 'Deposit' }), h('input', { id: 'vi-dep', type: 'number', inputmode: 'numeric', oninput: function () { recalc('dep'); } })]),
      h('div', { id: 'vi-comwrap' }, [h('label', { for: 'vi-com', text: 'Your commission' }), h('input', { id: 'vi-com', type: 'number', inputmode: 'numeric', oninput: function () { recalc('com'); } })])
    ]));
    mon.appendChild(h('div', { class: 'hint', id: 'vi-split' }));
    form.appendChild(mon);

    // meeting + notes
    var meet = h('div', { class: 'card' });
    meet.appendChild(h('div', { class: 'row' }, [
      h('div', { style: 'flex:2' }, [h('label', { for: 'vi-mp', text: 'Meeting point' }), h('input', { id: 'vi-mp' })]),
      h('div', null, [h('label', { for: 'vi-mt', text: 'Time' }), h('input', { id: 'vi-mt', type: 'time', step: '900' })])
    ]));
    meet.appendChild(h('label', { for: 'vi-map', text: 'Map link (optional)' }));
    meet.appendChild(h('input', { id: 'vi-map', type: 'url' }));
    meet.appendChild(h('div', { class: 'hint', id: 'vi-mphint' }));
    meet.appendChild(h('label', { for: 'vi-note', text: 'Note to customer (optional)' }));
    meet.appendChild(h('textarea', { id: 'vi-note' }));
    meet.appendChild(h('label', { for: 'vi-onote', text: 'Note to owner (optional)' }));
    meet.appendChild(h('textarea', { id: 'vi-onote' }));
    meet.appendChild(h('label', { for: 'vi-int', text: 'Internal notes (only you see these)' }));
    meet.appendChild(h('textarea', { id: 'vi-int' }));
    form.appendChild(meet);

    form.appendChild(h('div', { id: 'vi-err' }));
    form.appendChild(h('button', { class: 'btn pri', id: 'vi-go', type: 'button', onclick: function () { submit(false); } }, ['Create']));
    form.appendChild(h('button', { class: 'link', id: 'vi-skip', type: 'button', onclick: function () { submit(true); } }, ['Skip owner sign-off']));
    if (edit) form.appendChild(h('button', { class: 'link', type: 'button', onclick: function () { renderInvoice(edit.inv); } }, ['Cancel']));
    root.appendChild(form);

    if (edit) {
      var e2 = edit.inv.fields, cf = edit.conf ? edit.conf.fields : {};
      $('#vi-end').value = e2['End date'] && e2['End date'] > (e2['Trip date'] || '') ? e2['End date'] : (e2['Trip date'] || '');
      $('#vi-price').value = e2['Trip price'] || '';
      $('#vi-dep').value = e2.Deposit || '';
      $('#vi-com').value = e2.Commission || '';
      $('#vi-mp').value = e2['Meeting point'] || '';
      $('#vi-mt').value = toTimeInput(e2['Meeting time']);
      $('#vi-map').value = e2['Meeting map link'] || '';
      $('#vi-note').value = e2['Note to customer'] || '';
      $('#vi-int').value = e2['Internal notes'] || '';
      $('#vi-onote').value = cf['Note to owner'] || '';
      if (!cf['Partner Admin record ID'] && cf['Owner name']) { $('#vi-oname').value = cf['Owner name']; $('#vi-ophone').value = cf['Owner phone'] || ''; }
      if (!e2['Offering record ID']) { $('#vi-ctrip').value = e2.Trip || ''; $('#vi-cdur').value = e2.Duration || ''; $('#vi-ccan').value = e2['Cancellation policy'] || ''; }
    }
    state.lastStart = $('#vi-date').value;
    $('#vi-end').min = $('#vi-date').value || '';
    if (!inq && !edit && $('#vi-phone').value) lookupPhone();
    selectOffering(f['Offering record ID'] || (edit ? CUSTOM : ''));
    langHint();
  }
  // Shows how the WhatsApp number will be read. iPhone AutoFill drops +1 from US contacts on a US-region phone,
  // and a bare 10-digit number is read as Mexican, so a 10-digit number gets a one-tap "+1" switch.
  function phoneHint() {
    var el = $('#vi-phonehint'), inp = $('#vi-phone'); if (!el || !inp) return;
    var v = inp.value.trim(), d = digits(v);
    if (el.dataset.for === v) return;   // unchanged: keep the +1 button in place so a tap on it still lands
    el.dataset.for = v;
    el.innerHTML = '';
    if (!d) { el.textContent = PHONE_HINT; return; }
    if (v.charAt(0) === '+') { el.textContent = 'WhatsApp: +' + d + (d.indexOf('52') === 0 ? ' (Mexico)' : d.charAt(0) === '1' ? ' (US / Canada)' : ''); return; }
    if (d.length === 10) {
      el.appendChild(document.createTextNode('Read as a Mexican number (+52 ' + d + '). '));
      el.appendChild(h('button', { type: 'button', class: 'link', style: 'display:inline;margin:0;font-size:13px', onclick: function () { inp.value = '+1 ' + d; phoneHint(); lookupPhone(); } }, ['US or Canada? Make it +1']));
      return;
    }
    el.textContent = 'Add the country code with + (for example +1 or +52) so WhatsApp finds the right person.';
  }
  // Pick the customer from the phone's contacts. Browsers with the Contact Picker get a button;
  // iPhone Safari offers "AutoFill Contact" above the keyboard when you tap the name or phone field.
  function contactsHelp() {
    if (navigator.contacts && navigator.contacts.select) {
      return h('button', { class: 'btn sec', type: 'button', onclick: function () {
        navigator.contacts.select(['name', 'tel', 'email'], { multiple: false }).then(function (list) {
          var c = list && list[0]; if (!c) return;
          if (c.name && c.name[0]) $('#vi-name').value = c.name[0];
          if (c.tel && c.tel[0]) { $('#vi-phone').value = c.tel[0]; lookupPhone(); }
          if (c.email && c.email[0] && !$('#vi-email').value) $('#vi-email').value = c.email[0];
        }).catch(function () {});
      } }, ['Choose from contacts']);
    }
    return h('div', { class: 'hint', text: 'Tip: tap the name field, then AutoFill Contact above the keyboard to pick someone from your contacts.' });
  }
  // The language switch sets the customer's language (their page, messages, trip name); this screen stays in English.
  function langHint() {
    var el = $('#vi-langhint'); if (!el) return;
    el.textContent = state.form.lang === 'English' ? 'The customer\'s page and messages will be in English.' : 'The customer\'s page and messages will be in Spanish.';
  }
  /* boat / operator first, then that one's experiences */
  function byName(a, b) { return String(a.fields.Name).localeCompare(String(b.fields.Name)); }
  function groupKey(o) { var f = o.fields, b = ids(f.Boat)[0], op = ids(f.Operator)[0]; return b ? 'b:' + b : op ? 'o:' + op : 'x'; }
  function groups() {
    var m = {};
    (state.data.offerings || []).forEach(function (o) { var k = groupKey(o); (m[k] = m[k] || { key: k, items: [] }).items.push(o); });
    return Object.keys(m).map(function (k) {
      var g = m[k], c = ctxSafe(g.items[0].id);
      g.label = c && c.boat ? c.boat.fields.Name + (c.op && !c.placeholder ? ' · ' + c.op.fields.Name : c.owner ? ' · ' + first(c.owner.fields['Contact Name']) : '')
        : c && c.op ? c.op.fields.Name : 'Other listings';
      return g;
    }).sort(function (a, b) { return a.label.localeCompare(b.label); });
  }
  function fillExperiences(selectId) {
    var k = $('#vi-grp').value, sel = $('#vi-off'), custom = k === CUSTOM;
    $('#vi-offwrap').style.display = custom || !k ? 'none' : '';
    $('#vi-customwrap').style.display = custom ? '' : 'none';
    sel.innerHTML = '';
    if (k && !custom) {
      var g = groups().filter(function (x) { return x.key === k; })[0], items = g ? g.items.slice().sort(byName) : [];
      if (items.length > 1) sel.appendChild(h('option', { value: '', text: 'Choose an experience' }));
      items.forEach(function (o) { sel.appendChild(h('option', { value: o.id, text: (state.form.lang === 'English' ? o.fields.Name : (o.fields['Name (ES)'] || o.fields.Name)) + (o.fields['Price Range'] ? ' · ' + o.fields['Price Range'] : ''), selected: o.id === selectId ? 'selected' : null })); });
    }
    applyOffering(!selectId);
  }
  function selectOffering(id) {
    if (id === CUSTOM) { $('#vi-grp').value = CUSTOM; fillExperiences(''); return; }
    var o = id && state.data.maps.off[id];
    $('#vi-grp').value = o ? groupKey(o) : '';
    fillExperiences(o ? id : '');
  }
  function customCtx() {
    return { custom: true, o: { id: '', fields: {} }, f: { Name: ($('#vi-ctrip').value || '').trim(), Duration: ($('#vi-cdur').value || '').trim() },
      boat: null, op: null, placeholder: false, owner: null, opsId: '', mirror: null, gm: false, comPct: 0 };
  }
  function modeSwitch(on) {
    var seg = h('div', { class: 'seg', style: 'margin:0 0 14px' });
    [['booking', 'Booking'], ['quick', 'Quick payment']].forEach(function (m) {
      seg.appendChild(h('button', { type: 'button', class: m[0] === on ? 'on' : '', text: m[1], onclick: function () { if (m[0] === on) return; if (m[0] === 'quick') renderQuick({}); else renderForm(); } }));
    });
    return seg;
  }
  // Last day follows the trip date unless it was set to a later day on purpose; never earlier than the trip date.
  function syncEnd() {
    var start = $('#vi-date').value, end = $('#vi-end');
    if (!end.value || end.value === state.lastStart || end.value < start) end.value = start;
    end.min = start || '';
    state.lastStart = start;
  }
  function ctxSafe(id) { try { return ctx(id); } catch (e) { return null; } }

  function applyOffering(userChanged) {
    var custom = $('#vi-grp') && $('#vi-grp').value === CUSTOM;
    var id = $('#vi-off').value, c = custom ? customCtx() : id ? ctx(id) : null;
    state.ctx = c;
    if (!c) { $('#vi-owncard').style.display = 'none'; $('#vi-range').textContent = ''; refresh(); return; }
    if (custom) { $('#vi-owncard').style.display = 'none'; $('#vi-range').textContent = ''; $('#vi-mphint').textContent = ''; refresh(); return; }
    var f = c.f;
    if (userChanged || !$('#vi-price').value) {
      var p = lowPrice(f['Price Range']);
      $('#vi-price').value = p || '';
      $('#vi-dep').value = p ? Math.round(p * 0.2) : '';
      $('#vi-com').value = p && !c.gm ? Math.round(p * c.comPct) : '';
    }
    $('#vi-range').textContent = f['Price Range'] ? 'Listed: ' + f['Price Range'] + (f['Price Unit'] ? ' ' + f['Price Unit'] : '') : '';
    if (c.boat && (userChanged || !$('#vi-mp').value)) {
      $('#vi-mp').value = c.boat.fields['Meeting point (private)'] || '';
      $('#vi-map').value = c.boat.fields['Meeting map link (private)'] || '';
    }
    if (userChanged || !$('#vi-mt').value) $('#vi-mt').value = toTimeInput(f['Meeting time (private)']);
    $('#vi-mphint').textContent = c.boat && !c.boat.fields['Meeting point (private)'] ? 'No meeting point saved for ' + c.boat.fields.Name + ' yet; what you type here is used for this trip only.' : '';
    var noOwner = !c.gm && !c.owner;
    $('#vi-owncard').style.display = noOwner ? '' : 'none';
    if (noOwner) $('#vi-ownwarn').textContent = (c.boat ? c.boat.fields.Name : 'This experience') + ' has no owner on file in Partner Admin. Type their name and WhatsApp to send them the confirmation, or skip owner sign-off.';
    refresh();
  }
  function recalc(which) {
    var c = state.ctx, price = Number($('#vi-price').value) || 0;
    if (which === 'price' && price) {
      $('#vi-dep').value = Math.round(price * 0.2);
      if (c && !c.gm) $('#vi-com').value = Math.round(price * c.comPct);
    }
    refresh();
  }
  function refresh() {
    var c = state.ctx, price = Number($('#vi-price').value) || 0, dep = Number($('#vi-dep').value) || 0, com = Number($('#vi-com').value) || 0;
    var gm = c && (c.gm || c.custom);
    $('#vi-comwrap').style.display = gm ? 'none' : '';
    $('#vi-skip').style.display = gm ? 'none' : '';
    $('#vi-onote').previousSibling.style.display = gm ? 'none' : '';
    $('#vi-onote').style.display = gm ? 'none' : '';
    var split = '';
    if (price && dep) {
      var pct = Math.round(dep / price * 100);
      split = gm ? 'Deposit ' + pct + '% · balance ' + money(price - dep) + ' on the day'
        : c && c.custom ? 'Deposit ' + pct + '% · balance ' + money(price - dep) + ' on the day'
        : 'Deposit ' + pct + '% goes to ' + (c && c.owner ? first(c.owner.fields['Contact Name']) : 'the owner') + ' · owner collects ' + money(price - dep) + ' at the dock' + (com ? ' · owes you ' + money(com) : '');
    }
    $('#vi-split').textContent = split;
    var ed = !!state.edit;
    $('#vi-go').textContent = !c ? (ed ? 'Save' : 'Create') : gm ? (ed ? 'Save' : 'Create invoice') : (ed ? 'Save · send to owner again' : 'Create · send to owner first');
    $('#vi-skip').textContent = ed ? 'Save without owner sign-off' : 'Skip owner sign-off';
  }

  function lookupPhone() {
    var ph = $('#vi-phone').value;
    if (digits(ph).length < 8 || state.inquiry || state.edit) return;
    post(HOOK_DATA, { k: KEY, action: 'lookup', phone: ph }).then(function (r) {
      var c = r.customers && r.customers[0], box = $('#vi-known');
      box.innerHTML = '';
      if (!c) return;
      state.customerId = c.id;
      var name = String(c.fields['Customer name'] || '').replace(/\s*\(.*\)\s*$/, '');
      if (!$('#vi-name').value) $('#vi-name').value = name;
      if (!$('#vi-email').value && c.fields.Email) $('#vi-email').value = c.fields.Email;
      var last = (r.inquiries || []).sort(function (a, b) { return String(b.fields['Received at']).localeCompare(String(a.fields['Received at'])); })[0];
      if (last && $('#vi-grp') && !$('#vi-off').value && $('#vi-grp').value !== CUSTOM && last.fields['Offering record ID']) { selectOffering(last.fields['Offering record ID']); applyOffering(true); }
      if (last && $('#vi-date') && !$('#vi-date').value && last.fields['Requested date']) { $('#vi-date').value = last.fields['Requested date']; syncEnd(); }
      box.appendChild(h('div', { class: 'known', text: 'Known customer: ' + name + (last ? ' · last asked about ' + (last.fields.Offering || 'a trip') : '') }));
    }).catch(function () { /* lookup is a convenience only */ });
  }

  /* ---------- quick payment: a description and an amount (standalone, or an extra on a booking) ---------- */
  function renderQuick(opts) {
    var parent = opts.parent || null, edit = opts.edit || null, pf = parent ? parent.fields : {}, ef = edit ? edit.fields : {};
    state.edit = null; state.inquiry = null; state.busy = false;
    state.customerId = edit ? ids(ef.Customer)[0] || '' : parent ? ids(pf.Customer)[0] || '' : '';
    var lang = ef.Language || pf.Language || 'Español';
    state.form.lang = lang;
    root.innerHTML = '';
    if (!parent && !edit) root.appendChild(modeSwitch('quick'));
    root.appendChild(h('h1', { text: edit ? 'Edit ' + (ef['Invoice number'] || 'payment') : parent ? 'Extra payment for ' + pf['Invoice number'] : 'Quick payment' }));
    root.appendChild(h('p', { class: 'sub', text: parent ? (pf['Billed to'] || '') + ' · ' + (pf.Trip || '') : 'A card link and a payment page for any amount, such as an extra hour or an add-on.' }));
    var card = h('div', { class: 'card' });
    card.appendChild(h('label', { for: 'vi-qdesc', text: 'What is it for? (the customer sees this)' }));
    card.appendChild(h('input', { id: 'vi-qdesc', value: ef.Trip || '', placeholder: lang === 'English' ? 'Extra hour on the boat' : 'Hora extra en el barco' }));
    card.appendChild(h('label', { for: 'vi-qamt', text: 'Amount (MXN, IVA included)' }));
    card.appendChild(h('input', { id: 'vi-qamt', type: 'number', inputmode: 'numeric', value: ef['Trip price'] || '' }));
    root.appendChild(card);
    var cust = h('form', { class: 'card', autocomplete: 'on', onsubmit: function (e) { e.preventDefault(); } });
    setTimeout(langHint, 0);
    var qLookup = function () { if (!parent && !edit) lookupPhone(); };
    cust.appendChild(h('label', { for: 'vi-name', text: 'Customer name' }));
    cust.appendChild(h('input', { id: 'vi-name', name: 'name', value: ef['Billed to'] || pf['Billed to'] || '', autocomplete: 'name' }));
    cust.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-phone', text: 'WhatsApp number' }), h('input', { id: 'vi-phone', name: 'tel', type: 'tel', autocomplete: 'tel', value: ef.Phone || pf.Phone || qs.get('phone') || '', onblur: qLookup, onchange: function () { phoneHint(); qLookup(); }, oninput: phoneHint })]),
      h('div', null, [h('label', { for: 'vi-email', text: 'Email (optional)' }), h('input', { id: 'vi-email', name: 'email', type: 'email', autocomplete: 'email', value: ef.Email || pf.Email || '' })])
    ]));
    cust.appendChild(h('div', { class: 'hint', id: 'vi-phonehint' }));
    if (!parent && !edit) cust.appendChild(contactsHelp());
    setTimeout(phoneHint, 0);
    cust.appendChild(h('div', { id: 'vi-known' }));
    cust.appendChild(h('label', { text: 'Customer language' }));
    var seg = h('div', { class: 'seg' });
    ['Español', 'English'].forEach(function (l) {
      seg.appendChild(h('button', { type: 'button', class: l === lang ? 'on' : '', text: l, onclick: function () { Array.prototype.forEach.call(seg.children, function (b) { b.className = b.textContent === l ? 'on' : ''; }); state.form.lang = l; langHint(); } }));
    });
    cust.appendChild(seg);
    cust.appendChild(h('div', { class: 'hint', id: 'vi-langhint' }));
    cust.appendChild(h('label', { for: 'vi-note', text: 'Note to customer (optional)' }));
    cust.appendChild(h('textarea', { id: 'vi-note' }, [ef['Note to customer'] || '']));
    cust.appendChild(h('label', { for: 'vi-int', text: 'Internal notes (only you see these)' }));
    cust.appendChild(h('textarea', { id: 'vi-int' }, [ef['Internal notes'] || '']));
    root.appendChild(cust);
    var err = h('div');
    root.appendChild(err);
    var btn = h('button', { class: 'btn pri', type: 'button', onclick: function () {
      if (state.busy) return;
      err.innerHTML = '';
      var v = { desc: $('#vi-qdesc').value.trim(), amt: Number($('#vi-qamt').value) || 0, name: $('#vi-name').value.trim(), phone: $('#vi-phone').value.trim(), email: $('#vi-email').value.trim(),
        note: $('#vi-note').value.trim(), internal: $('#vi-int').value.trim(), lang: state.form.lang };
      var missing = [];
      if (!v.desc) missing.push('what it is for');
      if (!(v.amt >= 10)) missing.push('the amount (at least $10)');
      if (!v.name) missing.push('customer name');
      if (!v.phone && !v.email) missing.push('a WhatsApp number or email');
      if (missing.length) { err.appendChild(h('p', { class: 'err', text: 'Add ' + missing.join(', ') + '.' })); return; }
      state.busy = true; btn.disabled = true; btn.textContent = 'Saving…';
      var base = edit ? ef : parent ? pf : {};
      var payload = {
        k: KEY, action: edit ? 'edit' : 'create', id: edit ? edit.id : '', number: ef['Invoice number'] || '', kind: 'Quick payment',
        parentId: parent ? parent.id : '', parentNumber: parent ? pf['Invoice number'] : '',
        customerId: state.customerId, inquiryId: '', mirrorId: ids(base.Operator).join(','), offeringId: base['Offering record ID'] || '',
        source: 'WhatsApp', lang: v.lang, billedTo: v.name, phone: v.phone, email: v.email, trip: v.desc, duration: '',
        businessLine: base['Business line'] || 'Vamos marketplace', balanceBy: 'Vamos', tripDate: base['Trip date'] || today(), endDate: '', guests: '',
        price: v.amt, deposit: v.amt, commission: '', ownerPayout: '', meetingPoint: '', meetingTime: '', mapLink: '', provider: '', note: v.note, internalNotes: v.internal,
        cancellation: '', signoff: 'Not needed', oldConfId: ''
      };
      var chain = Promise.resolve();
      if (!state.customerId) chain = chain.then(function () {
        return post(HOOK_CREATE, { k: KEY, action: 'customer', name: v.name, phone: v.phone, email: v.email, lang: v.lang }).then(function (r) { state.customerId = payload.customerId = r.id; });
      });
      chain.then(function () { return post(edit ? HOOK_ACTIONS : HOOK_CREATE, payload); }).then(function (r) {
        var id = edit ? edit.id : r.id;
        history.replaceState(null, '', location.pathname + '?k=' + encodeURIComponent(KEY) + '&invoice=' + id);
        root.innerHTML = ''; root.appendChild(h('p', { class: 'sub', text: (edit ? 'Saved. ' : 'Created ' + r.number + '. ') + 'Loading…' }));
        return load('', id);
      }).catch(function (e) { state.busy = false; btn.disabled = false; btn.textContent = edit ? 'Save' : 'Create payment'; err.appendChild(h('p', { class: 'err', text: e.message })); });
    } }, [edit ? 'Save' : 'Create payment']);
    root.appendChild(btn);
    if (parent || edit) root.appendChild(h('button', { class: 'link', type: 'button', onclick: function () { reload(edit || parent); } }, ['Cancel']));
  }

  /* ---------- submit ---------- */
  function submit(skipOwner) {
    if (state.busy) return;
    var c = state.ctx, err = $('#vi-err');
    err.innerHTML = '';
    if (c && c.custom) c = state.ctx = customCtx();
    if (!c) { err.appendChild(h('p', { class: 'err', text: 'Choose the boat or operator and the experience, or Other (type it).' })); return; }
    if (c.custom && !c.f.Name) { err.appendChild(h('p', { class: 'err', text: 'Type what the trip is.' })); return; }
    var v = {
      name: $('#vi-name').value.trim(), phone: $('#vi-phone').value.trim(), email: $('#vi-email').value.trim(), lang: state.form.lang,
      date: $('#vi-date').value, end: $('#vi-end').value, guests: $('#vi-guests').value,
      price: Number($('#vi-price').value) || 0, dep: Number($('#vi-dep').value) || 0, com: Number($('#vi-com').value) || 0,
      mp: $('#vi-mp').value.trim(), mt: fromTimeInput($('#vi-mt').value), map: $('#vi-map').value.trim(),
      note: $('#vi-note').value.trim(), onote: $('#vi-onote').value.trim(), internal: $('#vi-int').value.trim()
    };
    var missing = [];
    if (!v.name) missing.push('customer name');
    if (!v.phone && !v.email) missing.push('a WhatsApp number or email');
    if (!c) missing.push('the experience');
    if (!v.date) missing.push('the date');
    if (!v.price) missing.push('the trip price');
    if (!v.dep) missing.push('the deposit');
    if (!v.mp && !c.custom) missing.push('the meeting point');
    if (missing.length) { err.appendChild(h('p', { class: 'err', text: 'Add ' + missing.join(', ') + '.' })); return; }
    if (v.end && v.date && v.end < v.date) { err.appendChild(h('p', { class: 'err', text: 'The last day is before the trip date.' })); return; }
    if (v.end === v.date) v.end = '';
    if (v.dep > v.price) { err.appendChild(h('p', { class: 'err', text: 'The deposit is more than the trip price.' })); return; }
    var owner = c.owner;
    if (!c.gm && !c.custom && !owner) {
      var on = $('#vi-oname').value.trim(), op = $('#vi-ophone').value.trim();
      if (on && op) owner = { id: '', typed: true, fields: { 'Contact Name': on, 'Contact Number': op, Language: $('#vi-olang').value } };
      else if (!skipOwner) { err.appendChild(h('p', { class: 'err', text: 'Add the owner\'s name and WhatsApp number, or tap Skip owner sign-off.' })); return; }
    }

    state.busy = true;
    var btn = $('#vi-go'); btn.disabled = true; btn.textContent = 'Saving…';
    var f = c.f, lang = v.lang, es = lang !== 'English';
    var oLang = owner && owner.fields.Language === 'English' ? 'English' : 'Español', oEs = oLang !== 'English';
    var ownerShort = owner ? shortName(owner.fields['Contact Name']) : '';
    var boatName = c.boat ? c.boat.fields.Name : '';
    var provider = c.gm || c.custom ? '' : (c.placeholder
      ? (es ? 'Embarcación ' + boatName + ', operada por su propietario' + (ownerShort ? ' ' + ownerShort : '') : boatName + ', run by its owner' + (ownerShort ? ' ' + ownerShort : ''))
      : (boatName ? (es ? boatName + ', operada por ' : boatName + ', run by ') : '') + (c.op ? c.op.fields.Name : ''));
    var signoff = c.gm || c.custom ? 'Not needed' : (skipOwner || !owner ? 'Skipped' : 'Required');

    var chain = Promise.resolve();
    if (!state.customerId && !state.edit) chain = chain.then(function () {
      return post(HOOK_CREATE, { k: KEY, action: 'customer', name: v.name, phone: v.phone, email: v.email, lang: lang }).then(function (r) { state.customerId = r.id; });
    });
    var mirrorId = c.mirror ? c.mirror.id : '';
    if (!mirrorId && c.opsId) chain = chain.then(function () {
      return post(HOOK_CREATE, { k: KEY, action: 'mirror', name: c.placeholder ? owner.fields['Contact Name'] : c.op.fields.Name, opsId: c.opsId,
        businessLine: c.gm ? 'Good Medicine direct' : 'Vamos marketplace', arrangement: owner ? owner.fields.Arrangement || '' : '', commission: c.comPct }).then(function (r) { mirrorId = r.id; });
    });
    var ed = state.edit;
    var oldConf = ed && ed.conf ? ed.conf.id : '';
    chain.then(function () {
      return post(ed ? HOOK_ACTIONS : HOOK_CREATE, {
        k: KEY, action: ed ? 'edit' : 'create', id: ed ? ed.inv.id : '', number: ed ? ed.inv.fields['Invoice number'] : '', oldConfId: oldConf,
        customerId: state.customerId, inquiryId: state.inquiry ? state.inquiry.id : '', mirrorId: mirrorId,
        offeringId: c.o.id, source: state.inquiry ? 'Website inquiry' : 'WhatsApp', lang: lang,
        billedTo: v.name, phone: v.phone, email: v.email,
        trip: es ? (f['Name (ES)'] || f.Name) : f.Name, duration: es ? (f['Duration (ES)'] || f.Duration || '') : (f.Duration || ''),
        businessLine: c.gm ? 'Good Medicine direct' : 'Vamos marketplace', balanceBy: c.gm || c.custom ? 'Vamos' : 'Owner', kind: 'Booking',
        tripDate: v.date, endDate: v.end, guests: v.guests, price: v.price, deposit: v.dep, commission: c.gm || c.custom ? '' : v.com, ownerPayout: '',
        meetingPoint: v.mp, meetingTime: v.mt, mapLink: v.map, provider: provider, note: v.note, internalNotes: v.internal,
        cancellation: c.custom ? $('#vi-ccan').value.trim() : cancellationText(c.o, lang), signoff: signoff,
        partnerId: owner && !owner.typed ? owner.id : '', ownerName: owner ? owner.fields['Contact Name'] : '', ownerPhone: owner ? owner.fields['Contact Number'] || '' : '', ownerLang: oLang,
        oTrip: oEs ? (f['Name (ES)'] || f.Name) : f.Name, oDuration: oEs ? (f['Duration (ES)'] || f.Duration || '') : (f.Duration || ''),
        oIncluded: plain(oEs ? (f["What's included (ES)"] || f["What's included"]) : (f["What's included"] || f["What's included (ES)"])),
        oCancellation: c.custom ? '' : cancellationText(c.o, oLang), oPaymentTerms: paymentTerms(oLang, v.dep, v.price - v.dep, v.com),
        ownerBalance: v.price - v.dep, boat: boatName, leadGuest: first(v.name), noteToOwner: v.onote
      });
    }).then(function (r) {
      var id = ed ? ed.inv.id : r.id;
      history.replaceState(null, '', location.pathname + '?k=' + encodeURIComponent(KEY) + '&invoice=' + id);
      root.innerHTML = ''; root.appendChild(h('p', { class: 'sub', text: (ed ? 'Saved. ' : 'Created ' + r.number + '. ') + 'Loading…' }));
      state.edit = null;
      return load('', id);
    }).catch(function (e) {
      state.busy = false; btn.disabled = false; refresh();
      err.appendChild(h('p', { class: 'err', text: e.message }));
    });
  }

  /* ---------- invoice tracker ---------- */
  function n(v) { return Number(v) || 0; }
  function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mazatlan' }); }
  function when(iso) { return iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''; }
  function shortDay(iso) { return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; }
  function mxn(v) { return money(v) + ' MXN'; }
  function activeConf() { return (state.data.confirmations || []).filter(function (x) { return x.fields.Status !== 'Superseded' && x.fields.Status !== 'Cancelled'; })[0]; }
  function reload(inv, msg) { root.innerHTML = ''; root.appendChild(h('p', { class: 'sub', text: (msg ? msg + ' ' : '') + 'Loading…' })); return load('', inv.id).catch(showFatal); }

  function renderInvoice(inv) {
    if (inv.fields.Kind === 'Quick payment') return renderQuickInvoice(inv);
    var d = state.data, f = inv.fields, conf = activeConf();
    var cf = conf ? conf.fields : {};
    var price = n(f['Trip price']), dep = n(f.Deposit), got = n(f['Amount paid']), com = n(f.Commission);
    var depPaid = dep > 0 && got >= dep, cancelled = !!f['Cancelled at'], ownerFlow = f['Balance collected by'] === 'Owner';
    var ownerName = first(cf['Owner name']) || 'the owner';
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'sub', text: (f['Invoice number'] || '') + ' · ' + (f['Billed to'] || '') + ' · ' + (f.Status || '') }));
    root.appendChild(h('h1', { text: (f.Trip || '') + ', ' + fmtDate(f['Trip date'], 'English') + (f.Guests ? ', ' + f.Guests + ' guests' : '') }));
    if (cancelled) root.appendChild(h('p', { class: 'warn', style: 'margin:0 0 12px', text: 'Cancelled ' + when(f['Cancelled at']) + '.' }));
    var steps = h('div', { class: 'card' });

    // 1. owner sign-off
    var so = f['Owner sign-off'], agreed = conf && cf.Status === 'Agreed';
    if (so === 'Required') {
      var link = cf['Page token'] ? SITE + '/confirmar?k=' + cf['Page token'] : '';
      var oEs = cf.Language !== 'English';
      var msg = oEs
        ? 'Hola ' + first(cf['Owner name']) + ', tengo una reservación para ' + (cf.Trip || '') + ' el ' + fmtDate(cf['Trip date'], 'Español') + ' (' + (cf.Guests || '') + ' personas). Revisa los detalles y confírmala aquí: ' + link
        : 'Hi ' + first(cf['Owner name']) + ', I have a booking for ' + (cf.Trip || '') + ' on ' + fmtDate(cf['Trip date'], 'English') + ' (' + (cf.Guests || '') + ' guests). Please review the details and confirm here: ' + link;
      var terms = 'Owner gets ' + money(dep) + ' deposit, collects ' + money(price - dep) + ', owes you ' + money(com);
      var title, small, cls = 'now';
      if (agreed) { cls = 'done'; title = ownerName + ' confirmed'; small = 'Signed by ' + (cf['Signed by'] || '') + (cf['Responded at'] ? ', ' + when(cf['Responded at']) : ''); }
      else if (cf.Status === 'Changes requested') { title = ownerName + ' asked for a change'; small = '“' + (cf['Change request'] || '') + '” Tap Edit to fix it; saving sends a fresh confirmation.'; }
      else if (cf.Status === 'Sent') { title = 'Waiting for ' + ownerName + ' to confirm'; small = 'Sent ' + when(cf['Sent at']) + '. ' + terms; }
      else { title = 'Send to ' + ownerName + ' for sign-off'; small = terms; }
      var sendBtns = [
        h('button', { class: 'btn sec', type: 'button', onclick: function () { ownerSent(conf, 'WhatsApp'); openWhatsApp(cf['Owner phone'], msg); } }, [cf.Status === 'Sent' ? 'WhatsApp again' : 'WhatsApp owner']),
        h('button', { class: 'btn sec', type: 'button', onclick: function () { ownerSent(conf, 'Copied'); copy(msg); } }, ['Copy message']),
        link ? h('a', { class: 'btn sec', href: link, target: '_blank', rel: 'noopener' }, ['Preview']) : null
      ];
      if (cancelled) cls = agreed ? 'done' : '';
      steps.appendChild(step(cls, title, small, cancelled ? null : agreed ? (link ? [h('a', { class: 'btn sec', href: link, target: '_blank', rel: 'noopener' }, ['Owner page'])] : null)
        : cf.Status === 'Changes requested' ? [h('button', { class: 'btn sec', type: 'button', onclick: function () { renderForm({ inv: inv, conf: conf }); } }, ['Edit'])] : sendBtns));
    } else if (so === 'Skipped') {
      steps.appendChild(step('done', 'Owner sign-off skipped', 'You chose to send without the owner confirming.'));
    }

    // 2. send to the customer
    var ready = so !== 'Required' || agreed;
    steps.appendChild(customerStep(inv, ready, depPaid, cancelled));

    // 3. deposit (and, when Vamos collects, the balance)
    var payList = (d.payments || []).map(function (p) { var x = p.fields; return shortDay(x['Received on']) + ' · ' + (x.Method || '') + ' · ' + money(x.Amount); }).join('\n');
    var depBox = h('div');
    steps.appendChild(step(depPaid ? 'done' : (ready && !cancelled ? 'now' : ''), depPaid ? 'Deposit ' + money(dep) + ' paid' : 'Deposit ' + money(dep),
      (payList ? payList + '\n' : '') + (depPaid ? '' : 'Card payments appear here by themselves (tap Refresh). Transfer or cash: Mark paid.'),
      cancelled || depPaid ? null : [h('button', { class: 'btn sec', type: 'button', onclick: function () { payForm(inv, depBox, Math.max(0, dep - got), 'Deposit'); } }, ['Mark paid'])], depBox));
    if (!ownerFlow) {
      var balBox = h('div'), full = price > 0 && got >= price;
      steps.appendChild(step(full ? 'done' : (depPaid && !cancelled ? 'now' : ''), full ? 'Balance paid' : 'Balance ' + money(Math.max(0, price - got)) + ' on the day', '',
        cancelled || full || !depPaid ? null : [h('button', { class: 'btn sec', type: 'button', onclick: function () { payForm(inv, balBox, Math.max(0, price - got), 'Balance'); } }, ['Mark paid'])], balBox));
    }

    // 4–5. managed booking: pass the deposit on, settle at the dock
    if (ownerFlow) {
      var toOwner = n(f['Paid to owner']), owed = n(f['Owner deposit owed']), comGot = n(f['Commission received']);
      var passed = depPaid && toOwner > 0 && owed <= 0;
      var trList = (d.transfers || []).map(function (t) { var x = t.fields; return shortDay(x['Paid on']) + ' · ' + (x.Type || '') + ' · ' + money(x.Amount) + (x.Method ? ' · ' + x.Method : ''); }).join('\n');
      var passBox = h('div');
      var oPhone = cf['Owner phone'], cLink = cf['Page token'] ? SITE + '/confirmar?k=' + cf['Page token'] : '';
      var oMsg = cf.Language === 'English'
        ? 'Hi ' + first(cf['Owner name']) + ', ' + first(f['Billed to']) + ' paid the deposit for booking ' + f['Invoice number'] + ' (' + (cf.Trip || f.Trip) + ', ' + fmtDate(f['Trip date'], 'English') + '). I\'m sending you ' + money(owed || dep) + '.' + (cLink ? ' Their name and WhatsApp are now on your confirmation: ' + cLink : '')
        : 'Hola ' + first(cf['Owner name']) + ', ' + first(f['Billed to']) + ' ya pagó el anticipo de la reservación ' + f['Invoice number'] + ' (' + (cf.Trip || f.Trip) + ', ' + fmtDate(f['Trip date'], 'Español') + '). Te envío ' + money(owed || dep) + '.' + (cLink ? ' Ya puedes ver su nombre y WhatsApp en tu confirmación: ' + cLink : '');
      steps.appendChild(step(passed ? 'done' : (depPaid && !cancelled ? 'now' : ''), passed ? 'Deposit passed to ' + ownerName : 'Pass the deposit to ' + ownerName,
        !depPaid ? 'After the customer pays the deposit.' : passed ? '' : 'Send ' + ownerName + ' ' + money(owed) + ', then Mark sent.',
        cancelled || !depPaid || passed ? null : [
          oPhone ? h('button', { class: 'btn sec', type: 'button', onclick: function () { openWhatsApp(oPhone, oMsg); } }, ['WhatsApp ' + ownerName]) : null,
          h('button', { class: 'btn sec', type: 'button', onclick: function () { transferForm(inv, passBox, owed, 'Deposit'); } }, ['Mark sent'])], passBox));
      var settled = !!f['Balance settled with owner'], comLeft = Math.max(0, com - comGot), done5 = settled && comLeft <= 0;
      var setBox = h('div');
      steps.appendChild(step(done5 ? 'done' : (passed && !cancelled ? 'now' : ''), done5 ? 'Settled at the dock' : 'Settle at the dock',
        'Customer pays ' + ownerName + ' ' + money(price - dep) + (settled ? ' ✓' : '') + '; ' + ownerName + ' pays you ' + money(com) + (comGot ? ' (received ' + money(comGot) + ')' : '') + '.' + (trList ? '\n' + trList : ''),
        cancelled || done5 || !depPaid ? null : [h('button', { class: 'btn sec', type: 'button', onclick: function () { settleForm(inv, setBox, settled, comLeft); } }, ['Settle'])], setBox));
    }
    root.appendChild(steps);
    root.appendChild(extrasCard(inv, cancelled));

    var sum = h('div', { class: 'card' });
    [['Trip price', money(price)], ['Deposit', money(dep)], com ? ['Your commission', money(com)] : null,
     ['Meeting', [f['Meeting point'], f['Meeting time']].filter(Boolean).join(', ') || 'not set'], ['Language', f.Language || ''], ['Status', f.Status || '']]
      .filter(Boolean).forEach(function (kv) { sum.appendChild(h('div', { class: 'kv' }, [h('span', { text: kv[0] }), h('span', { text: kv[1] })])); });
    if (f['Reschedule log']) sum.appendChild(h('div', { class: 'hint', style: 'white-space:pre-line;margin-top:8px', text: 'Date changes:\n' + f['Reschedule log'] }));
    root.appendChild(sum);
    var rBox = h('div');
    if (!cancelled) root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { rescheduleForm(inv, conf, rBox); } }, ['Reschedule']));
    root.appendChild(rBox);
    if (!cancelled) root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { renderForm({ inv: inv, conf: conf }); } }, ['Edit']));
    root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { reload(inv, 'Refreshing…'); } }, ['Refresh']));
    root.appendChild(h('a', { class: 'btn sec', href: homeUrl('&new=1') }, ['New invoice']));
    var cBox = h('div');
    if (!cancelled) root.appendChild(h('button', { class: 'link', type: 'button', onclick: function () { cancelForm(inv, conf, cBox); } }, ['Cancel this booking…']));
    else if (conf && cf['Owner phone']) {
      var cMsg = cf.Language === 'English' ? 'Hi ' + first(cf['Owner name']) + ', booking ' + f['Invoice number'] + ' (' + fmtDate(f['Trip date'], 'English') + ') is cancelled.' : 'Hola ' + first(cf['Owner name']) + ', la reservación ' + f['Invoice number'] + ' (' + fmtDate(f['Trip date'], 'Español') + ') quedó cancelada.';
      root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { openWhatsApp(cf['Owner phone'], cMsg); } }, ['Tell ' + ownerName + ' on WhatsApp']));
    }
    root.appendChild(cBox);
  }

  function extrasCard(inv, cancelled) {
    var list = state.data.extras || [], card = h('div', { class: 'card' });
    card.appendChild(h('b', { text: 'Extra payments' }));
    if (!list.length) card.appendChild(h('div', { class: 'hint', text: 'None yet. Use this for an extra hour, drinks, an add-on.' }));
    var paidSum = 0;
    list.forEach(function (x) {
      var f = x.fields, amt = n(f['Trip price']), paid = n(f['Amount paid']) >= amt && amt > 0;
      if (paid && !f['Cancelled at']) paidSum += amt;
      card.appendChild(h('a', { class: 'kv', style: 'text-decoration:none;color:inherit', href: location.pathname + '?k=' + encodeURIComponent(KEY) + '&invoice=' + x.id }, [
        h('span', { text: (f['Invoice number'] || '') + ' · ' + (f.Trip || '') }), h('span', { text: money(amt) + ' · ' + (f.Status || '') })]));
    });
    if (paidSum && inv.fields['Balance collected by'] === 'Owner') card.appendChild(h('div', { class: 'hint', text: 'Extras paid to you: ' + money(paidSum) + '. Settle the owner\'s share with them.' }));
    if (!cancelled) card.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { renderQuick({ parent: inv }); } }, ['Ask for extra payment']));
    return card;
  }
  function renderQuickInvoice(inv) {
    var f = inv.fields, amt = n(f['Trip price']), got = n(f['Amount paid']), paid = amt > 0 && got >= amt, cancelled = !!f['Cancelled at'];
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'sub', text: (f['Invoice number'] || '') + ' · Quick payment · ' + (f['Billed to'] || '') + ' · ' + (f.Status || '') }));
    root.appendChild(h('h1', { text: (f.Trip || '') + ', ' + money(amt) }));
    if (f['Extra for (record ID)']) root.appendChild(h('a', { class: 'btn sec', style: 'margin:0 0 12px', href: location.pathname + '?k=' + encodeURIComponent(KEY) + '&invoice=' + f['Extra for (record ID)'] }, ['Extra for ' + (f['Extra for booking'] || 'booking') + ' →']));
    if (cancelled) root.appendChild(h('p', { class: 'warn', style: 'margin:0 0 12px', text: 'Cancelled ' + when(f['Cancelled at']) + '.' }));
    var steps = h('div', { class: 'card' });
    steps.appendChild(customerStep(inv, true, paid, cancelled));
    var payList = (state.data.payments || []).map(function (p) { var x = p.fields; return shortDay(x['Received on']) + ' · ' + (x.Method || '') + ' · ' + money(x.Amount); }).join('\n');
    var box = h('div');
    steps.appendChild(step(paid ? 'done' : (!cancelled ? 'now' : ''), paid ? 'Paid' : 'Payment ' + money(amt),
      (payList ? payList + '\n' : '') + (paid ? '' : 'Card payments appear here by themselves (tap Refresh). Transfer or cash: Mark paid.'),
      cancelled || paid ? null : [h('button', { class: 'btn sec', type: 'button', onclick: function () { payForm(inv, box, Math.max(0, amt - got), 'Payment'); } }, ['Mark paid'])], box));
    root.appendChild(steps);
    if (!cancelled && !paid) root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { renderQuick({ edit: inv }); } }, ['Edit']));
    root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { reload(inv, 'Refreshing…'); } }, ['Refresh']));
    root.appendChild(h('a', { class: 'btn sec', href: homeUrl('&new=1') }, ['New invoice']));
    var cBox = h('div');
    if (!cancelled) root.appendChild(h('button', { class: 'link', type: 'button', onclick: function () { cancelForm(inv, null, cBox); } }, ['Cancel this payment…']));
    root.appendChild(cBox);
  }

  /* customer send: makes the card link first when it is missing or the deposit changed */
  function customerStep(inv, ready, depPaid, cancelled) {
    var f = inv.fields, who = first(f['Billed to']) || 'the customer', dep = n(f.Deposit);
    if (!ready) return step('', 'Send to ' + who, 'Unlocks when the owner confirms.');
    var page = SITE + '/reserva?k=' + (f['Page token'] || '');
    var linkOk = !!f['Stripe payment link'] && n(f['Payment link amount']) === dep;
    var needLink = !depPaid && !cancelled && dep > 0 && !linkOk;
    if (needLink && !state.linking && state.linkFailed !== inv.id) makeLink(inv);
    var sent = f['Sent at'];
    var title = sent ? 'Sent to ' + who : 'Send to ' + who;
    var small = sent ? 'Sent ' + when(sent) + (f['Sent via'] && f['Sent via'].length ? ' by ' + [].concat(f['Sent via']).join(', ') : '') + '.' : f.Kind === 'Quick payment' ? 'Their page has the amount, card payment and transfer details.' : 'Their page has the trip, card payment and transfer details.';
    if (state.linking) small += ' Making the card payment link…';
    else if (state.linkFailed === inv.id) small += ' The card link could not be made; the page still shows transfer details. Tap Refresh to try again.';
    if (depPaid || cancelled) {
      // Only green when a message actually went out from here; paying via a page shared another way doesn't count as sent.
      if (!sent) { title = 'Not sent from here'; small = depPaid ? 'The customer paid anyway, so there is nothing to send.' : 'Nothing was sent before the cancellation.'; }
      return step(sent ? 'done' : '', title, small, [h('a', { class: 'btn sec', href: page, target: '_blank', rel: 'noopener' }, ['Customer page'])]);
    }
    var msg = customerMessage(f, page);
    var wait = !!state.linking;
    var btns = [
      f.Phone ? h('button', { class: 'btn sec', type: 'button', disabled: wait, onclick: function () { customerSent(inv, 'WhatsApp', msg); openWhatsApp(f.Phone, msg); } }, [sent ? 'WhatsApp again' : 'WhatsApp ' + who]) : null,
      h('button', { class: 'btn sec', type: 'button', disabled: wait, onclick: function () { customerSent(inv, 'Copied', msg); copy(msg); } }, ['Copy message']),
      f.Email ? h('button', { class: 'btn sec', type: 'button', disabled: wait, onclick: function () {
        customerSent(inv, 'Email', msg);
        location.href = 'mailto:' + f.Email + '?subject=' + encodeURIComponent((f.Kind === 'Quick payment' ? (f.Language === 'English' ? 'Payment ' : 'Pago ') : (f.Language === 'English' ? 'Your booking ' : 'Tu reservación ')) + f['Invoice number']) + '&body=' + encodeURIComponent(msg);
      } }, ['Email']) : null,
      h('a', { class: 'btn sec', href: page, target: '_blank', rel: 'noopener' }, ['Preview'])
    ];
    return step(sent ? 'done' : 'now', title, small, btns);
  }
  function customerMessage(f, page) {
    var en = f.Language === 'English', dep = n(f.Deposit);
    if (f.Kind === 'Quick payment') return en
      ? 'Hi ' + first(f['Billed to']) + ', here is the link to pay for ' + f.Trip + ' (' + mxn(dep) + ')' + (f['Extra for booking'] ? ', booking ' + f['Extra for booking'] : '') + '. You can pay by card or bank transfer:\n' + page + '\n\nThank you!'
      : 'Hola ' + first(f['Billed to']) + ', aquí está el enlace para pagar ' + f.Trip + ' (' + mxn(dep) + ')' + (f['Extra for booking'] ? ', reservación ' + f['Extra for booking'] : '') + '. Puedes pagar con tarjeta o por transferencia:\n' + page + '\n\n¡Gracias!';
    return en
      ? 'Hi ' + first(f['Billed to']) + ', here is your booking ' + f['Invoice number'] + ': ' + f.Trip + ', ' + fmtDate(f['Trip date'], 'English') + (f.Guests ? ', ' + f.Guests + ' guests' : '') + '.\n\nTotal ' + mxn(f['Trip price']) + ' (IVA included). To secure your spot, pay the ' + mxn(dep) + ' deposit by card or bank transfer here:\n' + page + '\n\nAny questions, just message me!'
      : 'Hola ' + first(f['Billed to']) + ', aquí está tu reservación ' + f['Invoice number'] + ': ' + f.Trip + ', ' + fmtDate(f['Trip date'], 'Español') + (f.Guests ? ', ' + f.Guests + ' personas' : '') + '.\n\nPrecio total ' + mxn(f['Trip price']) + ' (IVA incluido). Para asegurar tu lugar, paga el anticipo de ' + mxn(dep) + ' con tarjeta o por transferencia aquí:\n' + page + '\n\n¡Cualquier duda, me escribes!';
  }
  function makeLink(inv) {
    var f = inv.fields;
    state.linking = true;
    post(HOOK_ACTIONS, { k: KEY, action: 'paylink', id: inv.id, number: f['Invoice number'], trip: f.Trip, deposit: n(f.Deposit), token: f['Page token'], oldLinkId: f['Stripe payment link ID'] || '',
      label: f.Kind === 'Quick payment' ? 'Pago / Payment' : '', submitType: f.Kind === 'Quick payment' ? 'pay' : '' })
      .then(function (r) {
        state.linking = false;
        if (!r.url) throw new Error('no url');
        f['Stripe payment link'] = r.url; f['Stripe payment link ID'] = r.id; f['Payment link amount'] = n(f.Deposit);
        state.linkFailed = '';
      })
      .catch(function () { state.linking = false; state.linkFailed = inv.id; })
      .then(function () { if (state.data.invoice && state.data.invoice[0] && state.data.invoice[0].id === inv.id) renderInvoice(inv); });
  }
  // Records the customer send (fire-and-forget; survives the jump to WhatsApp or Mail).
  function customerSent(inv, via, msg) {
    var f = inv.fields, list = [].concat(f['Sent via'] || []);
    if (list.indexOf(via) < 0) list.push(via);
    f['Sent at'] = f['Sent at'] || new Date().toISOString(); f['Sent via'] = list;
    var body = new URLSearchParams({ k: KEY, action: 'sent', id: inv.id, sentAt: f['Sent at'], via: list.join(','), message: msg });
    if (navigator.sendBeacon) navigator.sendBeacon(HOOK_ACTIONS, body); else fetch(HOOK_ACTIONS, { method: 'POST', body: body, keepalive: true });
    setTimeout(function () { renderInvoice(inv); }, 400);
  }

  /* ---------- small inline forms ---------- */
  function sel(id, options, value) {
    var s = h('select', { id: id });
    options.forEach(function (o) { s.appendChild(h('option', { value: o, text: o, selected: o === value ? 'selected' : null })); });
    return s;
  }
  function formShell(box, title, rows, saveText, onSave) {
    box.innerHTML = '';
    var err = h('div'), btn = h('button', { class: 'btn pri', type: 'button', style: 'margin-top:12px' }, [saveText]);
    var wrap = h('div', { style: 'margin-top:10px;padding:12px;border-radius:12px;background:#f8f6f2' }, [h('b', { text: title })].concat(rows).concat([err, btn,
      h('button', { class: 'link', type: 'button', onclick: function () { box.innerHTML = ''; } }, ['Close'])]));
    btn.addEventListener('click', function () {
      err.innerHTML = '';
      btn.disabled = true; btn.textContent = 'Saving…';
      Promise.resolve().then(onSave).catch(function (e) { btn.disabled = false; btn.textContent = saveText; err.appendChild(h('p', { class: 'err', text: e.message })); });
    });
    box.appendChild(wrap);
  }
  function field(label, input) { return h('div', null, [h('label', { text: label }), input]); }
  function payForm(inv, box, amount, what) {
    var a = h('input', { type: 'number', inputmode: 'numeric', value: amount || '' }), m = sel('vi-pm', ['Bank transfer', 'Cash', 'Other'], 'Bank transfer');
    var dt = h('input', { type: 'date', value: today() }), nt = h('input', { placeholder: 'Reference or note (optional)' });
    formShell(box, what + ' received', [h('div', { class: 'row' }, [field('Amount', a), field('How', m)]), field('Date', dt), field('Note', nt)], 'Save payment', function () {
      if (!(Number(a.value) > 0)) throw new Error('Enter the amount.');
      return post(HOOK_ACTIONS, { k: KEY, action: 'pay', id: inv.id, number: inv.fields['Invoice number'], amount: a.value, method: m.value, date: dt.value, notes: what + (nt.value ? ' · ' + nt.value : '') })
        .then(function () { return reload(inv, 'Saved.'); });
    });
  }
  function transferForm(inv, box, amount, type) {
    var a = h('input', { type: 'number', inputmode: 'numeric', value: amount || '' }), m = sel('vi-tm', ['Bank transfer', 'Cash', 'Other'], 'Bank transfer');
    var dt = h('input', { type: 'date', value: today() }), nt = h('input', { placeholder: 'Note (optional)' });
    formShell(box, 'Deposit sent to the owner', [h('div', { class: 'row' }, [field('Amount', a), field('How', m)]), field('Date', dt), field('Note', nt)], 'Save', function () {
      if (!(Number(a.value) > 0)) throw new Error('Enter the amount.');
      return post(HOOK_ACTIONS, { k: KEY, action: 'transfer', id: inv.id, number: inv.fields['Invoice number'], amount: a.value, type: type, method: m.value, date: dt.value, notes: nt.value })
        .then(function () { return reload(inv, 'Saved.'); });
    });
  }
  function settleForm(inv, box, settled, comLeft) {
    var cb = h('input', { type: 'checkbox', id: 'vi-bal', style: 'width:auto;margin-right:8px' }); cb.checked = true;
    var a = h('input', { type: 'number', inputmode: 'numeric', value: comLeft || '' }), m = sel('vi-cm', ['Cash', 'Bank transfer', 'Other'], 'Cash');
    var dt = h('input', { type: 'date', value: today() });
    formShell(box, 'At the dock', [
      h('label', { for: 'vi-bal', style: 'display:flex;align-items:center;color:#1d2731;font-size:15px' }, [cb, 'Customer paid the owner the balance']),
      h('div', { class: 'row' }, [field('Commission received', a), field('How', m)]), field('Date', dt)], 'Save', function () {
      var chain = Promise.resolve();
      if (Number(a.value) > 0) chain = chain.then(function () {
        return post(HOOK_ACTIONS, { k: KEY, action: 'transfer', id: inv.id, number: inv.fields['Invoice number'], amount: a.value, type: 'Commission paid by owner', method: m.value, date: dt.value, notes: '' });
      });
      if (cb.checked !== settled) chain = chain.then(function () { return post(HOOK_ACTIONS, { k: KEY, action: 'settle', id: inv.id, settled: cb.checked ? 'true' : 'false' }); });
      return chain.then(function () { return reload(inv, 'Saved.'); });
    });
  }
  function rescheduleForm(inv, conf, box) {
    var f = inv.fields, cf = conf ? conf.fields : {}, ownerFlow = f['Balance collected by'] === 'Owner';
    var oldDate = f['Trip date'] || '', oldEnd = f['End date'] && f['End date'] > oldDate ? f['End date'] : '', oldTime = f['Meeting time'] || '';
    var span = oldEnd ? Math.round((new Date(oldEnd + 'T12:00:00Z') - new Date(oldDate + 'T12:00:00Z')) / 864e5) : 0;
    var why = 'customer';
    var dt = h('input', { type: 'date', id: 'vi-rdate', value: oldDate, min: today() });
    var en = h('input', { type: 'date', id: 'vi-rend', value: oldEnd, min: oldDate });
    var tm = h('input', { type: 'time', id: 'vi-rtime', step: '900', value: toTimeInput(oldTime) });
    var nt = h('input', { placeholder: 'Note for your records (optional)' });
    dt.addEventListener('change', function () { if (span && dt.value) { en.value = addDaysIso(dt.value, span); } en.min = dt.value; });
    var seg = h('div', { class: 'seg tight', style: 'margin-top:8px' });
    [['customer', 'Customer asked'], ['weather', 'Port closed'], ['owner', 'Owner asked']].forEach(function (o) {
      var b = h('button', { type: 'button', text: o[1], class: o[0] === why ? 'on' : '', onclick: function () { why = o[0]; Array.prototype.forEach.call(seg.children, function (x) { x.className = x === b ? 'on' : ''; }); } });
      seg.appendChild(b);
    });
    var rows = [h('div', { class: 'row' }, [field('New date', dt), field('Meeting time', tm)])];
    if (oldEnd) rows.push(field('Last day', en));
    rows.push(h('label', { text: 'Why' }), seg, field('Note', nt));
    rows.push(h('p', { class: 'hint', text: 'Payments stay as they are: the deposit carries over to the new date. The calendar, the customer\'s page' + (conf ? ' and the owner\'s confirmation' : '') + ' update by themselves.' }));
    formShell(box, 'Reschedule ' + f['Invoice number'], rows, 'Save new date', function () {
      var nd = dt.value, ne = oldEnd ? en.value : '', ntime = fromTimeInput(tm.value);
      if (!nd) throw new Error('Choose the new date.');
      if (ne && ne < nd) throw new Error('The last day is before the new date.');
      if (nd === oldDate && ntime === oldTime && ne === oldEnd) throw new Error('That is the same date and time.');
      var reasons = { customer: 'customer asked', weather: 'port closed', owner: 'owner asked' };
      var label = function (d, t, e) { return shortDay(d) + (e ? '–' + shortDay(e) : '') + (t ? ', ' + t : ''); };
      var line = today() + ': ' + label(oldDate, oldTime, oldEnd) + ' → ' + label(nd, ntime, ne) + ' (' + reasons[why] + ')' + (nt.value.trim() ? '. ' + nt.value.trim() : '');
      return post(HOOK_ACTIONS, { k: KEY, action: 'reschedule', id: inv.id, number: f['Invoice number'], tripDate: nd, endDate: ne, meetingTime: ntime,
        log: (f['Reschedule log'] ? f['Reschedule log'] + '\n' : '') + line, confId: conf ? conf.id : '', confLog: conf ? (cf['Change log'] ? cf['Change log'] + '\n' : '') + line : '' })
        .then(function () { tellPeople(inv, conf, box, { date: nd, end: ne, time: ntime, why: why, oldDate: oldDate }); });
    });
  }
  // After a reschedule: one-tap WhatsApp messages to the customer and the owner, then reload.
  function tellPeople(inv, conf, box, r) {
    var f = inv.fields, cf = conf ? conf.fields : {}, cEs = f.Language !== 'English', oEs = cf.Language !== 'English';
    var cLink = f['Page token'] ? SITE + '/reserva?k=' + f['Page token'] : '';
    var oLink = cf['Page token'] ? SITE + '/confirmar?k=' + cf['Page token'] : '';
    var when = function (es) { return fmtDate(r.date, es ? 'Español' : 'English') + (r.end ? (es ? ' al ' : ' to ') + fmtDate(r.end, es ? 'Español' : 'English') : '') + (r.time ? (es ? ', a las ' : ' at ') + r.time : ''); };
    var depPaid = n(f.Deposit) > 0 && n(f['Amount paid']) >= n(f.Deposit), passed = n(f['Paid to owner']) > 0;
    var cMsg = cEs
      ? 'Hola ' + first(f['Billed to']) + ', ' + (r.why === 'weather' ? 'por el cierre del puerto, ' : '') + 'tu reservación ' + f['Invoice number'] + ' (' + (f.Trip || '') + ') queda para el ' + when(true) + '.' + (depPaid ? ' Tu anticipo se aplica a la nueva fecha.' : '') + (f['Meeting point'] ? ' Punto de encuentro: ' + f['Meeting point'] + '.' : '') + (cLink ? ' Detalles: ' + cLink : '')
      : 'Hi ' + first(f['Billed to']) + ', ' + (r.why === 'weather' ? 'because the port was closed, ' : '') + 'your booking ' + f['Invoice number'] + ' (' + (f.Trip || '') + ') is now on ' + when(false) + '.' + (depPaid ? ' Your deposit carries over to the new date.' : '') + (f['Meeting point'] ? ' Meeting point: ' + f['Meeting point'] + '.' : '') + (cLink ? ' Details: ' + cLink : '');
    var oReason = { customer: oEs ? 'a petición del cliente' : 'at the customer\'s request', weather: oEs ? 'por el cierre del puerto' : 'because the port was closed', owner: oEs ? 'como lo acordamos' : 'as we agreed' }[r.why];
    var oMsg = conf && cf['Owner phone'] ? (oEs
      ? 'Hola ' + first(cf['Owner name']) + ', la reservación ' + f['Invoice number'] + ' (' + (cf.Trip || f.Trip || '') + ') cambia del ' + fmtDate(r.oldDate, 'Español') + ' al ' + when(true) + ', ' + oReason + '.' + (passed ? ' El anticipo que ya te enviamos queda para la nueva fecha.' : '') + (oLink ? ' Tu confirmación ya muestra la nueva fecha: ' + oLink : '')
      : 'Hi ' + first(cf['Owner name']) + ', booking ' + f['Invoice number'] + ' (' + (cf.Trip || f.Trip || '') + ') moves from ' + fmtDate(r.oldDate, 'English') + ' to ' + when(false) + ', ' + oReason + '.' + (passed ? ' The deposit we already sent you carries over to the new date.' : '') + (oLink ? ' Your confirmation now shows the new date: ' + oLink : '')) : '';
    box.innerHTML = '';
    var btns = [];
    if (f.Phone) btns.push(h('button', { class: 'btn sec', type: 'button', onclick: function () { openWhatsApp(f.Phone, cMsg); } }, ['WhatsApp ' + (first(f['Billed to']) || 'customer')]));
    btns.push(h('button', { class: 'btn sec', type: 'button', onclick: function () { copy(cMsg); } }, ['Copy customer message']));
    if (oMsg) btns.push(h('button', { class: 'btn sec', type: 'button', onclick: function () { openWhatsApp(cf['Owner phone'], oMsg); } }, ['WhatsApp ' + (first(cf['Owner name']) || 'owner')]));
    box.appendChild(h('div', { style: 'margin-top:10px;padding:12px;border-radius:12px;background:#eef6ef' }, [
      h('b', { text: 'Moved to ' + fmtDate(r.date, 'English') + (r.time ? ', ' + r.time : '') }),
      h('p', { class: 'hint', text: 'Saved. The calendar and the booking pages are updated. Let them know:' }),
      h('div', { class: 'btns' }, btns),
      h('button', { class: 'btn pri', type: 'button', onclick: function () { reload(inv, 'Saved.'); } }, ['Done'])
    ]));
  }
  function cancelForm(inv, conf, box) {
    var f = inv.fields, toOwner = n(f['Paid to owner']), got = n(f['Amount paid']);
    var why = 'customer';
    var seg = h('div', { class: 'seg', style: 'margin-top:8px' });
    var detail = h('div');
    function pick(w) {
      why = w;
      Array.prototype.forEach.call(seg.children, function (b) { b.className = b.dataset.w === w ? 'on' : ''; });
      detail.innerHTML = '';
      if (w === 'customer') detail.appendChild(h('p', { class: 'hint', text: f.Kind === 'Quick payment' ? 'The card link is switched off and the page shows the payment as cancelled.' : 'The owner keeps any deposit already passed on and no commission is due. The card link is switched off and the owner\'s confirmation is cancelled.' }));
      else {
        detail.appendChild(h('p', { class: 'hint', text: 'Moving the trip to another day instead? Close this and tap Reschedule: the deposit carries over and nothing is refunded.' }));
        if (toOwner > 0) { var c1 = h('input', { type: 'checkbox', id: 'vi-ret', style: 'width:auto;margin-right:8px' }); c1.checked = true; detail.appendChild(h('label', { for: 'vi-ret', style: 'display:flex;align-items:center;color:#1d2731;font-size:15px' }, [c1, 'Owner returned the deposit (' + money(toOwner) + ')'])); }
        if (got > 0) {
          var c2 = h('input', { type: 'checkbox', id: 'vi-ref', style: 'width:auto;margin-right:8px' }); c2.checked = true;
          detail.appendChild(h('label', { for: 'vi-ref', style: 'display:flex;align-items:center;color:#1d2731;font-size:15px' }, [c2, 'Refunded the customer (' + money(got) + ')']));
          detail.appendChild(field('Refund method', sel('vi-refm', ['Card (Stripe)', 'Bank transfer', 'Cash', 'Other'], (state.data.payments || []).some(function (p) { return p.fields.Method === 'Card (Stripe)'; }) ? 'Card (Stripe)' : 'Bank transfer')));
          detail.appendChild(h('p', { class: 'hint', text: 'Card refunds: refund the payment in the Stripe app first; this only records it.' }));
        }
        if (!toOwner && !got) detail.appendChild(h('p', { class: 'hint', text: 'Nothing was paid yet, so there is nothing to return.' }));
      }
    }
    var quick = f.Kind === 'Quick payment';
    (quick ? [['customer', 'Cancel payment']] : [['customer', 'Customer cancelled'], ['weather', 'Port closed (weather)']]).forEach(function (o) { var b = h('button', { type: 'button', text: o[1], onclick: function () { pick(o[0]); } }); b.dataset.w = o[0]; seg.appendChild(b); });
    formShell(box, 'Cancel ' + f['Invoice number'], [seg, detail], quick ? 'Cancel payment' : 'Cancel booking', function () {
      var chain = Promise.resolve(), d0 = today();
      if (why === 'weather') {
        var ret = $('#vi-ret'), ref = $('#vi-ref');
        if (ret && ret.checked) chain = chain.then(function () { return post(HOOK_ACTIONS, { k: KEY, action: 'transfer', id: inv.id, number: f['Invoice number'], amount: -toOwner, type: 'Deposit returned (weather)', method: 'Bank transfer', date: d0, notes: 'Port closed' }); });
        if (ref && ref.checked) chain = chain.then(function () { return post(HOOK_ACTIONS, { k: KEY, action: 'pay', id: inv.id, number: f['Invoice number'], amount: -got, method: $('#vi-refm').value, date: d0, notes: 'Refund · port closed' }); });
      }
      return chain.then(function () {
        return post(HOOK_ACTIONS, { k: KEY, action: 'cancel', id: inv.id, confId: conf ? conf.id : '', linkId: f['Stripe payment link ID'] || '' });
      }).then(function () { return reload(inv, 'Cancelled.'); });
    });
    pick('customer');
  }

  // Records that the owner message went out (fire-and-forget; survives the jump to WhatsApp).
  function ownerSent(conf, via) {
    if (!conf) return;
    var cf = conf.fields, list = (cf['Sent via'] || []).slice();
    if (list.indexOf(via) < 0) list.push(via);
    var body = new URLSearchParams({ k: KEY, action: 'ownerSent', confId: conf.id,
      status: cf.Status === 'Draft' || !cf.Status ? 'Sent' : cf.Status, sentAt: cf['Sent at'] || new Date().toISOString(), via: list.join(',') });
    cf.Status = cf.Status === 'Draft' || !cf.Status ? 'Sent' : cf.Status; cf['Sent via'] = list; cf['Sent at'] = cf['Sent at'] || new Date().toISOString();
    if (navigator.sendBeacon) navigator.sendBeacon(HOOK_ACTIONS, body); else fetch(HOOK_ACTIONS, { method: 'POST', body: body, keepalive: true });
  }
  function step(cls, title, small, buttons, extra) {
    buttons = (buttons || []).filter(Boolean);
    return h('div', { class: 'step' }, [h('div', { class: 'dot ' + (cls || '') }), h('div', { style: 'flex:1;min-width:0' }, [
      h('b', { text: title }), small ? h('div', { class: 'small', style: 'white-space:pre-line', text: small }) : null,
      buttons.length ? h('div', { class: 'btns' }, buttons) : null, extra || null])]);
  }

  /* ---------- home dashboard (blank link): Bookings · Calendar · Numbers ----------
     Data: one call to HOOK_DASH (invoices of the last 4 months plus anything still open, the Vamos trips calendar for
     the next 4 months, and the Bookings ledger for the last 13 months). New tabs: add an entry to TABS. */
  var HOOK_DASH = 'https://hook.us2.make.com/urr4hijh6rfamxs0ylh29ctb1w8fs8cr';
  var TZ = 'America/Mazatlan';
  var DASH_CACHE = 'vi-dash-v1';
  var dash = { d: null, tab: 'bookings', list: 'upcoming', q: '', range: 3, line: 'all', open: '', view: 'past', ahead: 3, cur: '', fx: null };
  var TABS = [
    { id: 'bookings', label: 'Bookings', render: dashBookings },
    { id: 'calendar', label: 'Calendar', render: dashCalendar },
    { id: 'numbers', label: 'Numbers', render: dashNumbers }
    // Later: { id: 'documents', label: 'Documents', render: … }, { id: 'partners', label: 'Partners', render: … }
  ];

  function homeUrl(extra) { return location.pathname + '?k=' + encodeURIComponent(KEY) + (extra || ''); }
  function invUrl(id) { return homeUrl('&invoice=' + id); }
  function todayIso() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); }
  function addDaysIso(iso, days) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  function dayLabel(iso) {
    var t = todayIso();
    if (iso === t) return 'Today';
    if (iso === addDaysIso(t, 1)) return 'Tomorrow';
    if (iso === addDaysIso(t, -1)) return 'Yesterday';
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
  function flat(pages) {
    var seen = {}, out = [];
    (pages || []).forEach(function (p) { (Array.isArray(p) ? p : []).forEach(function (r) { if (r && r.id && !seen[r.id]) { seen[r.id] = 1; out.push(r); } }); });
    return out;
  }
  function cacheGet() { try { var c = JSON.parse(sessionStorage.getItem(DASH_CACHE) || 'null'); return c && Date.now() - c.at < 30 * 60000 ? c : null; } catch (e) { return null; } }
  function cacheSet(raw) { try { sessionStorage.setItem(DASH_CACHE, JSON.stringify({ at: Date.now(), raw: raw })); } catch (e) {} }
  function prepDash(raw, at) {
    var invoices = flat(raw.invoices), bookings = flat(raw.bookings);
    var expenses = String(raw.expenses || '').split(';').map(function (x) { var p = x.split('|'); return { d: p[0] || '', brand: p[1] || '', cat: p[2] || '', amt: Number(p[3]) || 0, cur: p[4] || 'MXN' }; })
      .filter(function (e) { return /^[0-9]{4}-[0-9]{2}/.test(e.d) && e.amt; });
    return { at: at || Date.now(), invoices: invoices, events: (raw.events || []).filter(function (e) { return e && e.status !== 'cancelled'; }), bookings: bookings, expenses: expenses };
  }

  function renderHome() {
    try { var t = (location.hash || '').slice(1); if (TABS.some(function (x) { return x.id === t; })) dash.tab = t; } catch (e) {}
    var c = cacheGet();
    if (c) { dash.d = prepDash(c.raw, c.at); drawHome(true); }
    else { root.innerHTML = ''; root.appendChild(h('p', { class: 'sub', text: 'Loading your bookings…' })); }
    return fetchDash();
  }
  function fetchDash() {
    dash.loading = true;
    return post(HOOK_DASH, { k: KEY, action: 'dash' }).then(function (raw) {
      cacheSet(raw); dash.d = prepDash(raw); dash.loading = false; drawHome();
    }, function (e) {
      dash.loading = false;
      if (dash.d) { drawHome(); toast('Could not refresh. Showing the last copy.'); } else showFatal(e);
    });
  }

  function drawHome(stale) {
    var y = window.scrollY;
    root.innerHTML = '';
    var tabs = h('div', { class: 'seg dash-tabs' });
    TABS.forEach(function (t) {
      tabs.appendChild(h('button', { type: 'button', class: t.id === dash.tab ? 'on' : '', text: t.label, onclick: function () {
        dash.tab = t.id; dash.open = '';
        try { history.replaceState(null, '', location.pathname + location.search + '#' + t.id); } catch (e) {}
        drawHome(); window.scrollTo(0, 0);
      } }));
    });
    root.appendChild(tabs);
    var meta = h('div', { class: 'dash-meta' }, [
      h('span', { text: stale || dash.loading ? 'Updating…' : 'Updated ' + new Date(dash.d.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }),
      h('button', { type: 'button', class: 'link', style: 'margin:0', text: 'Refresh', onclick: function () { dash.loading = true; drawHome(); fetchDash(); } })
    ]);
    root.appendChild(meta);
    var tab = TABS.filter(function (t) { return t.id === dash.tab; })[0] || TABS[0];
    tab.render(root);
    window.scrollTo(0, y);
  }

  /* --- what a booking needs from you --- */
  function needs(r) {
    var f = r.fields, st = f.Status || '', price = n(f['Trip price']), dep = n(f.Deposit), got = n(f['Amount paid']);
    if (f['Cancelled at']) return null;
    var today = todayIso(), trip = f['Trip date'] || '', ownerFlow = f['Balance collected by'] === 'Owner', quick = f.Kind === 'Quick payment';
    var depPaid = dep > 0 && got >= dep;
    if (st === 'Awaiting owner') {
      if (f['Owner status'] === 'Changes requested') return { label: 'Owner asked for a change', act: 1 };
      if (f['Owner status'] === 'Sent') return { label: 'Waiting for the owner to confirm', act: 0 };
      return { label: 'Send to the owner for sign-off', act: 1 };
    }
    if (st === 'Not sent') return { label: quick ? 'Send the payment link' : 'Send to the customer', act: 1 };
    if (!depPaid && (st === 'Sent' || st === 'Part paid')) return { label: (quick ? 'Payment ' : 'Deposit ') + money(Math.max(0, (quick ? price : dep) - got)) + ' not paid yet', act: 0 };
    if (n(f['Owner deposit owed']) > 0) return { label: 'Pass ' + money(f['Owner deposit owed']) + ' to the owner', act: 1 };
    if (n(f['Commission owed']) > 0) return { label: 'Commission ' + money(f['Commission owed']) + ' owed to you', act: 1 };
    if (ownerFlow && depPaid && trip && trip < today && !f['Balance settled with owner']) return { label: 'Settle at the dock', act: 1 };
    if (!ownerFlow && !quick && depPaid && price > got && trip && trip <= addDaysIso(today, 2)) return { label: 'Balance ' + money(price - got) + ' due', act: 1 };
    return null;
  }
  var PILL = { 'Not sent': '#e9e6e1|#4a5560', 'Awaiting owner': '#fdf3e2|#7a4b00', 'Sent': '#fdf3e2|#7a4b00', 'Part paid': '#fdf3e2|#7a4b00', 'Deposit paid': '#d9f4f2|#0b5e5a', 'Paid in full': '#e3f1df|#2c6a1f', 'Cancelled': '#fde8ec|#8a1c33' };
  function pill(st) { var c = (PILL[st] || '#e9e6e1|#4a5560').split('|'); return h('span', { class: 'pill', style: 'background:' + c[0] + ';color:' + c[1], text: st || '—' }); }

  function bookingRow(r, need) {
    var f = r.fields, quick = f.Kind === 'Quick payment', price = n(f['Trip price']), got = n(f['Amount paid']);
    var line1 = (f['Trip date'] ? dayLabel(f['Trip date']) : 'No date') + ' · ' + (f['Invoice number'] || '');
    var title = (f['Billed to'] || 'No name') + ' — ' + (quick ? (f.Trip || 'Payment') + (f['Extra for booking'] ? ' (extra for ' + f['Extra for booking'] + ')' : '') : (f.Trip || '')) + (f.Guests ? ' (' + f.Guests + ')' : '');
    var money1 = money(got) + ' of ' + money(price) + ' paid' + (f['Balance collected by'] === 'Owner' && !quick ? ' · owner collects balance' : '');
    return h('a', { class: 'card brow', href: invUrl(r.id) }, [
      h('div', { class: 'brow-top' }, [h('span', { class: 'brow-day', text: line1 }), pill(f.Status)]),
      h('b', { text: title }),
      need ? h('div', { class: 'brow-need' + (need.act ? ' act' : ''), text: need.label }) : null,
      h('div', { class: 'hint', style: 'margin:2px 0 0', text: money1 })
    ]);
  }

  function dashBookings(el) {
    var all = dash.d.invoices.slice(), today = todayIso();
    all.sort(function (a, b) { return (a.fields['Trip date'] || '9999') < (b.fields['Trip date'] || '9999') ? -1 : 1; });
    el.appendChild(h('div', { class: 'row', style: 'margin:0 0 12px' }, [
      h('div', null, [h('a', { class: 'btn pri', style: 'margin:0', href: homeUrl('&new=1') }, ['+ Booking'])]),
      h('div', null, [h('a', { class: 'btn sec', style: 'margin:0;padding:13px', href: homeUrl('&new=quick') }, ['+ Quick payment'])])
    ]));
    var list = h('div');
    var search = h('input', { type: 'search', placeholder: 'Search name, phone, VLP number, trip', value: dash.q, 'aria-label': 'Search bookings', oninput: function () { dash.q = search.value; drawList(); } });
    el.appendChild(search);
    el.appendChild(list);
    function drawList() {
      list.innerHTML = '';
      var q = dash.q.trim().toLowerCase(), qd = digits(q);
      if (q) {
        var hits = all.filter(function (r) {
          var f = r.fields, hay = [f['Invoice number'], f['Billed to'], f.Trip, f.Email, f['Extra for booking'], f.Provider].join(' ').toLowerCase();
          return hay.indexOf(q) >= 0 || (qd.length >= 4 && digits(f.Phone).indexOf(qd) >= 0);
        });
        list.appendChild(h('h3', { class: 'dash-h', text: hits.length + (hits.length === 1 ? ' match' : ' matches') }));
        hits.slice().reverse().forEach(function (r) { list.appendChild(bookingRow(r, needs(r))); });
        if (!hits.length) list.appendChild(h('p', { class: 'hint', text: 'Nothing found. Search covers the last 4 months plus anything still open.' }));
        return;
      }
      var nd = all.map(function (r) { return { r: r, n: needs(r) }; }).filter(function (x) { return x.n; });
      nd.sort(function (a, b) { return b.n.act - a.n.act; });
      list.appendChild(h('h3', { class: 'dash-h', text: 'Needs you' + (nd.length ? ' (' + nd.filter(function (x) { return x.n.act; }).length + ')' : '') }));
      if (!nd.length) list.appendChild(h('p', { class: 'hint', style: 'margin:0 0 12px', text: 'Nothing waiting on you.' }));
      nd.forEach(function (x) { list.appendChild(bookingRow(x.r, x.n)); });
      var groups = {
        upcoming: all.filter(function (r) { return !r.fields['Cancelled at'] && (!r.fields['Trip date'] || r.fields['Trip date'] >= today); }),
        past: all.filter(function (r) { return !r.fields['Cancelled at'] && r.fields['Trip date'] && r.fields['Trip date'] < today; }).reverse(),
        cancelled: all.filter(function (r) { return r.fields['Cancelled at']; }).reverse()
      };
      var seg = h('div', { class: 'seg', style: 'margin:18px 0 10px' });
      [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']].forEach(function (g) {
        seg.appendChild(h('button', { type: 'button', class: dash.list === g[0] ? 'on' : '', text: g[1] + ' ' + groups[g[0]].length, onclick: function () { dash.list = g[0]; drawList(); } }));
      });
      list.appendChild(seg);
      var rows = groups[dash.list];
      if (!rows.length) list.appendChild(h('p', { class: 'hint', text: dash.list === 'upcoming' ? 'No upcoming bookings.' : 'None in the last 4 months.' }));
      rows.forEach(function (r) { list.appendChild(bookingRow(r, null)); });
      if (dash.list !== 'upcoming' && rows.length) list.appendChild(h('p', { class: 'hint', text: 'Shows the last 4 months. Older bookings are in Airtable.' }));
    }
    drawList();
  }

  /* --- calendar --- */
  function evDay(e) { return e.start && e.start.date ? e.start.date : new Date(e.start.dateTime).toLocaleDateString('en-CA', { timeZone: TZ }); }
  function evTime(e) {
    if (!e.start || e.start.date) return 'All day';
    var o = { hour: 'numeric', minute: '2-digit', timeZone: TZ };
    return new Date(e.start.dateTime).toLocaleTimeString('en-US', o) + (e.end && e.end.dateTime ? '–' + new Date(e.end.dateTime).toLocaleTimeString('en-US', o) : '');
  }
  function invForEvent(e) {
    var list = dash.d.invoices, m = String(e.summary || '').match(/VLP-[0-9]+/);
    return list.filter(function (r) { return r.fields['Calendar event ID'] === e.id; })[0]
      || (m ? list.filter(function (r) { return r.fields['Invoice number'] === m[0]; })[0] : null) || null;
  }
  function mapsLink(e, f) {
    var m = String(e.description || '').match(/https:\/\/(www\.)?google\.[^\s]*maps[^\s]*|https:\/\/maps\.app\.goo\.gl\/[^\s]+/);
    if (m) return m[0];
    var p = (f && f['Meeting point']) || e.location;
    return p ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p + ', La Paz BCS') : '';
  }
  function eventDetail(e) {
    var r = invForEvent(e), box = h('div', { class: 'ev-detail' });
    function kv(k, v) { if (v) box.appendChild(h('div', { class: 'kv' }, [h('span', { text: k }), h('span', { text: v })])); }
    var btns = [];
    if (r) {
      var f = r.fields, price = n(f['Trip price']), got = n(f['Amount paid']), ownerFlow = f['Balance collected by'] === 'Owner';
      var cap = String(f['Agreed owner contact'] || '').split('|'), capName = (cap[0] || '').trim(), capPhone = (cap[1] || '').trim();
      kv('Customer', f['Billed to']);
      kv('WhatsApp', f.Phone);
      kv('Email', f.Email);
      kv('Guests', f.Guests ? String(f.Guests) : '');
      kv('Boat', f.Provider);
      kv('Captain', capName ? capName + (capPhone ? ' · ' + capPhone : '') : '');
      kv('Meeting', [f['Meeting point'], f['Meeting time']].filter(Boolean).join(', '));
      kv('Paid', money(got) + ' of ' + money(price));
      if (price > got) kv('Balance', money(price - got) + (ownerFlow ? ' (customer pays the owner)' : ' (to you)'));
      kv('Status', f.Status);
      if (f.Phone) btns.push(h('a', { class: 'btn sec', href: 'https://wa.me/' + waNumber(f.Phone) }, ['WhatsApp ' + (first(f['Billed to']) || 'customer')]));
      if (f.Phone) btns.push(h('a', { class: 'btn sec', href: 'tel:+' + waNumber(f.Phone) }, ['Call']));
      if (capPhone) btns.push(h('a', { class: 'btn sec', href: 'https://wa.me/' + waNumber(capPhone) }, ['WhatsApp ' + (first(capName) || 'captain')]));
      var map = mapsLink(e, f);
      if (map) btns.push(h('a', { class: 'btn sec', href: map, target: '_blank', rel: 'noopener' }, ['Map']));
      btns.push(h('a', { class: 'btn pri', style: 'margin:0', href: invUrl(r.id) }, ['Open booking']));
    } else {
      box.appendChild(h('div', { class: 'hint', style: 'white-space:pre-line;margin:0 0 6px', text: String(e.description || 'No details on this event.').replace(/https?:\/\/\S+/g, '').trim() }));
      if (/VLP-[0-9]+/.test(e.summary || '')) box.appendChild(h('div', { class: 'warn', style: 'margin:6px 0', text: 'This booking is no longer in invoicing (deleted or older than 4 months). You can delete the event in Google Calendar.' }));
      var map2 = mapsLink(e, null);
      if (map2) btns.push(h('a', { class: 'btn sec', href: map2, target: '_blank', rel: 'noopener' }, ['Map']));
    }
    if (e.htmlLink) btns.push(h('a', { class: 'btn sec', href: e.htmlLink, target: '_blank', rel: 'noopener' }, ['Google Calendar']));
    box.appendChild(h('div', { class: 'btns' }, btns));
    return box;
  }
  function dashCalendar(el) {
    var evs = dash.d.events.slice().sort(function (a, b) { return evDay(a) + evTime(a) < evDay(b) + evTime(b) ? -1 : 1; });
    var today = todayIso();
    evs = evs.filter(function (e) {
      if (evDay(e) < today) return false;
      if (String(e.description || '').indexOf('Booking VLP-') < 0) return true;
      var r = invForEvent(e);  // booking events whose booking was cancelled or deleted are removed by the server on this load
      return !!(r && !r.fields['Cancelled at']);
    });
    if (!evs.length) { el.appendChild(h('p', { class: 'hint', text: 'Nothing on the Vamos trips calendar in the next 4 months. Bookings appear here once the deposit is paid.' })); return; }
    var lastDay = '';
    evs.forEach(function (e) {
      var day = evDay(e);
      if (day !== lastDay) { el.appendChild(h('h3', { class: 'dash-h', text: dayLabel(day) + (dayLabel(day).length < 10 ? ' · ' + new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '') })); lastDay = day; }
      var r = invForEvent(e), isOpen = dash.open === e.id;
      var title = String(e.summary || '(no title)').replace(/\s·\sVLP-[0-9]+$/, '');
      var card = h('div', { class: 'card ev' + (isOpen ? ' open' : '') });
      var head = h('button', { type: 'button', class: 'ev-head', 'aria-expanded': isOpen ? 'true' : 'false', onclick: function () { dash.open = isOpen ? '' : e.id; drawHome(); } }, [
        h('span', { class: 'ev-row' }, [h('span', { class: 'ev-time', text: evTime(e) }), r ? pill(r.fields.Status) : null]),
        h('span', { class: 'ev-title', text: title })
      ]);
      card.appendChild(head);
      if (isOpen) card.appendChild(eventDetail(e));
      el.appendChild(card);
    });
    el.appendChild(h('p', { class: 'hint', text: 'From the Vamos trips Google calendar, next 4 months. Tap a trip for contacts.' }));
  }

  /* --- numbers --- */
  function monthKey(iso) { return String(iso || '').slice(0, 7); }
  function monthsBack(count) {
    var t = todayIso(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)), out = [];
    for (var i = count - 1; i >= 0; i--) { var mm = m - i, yy = y; while (mm < 1) { mm += 12; yy--; } out.push(yy + '-' + (mm < 10 ? '0' : '') + mm); }
    return out;
  }
  function monthName(k, long) { return new Date(k + '-15T12:00:00Z').toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC' }); }
  function revenueOf(f) { return f['Business line'] === 'Vamos marketplace' ? n(f['Commission earned']) : n(f['Net revenue']); }
  function lineOk(f) { return dash.line === 'all' || (dash.line === 'gm' ? f['Business line'] === 'Good Medicine direct' : f['Business line'] === 'Vamos marketplace'); }
  /* --- currency: MXN as stored, or USD at today's rate (free daily rates via jsDelivr, cached for 12 hours) --- */
  var FX_URLS = ['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json', 'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json'];
  function fxCached() { try { var c = JSON.parse(localStorage.getItem('vi-fx') || 'null'); return c && Date.now() - c.at < 12 * 3600e3 ? c : null; } catch (e) { return null; } }
  function fxLoad() {
    var c = fxCached(); if (c) return Promise.resolve(c);
    var tryUrl = function (i) {
      return fetch(FX_URLS[i]).then(function (r) { return r.json(); }).then(function (j) {
        var rate = j && j.usd && Number(j.usd.mxn); if (!(rate > 5 && rate < 60)) throw new Error('rate');
        var v = { rate: rate, date: j.date || '', at: Date.now() }; try { localStorage.setItem('vi-fx', JSON.stringify(v)); } catch (e) {} return v;
      }).catch(function (e) { if (i + 1 < FX_URLS.length) return tryUrl(i + 1); throw e; });
    };
    return tryUrl(0);
  }
  function usd() { return dash.cur === 'USD' && dash.fx; }
  function cm(v) { v = Number(v) || 0; if (!usd()) return money(v); var x = Math.round(v / dash.fx.rate); return (x < 0 ? '-' : '') + 'US$' + Math.abs(x).toLocaleString('en-US'); }
  function cmk(v) { v = Number(v) || 0; var x = usd() ? v / dash.fx.rate : v, p = usd() ? 'US$' : '$'; return Math.abs(x) >= 1000 ? p + Math.round(x / 1000) + 'k' : p + Math.round(x).toLocaleString('en-US'); }
  /* --- expenses & margin (optional layer on Numbers): Expenses table, P&L amount (personal and card payments are 0) --- */
  function expOk(e) { return dash.line === 'all' || (dash.line === 'gm' ? e.brand === 'Good Medicine' : e.brand === 'Vamos a La Paz'); }
  function expMXN(e) {
    if (e.cur !== 'USD') return e.amt;
    var fx = dash.fx || fxCached();
    if (fx) return e.amt * fx.rate;
    if (!dash.fxLoading) { dash.fxLoading = 1; fxLoad().then(function (v) { dash.fx = v; drawHome(); }, function () {}); }
    return 0;
  }
  function expByMonth() { var m = {}; (dash.d.expenses || []).forEach(function (e) { if (!expOk(e)) return; var k = e.d.slice(0, 7); m[k] = (m[k] || 0) + expMXN(e); }); return m; }
  function expStart() { var ks = (dash.d.expenses || []).map(function (e) { return e.d.slice(0, 7); }).sort(); return ks[0] || ''; }
  function expToggle() {
    return h('button', { type: 'button', class: 'chip' + (dash.exp ? ' on' : ''), text: dash.exp ? '✓ Expenses & margin' : '+ Expenses & margin', onclick: function () {
      dash.exp = !dash.exp; try { localStorage.setItem('vi-exp', dash.exp ? '1' : ''); } catch (e) {} drawHome();
    } });
  }
  function pct(a, b) { if (!b) return ''; var x = Math.round(a / b * 100); return (x < 0 ? '−' + (-x) : x) + '%'; }
  function cmS(v) { return v < 0 ? '−' + cm(-v) : cm(v); }
  // Revenue vs expenses, two bars per month, margin above each pair
  function gchart(per, inWin, aLabel, bLabel) {
    var W = 340, H = 196, padL = 8, padR = 8, top = 24, base = 152, bw = (W - padL - padR) / Math.max(per.length, 1);
    var maxV = Math.max(1, Math.max.apply(null, per.map(function (p) { return Math.max(Math.max(0, p.a), p.b || 0); })));
    var ns = 'http://www.w3.org/2000/svg';
    function s(tag, a, txt) { var e = document.createElementNS(ns, tag); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (txt != null) e.textContent = txt; return e; }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': aLabel + ' and ' + bLabel + ' by month' });
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: base, y2: base, stroke: '#d9d4cc' }));
    var bar = Math.min(bw * 0.32, 18), scale = (base - top - 14) / maxV;
    per.forEach(function (p, i) {
      var cx = padL + i * bw + bw / 2, on = !inWin || inWin[p.k];
      var ha = Math.max(0, p.a) * scale, hb = (p.b || 0) * scale;
      if (ha) svg.appendChild(s('rect', { x: cx - bar - 1, y: base - ha, width: bar, height: ha, rx: 2, fill: on ? C.aqua : '#bfe9e6' }));
      if (hb) svg.appendChild(s('rect', { x: cx + 1, y: base - hb, width: bar, height: hb, rx: 2, fill: on ? C.orange : '#f3c4b6' }));
      if (p.b != null && (p.a || p.b)) {
        var mg = p.a - p.b;
        svg.appendChild(s('text', { x: cx, y: base - Math.max(ha, hb) - 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: mg < 0 ? '#b3261e' : C.gulf }, (mg < 0 ? '−' : '') + cmk(Math.abs(mg))));
      }
      svg.appendChild(s('text', { x: cx, y: base + 15, 'text-anchor': 'middle', 'font-size': 10.5, fill: on ? C.navy : '#8a949b' }, monthName(p.k)));
    });
    var lg = H - 8;
    svg.appendChild(s('rect', { x: padL, y: lg - 9, width: 10, height: 10, rx: 2, fill: C.aqua })); svg.appendChild(s('text', { x: padL + 15, y: lg, 'font-size': 11, fill: C.navy }, aLabel));
    svg.appendChild(s('rect', { x: padL + 96, y: lg - 9, width: 10, height: 10, rx: 2, fill: C.orange })); svg.appendChild(s('text', { x: padL + 111, y: lg, 'font-size': 11, fill: C.navy }, bLabel));
    svg.appendChild(s('text', { x: W - padR, y: lg, 'text-anchor': 'end', 'font-size': 11, fill: C.gulf }, 'margin above'));
    return h('div', { class: 'card', style: 'padding:10px 8px 4px' }, [svg]);
  }
  function expCategories(el, months) {
    var inM = {}; months.forEach(function (k) { inM[k] = 1; });
    var by = {}, total = 0;
    (dash.d.expenses || []).forEach(function (e) { if (!expOk(e) || !inM[e.d.slice(0, 7)]) return; var v = expMXN(e); by[e.cat || 'Other'] = (by[e.cat || 'Other'] || 0) + v; total += v; });
    var list = Object.keys(by).map(function (k) { return [k, by[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (!list.length) return;
    var top = list.slice(0, 6), rest = list.slice(6).reduce(function (a, x) { return a + x[1]; }, 0);
    if (rest) top.push(['Everything else', rest]);
    var card = h('div', { class: 'card', style: 'padding:8px 14px' }, [h('b', { text: 'Where the money went', style: 'display:block;margin:4px 0 6px' })]);
    top.forEach(function (x) {
      card.appendChild(h('div', { class: 'kv' }, [h('span', { text: x[0] }), h('span', { text: cm(x[1]) + '  ·  ' + pct(x[1], total) })]));
      card.appendChild(h('div', { style: 'height:4px;border-radius:2px;background:#f1e5df;margin:0 0 6px' }, [h('div', { style: 'height:4px;border-radius:2px;background:' + C.orange + ';width:' + Math.max(2, Math.round(x[1] / total * 100)) + '%' })]));
    });
    el.appendChild(card);
  }
  function dashNumbers(el) {
    if (dash.exp === undefined) { try { dash.exp = !!localStorage.getItem('vi-exp'); } catch (e) { dash.exp = false; } }
    if (!dash.cur) { try { dash.cur = localStorage.getItem('vi-cur') || 'MXN'; } catch (e) { dash.cur = 'MXN'; } if (dash.cur === 'USD') dash.fx = fxCached(); if (!dash.fx) dash.cur = 'MXN'; }
    var top = h('div', { style: 'display:flex;gap:8px;margin:0 0 8px' });
    var vs = h('div', { class: 'seg', style: 'flex:1' });
    var cs = h('div', { class: 'seg', style: 'flex:0 0 auto' });
    ['MXN', 'USD'].forEach(function (c) {
      cs.appendChild(h('button', { type: 'button', class: dash.cur === c ? 'on' : '', text: c, style: 'padding:9px 12px', onclick: function () {
        if (c === dash.cur) return;
        var set = function () { dash.cur = c; try { localStorage.setItem('vi-cur', c); } catch (e) {} drawHome(); };
        if (c === 'MXN' || dash.fx) return set();
        fxLoad().then(function (fx) { dash.fx = fx; set(); }, function () { toast('Could not get today\'s dollar rate. Try again later.'); });
      } }));
    });
    top.appendChild(vs); top.appendChild(cs);
    [['past', 'So far'], ['ahead', 'Ahead']].forEach(function (o) {
      vs.appendChild(h('button', { type: 'button', class: dash.view === o[0] ? 'on' : '', text: o[1], onclick: function () { dash.view = o[0]; drawHome(); } }));
    });
    el.appendChild(top);
    if (usd()) el.appendChild(h('p', { class: 'hint', style: 'margin:0 0 8px', text: 'In US dollars at today\'s rate: 1 USD = ' + dash.fx.rate.toFixed(2) + ' MXN' + (dash.fx.date ? ' (' + shortDay(dash.fx.date) + ')' : '') + '. Past months use the same rate.' }));
    var ls0 = h('div', { class: 'seg tight', style: 'margin:0 0 8px' });
    [['all', 'All'], ['gm', 'Good Medicine'], ['vamos', 'Vamos']].forEach(function (o) {
      ls0.appendChild(h('button', { type: 'button', class: dash.line === o[0] ? 'on' : '', text: o[1], onclick: function () { dash.line = o[0]; drawHome(); } }));
    });
    el.appendChild(ls0);
    el.appendChild(h('div', { style: 'margin:0 0 8px' }, [expToggle()]));
    if (dash.view === 'ahead') return dashAhead(el);
    var rs = h('div', { class: 'seg tight', style: 'margin:0 0 14px' });
    [[1, 'This month'], [3, '3 mo'], [6, '6 mo'], [12, '12 mo']].forEach(function (o) {
      rs.appendChild(h('button', { type: 'button', class: dash.range === o[0] ? 'on' : '', text: o[1], onclick: function () { dash.range = o[0]; drawHome(); } }));
    });
    el.appendChild(rs);

    var months = monthsBack(dash.range), inWin = {}, today = todayIso();
    months.forEach(function (k) { inWin[k] = 1; });
    var rows = dash.d.bookings.filter(function (r) { return lineOk(r.fields) && inWin[monthKey(r.fields['Activity date'])]; });
    var live = rows.filter(function (r) { return r.fields.Status !== 'Cancelled'; });
    var cancelled = rows.length - live.length;
    var sum = function (list, fn) { return list.reduce(function (a, r) { return a + fn(r.fields); }, 0); };
    var gross = sum(live, function (f) { return n(f['Gross total']); }), rev = sum(live, revenueOf), guests = sum(live, function (f) { return n(f['Total guests']); });
    var ahead = dash.d.bookings.filter(function (r) { return lineOk(r.fields) && r.fields.Status !== 'Cancelled' && (r.fields['Activity date'] || '') > today; });
    var m0 = months[0], m1 = months[months.length - 1];
    var label = dash.range === 1 ? monthName(m0, true) : monthName(m0) + (m0.slice(0, 4) !== m1.slice(0, 4) ? ' ' + m0.slice(0, 4) : '') + ' – ' + monthName(m1) + ' ' + m1.slice(0, 4);
    el.appendChild(h('h3', { class: 'dash-h', style: 'margin-top:0', text: label }));
    var tiles = h('div', { class: 'tiles' });
    function tile(k, v, s) { tiles.appendChild(h('div', { class: 'tile' }, [h('span', { text: k }), h('b', { text: v }), s ? h('small', { text: s }) : null])); }
    tile('Bookings', String(live.length), cancelled ? cancelled + ' cancelled' : (guests ? guests + ' guests' : ''));
    tile('Sales', cm(gross), 'what customers paid');
    tile('Your revenue', cm(rev), dash.line === 'vamos' ? 'commission' : dash.line === 'gm' ? 'Good Medicine net' : 'net + commission');
    tile('Coming up', String(ahead.length), cm(sum(ahead, function (f) { return n(f['Gross total']); })) + ' booked ahead · see Ahead');
    tiles.lastChild.style.cursor = 'pointer'; tiles.lastChild.addEventListener('click', function () { dash.view = 'ahead'; drawHome(); window.scrollTo(0, 0); });
    var expM = dash.exp ? expByMonth() : null, eStart = dash.exp ? expStart() : '';
    if (dash.exp) {
      var covered = months.filter(function (k) { return eStart && k >= eStart; });
      var revC = sum(live.filter(function (r) { return covered.indexOf(monthKey(r.fields['Activity date'])) >= 0; }), revenueOf);
      var expC = covered.reduce(function (a, k) { return a + (expM[k] || 0); }, 0);
      var part = covered.length && covered.length < months.length ? monthName(covered[0]) + '–' + monthName(covered[covered.length - 1]) + ' only (expenses start ' + monthName(eStart) + ' ' + eStart.slice(0, 4) + ')' : '';
      tile('Expenses', covered.length ? cm(expC) : '—', part || (dash.line === 'all' ? 'incl. shared costs' : covered.length ? 'from the Expenses table' : 'none recorded for these months'));
      tile('Margin', covered.length ? cmS(revC - expC) : '—', covered.length ? (revC ? pct(revC - expC, revC) + ' of revenue' : '') + (part ? ' · same months' : '') : '');
    }
    el.appendChild(tiles);

    // money still moving (invoicing, any date)
    var inv = dash.d.invoices.filter(function (r) { return !r.fields['Cancelled at'] && lineOk(r.fields); });
    var owedYou = sum(inv, function (f) { var dep = n(f.Deposit), got = n(f['Amount paid']), price = n(f['Trip price']); return n(f['Commission owed']) + (f['Balance collected by'] !== 'Owner' && dep > 0 && got >= dep && f['Trip date'] && f['Trip date'] < today ? Math.max(0, price - got) : 0); });
    var owedOwners = sum(inv, function (f) { return n(f['Owner deposit owed']); });
    var t2 = h('div', { class: 'tiles' });
    [['Owed to you', cm(owedYou), 'commission and balances after the trip'], ['Owed to owners', cm(owedOwners), 'deposits to pass on']].forEach(function (x) {
      t2.appendChild(h('div', { class: 'tile' }, [h('span', { text: x[0] }), h('b', { text: x[1] }), h('small', { text: x[2] })]));
    });
    el.appendChild(t2);

    // chart: at least 6 months so "This month" still has context; the selected window is highlighted
    var cmo = monthsBack(Math.max(6, dash.range)), per = cmo.map(function (k) {
      var l = dash.d.bookings.filter(function (r) { return lineOk(r.fields) && r.fields.Status !== 'Cancelled' && monthKey(r.fields['Activity date']) === k; });
      return { k: k, count: l.length, rev: sum(l, revenueOf), gross: sum(l, function (f) { return n(f['Gross total']); }) };
    });
    var tbl = h('div', { class: 'card', style: 'padding:8px 14px' });
    if (dash.exp) {
      var tracked = function (k) { return eStart && k >= eStart; };
      el.appendChild(gchart(per.map(function (p) { return { k: p.k, a: p.rev, b: tracked(p.k) ? (expM[p.k] || 0) : null }; }), inWin, 'Revenue', 'Expenses'));
      tbl.appendChild(h('div', { class: 'kv mth' }, [h('span', { text: 'Month' }), h('span', { text: 'Revenue' }), h('span', { text: 'Expenses' }), h('span', { text: 'Margin' })]));
      per.slice().reverse().forEach(function (p) {
        var e = tracked(p.k) ? (expM[p.k] || 0) : null, mg = e == null ? null : p.rev - e;
        tbl.appendChild(h('div', { class: 'kv mth' + (inWin[p.k] ? '' : ' dim') }, [h('span', { text: monthName(p.k) + ' ' + p.k.slice(2, 4) }), h('span', { text: cm(p.rev) }), h('span', { text: e == null ? '—' : cm(e) }),
          h('span', { text: mg == null ? '—' : cmS(mg), style: mg != null && mg < 0 ? 'color:#b3261e' : '' })]));
      });
      el.appendChild(tbl);
      expCategories(el, months.filter(function (k) { return tracked(k); }));
    } else {
      el.appendChild(chart(per, inWin));
      tbl.appendChild(h('div', { class: 'kv mth' }, [h('span', { text: 'Month' }), h('span', { text: 'Bookings' }), h('span', { text: 'Sales' }), h('span', { text: 'Revenue' })]));
      per.slice().reverse().forEach(function (p) {
        tbl.appendChild(h('div', { class: 'kv mth' + (inWin[p.k] ? '' : ' dim') }, [h('span', { text: monthName(p.k) + ' ' + p.k.slice(2, 4) }), h('span', { text: String(p.count) }), h('span', { text: cm(p.gross) }), h('span', { text: cm(p.rev) })]));
      });
      el.appendChild(tbl);
    }
    el.appendChild(h('p', { class: 'hint', text: 'From the Bookings table in Vamos Sales (Bókun, the historical log and paid Vamos invoices), by trip date. Cancelled trips are left out. Good Medicine bookings made in invoicing count once they are entered in Bókun.' + (dash.exp ? ' Expenses come from the Expenses table by date, leaving out personal spending and card or loan payments. Shared costs count under All only. Margin is revenue minus expenses.' : '') }));
  }
  /* --- numbers ahead: booked trips from today on, what they should bring in and what is still to collect --- */
  function monthsFwd(count) {
    var t = todayIso(), y = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)), out = [];
    for (var i = 0; i < count; i++) { var mm = m + i, yy = y; while (mm > 12) { mm -= 12; yy++; } out.push(yy + '-' + (mm < 10 ? '0' : '') + mm); }
    return out;
  }
  function aheadOf(f) {
    var vamos = f['Business line'] === 'Vamos marketplace';
    var com = vamos ? n(f['Commission earned']) : 0, gm = vamos ? 0 : n(f['Net revenue']);
    return { vamos: vamos, gm: gm, com: com, comOpen: vamos && f['Commission status'] !== 'Paid' ? com : 0,
      collect: vamos ? 0 : Math.max(0, n(f['Gross total']) - n(f['Paid amount'])), paid: vamos ? 0 : n(f['Paid amount']) };
  }
  function dashAhead(el) {
    var rs = h('div', { class: 'seg tight', style: 'margin:0 0 14px' });
    [[1, 'This month'], [3, '3 mo'], [6, '6 mo'], [0, 'All booked']].forEach(function (o) {
      rs.appendChild(h('button', { type: 'button', class: dash.ahead === o[0] ? 'on' : '', text: o[1], onclick: function () { dash.ahead = o[0]; drawHome(); } }));
    });
    el.appendChild(rs);
    var today = todayIso();
    var future = dash.d.bookings.filter(function (r) { return lineOk(r.fields) && r.fields.Status !== 'Cancelled' && (r.fields['Activity date'] || '') >= today; });
    var last = future.reduce(function (a, r) { var k = monthKey(r.fields['Activity date']); return k > a ? k : a; }, monthKey(today));
    var months = dash.ahead ? monthsFwd(dash.ahead) : monthsFwd(Math.min(24, monthsBetween(monthKey(today), last) + 1));
    var inWin = {}; months.forEach(function (k) { inWin[k] = 1; });
    var rows = future.filter(function (r) { return inWin[monthKey(r.fields['Activity date'])]; });
    var t = { gm: 0, com: 0, comOpen: 0, collect: 0, paid: 0, guests: 0, vamosTrips: 0 };
    rows.forEach(function (r) { var a = aheadOf(r.fields); t.gm += a.gm; t.com += a.com; t.comOpen += a.comOpen; t.collect += a.collect; t.paid += a.paid; t.guests += n(r.fields['Total guests']); if (a.vamos) t.vamosTrips++; });
    var m0 = months[0], m1 = months[months.length - 1];
    el.appendChild(h('h3', { class: 'dash-h', style: 'margin-top:0', text: 'From today' + (m1 ? ' to the end of ' + monthName(m1, true) : '') }));
    var tiles = h('div', { class: 'tiles' });
    function tile(k, v, s) { tiles.appendChild(h('div', { class: 'tile' }, [h('span', { text: k }), h('b', { text: v }), s ? h('small', { text: s }) : null])); }
    tile('Trips booked', String(rows.length), t.guests ? t.guests + ' guests' : '');
    if (dash.line !== 'vamos') tile('Expected revenue', cm(t.gm + t.com), dash.line === 'gm' ? 'Good Medicine net' : 'Good Medicine ' + cm(t.gm) + ' · commissions ' + cm(t.com));
    if (dash.line !== 'vamos') tile('Good Medicine to collect', cm(t.collect), 'balances still to be paid');
    if (dash.line === 'gm') tile('Deposits already paid', cm(t.paid), 'on these trips');
    if (dash.line !== 'gm') tile('Commissions expected', cm(t.comOpen), t.vamosTrips + (t.vamosTrips === 1 ? ' trip' : ' trips') + ', owners pay on the day');
    // estimated costs: average of the last 3 complete months with expenses recorded
    var est = null;
    if (dash.exp) {
      var expM = expByMonth(), eStart = expStart(), cur = monthKey(today);
      var base3 = monthsBack(4).slice(0, 3).filter(function (k) { return eStart && k >= eStart; });
      if (base3.length) {
        var avg = base3.reduce(function (a, k) { return a + (expM[k] || 0); }, 0) / base3.length;
        est = { avg: avg, from: base3, by: {} };
        months.forEach(function (k) { est.by[k] = k === cur ? Math.max(0, avg - (expM[k] || 0)) : avg; });
        var estT = months.reduce(function (a, k) { return a + est.by[k]; }, 0), revT = t.gm + t.com;
        tile('Estimated costs', cm(estT), 'about ' + cm(avg) + ' a month (' + monthName(base3[0]) + '–' + monthName(base3[base3.length - 1]) + ' average)');
        tile('Projected margin', cmS(revT - estT), revT ? pct(revT - estT, revT) + ' of expected revenue' : 'on trips booked so far');
      }
    }
    el.appendChild(tiles);

    // month by month
    var per = months.map(function (k) {
      var l = rows.filter(function (r) { return monthKey(r.fields['Activity date']) === k; }), p = { k: k, count: l.length, gm: 0, com: 0, collect: 0 };
      l.forEach(function (r) { var a = aheadOf(r.fields); p.gm += a.gm; p.com += a.com; p.collect += a.collect; });
      return p;
    });
    var tbl = h('div', { class: 'card', style: 'padding:8px 14px' });
    if (est) {
      el.appendChild(gchart(per.map(function (p) { return { k: p.k, a: p.gm + p.com, b: est.by[p.k] }; }), null, 'Expected', 'Est. costs'));
      tbl.appendChild(h('div', { class: 'kv mth' }, [h('span', { text: 'Month' }), h('span', { text: 'Expected' }), h('span', { text: 'Est. costs' }), h('span', { text: 'Margin' })]));
      per.forEach(function (p) {
        var mg = p.gm + p.com - est.by[p.k];
        tbl.appendChild(h('div', { class: 'kv mth' }, [h('span', { text: monthName(p.k) + ' ' + p.k.slice(2, 4) }), h('span', { text: cm(p.gm + p.com) }), h('span', { text: cm(est.by[p.k]) }), h('span', { text: cmS(mg), style: mg < 0 ? 'color:#b3261e' : '' })]));
      });
    } else {
      el.appendChild(aheadChart(per));
      tbl.appendChild(h('div', { class: 'kv mth' }, [h('span', { text: 'Month' }), h('span', { text: 'Trips' }), h('span', { text: 'Expected' }), h('span', { text: dash.line === 'vamos' ? 'Commission' : 'To collect' })]));
      per.forEach(function (p) {
        tbl.appendChild(h('div', { class: 'kv mth' + (p.count ? '' : ' dim') }, [h('span', { text: monthName(p.k) + ' ' + p.k.slice(2, 4) }), h('span', { text: String(p.count) }), h('span', { text: cm(p.gm + p.com) }), h('span', { text: cm(dash.line === 'vamos' ? p.com : p.collect) })]));
      });
    }
    el.appendChild(tbl);
    if (dash.exp && !est) el.appendChild(h('p', { class: 'warn', style: 'margin:0 0 8px;font-size:13px', text: 'No expenses recorded in the last 3 months for this view, so there is no cost estimate.' }));
    if (est) el.appendChild(h('p', { class: 'hint', text: 'Estimated costs are your average monthly expenses for the last 3 complete months' + (dash.line === 'all' ? ', shared costs included' : '') + '; this month counts only what is left of that average. Costs come every month while further-out months are still filling with bookings, so their margin will rise as trips are booked.' }));

    // not counted above: bookings still waiting for a deposit, and Good Medicine invoices not entered in Bókun yet
    var last1 = m1 + '-31';
    var inv = dash.d.invoices.filter(function (r) { var f = r.fields; return !f['Cancelled at'] && f.Kind !== 'Quick payment' && lineOk(f) && (f['Trip date'] || '') >= today && (f['Trip date'] || '') <= last1; });
    var waiting = inv.filter(function (r) { var f = r.fields; return !(n(f.Deposit) > 0 && n(f['Amount paid']) >= n(f.Deposit)); });
    var gmInv = inv.filter(function (r) { var f = r.fields; return f['Business line'] === 'Good Medicine direct' && n(f.Deposit) > 0 && n(f['Amount paid']) >= n(f.Deposit); });
    var potential = function (f) { return f['Business line'] === 'Vamos marketplace' ? n(f.Commission) : n(f['Trip price']); };
    var notes = [];
    if (waiting.length) notes.push(waiting.length + (waiting.length === 1 ? ' booking is' : ' bookings are') + ' waiting for a deposit (' + waiting.map(function (r) { return r.fields['Invoice number']; }).join(', ') + '): up to ' + cm(waiting.reduce(function (a, r) { return a + potential(r.fields); }, 0)) + ' more if they pay. Not counted above.');
    if (gmInv.length) notes.push(gmInv.length + ' Good Medicine ' + (gmInv.length === 1 ? 'invoice' : 'invoices') + ' with the deposit paid ' + (gmInv.length === 1 ? 'is' : 'are') + ' not counted until entered in Bókun (' + gmInv.map(function (r) { return r.fields['Invoice number']; }).join(', ') + ': ' + cm(gmInv.reduce(function (a, r) { return a + n(r.fields['Trip price']); }, 0)) + ').');
    var odd = rows.filter(function (r) { return aheadOf(r.fields).gm < 0; });
    if (odd.length) notes.push('Check in Bókun: ' + odd.map(function (r) { return (r.fields['Booking reference'] || '') + ' (' + shortDay(r.fields['Activity date']) + ') shows net revenue ' + cmS(n(r.fields['Net revenue'])); }).join('; ') + '. It is included as is.');
    notes.forEach(function (x) { el.appendChild(h('p', { class: 'warn', style: 'margin:0 0 8px;font-size:13px', text: x })); });
    el.appendChild(h('p', { class: 'hint', text: 'Confirmed trips from the Bookings table, by trip date. Good Medicine: net revenue, and the balance still to collect (price minus what was paid). Vamos: the commission each owner pays on the day. Cancelled trips are left out.' }));
  }
  function monthsBetween(a, b) { return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7)); }
  function aheadChart(per) {
    var W = 340, H = 190, padL = 8, padR = 8, top = 22, base = 150, bw = (W - padL - padR) / Math.max(per.length, 1);
    var maxV = Math.max(1, Math.max.apply(null, per.map(function (p) { return Math.max(0, p.gm) + p.com; })));
    var ns = 'http://www.w3.org/2000/svg';
    function s(tag, a, txt) { var e = document.createElementNS(ns, tag); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (txt != null) e.textContent = txt; return e; }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Expected revenue by month' });
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: base, y2: base, stroke: '#d9d4cc' }));
    var bar = Math.min(bw * 0.6, 34);
    per.forEach(function (p, i) {
      var x = padL + i * bw + (bw - bar) / 2, scale = (base - top - 16) / maxV;
      var hg = Math.max(0, p.gm) * scale, hc = p.com * scale;
      if (hg) svg.appendChild(s('rect', { x: x, y: base - hg, width: bar, height: hg, rx: 3, fill: C.aqua }));
      if (hc) svg.appendChild(s('rect', { x: x, y: base - hg - hc, width: bar, height: Math.max(hc, 2), rx: 3, fill: PINK }));
      var tot = Math.max(0, p.gm) + p.com;
      if (tot) svg.appendChild(s('text', { x: x + bar / 2, y: base - hg - hc - 4, 'text-anchor': 'middle', 'font-size': 10.5, fill: C.navy }, cmk(tot)));
      svg.appendChild(s('text', { x: x + bar / 2, y: base + 15, 'text-anchor': 'middle', 'font-size': 10.5, fill: p.count ? C.navy : '#8a949b' }, monthName(p.k)));
    });
    var lg = H - 10;
    if (dash.line !== 'vamos') { svg.appendChild(s('rect', { x: padL, y: lg - 9, width: 10, height: 10, rx: 2, fill: C.aqua })); svg.appendChild(s('text', { x: padL + 15, y: lg, 'font-size': 11, fill: C.navy }, 'Good Medicine')); }
    if (dash.line !== 'gm') { var lx = dash.line === 'vamos' ? padL : padL + 110; svg.appendChild(s('rect', { x: lx, y: lg - 9, width: 10, height: 10, rx: 2, fill: PINK })); svg.appendChild(s('text', { x: lx + 15, y: lg, 'font-size': 11, fill: C.navy }, 'Vamos commissions')); }
    return h('div', { class: 'card', style: 'padding:10px 8px 4px' }, [svg]);
  }
  function chart(per, inWin) {
    var W = 340, H = 190, padL = 8, padR = 8, top = 22, base = 150, n0 = per.length, bw = (W - padL - padR) / n0;
    var maxC = Math.max(1, Math.max.apply(null, per.map(function (p) { return p.count; })));
    var maxR = Math.max(1, Math.max.apply(null, per.map(function (p) { return p.rev; })));
    var ns = 'http://www.w3.org/2000/svg';
    function s(tag, a, txt) { var e = document.createElementNS(ns, tag); Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (txt != null) e.textContent = txt; return e; }
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Bookings and revenue by month' });
    svg.appendChild(s('line', { x1: padL, x2: W - padR, y1: base, y2: base, stroke: '#d9d4cc' }));
    var pts = [];
    per.forEach(function (p, i) {
      var x = padL + i * bw, bh = (p.count / maxC) * (base - top - 18), on = inWin[p.k];
      svg.appendChild(s('rect', { x: x + bw * 0.2, y: base - bh, width: bw * 0.6, height: Math.max(bh, p.count ? 2 : 0), rx: 3, fill: on ? C.aqua : '#bfe9e6' }));
      if (p.count) svg.appendChild(s('text', { x: x + bw / 2, y: base - bh - 4, 'text-anchor': 'middle', 'font-size': 11, fill: C.navy }, String(p.count)));
      svg.appendChild(s('text', { x: x + bw / 2, y: base + 15, 'text-anchor': 'middle', 'font-size': 10.5, fill: on ? C.navy : '#8a949b' }, monthName(p.k)));
      pts.push([x + bw / 2, base - (p.rev / maxR) * (base - top - 18)]);
    });
    svg.appendChild(s('polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), fill: 'none', stroke: PINK, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
    pts.forEach(function (p) { svg.appendChild(s('circle', { cx: p[0], cy: p[1], r: 3.5, fill: PINK })); });
    var lg = H - 10;
    svg.appendChild(s('rect', { x: padL, y: lg - 9, width: 10, height: 10, rx: 2, fill: C.aqua }));
    svg.appendChild(s('text', { x: padL + 15, y: lg, 'font-size': 11, fill: C.navy }, 'Bookings'));
    svg.appendChild(s('line', { x1: padL + 90, x2: padL + 106, y1: lg - 4, y2: lg - 4, stroke: PINK, 'stroke-width': 2.5 }));
    svg.appendChild(s('text', { x: padL + 111, y: lg, 'font-size': 11, fill: C.navy }, 'Your revenue (peak ' + cm(maxR) + ')'));
    return h('div', { class: 'card', style: 'padding:10px 8px 4px' }, [svg]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
