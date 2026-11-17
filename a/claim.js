/* Soko World · gift claims (mock data layer)
 *
 * This file stands in for the Soko backoffice. Every function here maps 1:1 to a backend
 * endpoint the tech team will build. In this mockup the data lives in the browser
 * (localStorage) and travels inside the QR link, so the pages work across phones
 * without a server. Swap the bodies of these functions for fetch() calls and nothing
 * else in the pages changes.
 *
 * Backoffice tables (proposed)
 *   venues  id, name, area, market, redeem_pin
 *   gifts   id, venue_id (null = any venue), title{pt,br,es,en}, stock_total, stock_day,
 *           valid_days, active
 *   claims  code, gift_id, venue_id, phone_e164, market, lang, status, created_at,
 *           unlocked_at, expires_at, redeemed_at, redeemed_by_venue
 *   status: locked -> unlocked -> redeemed | expired | cancelled
 *
 * Endpoints (proposed)
 *   POST /api/v1/gifts/claims            lock()      body {gift, venue, phone}  -> claim (locked)
 *   (signup hook)                        unlock()    backend: on signup, phone match -> unlocked
 *   GET  /api/v1/gifts/claims/{code}     get()       -> claim + gift + venue
 *   POST /api/v1/gifts/claims/{code}/redeem  redeem() header X-Venue-Pin  -> claim (redeemed)
 *   POST /api/v1/venues/{id}/pin-check   checkPin()
 *   GET  /api/v1/venues/{id}/redemptions stats()
 *   Backoffice CRUD: gifts, venues, claims (list, cancel, manual issue)
 */
