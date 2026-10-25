'use strict';

// Persistent event-driven host for one developing M.
//
// This file is transport + durability only. It owns no cognition, scheduler,
// semantic store, planner, clock, or shadow memory. A reality contact reaches
// the same live composition used by direct inspection, settles synchronously
// into the canonical M, M is saved atomically, and the process returns to the OS
// event loop until reality changes.

const fsp = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Mind = require('./live-mind.js');

const cloudPort = process.env.PORT === undefined ? 4242 : Number(process.env.PORT);
const host = process.env.MIND_HOST || (process.env.RAILWAY_ENVIRONMENT_ID ? '0.0.0.0' : '127.0.0.1');
const port = integerEnv('MIND_PORT', cloudPort, 1, 65535);
const statePath = path.resolve(process.env.MIND_STATE_PATH || path.join(os.homedir(), '.42ndmind', 'live-M.json'));
const actionCount = integerEnv('MIND_ACTIONS', 1, 1, 1024);
const concernCount = integerEnv('MIND_CONCERNS', 1, 0, 1024);
const maxBodyBytes = integerEnv('MIND_MAX_BODY_BYTES', 64 * 1024 * 1024, 1024, 1024 * 1024 * 1024);
const token = process.env.MIND_TOKEN || '';

if (!isLoopback(host) && !token) throw new Error('MIND_TOKEN is required when MIND_HOST is not loopback');

let M = null;
let serial = Promise.resolve();
let closing = false;

