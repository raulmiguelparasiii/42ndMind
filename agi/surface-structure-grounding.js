'use strict';

// Zero-state bridge from already-known canonical M facts to previously unseen
// surface constructions. It owns no lexicon, grammar state, parser state, truth,
// or memory. A raw utterance can be aligned only when its independently grounded
// endpoint expressions uniquely identify a fact already current in M. Recurrent
// alignments across diverse bindings are then reduced through the same generic
// surface template/role machinery and may propose the relation for a new binding.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }

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

function alignmentUpdate(state, currentEpisode) {
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
  return { relations: { facts: [[currentEpisode.id, 'ρ:surface_known_fact_alignment', {
    subject: triple.subject,
    relation: triple.relation,
    object: triple.object,
    subject_span: subject.span,
    object_span: object.span,
    source: 'canonical_M_current_fact',
    authority: 'alignment_only',
  }]] } };
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
    .filter(f => f.relation === 'ρ:surface_expression' && f.object && Array.isArray(f.object.tokens) && same(compact(f.object.tokens), compact(phrase)))
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

module.exports = { alignmentUpdate, inferTriples };
