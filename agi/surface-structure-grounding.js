'use strict';

// Zero-state bridge from already-known canonical M facts to previously unseen
// surface constructions. It owns no lexicon, grammar state, parser state, truth,
// or memory. A raw utterance can be aligned only when its independently grounded
// endpoint expressions uniquely identify a fact already current in M. Recurrent
// alignments across diverse bindings are reduced through the same generic surface
// template/role machinery. Transfer to a new binding remains proposal-gated and,
// when recurrent, uses the existing M-owned surface_induction route anatomy.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function ref(id) { return { ref: String(id) }; }
function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : -1;
}
function compact(xs) { return Surface.compactTokens(xs || []); }

function phraseAt(tokens, phrase) {
  const a = compact(tokens), b = compact(phrase);
  if (!b.length || b.length > a.length) return [];
  const hits = [];
  outer: for (let i = 0; i + b.length <= a.length; i++) {
    for (let j = 0; j < b.length; j++) if (!same(a[i + j], b[j])) continue outer;
    hits.push({ start: i, end: i + b.length, tokens: b.slice() });
  }
  return hits;
}

function latestSurfaceEpisode(state) {
  let best = null;
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:input_tokens' || !Array.isArray(fact.object) ||
        typeof fact.subject !== 'string' || !fact.subject.startsWith('sequence-contact:')) continue;
    if (!best || episodeNumber(fact.subject) > episodeNumber(best.id))
      best = { id: fact.subject, input_tokens: fact.object.slice() };
  }
  return best;
}

function currentExpressionMatches(state, inputTokens) {
  const byValue = new Map();
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:surface_expression' || !fact.object || !Array.isArray(fact.object.tokens)) continue;
    const hits = phraseAt(inputTokens, fact.object.tokens);
    if (hits.length !== 1) continue;
    const key = stable(fact.subject);
    if (!byValue.has(key)) byValue.set(key, { value: fact.subject, hits: [] });
    byValue.get(key).hits.push(hits[0]);
  }
  return [...byValue.values()]
    .map(x => ({ ...x, hits: unique(x.hits) }))
    .filter(x => x.hits.length === 1)
    .map(x => ({ value: x.value, span: x.hits[0] }));
}

function knownFactAlignment(state, currentEpisode) {
  if (!currentEpisode || !Array.isArray(currentEpisode.input_tokens)) return null;
  const matches = currentExpressionMatches(state, currentEpisode.input_tokens);
  if (matches.length < 2) return null;
  const matched = new Map(matches.map(x => [stable(x.value), x]));
  const candidates = unique((state.knowledge?.current?.facts || [])
    .filter(f => matched.has(stable(f.subject)) && matched.has(stable(f.object)) && !same(f.subject, f.object))
    .map(f => ({ subject: f.subject, relation: f.relation, object: f.object })));
  if (candidates.length !== 1) return null;

  const triple = candidates[0];
  const subject = matched.get(stable(triple.subject));
  const object = matched.get(stable(triple.object));
  if (!subject || !object) return null;
  return {
    subject: triple.subject,
    relation: triple.relation,
    object: triple.object,
    subject_span: subject.span,
    object_span: object.span,
    source: 'canonical_M_current_fact',
    authority: 'alignment_only',
  };
}

function episodeTokens(state) {
  const map = new Map();
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation === 'ρ:input_tokens' && Array.isArray(fact.object) &&
        typeof fact.subject === 'string' && fact.subject.startsWith('sequence-contact:'))
      map.set(fact.subject, fact.object.slice());
  }
  return map;
}
function alignments(state, currentId) {
  return (state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:surface_known_fact_alignment' && f.subject !== currentId && f.object &&
      Object.prototype.hasOwnProperty.call(f.object, 'subject') &&
      Object.prototype.hasOwnProperty.call(f.object, 'relation') &&
      Object.prototype.hasOwnProperty.call(f.object, 'object'))
    .map(f => ({ episode: f.subject, ...f.object }));
}
function valueForPhrase(state, phrase) {
  const values = unique((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:surface_expression' && f.object && Array.isArray(f.object.tokens) &&
      same(compact(f.object.tokens), compact(phrase)))
    .map(f => f.subject));
  return values.length === 1 ? values[0] : undefined;
}

