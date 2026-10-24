'use strict';

// Zero-state bridge from already-known canonical M facts to previously unseen
// surface constructions. It owns no lexicon, grammar state, parser state, truth,
// or memory. A raw utterance can be aligned only when its independently grounded
// endpoint expressions uniquely identify a fact already current in M. Recurrent
// alignments across diverse bindings are reduced through the same generic surface
// template/role machinery. Transfer to a new binding remains proposal-gated and,
// when recurrent, uses the existing M-owned surface_induction route anatomy.
//
// The surface_structure_index below is acceleration only. It is append-synchronized
// from canonical M facts, versioned, disposable, and completely rebuildable.

const Surface = require('./surface-template.js');

const INDEX_VERSION = 1;

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
function pushMap(map, key, value) {
  if (!Array.isArray(map[key])) map[key] = [];
  map[key].push(value);
}

function emptyIndex(rebuilds = 1) {
  return {
    version: INDEX_VERSION,
    authority: 'zero_authority_rebuildable',
    fact_count: 0,
    rebuilds,
    incremental_syncs: 0,
    latest_episode_id: null,
    episodes: {},
    expressions: [],
    expressions_by_first: {},
    expressions_by_phrase: {},
    expression_attachment_keys: {},
    alignments_by_relation: {},
    proposals_by_key: {},
    proposals_by_episode: {},
    supports_by_episode: {},
  };
}
function validIndex(index, facts) {
  return !!(index && index.version === INDEX_VERSION &&
    index.authority === 'zero_authority_rebuildable' &&
    Number.isInteger(index.fact_count) && index.fact_count >= 0 && index.fact_count <= facts.length &&
    index.episodes && typeof index.episodes === 'object' &&
    Array.isArray(index.expressions) &&
    index.expressions_by_first && typeof index.expressions_by_first === 'object' &&
    index.expressions_by_phrase && typeof index.expressions_by_phrase === 'object' &&
    index.expression_attachment_keys && typeof index.expression_attachment_keys === 'object' &&
    index.alignments_by_relation && typeof index.alignments_by_relation === 'object' &&
    index.proposals_by_key && typeof index.proposals_by_key === 'object' &&
    index.proposals_by_episode && typeof index.proposals_by_episode === 'object' &&
    index.supports_by_episode && typeof index.supports_by_episode === 'object');
}
function episodeRecord(index, id) {
  const key = String(id);
  if (!index.episodes[key]) index.episodes[key] = { id: key, channeled: false };
  return index.episodes[key];
}
function applyFact(index, fact) {
  const subject = String(fact?.subject);
  if (subject.startsWith('sequence-contact:')) {
    const episode = episodeRecord(index, subject);
    if (fact.relation === 'ρ:input_tokens' && Array.isArray(fact.object)) {
      episode.input_tokens = fact.object.slice();
      if (!index.latest_episode_id || episodeNumber(subject) > episodeNumber(index.latest_episode_id))
        index.latest_episode_id = subject;
    } else if (fact.relation === 'ρ:input_raw') episode.input_raw = fact.object;
    else if (fact.relation === 'ρ:contact_channel') episode.channeled = true;
  }

  if (fact?.relation === 'ρ:surface_expression' && fact.object && Array.isArray(fact.object.tokens)) {
    const tokens = compact(fact.object.tokens);
    if (tokens.length) {
      const entry = {
        value: fact.subject,
        tokens,
        source_episode: fact.object.source_episode,
      };
      const at = index.expressions.length;
      index.expressions.push(entry);
      pushMap(index.expressions_by_first, stable(tokens[0]), at);
      pushMap(index.expressions_by_phrase, stable(tokens), at);
      index.expression_attachment_keys[stable([fact.subject, fact.object.source_episode, tokens])] = true;
    }
  } else if (fact?.relation === 'ρ:surface_known_fact_alignment' && fact.object &&
      Object.prototype.hasOwnProperty.call(fact.object, 'relation')) {
    const key = stable(fact.object.relation);
    if (!index.alignments_by_relation[key]) index.alignments_by_relation[key] = {
      relation: fact.object.relation,
      rows: [],
    };
    index.alignments_by_relation[key].rows.push({ episode: fact.subject, ...fact.object });
  } else if (fact?.relation === 'ρ:proposes_relation' && fact.object && typeof fact.object === 'object' &&
      Object.prototype.hasOwnProperty.call(fact.object, 'subject') &&
      Object.prototype.hasOwnProperty.call(fact.object, 'relation') &&
      Object.prototype.hasOwnProperty.call(fact.object, 'object')) {
    const row = { episode: String(fact.subject), triple: fact.object };
    pushMap(index.proposals_by_episode, String(fact.subject), row);
    pushMap(index.proposals_by_key, stable([fact.object.subject, fact.object.relation]), row);
  } else if (fact?.relation === 'ρ:supports' && fact.object?.ref !== undefined) {
    pushMap(index.supports_by_episode, String(fact.subject), String(fact.object.ref));
  }
}
function surfaceStructureIndex(state) {
  const facts = state.knowledge?.facts || [];
  if (!state.structure || typeof state.structure !== 'object') state.structure = {};
  let index = state.structure.surface_structure_index;
  let start = 0;
  let rebuilding = false;
  if (!validIndex(index, facts)) {
    const rebuilds = Number.isInteger(index?.rebuilds) ? index.rebuilds + 1 : 1;
    index = emptyIndex(rebuilds);
    state.structure.surface_structure_index = index;
    rebuilding = true;
  } else start = index.fact_count;

  if (start < facts.length) {
    for (let i = start; i < facts.length; i++) applyFact(index, facts[i]);
    index.fact_count = facts.length;
    if (!rebuilding) index.incremental_syncs++;
  }
  return index;
}

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
  const index = surfaceStructureIndex(state);
  const id = index.latest_episode_id;
  if (!id || !index.episodes[id]?.input_tokens) return null;
  const e = index.episodes[id];
  return { id, input_tokens: e.input_tokens.slice(), input_raw: e.input_raw };
}
function externallyChanneled(state, episodeId) {
  return !!surfaceStructureIndex(state).episodes[String(episodeId)]?.channeled;
}
function proposalsForEpisode(state, episodeId) {
  return (surfaceStructureIndex(state).proposals_by_episode[String(episodeId)] || [])
    .map(row => ({ episode: row.episode, triple: row.triple }));
}
function supportsForEpisode(state, episodeId) {
  return [...new Set(surfaceStructureIndex(state).supports_by_episode[String(episodeId)] || [])];
}
function hasExpressionAttachment(state, value, episodeId, tokens) {
  return surfaceStructureIndex(state).expression_attachment_keys[stable([value, episodeId, compact(tokens)])] === true;
}

