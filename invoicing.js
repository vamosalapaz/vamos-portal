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
       and an amount, standalone or attached to a booking as an extra); phone hint for non-Mexican numbers. */
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
      '.vi input[type=date]{-webkit-appearance:none;appearance:none;min-width:0;display:block;min-height:44px;line-height:1.2}',
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
    shell.appendChild(h('div', { class: 'vi-top' }, [h('img', { src: LOGO, alt: 'Vamos a La Paz' }), h('span', { text: 'Invoicing' })]));
    shell.appendChild(stripe);
    shell.appendChild(root);
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
    var form = h('div');
    if (!edit && !inq) form.appendChild(modeSwitch('booking'));
    // customer
    var cust = h('div', { class: 'card' });
    cust.appendChild(h('label', { for: 'vi-name', text: 'Customer name' }));
    cust.appendChild(h('input', { id: 'vi-name', value: f.Name || '', autocomplete: 'off' }));
    cust.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-phone', text: 'WhatsApp number' }), h('input', { id: 'vi-phone', type: 'tel', value: f.Phone || qs.get('phone') || '', onblur: lookupPhone })]),
      h('div', null, [h('label', { for: 'vi-email', text: 'Email (optional)' }), h('input', { id: 'vi-email', type: 'email', value: f.Email || '' })])
    ]));
    cust.appendChild(h('div', { class: 'hint', text: PHONE_HINT }));
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
    if (edit) form.appendChild(h('button', { class: 'link', type: 'button', onclick: function () { renderInvoice(edit.inv); } }, ['Cancel']));
    root.appendChild(form);

    if (edit) {
      var e2 = edit.inv.fields, cf = edit.conf ? edit.conf.fields : {};
      $('#vi-end').value = e2['End date'] && e2['End date'] > (e2['Trip date'] || '') ? e2['End date'] : (e2['Trip date'] || '');
      $('#vi-price').value = e2['Trip price'] || '';
      $('#vi-dep').value = e2.Deposit || '';
      $('#vi-com').value = e2.Commission || '';
      $('#vi-mp').value = e2['Meeting point'] || '';
      $('#vi-mt').value = e2['Meeting time'] || '';
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
      items.forEach(function (o) { sel.appendChild(h('option', { value: o.id, text: o.fields.Name + (o.fields['Price Range'] ? ' · ' + o.fields['Price Range'] : ''), selected: o.id === selectId ? 'selected' : null })); });
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
    var cust = h('div', { class: 'card' });
    cust.appendChild(h('label', { for: 'vi-name', text: 'Customer name' }));
    cust.appendChild(h('input', { id: 'vi-name', value: ef['Billed to'] || pf['Billed to'] || '', autocomplete: 'off' }));
    cust.appendChild(h('div', { class: 'row' }, [
      h('div', null, [h('label', { for: 'vi-phone', text: 'WhatsApp number' }), h('input', { id: 'vi-phone', type: 'tel', value: ef.Phone || pf.Phone || qs.get('phone') || '', onblur: function () { if (!parent && !edit) lookupPhone(); } })]),
      h('div', null, [h('label', { for: 'vi-email', text: 'Email (optional)' }), h('input', { id: 'vi-email', type: 'email', value: ef.Email || pf.Email || '' })])
    ]));
    cust.appendChild(h('div', { class: 'hint', text: PHONE_HINT }));
    cust.appendChild(h('div', { id: 'vi-known' }));
    cust.appendChild(h('label', { text: 'Customer language' }));
    var seg = h('div', { class: 'seg' });
    ['Español', 'English'].forEach(function (l) {
      seg.appendChild(h('button', { type: 'button', class: l === lang ? 'on' : '', text: l, onclick: function () { Array.prototype.forEach.call(seg.children, function (b) { b.className = b.textContent === l ? 'on' : ''; }); state.form.lang = l; } }));
    });
    cust.appendChild(seg);
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
    root.appendChild(sum);
    if (!cancelled) root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { renderForm({ inv: inv, conf: conf }); } }, ['Edit']));
    root.appendChild(h('button', { class: 'btn sec', type: 'button', onclick: function () { reload(inv, 'Refreshing…'); } }, ['Refresh']));
    root.appendChild(h('a', { class: 'btn sec', href: location.pathname + '?k=' + encodeURIComponent(KEY) }, ['New invoice']));
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
    root.appendChild(h('a', { class: 'btn sec', href: location.pathname + '?k=' + encodeURIComponent(KEY) }, ['New invoice']));
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
    if (depPaid || cancelled) return step(sent || depPaid ? 'done' : '', title, small, [h('a', { class: 'btn sec', href: page, target: '_blank', rel: 'noopener' }, ['Customer page'])]);
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
