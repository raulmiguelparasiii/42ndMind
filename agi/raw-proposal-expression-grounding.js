'use strict';

// Zero-state surface bridge after the canonical raw surface learner runs.
// Exact proposal endpoint expressions remain ordinary M facts. Separately, a raw
// construction may align with a uniquely known current M fact across diverse
// examples; that structure may later propose a new binding through the same
// surface_induction route anatomy. Teacher-grounded surface/relation contacts are
// retained as a distinct evidence route and projected through that same generic
// construction learner only when the ordinary self-alignment route has no match.
// No path owns truth, grammar state, memory, or a semantic dictionary.

const Surface = require('./surface-template.js');
const SurfaceStructure = require('./surface-structure-grounding.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }

function exactSpan(tokens, value) {
  if (!Array.isArray(tokens) || !['string', 'number', 'boolean'].includes(typeof value)) return undefined;
  const compact = Surface.compactTokens(tokens);
  const target = String(value);
  const hits = [];
  for (let start = 0; start < compact.length; start++) {
    for (let end = start + 1; end <= compact.length; end++) {
      const span = compact.slice(start, end);
      if (Surface.renderTokens(span) === target) hits.push(span);
    }
  }
  const variants = unique(hits);
  return variants.length === 1 ? variants[0] : undefined;
}

function structuralProposals(update, episodeId) {
  return (update?.relations?.facts || [])
    .filter(f => Array.isArray(f) && f.length === 3 && String(f[0]) === String(episodeId) &&
      f[1] === 'ρ:proposes_relation' && f[2] && typeof f[2] === 'object' &&
      Object.prototype.hasOwnProperty.call(f[2], 'subject') &&
      Object.prototype.hasOwnProperty.call(f[2], 'relation') &&
      Object.prototype.hasOwnProperty.call(f[2], 'object'))
    .map(f => ({ episode: String(f[0]), triple: f[2] }));
}
function updateHasStructuralLearning(update) {
  return !!((update?.relations?.rules || []).length || (update?.relations?.facts || []).some(f =>
    Array.isArray(f) && (f[1] === 'ρ:proposes_relation' || f[1] === 'ρ:surface_known_fact_alignment')));
}

// A simultaneous surface + relational teacher contact is genuine grounding
// evidence. Preserve only the correspondence actually present in that same lived
// episode. It is deliberately not stored as the self-alignment relation, because
// one semantic relation can have several different learned surface constructions.
function directGroundedAlignment(state, episode) {
  if (!episode || !Array.isArray(episode.input_tokens)) return null;
  const channels = new Map();
  for (const fact of state.knowledge?.facts || []) {
    if (String(fact.subject) !== String(episode.id) || fact.relation !== 'ρ:contact_channel' ||
        !fact.object || !Number.isInteger(fact.object.index)) continue;
    channels.set(fact.object.index, fact.object.value);
  }
  if (![0, 1, 2].every(i => channels.has(i))) return null;

  const subject = channels.get(0);
  const relation = channels.get(1);
  const object = channels.get(2);
  const subjectSpan = exactSpan(episode.input_tokens, subject);
  const objectSpan = exactSpan(episode.input_tokens, object);
  if (!subjectSpan || !objectSpan) return null;

  const already = (state.knowledge?.facts || []).some(f =>
    String(f.subject) === String(episode.id) && f.relation === 'ρ:grounded_surface_relation_alignment' &&
    f.object && stable(f.object.subject) === stable(subject) &&
    stable(f.object.relation) === stable(relation) && stable(f.object.object) === stable(object));
  if (already) return null;

  return [episode.id, 'ρ:grounded_surface_relation_alignment', {
    subject,
    relation,
    object,
    subject_span: subjectSpan,
    object_span: objectSpan,
    source: 'simultaneous_grounded_surface_relation',
    authority: 'alignment_only',
  }];
}

function currentEpisodeHasChannels(state, episodeId) {
  return (state.knowledge?.facts || []).some(f => String(f.subject) === String(episodeId) && f.relation === 'ρ:contact_channel');
}

// A raw span can accumulate several surface-expression identities over a life
// (for example numeric 15 and textual "15"). The grounded projection may resolve
// that ambiguity only when canonical M itself currently supports exactly one of
// those candidates as an endpoint somewhere in settled knowledge. If zero or more
// than one candidates are current, all variants remain and the generic learner
// continues to withhold rather than guess.
function canonicalExpressionProjection(state, facts) {
  const currentValues = new Set();
  for (const fact of state.knowledge?.current?.facts || []) {
    currentValues.add(stable(fact.subject));
    currentValues.add(stable(fact.object));
  }

  const groups = new Map();
  for (const fact of facts) {
    if (fact.relation !== 'ρ:surface_expression' || !fact.object || !Array.isArray(fact.object.tokens)) continue;
    const key = stable(Surface.compactTokens(fact.object.tokens));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fact);
  }

  const preferred = new Map();
  for (const [key, rows] of groups) {
    const candidates = unique(rows.map(row => row.subject));
    if (candidates.length < 2) continue;
    const current = candidates.filter(value => currentValues.has(stable(value)));
    if (current.length === 1) preferred.set(key, stable(current[0]));
  }

  return facts.filter(fact => {
    if (fact.relation !== 'ρ:surface_expression' || !fact.object || !Array.isArray(fact.object.tokens)) return true;
    const key = stable(Surface.compactTokens(fact.object.tokens));
    const wanted = preferred.get(key);
    return wanted === undefined || stable(fact.subject) === wanted;
  });
}

