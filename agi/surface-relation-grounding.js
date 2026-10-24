'use strict';

// Zero-state cross-modal grounding over canonical M.
//
// A surface expression may acquire meaning when it repeatedly occurs in the same
// lived contacts as a first-class learned relation occurrence. This helper owns
// no lexicon or semantic memory: exact co-occurrence evidence, support routes, and
// the resulting expression relation all live in M. Surface-only recall is a
// disposable current view over those canonical facts.

const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function ref(id) { return { ref: String(id) }; }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function episodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : -1;
}
function lexicalAtom(token) {
  const text = String(token);
  return /[\p{L}\p{N}]/u.test(text) ? text : null;
}
function surfaceTerm(expression) { return `surface:${String(expression)}`; }
function groundingKey(surface, relationTerm) { return `${surface}\u0000${relationTerm}`; }

// Surface anatomy is not fixed to one token. Search contiguous lexical spans,
// with the maximum span growing slowly from the amount of structure present in
// the current utterance. Length-1 spans preserve ordinary word grounding.
function expressionCandidates(tokens, options = {}) {
  const compact = Surface.compactTokens(tokens || []);
  const evidenceMax = Math.max(1, Math.floor(Math.log2(Math.max(2, compact.length + 1))) + 1);
  const maxSpan = Math.min(options.maxSpan ?? evidenceMax, evidenceMax);
  const out = [];
  for (let start = 0; start < compact.length; start++) {
    if (!lexicalAtom(compact[start])) continue;
    for (let length = 1; length <= maxSpan && start + length <= compact.length; length++) {
      const span = compact.slice(start, start + length);
      if (span.some(token => !lexicalAtom(token))) break;
      const expression = Surface.renderTokens(span);
      if (!expression) continue;
      out.push({
        expression,
        surface: surfaceTerm(expression),
        tokens: span,
        start,
        length,
        context_signature: stable({
          before: compact.slice(0, start),
          after: compact.slice(start + length),
        }),
      });
    }
  }
  return unique(out);
}

function latestSurfaceEpisode(state) {
  let best = null;
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:input_tokens' || !Array.isArray(fact.object) ||
        typeof fact.subject !== 'string' || !fact.subject.startsWith('sequence-contact:')) continue;
    if (!best || episodeNumber(fact.subject) > episodeNumber(best.id))
      best = { id: fact.subject, tokens: fact.object.slice() };
  }
  return best;
}

// Grounding is modality-neutral. Any generic relation occurrence produced at the
// current lived-contact order can support a surface expression, regardless of
// which learner produced it. At most one evidence item per relation term is used
// for one utterance episode; multiple internal occurrence aliases cannot inflate
// lexical support.
function freshRelationTerms(state) {
  const order = state.contacts?.length || 0;
  const facts = state.knowledge?.facts || [];
  const relationOccurrences = new Set();
  const orderedHere = new Set();
  const instantiates = new Map();
  const relationTerms = new Set();

  for (const fact of facts) {
    const subject = String(fact.subject);
    if (fact.relation === 'ρ:kind' && fact.object === 'relation_occurrence') relationOccurrences.add(subject);
    else if (fact.relation === 'ρ:kind' && fact.object === 'relation_term') relationTerms.add(subject);
    else if (fact.relation === 'ρ:order' && fact.object === order) orderedHere.add(subject);
    else if (fact.relation === 'ρ:instantiates' && fact.object?.ref !== undefined)
      instantiates.set(subject, String(fact.object.ref));
  }

  const byTerm = new Map();
  for (const occurrence of orderedHere) {
    if (!relationOccurrences.has(occurrence)) continue;
    const term = instantiates.get(occurrence);
    if (!term || !relationTerms.has(term) || byTerm.has(term)) continue;
    byTerm.set(term, { occurrence, relation_term: term, order });
  }
  return [...byTerm.values()];
}

// Rebuilt from M each call. These maps/sets are acceleration only; the facts and
// rules they summarize remain the sole semantic authority.
function groundingIndexes(state) {
  const evidence = new Map();
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:surface_relation_cooccurrence' || !fact.object ||
        typeof fact.object.surface !== 'string' || typeof fact.object.relation_term !== 'string') continue;
    const key = groundingKey(fact.object.surface, fact.object.relation_term);
    if (!evidence.has(key)) evidence.set(key, { episodes: new Set(), contexts: new Set() });
    const bucket = evidence.get(key);
    bucket.episodes.add(String(fact.subject));
    bucket.contexts.add(fact.object.context_signature);
  }

  const active = new Set();
  let maxRoute = 0;
  for (const rule of state.knowledge?.rules || []) {
    const match = /^surface-relation-grounding:(\d+)$/.exec(String(rule.id));
    if (match) maxRoute = Math.max(maxRoute, Number(match[1]));
    if (rule.active === false || rule.provenance?.kind !== 'surface_relation_grounding') continue;
    active.add(groundingKey(String(rule.provenance.surface), String(rule.provenance.relation_term)));
  }
  return { evidence, active, nextRoute: maxRoute + 1 };
}

