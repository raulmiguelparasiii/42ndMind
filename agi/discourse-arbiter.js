'use strict';

// Zero-state expression arbiter. It owns no memory, truth, intent, or semantic
// dictionary. It compares learned surface structures already retained in M and,
// when a multi-relation discourse form is the better structural match, renders
// only facts that are uniquely current in canonical M.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }

function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}
function episodes(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    if (typeof f.subject !== 'string' || !f.subject.startsWith('sequence-contact:')) continue;
    if (!groups.has(f.subject)) groups.set(f.subject, { id: f.subject, channels: new Map(), relations: [] });
    const e = groups.get(f.subject);
    if (f.relation === 'ρ:input_tokens' && Array.isArray(f.object)) e.input_tokens = f.object.slice();
    else if (f.relation === 'ρ:output_tokens' && Array.isArray(f.object)) e.output_tokens = f.object.slice();
    else if (f.relation === 'ρ:contact_channel' && f.object && Number.isInteger(f.object.index)) e.channels.set(f.object.index, f.object.value);
    else if (f.relation === 'ρ:contact_relation' && f.object && typeof f.object === 'object' &&
      Object.prototype.hasOwnProperty.call(f.object, 'subject') && Object.prototype.hasOwnProperty.call(f.object, 'relation') && Object.prototype.hasOwnProperty.call(f.object, 'object')) {
      e.relations.push({ ...f.object });
    } else if (f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object' &&
      Object.prototype.hasOwnProperty.call(f.object, 'subject') && Object.prototype.hasOwnProperty.call(f.object, 'relation') && Object.prototype.hasOwnProperty.call(f.object, 'object')) {
      e.relations.push({ ...f.object, source: 'proposal', order: Number.MAX_SAFE_INTEGER });
    }
  }
  for (const e of groups.values()) e.relations.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  return [...groups.values()].sort((a, b) => episodeNumber(a.id) - episodeNumber(b.id));
}

function setJaccard(a, b) {
  const A = new Set((a || []).map(stable)), B = new Set((b || []).map(stable));
  if (!A.size && !B.size) return 1;
  let intersection = 0;
  for (const x of A) if (B.has(x)) intersection++;
  return intersection / Math.max(1, A.size + B.size - intersection);
}
function bigrams(tokens) {
  const out = [];
  for (let i = 0; i + 1 < (tokens || []).length; i++) out.push([tokens[i], tokens[i + 1]]);
  return out;
}
function similarity(a, b) {
  const A = Surface.compactTokens(a || []), B = Surface.compactTokens(b || []);
  return 0.65 * setJaccard(A, B) + 0.35 * setJaccard(bigrams(A), bigrams(B));
}

function contactRelations(e) {
  return (e.relations || []).filter(r => r.source === 'simultaneous_relational_contact');
}
function signature(e) { return unique(contactRelations(e).map(r => r.relation)); }
function subjects(e) { return unique((e.relations || []).map(r => r.subject)); }

function projectedEpisode(e, sig) {
  const rels = contactRelations(e);
  const ss = unique(rels.map(r => r.subject));
  if (ss.length !== 1) return null;
  const channels = new Map([[0, ss[0]]]);
  for (let i = 0; i < sig.length; i++) {
    const values = unique(rels.filter(r => same(r.relation, sig[i])).map(r => r.object));
    if (values.length !== 1) return null;
    channels.set(i + 1, values[0]);
  }
  return { ...e, channels };
}

function bestDiscourse(es, inputTokens) {
  const candidates = es
    .filter(e => Array.isArray(e.input_tokens) && Array.isArray(e.output_tokens) && signature(e).length >= 2)
    .map(e => ({ e, signature: signature(e), score: similarity(inputTokens, e.input_tokens) }))
    .sort((a, b) => b.score - a.score || episodeNumber(b.e.id) - episodeNumber(a.e.id));
  if (!candidates.length) return null;
  const best = candidates[0].score;
  const near = candidates.filter(x => x.score >= Math.max(0.12, best - 0.15));
  const groups = new Map();
  for (const x of near) {
    const key = stable(x.signature);
    if (!groups.has(key)) groups.set(key, { signature: x.signature, rows: [] });
    groups.get(key).rows.push(x);
  }
  const ranked = [...groups.values()].map(g => ({
    ...g,
    support: g.rows.length,
    subject_diversity: unique(g.rows.flatMap(x => subjects(x.e))).length,
    score: g.rows.reduce((sum, x) => sum + x.score, 0) / g.rows.length,
  })).filter(g => g.support >= 2 && g.subject_diversity >= 2)
    .sort((a, b) => b.score - a.score || b.support - a.support || stable(a.signature).localeCompare(stable(b.signature)));
  if (!ranked.length) return null;
  const chosen = ranked[0];
  const projected = chosen.rows.map(x => projectedEpisode(x.e, chosen.signature)).filter(Boolean);
  return projected.length >= 2 ? { ...chosen, episodes: projected } : null;
}