// Reuse SurfaceStructure without giving grounded teaching its own parser or
// proposal authority. A disposable projection relabels only M-owned grounded
// alignments as the generic alignment evidence SurfaceStructure already consumes.
// Self-aligned examples are excluded from this projection so distinct surface
// constructions for the same relation never collapse into one template family.
function groundedStructureUpdate(state, episode) {
  if (!episode || currentEpisodeHasChannels(state, episode.id)) return null;
  const allFacts = state.knowledge?.facts || [];
  const facts = canonicalExpressionProjection(state, allFacts);
  const grounded = facts.filter(f => f.relation === 'ρ:grounded_surface_relation_alignment');
  if (!grounded.length) return null;

  const projectedFacts = facts
    .filter(f => f.relation !== 'ρ:surface_known_fact_alignment' && f.relation !== 'ρ:grounded_surface_relation_alignment')
    .concat(grounded.map(f => ({
      ...f,
      relation: 'ρ:surface_known_fact_alignment',
      object: { ...f.object, source: 'projected_grounded_surface_relation' },
    })));
  const projected = {
    ...state,
    knowledge: { ...state.knowledge, facts: projectedFacts },
    structure: { ...(state.structure || {}) },
  };
  delete projected.structure.surface_structure_index;
  return SurfaceStructure.relationalUpdate(projected);
}

function relationalUpdate(state) {
  const ordinaryStructural = SurfaceStructure.relationalUpdate(state);
  const episode = SurfaceStructure.latestSurfaceEpisode(state);
  const facts = [...(ordinaryStructural?.relations?.facts || [])];
  const rules = [...(ordinaryStructural?.relations?.rules || [])];
  if (!episode) return facts.length || rules.length ? { relations: { facts, rules } } : null;

  const groundedAlignment = directGroundedAlignment(state, episode);
  if (groundedAlignment) facts.push(groundedAlignment);

  // Preserve the already-proven self-alignment path whenever it recognizes the
  // current construction. Only an otherwise-unresolved raw surface contact gets a
  // second zero-state projection over explicitly grounded teacher alignments.
  let groundedStructural = null;
  if (!currentEpisodeHasChannels(state, episode.id) && !updateHasStructuralLearning(ordinaryStructural))
    groundedStructural = groundedStructureUpdate(state, episode);
  if (groundedStructural) {
    facts.push(...(groundedStructural.relations?.facts || []));
    rules.push(...(groundedStructural.relations?.rules || []));
  }

  // Existing proposals are retrieved from the append-synchronized zero-authority
  // projection. Proposals created in either structural view in this same call are
  // included directly because they have not entered canonical M yet.
  const proposals = unique([
    ...SurfaceStructure.proposalsForEpisode(state, episode.id),
    ...structuralProposals(ordinaryStructural, episode.id),
    ...structuralProposals(groundedStructural, episode.id),
  ].map(row => row.triple));

  for (const proposal of proposals) {
    for (const [role, value] of [['subject', proposal.subject], ['object', proposal.object]]) {
      const tokens = exactSpan(episode.input_tokens, value);
      if (!tokens || SurfaceStructure.hasExpressionAttachment(state, value, episode.id, tokens)) continue;
      facts.push([value, 'ρ:surface_expression', {
        tokens,
        source_episode: episode.id,
        source_role: role,
        source: 'raw_surface_proposal_endpoint',
        exact_contact: true,
        semantic_authority: 'none',
      }]);
    }
  }
  if (!facts.length && !rules.length) return null;
  return { relations: { facts, ...(rules.length ? { rules } : {}) } };
}

module.exports = { relationalUpdate };