function inferTriples(state, currentEpisode) {
  if (!currentEpisode || !Array.isArray(currentEpisode.input_tokens)) return [];
  const tokenMap = episodeTokens(state);
  const groups = new Map();
  for (const row of alignments(state, currentEpisode.id)) {
    if (!tokenMap.has(row.episode)) continue;
    const key = stable(row.relation);
    if (!groups.has(key)) groups.set(key, { relation: row.relation, rows: [] });
    groups.get(key).rows.push(row);
  }

  const candidates = [];
  for (const group of groups.values()) {
    const rows = group.rows;
    const subjects = unique(rows.map(x => x.subject));
    const objects = unique(rows.map(x => x.object));
    if (rows.length < 4 || subjects.length < 3 || objects.length < 2) continue;

    const projected = rows.map(row => ({
      id: row.episode,
      output_tokens: compact(tokenMap.get(row.episode)),
      channels: new Map([[0, row.subject], [2, row.object]]),
    }));
    const template = Surface.buildTemplate(projected.map(e => e.output_tokens));
    if (!template) continue;
    const match = Surface.matchTemplate(compact(currentEpisode.input_tokens), template);
    if (!match) continue;
    const roles = Surface.inferOutputRoles(projected, template);
    const subjectRoles = roles.filter(r => r.channel === 0 && match.has(r.slot));
    const objectRoles = roles.filter(r => r.channel === 2 && match.has(r.slot));
    if (subjectRoles.length !== 1 || objectRoles.length !== 1 || subjectRoles[0].slot === objectRoles[0].slot) continue;

    const subject = valueForPhrase(state, match.get(subjectRoles[0].slot));
    const object = valueForPhrase(state, match.get(objectRoles[0].slot));
    if (subject === undefined || object === undefined) continue;
    candidates.push({ subject, relation: group.relation, object });
  }
  return unique(candidates);
}

function proposalRows(state, subject, relation) {
  return (state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:proposes_relation' && f.object &&
      same(f.object.subject, subject) && same(f.object.relation, relation))
    .map(f => ({ episode: String(f.subject), object: f.object.object }))
    .sort((a, b) => episodeNumber(a.episode) - episodeNumber(b.episode));
}
function recurrentObjectWithCurrent(state, episodeId, triple, minEpisodes = 2) {
  const rows = proposalRows(state, triple.subject, triple.relation);
  rows.push({ episode: String(episodeId), object: triple.object });
  const byEpisode = new Map();
  for (const row of rows) byEpisode.set(row.episode, row.object);
  const ordered = [...byEpisode.entries()]
    .map(([episode, object]) => ({ episode, object }))
    .sort((a, b) => episodeNumber(a.episode) - episodeNumber(b.episode));
  let run = 0;
  for (let i = ordered.length - 1; i >= 0 && same(ordered[i].object, triple.object); i--) run++;
  return run >= minEpisodes ? triple.object : undefined;
}
function activeSurfaceRoutes(state, subject, relation) {
  return (state.knowledge?.rules || []).filter(rule => rule.active !== false &&
    rule.provenance?.kind === 'surface_induction' && same(rule.provenance.subject, subject) && same(rule.provenance.relation, relation));
}
function nextSurfaceRouteId(state) {
  let max = 0;
  for (const rule of state.knowledge?.rules || []) {
    const m = /^surface-induction:(\d+)$/.exec(String(rule.id));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `surface-induction:${max + 1}`;
}

function proposalUpdate(state, episodeId, triple) {
  const facts = [
    [episodeId, 'ρ:proposes_relation', triple],
    [episodeId, 'ρ:proposal_provenance', { kind: 'learned_surface_structure', authority: 'proposal_only' }],
  ];
  const selected = recurrentObjectWithCurrent(state, episodeId, triple);
  if (selected === undefined) return { relations: { facts } };

  const active = activeSurfaceRoutes(state, triple.subject, triple.relation);
  if (active.some(rule => same(rule.provenance.object, selected))) return { relations: { facts } };
  for (const rule of active) facts.push([ref(rule.id), 'counterexample', {
    kind: 'later_recurrent_surface_evidence',
    proposal_episode: episodeId,
  }]);
  const routeId = nextSurfaceRouteId(state);
  facts.push(
    [ref(routeId), 'surface_support', 'recurrent'],
    [episodeId, 'ρ:supports', ref(routeId)],
  );
  return { relations: {
    facts,
    rules: [{
      id: routeId,
      premises: [[ref(routeId), 'surface_support', 'recurrent']],
      conclusion: [triple.subject, triple.relation, selected],
      categorical: true,
      provenance: {
        kind: 'surface_induction',
        subject: triple.subject,
        relation: triple.relation,
        object: selected,
        source: 'recurrent_learned_surface_structure',
      },
    }],
  } };
}

function relationalUpdate(state, originalContact) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface ||
      originalContact.relations || Array.isArray(originalContact.surface.channels)) return null;
  const episode = latestSurfaceEpisode(state);
  if (!episode) return null;

  // When the sentence describes a fact M already independently knows, retain only
  // the alignment evidence. It must never create another truth route for that fact.
  const aligned = knownFactAlignment(state, episode);
  if (aligned) return { relations: { facts: [[episode.id, 'ρ:surface_known_fact_alignment', aligned]] } };

  // Otherwise a sufficiently established structural construction may propose a
  // new binding. Ambiguous competing constructions stay unresolved.
  const triples = inferTriples(state, episode);
  if (triples.length !== 1) return null;
  return proposalUpdate(state, episode.id, triples[0]);
}

module.exports = { relationalUpdate, knownFactAlignment, inferTriples };
