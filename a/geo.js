// Soko World · place lock
// Locks a page (or a game version) to the vicinity of a registered place.
// Use: add ?geo=<placeId> to any page that loads this file, or call SWGeo.require('<placeId>').
// The server holds the place list and decides; this file only asks and shows the result.
(function () {
  const API = 'https://soko-world-ttm.soko-world.workers.dev';
  const qs = new URLSearchParams(location.search);
  const lang = ({ pt: 'pt', br: 'br', 'pt-br': 'br', es: 'es' })[(qs.get('lang') || '').toLowerCase()] || 'en';
  const T = {
    en: { k: 'Only here', ask: 'This game only opens at {n}.', why: 'We check your location once to open it. It is not stored.', go: 'Check where I am', wait: 'Checking…', far: 'You are about {d} from {n}. Come closer and try again.', weak: 'Your location signal is weak. Step outside or near a window and try again.', denied: 'Location access is off. Allow it in your browser settings, then try again.', err: 'Could not check right now. Try again.', unknown: 'This place is not on the map yet.', again: 'Try again', ok: 'You are at {n}. Opening…' },
    pt: { k: 'Só aqui', ask: 'Este jogo só abre no {n}.', why: 'Verificamos a tua localização uma vez para o abrir. Não fica guardada.', go: 'Ver onde estou', wait: 'A verificar…', far: 'Estás a cerca de {d} do {n}. Chega-te mais perto e tenta outra vez.', weak: 'O sinal de localização está fraco. Vai até à rua ou a uma janela e tenta outra vez.', denied: 'O acesso à localização está desligado. Ativa-o nas definições do navegador e tenta outra vez.', err: 'Não deu para verificar agora. Tenta outra vez.', unknown: 'Este sítio ainda não está no mapa.', again: 'Tentar outra vez', ok: 'Estás no {n}. A abrir…' },
    br: { k: 'Só aqui', ask: 'Este jogo só abre no {n}.', why: 'A gente confere sua localização uma vez pra abrir. Ela não fica salva.', go: 'Ver onde estou', wait: 'Conferindo…', far: 'Você está a uns {d} do {n}. Chega mais perto e tenta de novo.', weak: 'O sinal de localização está fraco. Vai pra rua ou perto de uma janela e tenta de novo.', denied: 'O acesso à localização está desligado. Ativa nas configurações do navegador e tenta de novo.', err: 'Não deu pra conferir agora. Tenta de novo.', unknown: 'Este lugar ainda não está no mapa.', again: 'Tentar de novo', ok: 'Você está no {n}. Abrindo…' },
    es: { k: 'Solo aquí', ask: 'Este juego solo abre en {n}.', why: 'Revisamos tu ubicación una vez para abrirlo. No se guarda.', go: 'Ver dónde estoy', wait: 'Revisando…', far: 'Estás a unos {d} de {n}. Acércate e inténtalo otra vez.', weak: 'Tu señal de ubicación está débil. Sal a la calle o acércate a una ventana e inténtalo otra vez.', denied: 'El acceso a la ubicación está apagado. Actívalo en los ajustes del navegador e inténtalo otra vez.', err: 'No se pudo revisar ahora. Inténtalo otra vez.', unknown: 'Este lugar todavía no está en el mapa.', again: 'Intentar otra vez', ok: 'Estás en {n}. Abriendo…' },
  }[lang];
  const did = () => { let d = ''; try { d = localStorage.getItem('sw_did'); } catch (e) {} if (!d) { d = 'd' + Math.random().toString(36).slice(2) + Date.now().toString(36); try { localStorage.setItem('sw_did', d); } catch (e) {} } return d; };
  const fmt = m => m >= 1000 ? (m / 1000).toFixed(1).replace('.', lang === 'en' ? '.' : ',') + ' km' : Math.round(m / 10) * 10 + ' m';
  async function post(path, body) { const c = new AbortController(), t = setTimeout(() => c.abort(), 9000); try { const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: c.signal }); return await r.json(); } catch (e) { return { ok: false, why: 'err' }; } finally { clearTimeout(t); } }
  const fix = () => new Promise(res => { if (!navigator.geolocation) return res({ why: 'denied' }); navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }), e => res({ why: e.code === 1 ? 'denied' : 'weak' }), { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }); });

  // one check, no UI. Resolves {ok, place, pass, dist?, why?}
  async function check(placeId) {
    const test = qs.get('geotest');
    if (test) return post('/geo/check', { did: did(), place: placeId, test });
    const f = await fix(); if (f.why) return { ok: false, why: f.why };
    return post('/geo/check', { did: did(), place: placeId, ...f });
  }

  // full-screen gate. Resolves with the place once the player is there.
  function require(placeId, nameHint) {
    return new Promise(resolve => {
      const el = document.createElement('div'); el.id = 'swgeo';
      el.innerHTML = `<style>#swgeo{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:22px;background:#160407;color:#160407;font-family:"Zalando Sans",system-ui,sans-serif;transition:opacity .5s}
#swgeo .c{width:100%;max-width:360px;background:#f9f0f0;border-radius:28px;padding:28px 24px 22px;text-align:center}
#swgeo .k{font-family:Oswald,sans-serif;letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#764d4d}
#swgeo h1{font-family:"Season Mix",Georgia,serif;font-weight:400;font-size:30px;line-height:1.05;margin:10px 0 12px;letter-spacing:-.02em}
#swgeo p{font-size:14px;line-height:1.35;margin:0;opacity:.75;min-height:38px}#swgeo p.bad{opacity:1;color:#b3261e}
#swgeo button{font:inherit;font-size:18px;font-weight:500;width:100%;margin-top:16px;padding:16px;border:0;border-radius:12px;background:#ffb8cb;color:#160407}#swgeo button:disabled{opacity:.6}
#swgeo .pin{width:46px;height:46px;margin:0 auto 6px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ffb8cb;display:grid;place-items:center}#swgeo .pin i{width:16px;height:16px;border-radius:50%;background:#160407}#swgeo.ok .pin{background:#b0ef8b}</style>
<div class="c"><div class="pin"><i></i></div><div class="k">${T.k}</div><h1></h1><p></p><button></button></div>`;
      const h = el.querySelector('h1'), p = el.querySelector('p'), b = el.querySelector('button');
      let name = nameHint || placeId; const n = s => s.replace('{n}', name);
      h.textContent = n(T.ask); p.textContent = T.why; b.textContent = T.go;
      (document.body || document.documentElement).appendChild(el);
      post('/geo/check', { did: did(), place: placeId, lat: 'x' }).then(r => { if (r && r.place) { name = r.place.name; if (!b.disabled && !el.classList.contains('ok')) h.textContent = n(T.ask); } else if (r && r.why === 'unknown') { p.textContent = T.unknown; p.className = 'bad'; b.style.display = 'none'; } });
      async function run() {
        b.disabled = true; b.textContent = T.wait; p.className = ''; p.textContent = T.why;
        const r = await check(placeId);
        if (r.place) name = r.place.name;
        if (r.ok) { el.classList.add('ok'); h.textContent = n(T.ok); p.textContent = ''; b.style.display = 'none'; window.SW_PLACE = r.place; window.SW_PLACE_PASS = r.pass; setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 500); resolve(r); }, 900); return; }
        p.className = 'bad'; p.textContent = r.why === 'far' ? n(T.far).replace('{d}', fmt(r.dist)) : r.why === 'unknown' ? T.unknown : (T[r.why] || T.err);
        b.disabled = false; b.textContent = T.again;
      }
      b.onclick = run; if (qs.get('geotest')) run();
    });
  }
  window.SWGeo = { check, require, fmt, did };
  // auto mode: ?geo=<placeId> locks whatever page loaded this file
  const auto = qs.get('geo');
  if (auto) { const go = () => { window.SW_GEO_READY = require(auto); }; document.body ? go() : addEventListener('DOMContentLoaded', go); }
})();