function relationalUpdate(state, originalContact, options = {}) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface ||
      !Array.isArray(originalContact.frame)) return null;
  const episode = latestSurfaceEpisode(state);
  const relationTerms = freshRelationTerms(state);
  if (!episode || !relationTerms.length) return null;

  const expressions = expressionCandidates(episode.tokens, options);
  if (!expressions.length) return null;
  const minSupport = options.minSupport ?? 3;
  const facts = [], rules = [];
  const index = groundingIndexes(state);
  let nextRoute = index.nextRoute;

  for (const candidate of expressions) for (const relation of relationTerms) {
    const key = groundingKey(candidate.surface, relation.relation_term);
    const evidence = {
      expression: candidate.expression,
      token: candidate.length === 1 ? candidate.expression : undefined,
      span_tokens: candidate.tokens,
      surface: candidate.surface,
      relation_term: relation.relation_term,
      relation_occurrence: relation.occurrence,
      contact_order: relation.order,
      context_signature: candidate.context_signature,
      exact_contact: true,
    };
    facts.push([episode.id, 'ρ:surface_relation_cooccurrence', evidence]);

    if (!index.evidence.has(key)) index.evidence.set(key, { episodes: new Set(), contexts: new Set() });
    const bucket = index.evidence.get(key);
    bucket.episodes.add(episode.id);
    bucket.contexts.add(candidate.context_signature);

    if (index.active.has(key) || bucket.episodes.size < minSupport ||
        bucket.contexts.size < Math.min(minSupport, 2)) continue;

    const support = {
      support: bucket.episodes.size,
      context_diversity: bucket.contexts.size,
      retained_contact: true,
      span_length: candidate.length,
    };
    const routeId = `surface-relation-grounding:${nextRoute++}`;
    facts.push(
      [ref(routeId), 'ρ:surface_relation_support', support],
      [episode.id, 'ρ:supports', ref(routeId)],
    );
    rules.push({
      id: routeId,
      premises: [[ref(routeId), 'ρ:surface_relation_support', support]],
      conclusion: [candidate.surface, 'ρ:expresses', ref(relation.relation_term)],
      categorical: true,
      provenance: {
        kind: 'surface_relation_grounding',
        surface: candidate.surface,
        relation_term: relation.relation_term,
        span_length: candidate.length,
        authority: 'M_retained_crossmodal_contact',
      },
    });
    index.active.add(key);
  }
  return facts.length || rules.length ? { relations: { facts, rules } } : null;
}

function currentMeaningIndex(state) {
  const meanings = new Map();
  for (const fact of state.knowledge?.current?.facts || []) {
    if (fact.relation !== 'ρ:expresses' || fact.object?.ref === undefined) continue;
    const surface = String(fact.subject);
    if (!meanings.has(surface)) meanings.set(surface, new Set());
    meanings.get(surface).add(String(fact.object.ref));
  }
  return meanings;
}

// Every heard lexical expression is first ordinary lived material, even before
// the mind knows what it means. A learned meaning only enriches that same event
// with ρ:refers_to. This keeps acquisition direction correct: expression contact
// exists first; semantic reference can emerge later from retained experience.
function mentionUpdate(state, originalContact, options = {}) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface) return null;
  const episode = latestSurfaceEpisode(state);
  if (!episode) return null;
  const meanings = currentMeaningIndex(state);
  const facts = [];

  for (const candidate of expressionCandidates(episode.tokens, options)) {
    const relationTerms = meanings.get(candidate.surface) || new Set();
    const occurrence = `surface-expression-occurrence:${episode.id}:${candidate.start}:${candidate.length}`;
    facts.push(
      [occurrence, 'ρ:kind', 'surface_expression_occurrence'],
      [occurrence, 'ρ:surface', candidate.surface],
      [occurrence, 'ρ:span', {
        start: candidate.start,
        length: candidate.length,
        tokens: candidate.tokens,
      }],
      [occurrence, 'ρ:within_surface_episode', episode.id],
      [episode.id, 'ρ:contains_expression', ref(occurrence)],
      ['self', 'ρ:experienced', occurrence],
    );
    for (const relationTerm of relationTerms) facts.push([occurrence, 'ρ:refers_to', ref(relationTerm)]);
  }

  return facts.length ? { relations: { facts } } : null;
}

function groundCurrent(state, originalContact, options = {}) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface || !state.current?.sequence) return state;
  const episode = latestSurfaceEpisode(state);
  if (!episode) return state;
  const meanings = currentMeaningIndex(state);
  const grounded = [];
  for (const candidate of expressionCandidates(episode.tokens, options)) {
    for (const relationTerm of meanings.get(candidate.surface) || []) grounded.push({
      token: candidate.length === 1 ? candidate.expression : undefined,
      expression: candidate.expression,
      span_tokens: candidate.tokens,
      surface: candidate.surface,
      relation_term: relationTerm,
      authority: 'canonical_M',
    });
  }
  state.current.sequence.lexical_grounding = grounded;
  return state;
}

module.exports = { relationalUpdate, mentionUpdate, groundCurrent };