(function () {
  const LS = 'sw_bo_v1';
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  const PREFIX = { lis: '+351', cdmx: '+52', br: '+55' };
  const LANG = { lis: 'pt', cdmx: 'es', br: 'br' };
  const SALT = 'soko-world-demo'; // demo integrity check only, not security
  const now = () => Date.now();
  const DAY = 864e5;

  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'venue';

  function load() {
    try { const d = JSON.parse(localStorage.getItem(LS)); if (d && d.v === 1) return d; } catch (e) {}
    return seed();
  }
  function save(d) { try { localStorage.setItem(LS, JSON.stringify(d)); } catch (e) {} }
  function seed() {
    const d = { v: 1, venues: {}, gifts: {}, claims: {}, log: [] };
    [['prisma-estudio-lisboa', 'Prisma Estúdio Lisboa', 'Santa Maria Maior', 'lis'],
     ['bento-pizzeria-napoletana', 'Bento Pizzeria Napoletana', 'Tijuca', 'br'],
     ['cafe-de-la-esquina', 'Café de la Esquina', 'Roma Norte', 'cdmx']]
      .forEach(([id, name, area, m]) => { d.venues[id] = { id, name, area, market: m, redeem_pin: '1234' }; });
    d.gifts['G-MINI'] = { id: 'G-MINI', venue_id: null, title: { pt: 'Uma mini por conta da casa', br: 'Um chope por conta da casa', es: 'Una cerveza por cuenta de la casa', en: 'A drink on the house' }, stock_total: 500, stock_day: 50, valid_days: 7, active: true, issued: 0 };
    save(d); return d;
  }

  function code() {
    const b = new Uint8Array(6); crypto.getRandomValues(b);
    return 'SW-' + Array.from(b, x => ALPH[x % ALPH.length]).join('');
  }
  function e164(market, raw, prefix) {
    const p = prefix || PREFIX[market] || '+351'; let dg = String(raw || '').replace(/\D/g, '');
    const pd = p.slice(1); if (dg.startsWith(pd) && dg.length > pd.length + 7) dg = dg.slice(pd.length);
    return { ok: dg.length >= 8 && dg.length <= 12, full: p + dg, prefix: p, local: dg };
  }
  function mask(full) {
    const m = String(full).match(/^(\+\d{2,3})(\d+)$/); if (!m) return full;
    const d = m[2]; return m[1] + ' ' + d.slice(0, 3) + ' *** ' + d.slice(-3);
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const b64e = o => { const j = JSON.stringify(o); return btoa(unescape(encodeURIComponent(j))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const b64d = s => JSON.parse(decodeURIComponent(escape(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')))));

  /* The link payload carries only what the venue screen shows. Phone travels masked. */
  function pack(c) {
    const o = { c: c.code, g: c.gift_title, gid: c.gift_id, v: c.venue_id, vn: c.venue_name, va: c.venue_area, m: c.market, l: c.lang,
      p: c.phone_masked || mask(c.phone_e164 || ''), s: c.status, t: c.created_at, u: c.unlocked_at || 0, x: c.expires_at || 0 };
    o.h = hash(SALT + JSON.stringify(o)); return b64e(o);
  }
  function unpack(s) {
    try { const o = b64d(s); const h = o.h; delete o.h; if (hash(SALT + JSON.stringify(o)) !== h) return null; return o; } catch (e) { return null; }
  }

  function ensureVenue(d, name, area, market) {
    const id = slug(name);
    if (!d.venues[id]) d.venues[id] = { id, name, area: area || '', market, redeem_pin: '1234' };
    return d.venues[id];
  }

  const API = {
    PREFIX, LANG, mask, e164, slug, pack, unpack,
    db: load,
    /* POST /api/v1/gifts/claims */
    lock({ phone, prefix, market, lang, gift_title, gift_id, venue_name, venue_area }) {
      const d = load(); const ph = e164(market, phone, prefix);
      if (!ph.ok) return { error: 'phone' };
      const v = ensureVenue(d, venue_name, venue_area, market);
      const dup = Object.values(d.claims).find(c => c.phone_e164 === ph.full && c.venue_id === v.id && c.status !== 'cancelled');
      if (dup) return { error: 'duplicate', claim: dup };
      const g = d.gifts[gift_id || 'G-MINI'];
      if (g && (!g.active || g.issued >= g.stock_total)) return { error: 'stock' };
      const c = { code: code(), gift_id: gift_id || 'G-MINI', gift_title, venue_id: v.id, venue_name: v.name, venue_area: v.area,
        phone_e164: ph.full, market, lang, status: 'locked', created_at: now(), unlocked_at: 0, expires_at: 0, redeemed_at: 0, redeemed_by_venue: null };
      d.claims[c.code] = c; if (g) g.issued++; save(d); return { claim: c };
    },
    /* Backend signup hook: user signs up with the same phone -> unlocked. Demo: called by hand. */
    unlock(codeOrClaim) {
      const d = load(); const c = d.claims[codeOrClaim.code || codeOrClaim] || codeOrClaim;
      if (!c || c.status !== 'locked') return c;
      const g = d.gifts[c.gift_id]; c.status = 'unlocked'; c.unlocked_at = now(); c.expires_at = now() + ((g && g.valid_days) || 7) * DAY;
      d.claims[c.code] = c; save(d); return c;
    },
    cancel(code) { const d = load(); const c = d.claims[code]; if (c) { c.status = 'cancelled'; save(d); } return c; },
    /* GET /api/v1/gifts/claims/{code}: in the mockup the link payload is the source, overlaid by anything this browser knows */
    get(payloadOrCode) {
      const d = load();
      if (d.claims[payloadOrCode]) return { claim: d.claims[payloadOrCode], src: 'db' };
      const o = unpack(payloadOrCode); if (!o) return { error: 'invalid' };
      const local = d.claims[o.c];
      const claim = local || { code: o.c, gift_title: o.g, gift_id: o.gid, venue_id: o.v, venue_name: o.vn, venue_area: o.va, market: o.m, lang: o.l,
        phone_masked: o.p, status: o.s, created_at: o.t, unlocked_at: o.u, expires_at: o.x, redeemed_at: 0 };
      const red = d.log.find(r => r.code === o.c); if (red && claim.status !== 'redeemed') { claim.status = 'redeemed'; claim.redeemed_at = red.at; claim.redeemed_by_venue = red.venue_id; }
      return { claim, src: local ? 'db' : 'link' };
    },
    /* Status as the venue sees it */
    check(claim, venueId) {
      if (!claim) return 'invalid';
      if (claim.status === 'cancelled') return 'cancelled';
      if (claim.status === 'redeemed') return 'used';
      if (claim.status === 'locked') return 'locked';
      if (claim.expires_at && now() > claim.expires_at) return 'expired';
      if (venueId && claim.venue_id !== venueId) return 'wrong_venue';
      return 'valid';
    },
    checkPin(venueId, pin, hint) {
      const d = load(); let v = d.venues[venueId];
      if (!v && hint) { v = ensureVenue(d, hint.name, hint.area, hint.market); save(d); }
      return !!v && String(pin) === String(v.redeem_pin);
    },
    /* POST /api/v1/gifts/claims/{code}/redeem */
    redeem(claim, venueId) {
      const st = API.check(claim, venueId); if (st !== 'valid') return { error: st };
      const d = load(); const at = now();
      const c = d.claims[claim.code] || Object.assign({}, claim);
      c.status = 'redeemed'; c.redeemed_at = at; c.redeemed_by_venue = venueId; d.claims[c.code] = c;
      d.log.unshift({ code: c.code, venue_id: venueId, at, gift_title: c.gift_title, phone: c.phone_masked || mask(c.phone_e164 || '') });
      save(d); return { claim: c };
    },
    stats(venueId) {
      const d = load(); const t = new Date(); const wk = new Date(t); wk.setHours(0, 0, 0, 0); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
      const mo = new Date(t.getFullYear(), t.getMonth(), 1).getTime();
      const L = d.log.filter(r => r.venue_id === venueId);
      return { week: L.filter(r => r.at >= wk.getTime()).length, month: L.filter(r => r.at >= mo).length, recent: L.slice(0, 5) };
    },
    saveGift(g) { const d = load(); d.gifts[g.id] = Object.assign({ issued: 0 }, d.gifts[g.id] || {}, g); save(d); return d.gifts[g.id]; },
    saveVenue(v) { const d = load(); d.venues[v.id] = Object.assign({}, d.venues[v.id] || {}, v); save(d); return d.venues[v.id]; },
    reset() { try { localStorage.removeItem(LS); } catch (e) {} return seed(); },
    base() { return location.href.replace(/[^/]*([?#].*)?$/, ''); },
    giftUrl(c) { return API.base() + 'gift.html?d=' + pack(c); },
    redeemUrl(c) { return API.base() + 'redeem.html?d=' + pack(c); },
    track(ev, pr) {
      try {
        const qs = new URLSearchParams(location.search);
        const on = location.protocol === 'https:' && /(^|\.)(soko\.fyi|nizar-soko\.github\.io)$/.test(location.hostname) && qs.get('notrack') !== '1';
        const P = Object.assign({ source: 'soko_world', $process_person_profile: false, page: location.pathname.split('/').pop() }, pr || {});
        if (qs.get('phdebug') === '1') { (window.__ph = window.__ph || []).push([ev, P]); return; }
        if (!on) return;
        let id = localStorage.getItem('sw_did'); if (!id) { id = 'sw_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('sw_did', id); }
        const body = JSON.stringify({ api_key: 'phc_6cWleohy95oFDe1A39fpuVwAaGqBGYmq3eKdPPhQIKs', event: ev, distinct_id: id, properties: P });
        navigator.sendBeacon('https://us.i.posthog.com/i/v0/e/', new Blob([body], { type: 'text/plain' }));
      } catch (e) {}
    }
  };
  window.SWGifts = API;
})();