function integerEnv(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${name} must be an integer in [${min}, ${max}]`);
  return value;
}
function isLoopback(value) { return value === '127.0.0.1' || value === '::1' || value === 'localhost'; }
function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': data.length,
    'cache-control': 'no-store',
  });
  res.end(data);
}
function text(res, status, body, type = 'text/plain; charset=utf-8') {
  const data = Buffer.from(body);
  res.writeHead(status, {
    'content-type': type,
    'content-length': data.length,
    'cache-control': 'no-store',
  });
  res.end(data);
}
function authorized(req) {
  if (!token) return true;
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error(`request exceeds ${maxBodyBytes} bytes`);
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function view(state, includeState = false) {
  const result = {
    whole: state?.whole,
    facts: state?.knowledge?.facts?.length || 0,
    rules: state?.knowledge?.rules?.length || 0,
    episodes: state?.knowledge?.episodes?.length || state?.experiences?.length || 0,
    motor: state?.motor,
    current: state?.current ?? null,
  };
  if (includeState) result.M = state;
  return result;
}

async function loadOrBirth() {
  await fsp.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
  try {
    const raw = await fsp.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.whole !== 1) throw new Error('saved state is not one whole M');
    if (parsed.action_count !== actionCount || parsed.concern_count !== concernCount)
      throw new Error('saved M is incompatible with configured actuator/concern interface');
    M = parsed;
    return { born: false };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    M = Mind.one(actionCount, concernCount);
    await saveAtomic();
    return { born: true };
  }
}

async function saveAtomic() {
  const directory = path.dirname(statePath);
  const tempPath = path.join(directory, `.${path.basename(statePath)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  const bytes = Buffer.from(JSON.stringify(M));
  let handle;
  try {
    handle = await fsp.open(tempPath, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await fsp.rename(tempPath, statePath);
    try {
      const dir = await fsp.open(directory, 'r');
      await dir.sync();
      await dir.close();
    } catch (_) {
      // Atomic rename remains the durability boundary where directory fsync is unavailable.
    }
  } finally {
    if (handle) await handle.close().catch(() => {});
    await fsp.unlink(tempPath).catch(() => {});
  }
}

function transact(contact) {
  const operation = serial.then(async () => {
    if (closing) throw new Error('live individual is shutting down');
    if (contact === undefined || contact === null) throw new Error('reality contact is required');
    Mind.C(M, contact);
    await saveAtomic();
    return view(M, false);
  });
  serial = operation.catch(() => {});
  return operation;
}

const page = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>42ndMind live individual</title>
<style>
  body{font:16px system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 18px;line-height:1.45}
  textarea,input,button{font:inherit} textarea{width:100%;min-height:160px;box-sizing:border-box;padding:12px}
  input{width:100%;box-sizing:border-box;padding:8px;margin:4px 0 12px} button{padding:9px 16px}
  pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f5f5;padding:12px;border-radius:8px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.muted{opacity:.7}
</style>
<h1>42ndMind live individual</h1>
<p class="muted">One persistent M. No tick loop. Sending input is reality contact; otherwise the process is quiescent.</p>
<div class="row"><label>Source (optional)<input id="source" placeholder="conversation, book title, sensor name"></label><label>Bearer token (only if configured)<input id="token" type="password"></label></div>
<textarea id="input" placeholder="Talk to the same individual, paste prose, or supply a reality-contact as JSON below."></textarea><p><button id="say">Send surface contact</button> <button id="snapshot">Inspect current view</button></p>
<details><summary>Raw JSON reality contact</summary><textarea id="contact" placeholder='{"surface":{"input":"..."}}'></textarea><p><button id="sendContact">Send JSON contact</button></p></details>
<pre id="out">ready</pre>
<script>
const out=document.querySelector('#out');
function headers(type='application/json'){const h={'content-type':type};const t=document.querySelector('#token').value;if(t)h.authorization='Bearer '+t;return h}
async function show(r){const txt=await r.text();out.textContent=txt;if(!r.ok)throw new Error(txt)}
document.querySelector('#say').onclick=async()=>{try{const text=document.querySelector('#input').value;const source=document.querySelector('#source').value;await show(await fetch('/say',{method:'POST',headers:headers(),body:JSON.stringify({text,source:source||undefined})}))}catch(e){out.textContent=String(e)}};
document.querySelector('#sendContact').onclick=async()=>{try{await show(await fetch('/contact',{method:'POST',headers:headers(),body:document.querySelector('#contact').value}))}catch(e){out.textContent=String(e)}};
document.querySelector('#snapshot').onclick=async()=>{try{await show(await fetch('/state',{headers:headers()}))}catch(e){out.textContent=String(e)}};
</script>`;

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/') return text(res, 200, page, 'text/html; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { alive: true, whole: M?.whole });
    if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });

    if (req.method === 'GET' && url.pathname === '/state')
      return json(res, 200, view(M, url.searchParams.get('full') === '1'));

    if (req.method === 'POST' && url.pathname === '/contact') {
      const raw = await body(req);
      return json(res, 200, await transact(JSON.parse(raw.toString('utf8'))));
    }

    if (req.method === 'POST' && url.pathname === '/say') {
      const raw = await body(req);
      let textInput;
      let source;
      const contentType = String(req.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const parsed = JSON.parse(raw.toString('utf8'));
        textInput = parsed?.text;
        source = parsed?.source;
      } else {
        textInput = raw.toString('utf8');
        source = req.headers['x-source'];
      }
      if (typeof textInput !== 'string' || !textInput.length) return json(res, 400, { error: 'text is required' });
      // /say is transport that is physically directed at this individual. Source
      // remains unknown unless supplied; target does not.
      const surface = { input: textInput, target: 'self' };
      if (source !== undefined && source !== null && String(source).length) surface.source = String(source);
      return json(res, 200, await transact({ surface }));
    }

    return json(res, 404, { error: 'not found' });
  } catch (error) {
    return json(res, error.statusCode || 400, { error: error.message });
  }
});

async function shutdown(signal) {
  if (closing) return;
  closing = true;
  server.close();
  await serial.catch(() => {});
  await saveAtomic().catch(error => console.error('final save failed:', error));
  console.log(`42ndMind live individual stopped (${signal})`);
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('uncaughtException', error => { console.error(error); void shutdown('uncaughtException'); });
process.on('unhandledRejection', error => { console.error(error); void shutdown('unhandledRejection'); });

(async () => {
  const { born } = await loadOrBirth();
  server.listen(port, host, () => {
    console.log(JSON.stringify({ live: true, born, whole: M.whole, host, port, state_path: statePath, tick_loop: false, scheduler: false }));
  });
})().catch(error => {
  console.error(error);
  process.exit(1);
});