function bestSpecificScore(es, inputTokens, relation) {
  if (relation === undefined) return -Infinity;
  let best = -Infinity;
  for (const e of es) {
    if (!Array.isArray(e.input_tokens) || !Array.isArray(e.output_tokens)) continue;
    if (!e.channels.has(1) || !same(e.channels.get(1), relation)) continue;
    best = Math.max(best, similarity(inputTokens, e.input_tokens));
  }
  return best;
}

function phraseAppears(queryTokens, phrase) {
  const q = Surface.compactTokens(queryTokens || []), p = Surface.compactTokens(phrase || []);
  if (!p.length || p.length > q.length) return false;
  outer: for (let i = 0; i + p.length <= q.length; i++) {
    for (let j = 0; j < p.length; j++) if (!same(q[i + j], p[j])) continue outer;
    return true;
  }
  return false;
}
function subjectFromQuery(state, es, seq) {
  const grounded = seq.canonical_grounding?.subject;
  if (grounded !== undefined) return grounded;

  // First use M-owned exact expression attachments. This is not a dictionary:
  // the attachment is retained contact learned during this individual's life.
  const attached = [];
  for (const f of state.knowledge?.facts || []) {
    if (f.relation !== 'ρ:surface_expression' || !f.object || !Array.isArray(f.object.tokens)) continue;
    if (phraseAppears(seq.input_tokens, f.object.tokens)) attached.push(f.subject);
  }
  const attachedUnique = unique(attached);
  if (attachedUnique.length === 1) return attachedUnique[0];

  // Otherwise use recurrent episode framing: a query token that has repeatedly
  // occurred in episodes about exactly one subject can identify that subject.
  const candidates = [];
  for (const token of unique(seq.input_tokens || [])) {
    const matching = es.filter(e => (e.input_tokens || []).includes(token) && subjects(e).length === 1);
    if (matching.length < 2) continue;
    const values = unique(matching.map(e => subjects(e)[0]));
    if (values.length === 1) candidates.push(values[0]);
  }
  const values = unique(candidates);
  return values.length === 1 ? values[0] : undefined;
}

function currentObjects(state, subject, relation) {
  return unique((state.knowledge?.current?.facts || [])
    .filter(f => same(f.subject, subject) && same(f.relation, relation))
    .map(f => f.object));
}
function attachedPhrase(state, value) {
  const rows = (state.knowledge?.facts || [])
    .filter(f => same(f.subject, value) && f.relation === 'ρ:surface_expression' && f.object && Array.isArray(f.object.tokens))
    .sort((a, b) => episodeNumber(a.object.source_episode) - episodeNumber(b.object.source_episode));
  if (!rows.length) return undefined;
  const variants = unique(rows.map(f => f.object.tokens));
  return variants.length === 1 ? variants[0] : rows.at(-1).object.tokens;
}

function arbitrate(state) {
  const seq = state?.current?.sequence;
  if (!seq || !Array.isArray(seq.input_tokens)) return false;
  const es = episodes(state);
  const learned = bestDiscourse(es, seq.input_tokens);
  if (!learned) return false;

  const relation = seq.canonical_grounding && !seq.discourse_composition ? seq.canonical_grounding.relation : undefined;
  const specificScore = bestSpecificScore(es, seq.input_tokens, relation);

  // A broad learned structure must actually fit the whole input better than the
  // already selected specific-relation form. Ties stay with the narrower answer.
  if (relation !== undefined && !(learned.score > specificScore + 1e-12)) return false;

  const subject = subjectFromQuery(state, es, seq);
  if (subject === undefined) return false;
  const channels = new Map([[0, subject]]), grounding = [];
  for (let i = 0; i < learned.signature.length; i++) {
    const relationId = learned.signature[i];
    const objects = currentObjects(state, subject, relationId);
    if (objects.length !== 1) return false;
    channels.set(i + 1, objects[0]);
    grounding.push({ relation: relationId, object: objects[0] });
  }

  const template = Surface.buildTemplate(learned.episodes.map(e => e.output_tokens));
  if (!template) return false;
  const roles = Surface.inferOutputRoles(learned.episodes, template);
  const filled = Surface.fillTemplate(
    template,
    learned.episodes,
    learned.episodes,
    channels,
    roles,
    (_channel, value) => attachedPhrase(state, value),
  );
  if (!filled.tokens || filled.unresolved.length) return false;

  seq.output_template = template;
  seq.output_roles = roles;
  seq.output_tokens = filled.tokens;
  seq.unresolved_output_positions = [];
  seq.expression = Surface.renderTokens(filled.tokens);
  seq.discourse_composition = true;
  seq.discourse_signature = learned.signature.slice();
  seq.canonical_grounding = {
    subject,
    relations: grounding,
    source: 'M.knowledge.current.facts',
    authority: 'canonical_M',
    status: 'grounded_discourse',
  };
  return true;
}

module.exports = { arbitrate };