function currentExpressionMatches(state, inputTokens) {
  const index = surfaceStructureIndex(state);
  const candidateIndexes = new Set();
  for (const token of unique(compact(inputTokens)))
    for (const at of index.expressions_by_first[stable(token)] || []) candidateIndexes.add(at);

  const byValue = new Map();
  for (const at of candidateIndexes) {
    const expression = index.expressions[at];
    if (!expression) continue;
    const hits = phraseAt(inputTokens, expression.tokens);
    if (hits.length !== 1) continue;
    const key = stable(expression.value);
    if (!byValue.has(key)) byValue.set(key, { value: expression.value, hits: [] });
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

  // Current settled facts are query-relative state, not lifetime history. Scanning
  // them here avoids copying a second truth index while eliminating lifetime rescans.
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

function valueForPhrase(state, phrase) {
  const index = surfaceStructureIndex(state);
  const values = unique((index.expressions_by_phrase[stable(compact(phrase))] || [])
    .map(at => index.expressions[at]?.value)
    .filter(v => v !== undefined));
  return values.length === 1 ? values[0] : undefined;
}
function inferTriples(state, currentEpisode) {
  if (!currentEpisode || !Array.isArray(currentEpisode.input_tokens)) return [];
  const index = surfaceStructureIndex(state);
  const candidates = [];

  for (const group of Object.values(index.alignments_by_relation)) {
    const rows = (group.rows || []).filter(row => row.episode !== currentEpisode.id && index.episodes[String(row.episode)]?.input_tokens);
    const subjects = unique(rows.map(x => x.subject));
    const objects = unique(rows.map(x => x.object));
    if (rows.length < 4 || subjects.length < 3 || objects.length < 2) continue;

    const projected = rows.map(row => ({
      id: row.episode,
      output_tokens: compact(index.episodes[String(row.episode)].input_tokens),
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
  const index = surfaceStructureIndex(state);
  return (index.proposals_by_key[stable([subject, relation])] || [])
    .map(row => ({ episode: row.episode, object: row.triple.object }))
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

function relationalUpdate(state) {
  const episode = latestSurfaceEpisode(state);
  if (!episode || externallyChanneled(state, episode.id)) return null;

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

module.exports = {
  relationalUpdate,
  knownFactAlignment,
  inferTriples,
  latestSurfaceEpisode,
  proposalsForEpisode,
  supportsForEpisode,
  hasExpressionAttachment,
  surfaceStructureIndex,
};
