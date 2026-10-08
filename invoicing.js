/* Vamos a La Paz — invoicing screen (/invoicing?k=<admin key>[&inquiry=rec…][&invoice=rec…][&phone=…])
   Source: github.com/vamosalapaz/vamos-portal (invoicing.js), served via jsDelivr tagged releases.
   v1 (Oct 2026): create a managed-booking invoice from an inquiry or a WhatsApp number, owner sign-off by WhatsApp.
   v2: WhatsApp buttons use wa.me (WhatsApp then offers to switch to WhatsApp Business); experiences whose boat has
       no owner on file let you type the owner's name and number, or skip sign-off.
   Next releases add: customer send (Stripe link + /reserva page), Mark paid, pass deposit, settle at the dock. */
(function () {
  'use strict';

  var HOOK_DATA = 'https://hook.us2.make.com/sj7umgqbg14kim902rg0ochd4ny6i72f';
  var HOOK_CREATE = 'https://hook.us2.make.com/4vs20d3adxqy8nnc1hftzito01rn933q';
  var SITE = 'https://vamosalapaz.com';
  var PINK = '#D4537E';

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
    if (lang === 'English') return 'We send you the full deposit (' + money(dep) + ') as soon as the customer pays it; it secures the booking. On the day you collect the balance (' + money(bal) + ') directly from the customer before departure, and after the trip you pay Vamos its commission (' + money(com) + '). If the customer cancels, you keep the deposit and no commission is due. If the Port Captain closes the port, you return the deposit to Vamos and we refund the customer.';
    return 'Te enviamos el anticipo completo (' + money(dep) + ') en cuanto el cliente lo paga; asegura la reservación. El día del viaje cobras el saldo (' + money(bal) + ') directamente al cliente, antes de zarpar, y después del viaje nos pagas la comisión de Vamos (' + money(com) + '). Si el cliente cancela, te quedas con el anticipo y no hay comisión. Si Capitanía cierra el puerto, nos devuelves el anticipo y nosotros se lo reembolsamos al cliente.';
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
      '.vi{max-width:560px;margin:0 auto;padding:20px 16px 64px;font-family:"DM Sans",system-ui,sans-serif;color:#1d2731;font-size:16px;line-height:1.45}',
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
      '.vi .dot.done{background:#2e7d4f;border-color:#2e7d4f}.vi .dot.now{border-color:' + PINK + ';background:#fbe3ec}',
      '.vi .step b{display:block}.vi .step .small{font-size:14px;color:#5a6670}',
      '.vi .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.vi .btns .btn{width:auto;padding:9px 14px;margin:0;font-size:15px}',
      '.vi .kv{display:flex;justify-content:space-between;gap:12px;padding:3px 0;font-size:15px}.vi .kv span:first-child{color:#5a6670}',
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
    var anchor = document.querySelector('main') || document.body;
    var nav = document.querySelector('.w-nav, header, nav');
    if (nav && nav.parentNode === anchor) nav.insertAdjacentElement('afterend', root); else anchor.appendChild(root);
    if (!KEY) { root.appendChild(h('p', { class: 'warn', text: 'This page needs your private invoicing link. Open it from an inquiry email.' })); return; }
    root.appendChild(h('p', { class: 'sub', text: 'Loading…' }));
    load(qs.get('inquiry'), qs.get('invoice')).catch(showFatal);
  }
  function showFatal(e) { root.innerHTML = ''; root.appendChild(h('p', { class: 'err', text: e.message || String(e) })); }

  function load(inquiryId, invoiceId) {
    return post(HOOK_DATA, { k: KEY, action: 'load', inquiry: inquiryId || '', invoice: invoiceId || '' }).then(function (d) {
      d.maps = { off: byId(d.offerings), boat: byId(d.boats), pa: byId(d.partners), op: byId(d.operators) };
      state.data = d;
      if (d.invoice && d.invoice.length) return renderInvoice(d.invoice[0]);
      state.inquiry = d.inquiry && d.inquiry[0] || null;
      renderForm();
    });
  }

  /* ---------- create form ---------- */
  function renderForm() {
    var d = state.data, inq = state.inquiry, f = inq ? inq.fields : {};
    state.customerId = inq && f.Customer ? ids(f.Customer)[0] : '';
    root.innerHTML = '';
    root.appendChild(h('h1', { text: 'New invoice' }));
    root.appendChild(h('p', { class: 'sub', text: inq ? 'From website inquiry' + (f['Received at'] ? ', ' + new Date(f['Received at']).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '') : 'Started from WhatsApp or by hand' }));

    var lang = f.Language || 'Español';
    var form = h('div');
    // customer
    var cust = h('div', { class: 'card' });
    cust.appendChild(h('label', { for: 'vi-name', text: 'Customer name' }));
    cust.appendChild(h('input', { id: 'vi-name', value: f.Name || '', autocomplete: 'off' }));
    cust.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-phone', text: 'WhatsApp number' }), h('input', { id: 'vi-phone', type: 'tel', value: f.Phone || qs.get('phone') || '', onblur: lookupPhone })]),
      h('div', null, [h('label', { for: 'vi-email', text: 'Email (optional)' }), h('input', { id: 'vi-email', type: 'email', value: f.Email || '' })])
    ]));
    cust.appendChild(h('div', { id: 'vi-known' }));
    cust.appendChild(h('label', { text: 'Customer language' }));
    var seg = h('div', { class: 'seg', id: 'vi-lang' });
    ['Español', 'English'].forEach(function (l) {
      seg.appendChild(h('button', { type: 'button', class: l === lang ? 'on' : '', text: l, onclick: function () { Array.prototype.forEach.call(seg.children, function (b) { b.className = b.textContent === l ? 'on' : ''; }); state.form.lang = l; refresh(); } }));
    });
    state.form.lang = lang;
    cust.appendChild(seg);
    if (f.Message) cust.appendChild(h('p', { class: 'hint', text: '“' + f.Message + '”' }));
    form.appendChild(cust);

    // trip
    var trip = h('div', { class: 'card' });
    trip.appendChild(h('label', { for: 'vi-off', text: 'Experience' }));
    var sel = h('select', { id: 'vi-off', onchange: function () { applyOffering(true); } });
    sel.appendChild(h('option', { value: '', text: 'Choose an experience' }));
    (d.offerings || []).slice().sort(function (a, b) { return String(a.fields.Name).localeCompare(String(b.fields.Name)); }).forEach(function (o) {
      var c = ctxSafe(o.id);
      var tag = c ? [c.boat && c.boat.fields.Name, c.op && !c.placeholder ? c.op.fields.Name : (c.owner ? 'owner ' + first(c.owner.fields['Contact Name']) : '')].filter(Boolean).join(', ') : '';
      sel.appendChild(h('option', { value: o.id, text: o.fields.Name + (tag ? ' (' + tag + ')' : ''), selected: f['Offering record ID'] === o.id ? 'selected' : null }));
    });
    trip.appendChild(sel);
    trip.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-date', text: 'Date' }), h('input', { id: 'vi-date', type: 'date', value: f['Requested date'] || '' })]),
      h('div', null, [h('label', { for: 'vi-guests', text: 'Guests' }), h('input', { id: 'vi-guests', type: 'number', inputmode: 'numeric', min: '1', value: f.Guests || '' })])
    ]));
    trip.appendChild(h('label', { for: 'vi-end', text: 'Last day (multi-day trips only)' }));
    trip.appendChild(h('input', { id: 'vi-end', type: 'date' }));
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
      h('div', null, [h('label', { for: 'vi-mt', text: 'Time' }), h('input', { id: 'vi-mt', placeholder: '8:30 am' })])
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
    root.appendChild(form);

    if (!inq && $('#vi-phone').value) lookupPhone();
    applyOffering(false);
  }
  function ctxSafe(id) { try { return ctx(id); } catch (e) { return null; } }

  function applyOffering(userChanged) {
    var id = $('#vi-off').value, c = id ? ctx(id) : null;
    state.ctx = c;
    if (!c) { refresh(); return; }
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
    if (userChanged || !$('#vi-mt').value) $('#vi-mt').value = f['Meeting time (private)'] || '';
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
    var gm = c && c.gm;
    $('#vi-comwrap').style.display = gm ? 'none' : '';
    $('#vi-skip').style.display = gm ? 'none' : '';
    $('#vi-onote').previousSibling.style.display = gm ? 'none' : '';
    $('#vi-onote').style.display = gm ? 'none' : '';
    var split = '';
    if (price && dep) {
      var pct = Math.round(dep / price * 100);
      split = gm ? 'Deposit ' + pct + '% · balance ' + money(price - dep) + ' on the day'
        : 'Deposit ' + pct + '% goes to ' + (c && c.owner ? first(c.owner.fields['Contact Name']) : 'the owner') + ' · owner collects ' + money(price - dep) + ' at the dock' + (com ? ' · owes you ' + money(com) : '');
    }
    $('#vi-split').textContent = split;
    $('#vi-go').textContent = !c ? 'Create' : gm ? 'Create invoice' : 'Create · send to owner first';
  }

  function lookupPhone() {
    var ph = $('#vi-phone').value;
    if (digits(ph).length < 8 || state.inquiry) return;
    post(HOOK_DATA, { k: KEY, action: 'lookup', phone: ph }).then(function (r) {
      var c = r.customers && r.customers[0], box = $('#vi-known');
      box.innerHTML = '';
      if (!c) return;
      state.customerId = c.id;
      var name = String(c.fields['Customer name'] || '').replace(/\s*\(.*\)\s*$/, '');
      if (!$('#vi-name').value) $('#vi-name').value = name;
      if (!$('#vi-email').value && c.fields.Email) $('#vi-email').value = c.fields.Email;
      var last = (r.inquiries || []).sort(function (a, b) { return String(b.fields['Received at']).localeCompare(String(a.fields['Received at'])); })[0];
      if (last && !$('#vi-off').value && last.fields['Offering record ID']) { $('#vi-off').value = last.fields['Offering record ID']; applyOffering(true); }
      if (last && !$('#vi-date').value && last.fields['Requested date']) $('#vi-date').value = last.fields['Requested date'];
      box.appendChild(h('div', { class: 'known', text: 'Known customer: ' + name + (last ? ' · last asked about ' + (last.fields.Offering || 'a trip') : '') }));
    }).catch(function () { /* lookup is a convenience only */ });
  }

  /* ---------- submit ---------- */
  function submit(skipOwner) {
    if (state.busy) return;
    var c = state.ctx, err = $('#vi-err');
    err.innerHTML = '';
    if (!c) { err.appendChild(h('p', { class: 'err', text: 'Choose the experience.' })); return; }
    var v = {
      name: $('#vi-name').value.trim(), phone: $('#vi-phone').value.trim(), email: $('#vi-email').value.trim(), lang: state.form.lang,
      date: $('#vi-date').value, end: $('#vi-end').value, guests: $('#vi-guests').value,
      price: Number($('#vi-price').value) || 0, dep: Number($('#vi-dep').value) || 0, com: Number($('#vi-com').value) || 0,
      mp: $('#vi-mp').value.trim(), mt: $('#vi-mt').value.trim(), map: $('#vi-map').value.trim(),
      note: $('#vi-note').value.trim(), onote: $('#vi-onote').value.trim(), internal: $('#vi-int').value.trim()
    };
    var missing = [];
    if (!v.name) missing.push('customer name');
    if (!v.phone && !v.email) missing.push('a WhatsApp number or email');
    if (!c) missing.push('the experience');
    if (!v.date) missing.push('the date');
    if (!v.price) missing.push('the trip price');
    if (!v.dep) missing.push('the deposit');
    if (missing.length) { err.appendChild(h('p', { class: 'err', text: 'Add ' + missing.join(', ') + '.' })); return; }
    if (v.dep > v.price) { err.appendChild(h('p', { class: 'err', text: 'The deposit is more than the trip price.' })); return; }
    var owner = c.owner;
    if (!c.gm && !owner) {
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
    var provider = c.gm ? '' : (c.placeholder
      ? (es ? 'Embarcación ' + boatName + ', operada por su propietario' + (ownerShort ? ' ' + ownerShort : '') : boatName + ', run by its owner' + (ownerShort ? ' ' + ownerShort : ''))
      : (boatName ? (es ? boatName + ', operada por ' : boatName + ', run by ') : '') + (c.op ? c.op.fields.Name : ''));
    var signoff = c.gm ? 'Not needed' : (skipOwner || !owner ? 'Skipped' : 'Required');

    var chain = Promise.resolve();
    if (!state.customerId) chain = chain.then(function () {
      return post(HOOK_CREATE, { k: KEY, action: 'customer', name: v.name, phone: v.phone, email: v.email, lang: lang }).then(function (r) { state.customerId = r.id; });
    });
    var mirrorId = c.mirror ? c.mirror.id : '';
    if (!mirrorId && c.opsId) chain = chain.then(function () {
      return post(HOOK_CREATE, { k: KEY, action: 'mirror', name: c.placeholder ? owner.fields['Contact Name'] : c.op.fields.Name, opsId: c.opsId,
        businessLine: c.gm ? 'Good Medicine direct' : 'Vamos marketplace', arrangement: owner ? owner.fields.Arrangement || '' : '', commission: c.comPct }).then(function (r) { mirrorId = r.id; });
    });
    chain.then(function () {
      return post(HOOK_CREATE, {
        k: KEY, action: 'create', customerId: state.customerId, inquiryId: state.inquiry ? state.inquiry.id : '', mirrorId: mirrorId,
        offeringId: c.o.id, source: state.inquiry ? 'Website inquiry' : 'WhatsApp', lang: lang,
        billedTo: v.name, phone: v.phone, email: v.email,
        trip: es ? (f['Name (ES)'] || f.Name) : f.Name, duration: es ? (f['Duration (ES)'] || f.Duration || '') : (f.Duration || ''),
        businessLine: c.gm ? 'Good Medicine direct' : 'Vamos marketplace', balanceBy: c.gm ? 'Vamos' : 'Owner',
        tripDate: v.date, endDate: v.end, guests: v.guests, price: v.price, deposit: v.dep, commission: c.gm ? '' : v.com, ownerPayout: '',
        meetingPoint: v.mp, meetingTime: v.mt, mapLink: v.map, provider: provider, note: v.note, internalNotes: v.internal,
        cancellation: cancellationText(c.o, lang), signoff: signoff,
        partnerId: owner && !owner.typed ? owner.id : '', ownerName: owner ? owner.fields['Contact Name'] : '', ownerPhone: owner ? owner.fields['Contact Number'] || '' : '', ownerLang: oLang,
        oTrip: oEs ? (f['Name (ES)'] || f.Name) : f.Name, oDuration: oEs ? (f['Duration (ES)'] || f.Duration || '') : (f.Duration || ''),
        oIncluded: plain(oEs ? (f["What's included (ES)"] || f["What's included"]) : (f["What's included"] || f["What's included (ES)"])),
        oCancellation: cancellationText(c.o, oLang), oPaymentTerms: paymentTerms(oLang, v.dep, v.price - v.dep, v.com),
        ownerBalance: v.price - v.dep, boat: boatName, leadGuest: first(v.name), noteToOwner: v.onote
      });
    }).then(function (r) {
      history.replaceState(null, '', location.pathname + '?k=' + encodeURIComponent(KEY) + '&invoice=' + r.id);
      root.innerHTML = ''; root.appendChild(h('p', { class: 'sub', text: 'Created ' + r.number + '. Loading…' }));
      return load('', r.id);
    }).catch(function (e) {
      state.busy = false; btn.disabled = false; refresh();
      err.appendChild(h('p', { class: 'err', text: e.message }));
    });
  }

  /* ---------- invoice tracker ---------- */
  function renderInvoice(inv) {
    var d = state.data, f = inv.fields, conf = (d.confirmations || []).filter(function (x) { return x.fields.Status !== 'Superseded' && x.fields.Status !== 'Cancelled'; })[0];
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'sub', text: (f['Invoice number'] || '') + ' · ' + (f['Billed to'] || '') }));
    root.appendChild(h('h1', { text: (f.Trip || '') + ', ' + fmtDate(f['Trip date'], 'English') + (f.Guests ? ', ' + f.Guests + ' guests' : '') }));
    var steps = h('div', { class: 'card' });

    // 1. owner sign-off
    var so = f['Owner sign-off'];
    if (so === 'Required') {
      var agreed = conf && conf.fields.Status === 'Agreed';
      var cf = conf ? conf.fields : {};
      var link = cf['Page token'] ? SITE + '/confirmar?k=' + cf['Page token'] : '';
      var oEs = cf.Language !== 'English';
      var msg = oEs
        ? 'Hola ' + first(cf['Owner name']) + ', tengo una reservación para ' + (cf.Trip || '') + ' el ' + fmtDate(cf['Trip date'], 'Español') + ' (' + (cf.Guests || '') + ' personas). Revisa los detalles y confírmala aquí: ' + link
        : 'Hi ' + first(cf['Owner name']) + ', I have a booking for ' + (cf.Trip || '') + ' on ' + fmtDate(cf['Trip date'], 'English') + ' (' + (cf.Guests || '') + ' guests). Please review the details and confirm here: ' + link;
      steps.appendChild(step(agreed ? 'done' : 'now', agreed ? first(cf['Owner name']) + ' confirmed' : 'Waiting for ' + first(cf['Owner name']) + ' to confirm',
        agreed ? 'Signed by ' + (cf['Signed by'] || '') : (cf.Status === 'Changes requested' ? 'Asked for a change: ' + (cf['Change request'] || '') : 'Owner gets ' + money(f.Deposit) + ' deposit, collects ' + money((f['Trip price'] || 0) - (f.Deposit || 0)) + ', owes you ' + money(f.Commission)),
        agreed ? null : [
          h('button', { class: 'btn sec', type: 'button', onclick: function () { openWhatsApp(cf['Owner phone'], msg); } }, ['WhatsApp owner']),
          h('button', { class: 'btn sec', type: 'button', onclick: function () { copy(msg); } }, ['Copy message'])
        ]));
    } else if (so === 'Skipped') {
      steps.appendChild(step('done', 'Owner sign-off skipped', 'You chose to send without the owner confirming.'));
    }
    // 2. customer
    var ready = so !== 'Required' || (conf && conf.fields.Status === 'Agreed');
    steps.appendChild(step(ready ? 'now' : '', 'Send to ' + first(f['Billed to']), ready ? 'Customer page and card payment link arrive in the next release.' : 'Unlocks when the owner confirms.'));
    steps.appendChild(step('', 'Deposit ' + money(f.Deposit), 'Card payments will update by themselves; Mark paid for transfer or cash.'));
    if (f['Balance collected by'] === 'Owner') {
      steps.appendChild(step('', 'Pass the deposit to the owner', ''));
      steps.appendChild(step('', 'Settle at the dock', 'Customer pays the owner ' + money((f['Trip price'] || 0) - (f.Deposit || 0)) + '; owner pays you ' + money(f.Commission) + '.'));
    }
    root.appendChild(steps);

    var sum = h('div', { class: 'card' });
    [['Trip price', money(f['Trip price'])], ['Deposit', money(f.Deposit)], f.Commission ? ['Your commission', money(f.Commission)] : null,
     ['Meeting', [f['Meeting point'], f['Meeting time']].filter(Boolean).join(', ') || 'not set'], ['Language', f.Language || ''], ['Status', f.Status || '']]
      .filter(Boolean).forEach(function (kv) { sum.appendChild(h('div', { class: 'kv' }, [h('span', { text: kv[0] }), h('span', { text: kv[1] })])); });
    root.appendChild(sum);
    root.appendChild(h('a', { class: 'btn sec', href: location.pathname + '?k=' + encodeURIComponent(KEY) }, ['New invoice']));
  }
  function step(cls, title, small, buttons) {
    return h('div', { class: 'step' }, [h('div', { class: 'dot ' + (cls || '') }), h('div', { style: 'flex:1' }, [
      h('b', { text: title }), small ? h('div', { class: 'small', text: small }) : null, buttons ? h('div', { class: 'btns' }, buttons) : null])]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
