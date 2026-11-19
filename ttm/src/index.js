// Soko World · Talk to Me scorer
// POST /gate  {did,pid}            -> {ok, left}   (claims one open-field play for this device)
// POST /score {did,pid,lang,age,who,q,opts:[[text,score]x3],a} -> {k, react} | {fallback:true}
const LANG = {
  en: 'English',
  pt: 'European Portuguese (Portugal, PT-PT: "tu", "estás", never Brazilian forms)',
  br: 'Brazilian Portuguese (PT-BR, casual Rio register: "você", "tá")',
  es: 'Mexican Spanish (ES-MX: "ustedes", Mexican everyday words)',
};
const STYLE = {
  u: 'The player is under 25. Their best moves are bold, playful, spontaneous and generous with the group. Slang is fine.',
  o: 'The player is 25 or older. Their best moves are warm, tactful, curious and quietly witty: grace over noise, good manners, real interest in people. React in a calm, grown-up register, no slang.',
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
const day = () => new Date().toISOString().slice(0, 10);
const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export class Gate {
  constructor(state, env) { this.s = state.storage; this.env = env; }
  async fetch(req) {
    const { op, did, pid, ip } = await req.json();
    const d = day();
    if (op === 'play') {
      const k = 'p:' + did, rec = (await this.s.get(k)) || { n: 0, pids: [] };
      if (rec.pids.includes(pid)) return J({ ok: true, left: +this.env.PLAYS_PER_DEVICE - rec.n });
      if (rec.n >= +this.env.PLAYS_PER_DEVICE) return J({ ok: false, left: 0 });
      rec.n++; rec.pids = [...rec.pids.slice(-9), pid]; await this.s.put(k, rec);
      return J({ ok: true, left: +this.env.PLAYS_PER_DEVICE - rec.n });
    }
    if (op === 'call') {
      const rec = (await this.s.get('p:' + did)) || { pids: [] };
      if (!rec.pids.includes(pid)) return J({ ok: false, why: 'play' });
      const dk = 'd:' + d, ik = 'i:' + d + ':' + ip;
      const [n, ni] = [(await this.s.get(dk)) || 0, (await this.s.get(ik)) || 0];
      if (n >= +this.env.MAX_CALLS_DAY) return J({ ok: false, why: 'cap' });
      if (ni >= +this.env.CALLS_PER_IP_DAY) return J({ ok: false, why: 'ip' });
      await this.s.put(dk, n + 1); await this.s.put(ik, ni + 1);
      return J({ ok: true });
    }
    if (op === 'stats') return J({ day: d, calls: (await this.s.get('d:' + d)) || 0, cap: +this.env.MAX_CALLS_DAY });
    return J({ ok: false }, 400);
  }
}

async function gate(env, body) {
  const stub = env.GATE.get(env.GATE.idFromName('global'));
  return (await stub.fetch('https://gate/', { method: 'POST', body: JSON.stringify(body) })).json();
}

function prompt(b) {
  const opts = b.opts.map((o, i) => `${i}: "${clip(o[0], 90)}" (score ${o[1]})`).join('\n');
  return `You are the scene engine of a short social story game. The player answers a moment in their own words.
Scene speaker: ${clip(b.who, 30)}
Moment: ${clip(b.q, 200)}
Scripted options (higher score = better social move):
${opts}

Pick k = the option whose intent and social effect is closest to the player's answer.
${STYLE[b.age] || STYLE.u}
If the answer is rude to people, hateful, empty or off-topic, pick the lowest-score option.
Then write "react": what ${clip(b.who, 30)} says back to the player, max 10 words, in ${LANG[b.lang] || LANG.en}.
The react must match how good the chosen option is: top score = delighted or charmed, middle = amused, lowest = annoyed, side-eye or teasing. If the player was rude, call it out with dry humour.
Make it specific to what the player said, funny and human, never generic praise. Correct spelling. No em dashes, no emojis, no hashtags. No English words unless the language is English.
Return only JSON: {"k":0,"react":"..."}`;
}

async function score(env, b) {
  const r = await env.AI.run(env.MODEL, {
    messages: [{ role: 'system', content: prompt(b) }, { role: 'user', content: clip(b.a, 140) }],
    max_tokens: 80, temperature: 0.6,
    response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { k: { type: 'integer', enum: [0, 1, 2] }, react: { type: 'string' } }, required: ['k', 'react'] } },
  });
  let o = r.response;
  if (typeof o === 'string') { const m = o.match(/\{[\s\S]*\}/); o = JSON.parse(m ? m[0] : '{}'); }
  o = o || {};
  const k = [0, 1, 2].includes(+o.k) ? +o.k : null;
  if (k === null) throw new Error('bad k');
  return { k, react: clip(o.react, 90).replace(/\s*[—–]\s*/g, ', ') };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/stats') return J(await gate(env, { op: 'stats' }));
    if (req.method !== 'POST') return J({ ok: false }, 404);
    let b; try { b = await req.json(); } catch { return J({ fallback: true }, 400); }
    const did = clip(b.did, 40), pid = clip(b.pid, 40);
    if (!did || !pid) return J({ fallback: true }, 400);
    const ip = req.headers.get('cf-connecting-ip') || '?';
    if (url.pathname === '/gate') return J(await gate(env, { op: 'play', did, pid }));
    if (url.pathname === '/score') {
      if (!Array.isArray(b.opts) || b.opts.length !== 3 || !clip(b.a, 140)) return J({ fallback: true }, 400);
      const g = await gate(env, { op: 'call', did, pid, ip });
      if (!g.ok) return J({ fallback: true, why: g.why });
      try { return J(await score(env, b)); } catch (e) { return J({ fallback: true, why: 'model' }); }
    }
    return J({ ok: false }, 404);
  },
};
