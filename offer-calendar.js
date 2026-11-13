/* Vamos a La Paz — live calendar on FareHarbor offer pages (Nov 13, 2026)
   On /offerings/<slug> (and /es/), when the booking button (.vlp-book-btn) points at FareHarbor: a month calendar of that
   offer's open departures (vamos-requests /days), a guests stepper, and one "Book <time>" button per departure that opens
   FareHarbor checkout straight on that departure (FareHarbor's lightframe, Vamos affiliate code, ref vamosalapaz-<slug>-cal).
   Each Book tap is logged in Vamos Sales → Checkout Link Taps (POST /go beacon) and pushed to the dataLayer
   (offer_calendar_book). If the calendar can't load, the page keeps the normal "Book now" button.
   Nov 13 (later): no guests stepper (FareHarbor asks for the group size at checkout) and no "see all dates" link.
   PREVIEW: shows only after visiting an offer page with ?cal=1 (remembered in this browser; ?cal=0 turns it off) until LIVE = true. */
(function () {
  'use strict';
  var LIVE = false;
  var API = 'https://vamos-requests.solitary-wind-dfb8.workers.dev';
  var m = /^\/(?:es\/)?offerings\/([a-z0-9-]+)\/?$/.exec(location.pathname);
  if (!m || window.__vlpOfferCal) return;
  window.__vlpOfferCal = 1;
  var SLUG = m[1];
  var ES = /^\/es(\/|$)/.test(location.pathname) || /^es/i.test(document.documentElement.lang || '');
  var qs; try { qs = new URLSearchParams(location.search); } catch (e) { qs = { get: function () { return null; } }; }
  try {
    if (qs.get('cal') === '1') localStorage.setItem('vlp-cal', '1');
    if (qs.get('cal') === '0') localStorage.removeItem('vlp-cal');
  } catch (e) {}
  var on = LIVE; try { on = on || localStorage.getItem('vlp-cal') === '1'; } catch (e) {}
  if (!on) return;

  var T = ES ? {
    title: 'Elige tu fecha', sub: 'Disponibilidad en vivo. Elige un día y reserva al instante.', guests: 'Personas', fewer: 'Menos', more: 'Más',
    prev: 'Mes anterior', next: 'Mes siguiente', loading: 'Consultando disponibilidad…', book: 'Reservar', bookAt: function (t) { return 'Reservar ' + t; },
    left: function (n) { return 'quedan ' + n; }, none: 'No hay salidas con lugar este día.', noneMonth: 'Sin fechas con lugar este mes.',
    nextOpen: 'Próxima fecha con lugar:', tryNext: 'Ver el mes siguiente', priceNote: 'El total final aparece al pagar.',
    perPerson: 'por persona', perGroup: 'por grupo', guest: function (n) { return n + (n === 1 ? ' persona' : ' personas'); },
    tsdb: 'El parque asigna la hora exacta un día antes.', all: 'Ver todas las fechas y horarios', open: 'Con lugar'
  } : {
    title: 'Pick your date', sub: 'Live availability. Choose a day and book instantly.', guests: 'Guests', fewer: 'Fewer', more: 'More',
    prev: 'Previous month', next: 'Next month', loading: 'Checking availability…', book: 'Book', bookAt: function (t) { return 'Book ' + t; },
    left: function (n) { return n + ' left'; }, none: 'No departures with space this day.', noneMonth: 'No dates with space this month.',
    nextOpen: 'Next date with space:', tryNext: 'See next month', priceNote: 'Final total shown at checkout.',
    perPerson: 'per person', perGroup: 'per group', guest: function (n) { return n + (n === 1 ? ' guest' : ' guests'); },
    tsdb: 'The park assigns the exact time the day before.', all: 'See all dates and times', open: 'Has space'
  };

  var CSS = [
    '.vlp-oc{font-family:"DM Sans",sans-serif;color:#17202A;background:#fff;border:1px solid #E5DFD1;border-radius:12px;padding:14px 12px;margin:0 0 12px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box;width:100%}',
    '.vlp-oc *{box-sizing:border-box}.vlp-oc [hidden]{display:none!important}',
    '.vlp-oc-h{margin:0;font-size:18px;font-weight:700;line-height:1.25}.vlp-oc-s{margin:2px 0 0;font-size:14px;color:#46525C;line-height:1.35}',
    '.vlp-oc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.vlp-oc-nav{width:40px;height:40px;flex:none;border:1px solid #E5DFD1;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;color:#17202A;cursor:pointer;padding:0}',
    '.vlp-oc-nav:disabled{color:#A3ABB2;cursor:default}.vlp-oc-mo{font-size:16px;font-weight:700}',
    '.vlp-oc-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}',
    '.vlp-oc-wd{text-align:center;font-size:12px;font-weight:700;color:#46525C;padding:2px 0;text-transform:capitalize}',
    '.vlp-oc-c{height:40px;border:1px solid transparent;border-radius:8px;background:none;font:inherit;font-size:15px;color:#A3ABB2;cursor:default;padding:0}',
    '.vlp-oc-c.open{border-color:#CFE3D5;background:#F2F9F4;color:#17202A;font-weight:600;cursor:pointer}',
    '.vlp-oc-c.sel{border:2px solid #B51E66;background:#B51E66;color:#fff;font-weight:700}',
    '.vlp-oc button:focus-visible,.vlp-oc a:focus-visible{outline:2px solid #B51E66;outline-offset:2px}',
    '.vlp-oc-g{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;font-weight:600;color:#46525C;border-top:1px solid #EFEAE0;padding-top:10px}',
    '.vlp-oc-step{display:flex;align-items:center;border:1px solid #E5DFD1;border-radius:8px;padding:2px;min-height:44px}',
    '.vlp-oc-step button{width:38px;height:38px;border:none;border-radius:6px;background:#F4EFE6;font:inherit;font-size:20px;font-weight:600;color:#17202A;cursor:pointer;padding:0;line-height:1}',
    '.vlp-oc-step span{min-width:84px;text-align:center;font-size:15px;color:#17202A}',
    '.vlp-oc-day{display:flex;flex-direction:column;gap:8px;border-top:1px solid #EFEAE0;padding-top:10px}',
    '.vlp-oc-dh{font-size:16px;font-weight:700}.vlp-oc-pr{font-size:14px;color:#46525C}.vlp-oc-pr b{color:#17202A;font-weight:600}',
    '.vlp-oc-btns{display:flex;flex-direction:column;gap:8px}',
    '.vlp-oc-book{min-height:48px;display:flex;align-items:center;justify-content:center;background:#B51E66;color:#fff!important;border-radius:999px;padding:0 16px;font-size:16px;font-weight:700;text-decoration:none!important;text-align:center}',
    '.vlp-oc-book:hover{background:#9A1957}.vlp-oc-book small{font-weight:500;font-size:14px;margin-left:6px;opacity:.9}',
    '.vlp-oc-m{margin:0;font-size:14px;color:#46525C;line-height:1.4}',
    '.vlp-oc-l{font:inherit;font-size:14px;font-weight:600;color:#B51E66;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-align:left}',
    '.vlp-oc-spin{font-size:14px;color:#46525C;padding:6px 0}'
  ].join('');
  var CH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function todayLaPaz() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return new Date(Date.now() - 7 * 36e5).toISOString().slice(0, 10); } }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function addMonths(ym, n) { var y = +ym.slice(0, 4), mo = +ym.slice(5, 7) - 1 + n; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12; return y + '-' + String(mo + 1).padStart(2, '0'); }
  function monthEnd(ym) { var d = new Date(ym + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); }
  function fmt(iso, o) { return new Date(iso + 'T12:00:00Z').toLocaleDateString(ES ? 'es-MX' : 'en-US', Object.assign({ timeZone: 'UTC' }, o)); }
  function cap1(s) { return s.replace(/^./, function (c) { return c.toUpperCase(); }); }
  function fmtTime(t) { var h = +t.slice(0, 2), mi = t.slice(3, 5); return ES ? h + ':' + mi : ((h + 11) % 12 + 1) + (mi === '00' ? '' : ':' + mi) + (h < 12 ? ' am' : ' pm'); }
  function track(ev, p) { try { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: ev }, p || {})); } catch (e) {} }

  function start() {
    var btn = document.querySelector('.vlp-book-btn');
    if (!btn || !/fareharbor\.com\/embeds\/book\//i.test(btn.getAttribute('href') || '')) return;
    var mount = btn.parentNode;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    var today = todayLaPaz();
    var want = /^\d{4}-\d{2}-\d{2}$/.test(qs.get('date') || '') && qs.get('date') >= today ? qs.get('date') : '';
    // Group size is picked in FareHarbor checkout (it can't be passed in the link), so no guests step here (Peter, Nov 13).
    var guests = 1;
    var minMonth = today.slice(0, 7), maxMonth = addMonths(minMonth, 5), month = (want || today).slice(0, 7);
    var cache = {}, cur = null, sel = want, info = null, shown = false;

    var box = document.createElement('section');
    box.className = 'vlp-oc'; box.setAttribute('aria-label', T.title); box.hidden = true;
    box.innerHTML = '<div><h3 class="vlp-oc-h">' + esc(T.title) + '</h3><p class="vlp-oc-s">' + esc(T.sub) + '</p></div>' +
      '<div class="vlp-oc-top"><button type="button" class="vlp-oc-nav" data-m="-1" aria-label="' + esc(T.prev) + '">' + CH + '</button>' +
      '<span class="vlp-oc-mo" aria-live="polite"></span><button type="button" class="vlp-oc-nav" data-m="1" aria-label="' + esc(T.next) + '">' +
      CH.replace('M15 6l-6 6 6 6', 'M9 6l6 6-6 6') + '</button></div><div class="vlp-oc-grid" role="group"></div>' +
      '<div class="vlp-oc-day" aria-live="polite"></div>';
    mount.insertBefore(box, btn);
    var gridEl = box.querySelector('.vlp-oc-grid'), moEl = box.querySelector('.vlp-oc-mo'), dayEl = box.querySelector('.vlp-oc-day');
    box.querySelectorAll('[data-m]').forEach(function (b) {
      b.addEventListener('click', function () { var mm = addMonths(month, +b.getAttribute('data-m')); if (mm < minMonth || mm > maxMonth) return; month = mm; sel = ''; load(); });
    });

    function slotsOn(d) {
      if (!cur) return [];
      return ((cur.days || {})[d] || []).filter(function (s) {
        if (s.s != null && s.s < guests) return false;
        return true;
      });
    }
    function tsdb() { return info && info.book && info.book.co === 'thehooklapaz' && /whale|tiburon/.test(SLUG); }

    function load() {
      var ym = month, from = ym === minMonth ? today : ym + '-01', to = monthEnd(ym);
      drawGrid(true);
      dayEl.innerHTML = '<div class="vlp-oc-spin">' + esc(T.loading) + '</div>';
      var got = cache[ym] ? Promise.resolve(cache[ym]) : fetch(API + '/days?o=' + SLUG + '&from=' + from + '&to=' + to, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); });
      got.then(function (j) {
        if (!j || !j.ok || !j.live) throw new Error((j && j.error) || 'not live');
        cache[ym] = j; info = j;
        if (month !== ym) return;
        cur = j;
        if (!shown) { shown = true; box.hidden = false; btn.hidden = true; btn.style.display = 'none'; track('offer_calendar_view', { offer_slug: SLUG }); }
        if (!sel || sel.slice(0, 7) !== ym || !slotsOn(sel).length) {
          var keep = sel && sel.slice(0, 7) === ym ? sel : '';
          sel = '';
          for (var d = from; d <= to; d = addDays(d, 1)) if (slotsOn(d).length) { sel = d; break; }
          if (keep && !sel) sel = keep;
        }
        draw();
      }).catch(function () {
        if (!shown) { box.remove(); return; } // first load failed: the normal Book now button stays
        cur = null; drawGrid(false);
        dayEl.innerHTML = '<p class="vlp-oc-m">' + esc(T.noneMonth) + '</p>';
      });
    }

    function draw() { drawGrid(false); drawDay(); }

    function drawGrid(loading) {
      moEl.textContent = cap1(fmt(month + '-15', { month: 'long', year: 'numeric' }));
      box.querySelector('[data-m="-1"]').disabled = month <= minMonth;
      box.querySelector('[data-m="1"]').disabled = month >= maxMonth;
      var first = month + '-01', last = monthEnd(month), lead = new Date(first + 'T12:00:00Z').getUTCDay(), h = '';
      for (var i = 0; i < 7; i++) h += '<span class="vlp-oc-wd" aria-hidden="true">' + esc(fmt(addDays('2026-11-01', i), { weekday: 'short' }).replace('.', '').slice(0, 2)) + '</span>';
      for (i = 0; i < lead; i++) h += '<span></span>';
      for (var d = first; d <= last; d = addDays(d, 1)) {
        var n = +d.slice(8, 10), open = !loading && d >= today && slotsOn(d).length > 0;
        var cls = open ? (d === sel ? 'open sel' : 'open') : '';
        h += '<button type="button" class="vlp-oc-c ' + cls + '"' + (open ? ' data-d="' + d + '"' : ' disabled') + (d === sel ? ' aria-pressed="true"' : '') +
          ' aria-label="' + esc(fmt(d, { weekday: 'long', month: 'long', day: 'numeric' }) + (open ? ': ' + T.open : '')) + '">' + n + '</button>';
      }
      gridEl.innerHTML = h;
      gridEl.querySelectorAll('[data-d]').forEach(function (b) {
        b.addEventListener('click', function () {
          sel = b.getAttribute('data-d'); draw();
          track('offer_calendar_date', { offer_slug: SLUG, trip_date: sel });
        });
      });
    }

    function bookHref(s) {
      var b = info.book, p = new URLSearchParams();
      if (b.flow) p.set('flow', b.flow);
      if (b.schedule) p.set('schedule-uuid', b.schedule);
      p.set('asn', 'vamosalapaz-mxn'); p.set('asn-ref', 'vamosalapaz-mxn'); p.set('ref', b.ref); p.set('full-items', 'yes');
      return 'https://fareharbor.com/embeds/book/' + b.co + '/items/' + b.item + '/availability/' + s.id + '/book/?' + p.toString();
    }

    function drawDay() {
      if (!cur) return;
      var h = '';
      var slots = sel ? slotsOn(sel) : [];
      if (!sel || !slots.length) {
        var nxt = '';
        for (var d = month === minMonth ? today : month + '-01'; d <= monthEnd(month); d = addDays(d, 1)) if (slotsOn(d).length) { nxt = d; break; }
        h += '<p class="vlp-oc-m">' + esc(sel ? T.none : T.noneMonth) + '</p>';
        if (nxt && nxt !== sel) h += '<p class="vlp-oc-m">' + esc(T.nextOpen) + ' <button type="button" class="vlp-oc-l" data-go="' + nxt + '">' + esc(fmt(nxt, { weekday: 'short', month: 'short', day: 'numeric' })) + '</button></p>';
        else if (!nxt && month < maxMonth) h += '<button type="button" class="vlp-oc-l" data-nm="1">' + esc(T.tryNext) + '</button>';
      } else {
        var unit = /person|persona/i.test(info.unit || '') ? T.perPerson : info.unit ? T.perGroup : '';
        h += '<div class="vlp-oc-dh">' + esc(cap1(fmt(sel, { weekday: 'long', month: 'long', day: 'numeric' }))) + '</div>';
        if (info.price) h += '<div class="vlp-oc-pr"><b>' + esc(info.price) + '</b> ' + esc(unit) + ' · ' + esc(T.priceNote) + '</div>';
        if (tsdb()) h += '<p class="vlp-oc-m">' + esc(T.tsdb) + '</p>';
        h += '<div class="vlp-oc-btns">' + (tsdb() ? slots.slice(0, 1) : slots).map(function (s, i) {
          var label = tsdb() ? T.book : T.bookAt(fmtTime(s.t));
          var extra = !tsdb() && info.type === 'shared' && s.s != null && s.s <= 5 ? '<small>· ' + esc(T.left(s.s)) + '</small>' : '';
          return '<a class="vlp-oc-book" data-i="' + i + '" href="' + esc(bookHref(s)) + '">' + esc(label) + extra + '</a>';
        }).join('') + '</div>';
      }
      dayEl.innerHTML = h;
      dayEl.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { sel = b.getAttribute('data-go'); draw(); }); });
      dayEl.querySelectorAll('[data-nm]').forEach(function (b) { b.addEventListener('click', function () { month = addMonths(month, 1); sel = ''; load(); }); });
      dayEl.querySelectorAll('.vlp-oc-book').forEach(function (a) {
        a.addEventListener('click', function () {
          var s = slots[+a.getAttribute('data-i')];
          var u = API + '/go?o=' + SLUG + '&d=' + sel + '&t=' + s.t + '&src=web';
          try { if (!(navigator.sendBeacon && navigator.sendBeacon(u))) fetch(u, { method: 'POST', mode: 'no-cors', keepalive: true }); } catch (e) {}
          track('offer_calendar_book', { offer_slug: SLUG, trip_date: sel, departure: s.t });
        });
      });
    }

    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
