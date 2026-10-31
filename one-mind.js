'use strict';

// One continuing artificial life.
// Birth: exactly one internal node: the whole itself.
// Everything else must be made from lived contact.

const EPS = 1e-12;

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

function one(actionCount = 2) {
  if (!Number.isInteger(actionCount) || actionCount < 1) throw new Error('actionCount');
  return {
    whole: 1,
    alive: true,
    action_count: actionCount,
    viability: 1,
    need: 0,
    want: 0,
    sense: null,
    action: null,
    previous: null,
    variation: -1,
    nodes: [{ id: 0, parts: [], raw: null, depth: 0 }],
    trace: [],
  };
}

function R(x) {
  if (!x || !Array.isArray(x.sense)) throw new Error('R.sense');
  if (!Number.isFinite(x.viability) || x.viability < 0 || x.viability > 1) throw new Error('R.viability');
  for (const v of x.sense) if (!(v === null || typeof v === 'boolean' || typeof v === 'string' || Number.isFinite(v))) throw new Error('primitive sense only');
  return { sense: x.sense.slice(), viability: x.viability };
}

function internRaw(M, raw) {
  const key = stable(raw);
  let n = M.nodes.find(x => x.raw && stable(x.raw) === key);
  if (n) return n.id;
  n = { id: M.nodes.length, parts: [], raw, depth: 1 };
  M.nodes.push(n);
  return n.id;
}

function nonoverlap(seq, a, b) {
  let n = 0;
  for (let i = 0; i < seq.length - 1;) {
    if (seq[i] === a && seq[i+1] === b) { n++; i += 2; }
    else i++;
  }
  return n;
}

function replacePair(seq, a, b, id) {
  const out = [];
  for (let i = 0; i < seq.length;) {
    if (i + 1 < seq.length && seq[i] === a && seq[i+1] === b) { out.push(id); i += 2; }
    else out.push(seq[i++]);
  }
  return out;
}

function grow(M) {
  // One law of self-construction: recurrent structure may become one reusable
  // internal thing. Created things are eligible immediately, so growth recurses.
  for (;;) {
    const counts = new Map();
    for (let i = 0; i < M.trace.length - 1; i++) {
      const a = M.trace[i], b = M.trace[i+1], k = `${a},${b}`;
      if (!counts.has(k)) counts.set(k, { a, b });
    }
    let best = null;
    for (const p of counts.values()) {
      const occurrences = nonoverlap(M.trace, p.a, p.b);
      const gain = occurrences - 1;
      if (gain <= 0) continue;
      if (!best || gain > best.gain || (gain === best.gain && (p.a < best.a || (p.a === best.a && p.b < best.b)))) best = { ...p, occurrences, gain };
    }
    if (!best) return;

    let n = M.nodes.find(x => x.raw === null && x.parts.length === 2 && x.parts[0] === best.a && x.parts[1] === best.b);
    if (!n) {
      const da = M.nodes[best.a].depth, db = M.nodes[best.b].depth;
      n = { id: M.nodes.length, parts: [best.a, best.b], raw: null, depth: 1 + Math.max(da, db) };
      M.nodes.push(n);
    }
    const next = replacePair(M.trace, best.a, best.b, n.id);
    if (next.length === M.trace.length) return;
    M.trace = next;
  }
}

function livedLeaves(M) {
  return M.nodes.filter(n => n.raw && n.raw.kind === 'lived');
}

function choose(M, sense) {
  const key = stable(sense);
  const stats = Array.from({ length: M.action_count }, () => ({ n: 0, sum: 0 }));
  for (const n of livedLeaves(M)) {
    const x = n.raw;
    if (stable(x.before) !== key) continue;
    stats[x.action].n++;
    stats[x.action].sum += x.delta;
  }
  let best = null;
  const unknown = [];
  for (let a = 0; a < M.action_count; a++) {
    if (!stats[a].n) unknown.push(a);
    else {
      const mean = stats[a].sum / stats[a].n;
      if (mean > EPS && (!best || mean > best.mean)) best = { action: a, mean };
    }
  }
  if (best) return best.action;
  if (unknown.length) {
    M.variation = (M.variation + 1) % M.action_count;
    for (let k = 0; k < M.action_count; k++) {
      const a = (M.variation + k) % M.action_count;
      if (unknown.includes(a)) { M.variation = a; return a; }
    }
  }
  let least = 0, score = -Infinity;
  for (let a = 0; a < M.action_count; a++) {
    const mean = stats[a].sum / stats[a].n;
    if (mean > score) { score = mean; least = a; }
  }
  return least;
}

function C(M, reality) {
  if (!M || M.whole !== 1 || !Array.isArray(M.nodes) || M.nodes[0]?.id !== 0) throw new Error('one M required');
  if (!M.alive) return M;
  const now = R(reality);

  if (M.previous && Number.isInteger(M.action)) {
    const raw = {
      kind: 'lived',
      before: M.previous.sense.slice(),
      action: M.action,
      after: now.sense.slice(),
      delta: Number((now.viability - M.previous.viability).toFixed(12)),
    };
    M.trace.push(internRaw(M, raw));
    grow(M);
  }

  M.sense = now.sense.slice();
  M.viability = now.viability;
  M.need = 1 - now.viability;
  M.want = M.need;
  M.previous = now;

  if (now.viability <= 0) {
    M.alive = false;
    M.action = null;
    return M;
  }
  M.action = M.want > EPS ? choose(M, now.sense) : null;
  return M;
}

module.exports = { one, C };
