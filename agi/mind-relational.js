'use strict';

// One-live-M AGI public entrypoint.
// Durable cognition remains in canonical M. Everything here is a zero-state
// structural bridge over M-owned contact and canonical relational closure.

const Core = require('./one-live-blueprint.js');
const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function ref(id) { return { ref: String(id) }; }

function cloneContact(contact) {
  if (Array.isArray(contact)) return contact.slice();
  if (!contact || typeof contact !== 'object') return contact;
  const out = { ...contact };
  if (contact.surface) out.surface = { ...contact.surface };
  if (contact.relations) out.relations = {
    ...contact.relations,
    facts: Array.isArray(contact.relations.facts) ? contact.relations.facts.map(x => Array.isArray(x) ? x.slice() : x) : contact.relations.facts,
    rules: Array.isArray(contact.relations.rules) ? contact.relations.rules.slice() : contact.relations.rules,
  };
  return out;
}
function relationalTriples(contact) {
  const facts = contact && typeof contact === 'object' && contact.relations && Array.isArray(contact.relations.facts)
    ? contact.relations.facts : [];
  return facts.filter(x => Array.isArray(x) && x.length === 3);
}
function enrichSurfaceWithRelation(contact) {
  const out = cloneContact(contact);
  if (!out || typeof out !== 'object' || !out.surface || Array.isArray(out.surface.channels)) return out;
  const triples = relationalTriples(out);
  if (triples.length === 1) out.surface.channels = triples[0].slice();
  return out;
}

function sequenceEpisodeNumber(id) {
  const n = Number(String(id).split(':').at(-1));
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}
function sequenceEpisodes(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    if (typeof f.subject !== 'string' || !f.subject.startsWith('sequence-contact:')) continue;
    if (!groups.has(f.subject)) groups.set(f.subject, { id: f.subject, channels: new Map(), relations: [] });
    const e = groups.get(f.subject);
    if (f.relation === 'ρ:input_tokens' && Array.isArray(f.object)) e.input_tokens = f.object.slice();
    else if (f.relation === 'ρ:output_tokens' && Array.isArray(f.object)) e.output_tokens = f.object.slice();
    else if (f.relation === 'ρ:contact_channel' && f.object && Number.isInteger(f.object.index)) e.channels.set(f.object.index, f.object.value);
    else if (f.relation === 'ρ:contact_relation' && f.object && typeof f.object === 'object') {
      if (Object.prototype.hasOwnProperty.call(f.object, 'subject') && Object.prototype.hasOwnProperty.call(f.object, 'relation') && Object.prototype.hasOwnProperty.call(f.object, 'object')) e.relations.push({ ...f.object });
    } else if (f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object') {
      if (Object.prototype.hasOwnProperty.call(f.object, 'subject') && Object.prototype.hasOwnProperty.call(f.object, 'relation') && Object.prototype.hasOwnProperty.call(f.object, 'object')) e.relations.push({ ...f.object, source: 'proposal', order: Number.MAX_SAFE_INTEGER });
    }
  }
  for (const e of groups.values()) e.relations.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  return [...groups.values()].sort((a, b) => sequenceEpisodeNumber(a.id) - sequenceEpisodeNumber(b.id));
}

function directRole(episodes, queryTokens, channel) {
  const candidates = [];
  for (const token of unique(queryTokens || [])) {
    const matching = episodes.filter(e => (e.input_tokens || []).includes(token) && e.channels.has(channel));
    if (matching.length < 2) continue;
    const values = unique(matching.map(e => e.channels.get(channel)));
    if (values.length !== 1) continue;
    const contextual = [];
    for (const e of matching) for (const [i, value] of e.channels) if (i !== channel) contextual.push([i, value]);
    candidates.push({ value: values[0], token, support: matching.length, context_diversity: unique(contextual).length });
  }
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.context_diversity - a.context_diversity || b.support - a.support || stable(a.value).localeCompare(stable(b.value)));
  const topScore = `${candidates[0].context_diversity}:${candidates[0].support}`;
  const top = candidates.filter(x => `${x.context_diversity}:${x.support}` === topScore);
  const values = unique(top.map(x => x.value));
  return values.length === 1 ? values[0] : undefined;
}

function episodeSubjects(e) {
  return unique((e.relations || []).map(r => r.subject));
}
function directFrameSubject(episodes, queryTokens) {
  const candidates = [];
  for (const token of unique(queryTokens || [])) {
    const matching = episodes.filter(e => (e.input_tokens || []).includes(token) && episodeSubjects(e).length === 1);
    if (matching.length < 2) continue;
    const values = unique(matching.map(e => episodeSubjects(e)[0]));
    if (values.length !== 1) continue;
    const diversity = unique(matching.flatMap(e => (e.relations || []).map(r => [r.relation, r.object]))).length;
    candidates.push({ value: values[0], token, support: matching.length, context_diversity: diversity });
  }
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.context_diversity - a.context_diversity || b.support - a.support || stable(a.value).localeCompare(stable(b.value)));
  const score = `${candidates[0].context_diversity}:${candidates[0].support}`;
  const top = candidates.filter(x => `${x.context_diversity}:${x.support}` === score);
  const values = unique(top.map(x => x.value));
  return values.length === 1 ? values[0] : undefined;
}

function previousEpisodeWithChannel(episodes, before, channel) {
  for (let i = before - 1; i >= 0; i--) if (episodes[i].channels.has(channel)) return episodes[i];
  return null;
}
function contextualRole(episodes, queryTokens, channel, minSupport = 2) {
  const candidates = [];
  for (const token of unique(queryTokens || [])) {
    const observations = [];
    for (let i = 0; i < episodes.length; i++) {
      const e = episodes[i];
      if (!(e.input_tokens || []).includes(token) || !e.channels.has(channel)) continue;
      const prior = previousEpisodeWithChannel(episodes, i, channel);
      if (!prior) continue;
      observations.push({ current: e.channels.get(channel), previous: prior.channels.get(channel) });
    }
    if (observations.length < minSupport || unique(observations.map(x => x.current)).length < 2) continue;
    if (!observations.every(x => same(x.current, x.previous))) continue;
    candidates.push({ token, support: observations.length, diversity: unique(observations.map(x => x.current)).length });
  }
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.support - a.support || b.diversity - a.diversity || a.token.localeCompare(b.token));
  const prior = previousEpisodeWithChannel(episodes, episodes.length, channel);
  return prior ? { value: prior.channels.get(channel), cue: candidates[0].token, support: candidates[0].support } : undefined;
}

function setJaccard(a, b) {
  const A = new Set(a.map(stable)), B = new Set(b.map(stable));
  if (!A.size && !B.size) return 1;
  let intersection = 0;
  for (const x of A) if (B.has(x)) intersection++;
  return intersection / Math.max(1, A.size + B.size - intersection);
}
function bigrams(tokens) { const out = []; for (let i = 0; i + 1 < tokens.length; i++) out.push([tokens[i], tokens[i + 1]]); return out; }
function structuralSimilarity(a, b) {
  const A = Surface.compactTokens(a || []), B = Surface.compactTokens(b || []);
  return 0.65 * setJaccard(A, B) + 0.35 * setJaccard(bigrams(A), bigrams(B));
}
function structuralNeighbors(episodes, inputTokens, relation, requireOutput = false) {
  const scored = episodes
    .filter(e => e.channels.has(1) && same(e.channels.get(1), relation) && Array.isArray(e.input_tokens) && (!requireOutput || Array.isArray(e.output_tokens)))
    .map(e => ({ e, score: structuralSimilarity(inputTokens, e.input_tokens) }))
    .sort((a, b) => b.score - a.score || sequenceEpisodeNumber(b.e.id) - sequenceEpisodeNumber(a.e.id));
  if (!scored.length) return [];
  const threshold = Math.max(0.12, scored[0].score - 0.12);
  return scored.filter(x => x.score >= threshold).slice(0, 64).map(x => x.e);
}

function surfaceTerm(tokens) {
  if (!Array.isArray(tokens) || !tokens.length) return undefined;
  return Surface.renderTokens(tokens);
}
function inferRawSurfaceTriple(episodes, currentEpisode) {
  if (!currentEpisode || !Array.isArray(currentEpisode.input_tokens)) return null;
  const tokens = currentEpisode.input_tokens;
  const known = new Map();
  for (let channel = 0; channel < 3; channel++) {
    const value = directRole(episodes, tokens, channel);
    if (value !== undefined) known.set(channel, value);
  }
  const relation = known.get(1);
  if (relation === undefined) return null;

  const neighbors = structuralNeighbors(episodes.filter(e => e.id !== currentEpisode.id), tokens, relation, false);
  if (neighbors.length >= 2) {
    const projected = neighbors.map(e => ({ ...e, output_tokens: Surface.compactTokens(e.input_tokens) }));
    const structuralTokens = Surface.compactTokens(tokens);
    const template = Surface.buildTemplate(projected.map(e => e.output_tokens));
    const match = template && Surface.matchTemplate(structuralTokens, template);
    if (template && match) {
      const roles = Surface.inferOutputRoles(projected, template);
      for (const role of roles) {
        if (!match.has(role.slot)) continue;
        const span = match.get(role.slot);
        const value = surfaceTerm(span);
        if (value !== undefined) known.set(role.channel, value);
      }
    }
  }

  if (![0, 1, 2].every(i => known.has(i))) return null;
  return { subject: known.get(0), relation: known.get(1), object: known.get(2) };
}

function proposalRecords(state) {
  return (state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:proposes_relation' && f.object && typeof f.object === 'object' &&
      Object.prototype.hasOwnProperty.call(f.object, 'subject') && Object.prototype.hasOwnProperty.call(f.object, 'relation') && Object.prototype.hasOwnProperty.call(f.object, 'object'))
    .map(f => ({ episode: f.subject, triple: f.object }))
    .sort((a, b) => sequenceEpisodeNumber(a.episode) - sequenceEpisodeNumber(b.episode));
}
function recurrentProposalObject(records, subject, relation, minSupport = 2) {
  const values = records.filter(x => same(x.triple.subject, subject) && same(x.triple.relation, relation)).map(x => x.triple.object);
  if (values.length < minSupport) return undefined;
  const distinct = unique(values);
  if (distinct.length === 1) return values[0];
  const last = values.at(-1);
  let run = 0;
  for (let i = values.length - 1; i >= 0 && same(values[i], last); i--) run++;
  return run >= minSupport ? last : undefined;
}
function activeSurfaceRoutes(state, subject, relation) {
  return (state.knowledge?.rules || []).filter(rule => rule.active !== false && rule.provenance && rule.provenance.kind === 'surface_induction' && same(rule.provenance.subject, subject) && same(rule.provenance.relation, relation));
}
function nextSurfaceRouteId(state) {
  let max = 0;
  for (const rule of state.knowledge?.rules || []) { const m = /^surface-induction:(\d+)$/.exec(String(rule.id)); if (m) max = Math.max(max, Number(m[1])); }
  return `surface-induction:${max + 1}`;
}
function settleRawSurfaceProposal(state, proposalEpisode, triple) {
  Core.C(state, { relations: { facts: [
    [proposalEpisode, 'ρ:proposes_relation', triple],
    [proposalEpisode, 'ρ:proposal_provenance', { kind: 'ordered_surface', authority: 'proposal_only' }],
  ] } });
  const selected = recurrentProposalObject(proposalRecords(state), triple.subject, triple.relation);
  if (selected === undefined) return;
  const active = activeSurfaceRoutes(state, triple.subject, triple.relation);
  if (active.some(rule => same(rule.provenance.object, selected))) return;
  const defeatFacts = active.map(rule => [ref(rule.id), 'counterexample', { kind: 'later_recurrent_surface_evidence', proposal_episode: proposalEpisode }]);
  const routeId = nextSurfaceRouteId(state);
  Core.C(state, { relations: {
    facts: [...defeatFacts, [ref(routeId), 'surface_support', 'recurrent'], [proposalEpisode, 'ρ:supports', ref(routeId)]],
    rules: [{ id: routeId, premises: [[ref(routeId), 'surface_support', 'recurrent']], conclusion: [triple.subject, triple.relation, selected], categorical: true,
      provenance: { kind: 'surface_induction', subject: triple.subject, relation: triple.relation, object: selected, source: 'recurrent_ordered_surface_contact' } }],
  } });
}

function recordSurfaceRelationFrame(state, originalContact) {
  if (!originalContact || typeof originalContact !== 'object' || !originalContact.surface) return;
  const triples = relationalTriples(originalContact);
  if (!triples.length) return;
  const episode = sequenceEpisodes(state).at(-1);
  if (!episode) return;
  const facts = triples.map((t, order) => [episode.id, 'ρ:contact_relation', {
    order, subject: t[0], relation: t[1], object: t[2], source: 'simultaneous_relational_contact',
  }]);
  Core.C(state, { relations: { facts } });
}

function exactSurfaceSpan(tokens, value) {
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
function recordSurfaceExpressionAttachments(state) {
  const episode = sequenceEpisodes(state).at(-1);
  if (!episode || !Array.isArray(episode.input_tokens) || !episode.channels.size) return;
  const facts = [];
  for (const [channel, value] of episode.channels) {
    const tokens = exactSurfaceSpan(episode.input_tokens, value);
    if (!tokens) continue;
    facts.push([value, 'ρ:surface_expression', {
      tokens,
      source_episode: episode.id,
      source_channel: channel,
      exact_contact: true,
    }]);
  }
  if (facts.length) Core.C(state, { relations: { facts } });
}
function attachedSurfacePhrase(state, value) {
  const rows = (state.knowledge?.facts || [])
    .filter(f => same(f.subject, value) && f.relation === 'ρ:surface_expression' && f.object && Array.isArray(f.object.tokens))
    .sort((a, b) => sequenceEpisodeNumber(a.object.source_episode) - sequenceEpisodeNumber(b.object.source_episode));
  if (!rows.length) return undefined;
  const variants = unique(rows.map(f => f.object.tokens));
  return variants.length === 1 && rows.length ? variants[0] : rows.at(-1).object.tokens;
}

function currentObjects(state, subject, relation) {
  if (subject === undefined || relation === undefined) return [];
  return unique((state.knowledge?.current?.facts || []).filter(f => same(f.subject, subject) && same(f.relation, relation)).map(f => f.object));
}
function suppressUngroundedSurface(seq, subject, relation, objects, status) {
  seq.output_tokens = null; seq.expression = null; seq.unresolved_output_positions = ['canonical_object'];
  seq.canonical_grounding = { subject, relation, candidates: objects, source: 'M.knowledge.current.facts', authority: 'canonical_M', status: status || (objects.length ? 'ambiguous' : 'unresolved') };
}

function contactRelations(e) {
  return (e.relations || []).filter(r => r.source === 'simultaneous_relational_contact');
}
function discourseSignature(e) {
  return unique(contactRelations(e).map(r => r.relation));
}
function discourseProjection(e, signature) {
  const rels = contactRelations(e);
  const subjects = unique(rels.map(r => r.subject));
  if (subjects.length !== 1) return null;
  const channels = new Map([[0, subjects[0]]]);
  for (let i = 0; i < signature.length; i++) {
    const objects = unique(rels.filter(r => same(r.relation, signature[i])).map(r => r.object));
    if (objects.length !== 1) return null;
    channels.set(i + 1, objects[0]);
  }
  return { ...e, channels };
}
function discourseNeighbors(episodes, inputTokens, broadenSignature = false) {
  const candidates = episodes
    .filter(e => Array.isArray(e.input_tokens) && Array.isArray(e.output_tokens) && discourseSignature(e).length >= 2)
    .map(e => ({ e, signature: discourseSignature(e), score: structuralSimilarity(inputTokens, e.input_tokens) }))
    .sort((a, b) => b.score - a.score || sequenceEpisodeNumber(b.e.id) - sequenceEpisodeNumber(a.e.id));
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
    subjects: unique(g.rows.flatMap(x => episodeSubjects(x.e))).length,
    score: g.rows.reduce((s, x) => s + x.score, 0) / g.rows.length,
  })).filter(g => g.support >= 2 && g.subjects >= 2)
    .sort((a, b) => b.score - a.score || b.support - a.support || stable(a.signature).localeCompare(stable(b.signature)));
  if (!ranked.length) return null;
  const chosen = ranked[0];
  const sourceRows = broadenSignature
    ? candidates.filter(x => same(x.signature, chosen.signature))
    : chosen.rows;
  const projected = sourceRows.map(x => discourseProjection(x.e, chosen.signature)).filter(Boolean);
  return projected.length >= 2 ? { signature: chosen.signature, episodes: projected, score: chosen.score } : null;
}

// Generic set-valued raw-surface inference. Multi-relation schooling episodes
// already retain the relation signature and concrete subject/object values in M.
// Re-project their *input* surface through the existing template/role machinery,
// then instantiate every independently grounded relation slot in the current raw
// utterance. No conjunction token, grammar word, or proposition count is known.
function inferRawSurfaceTriples(episodes, currentEpisode) {
  const out = [];
  const single = inferRawSurfaceTriple(episodes, currentEpisode);
  if (single) out.push(single);
  if (!currentEpisode || !Array.isArray(currentEpisode.input_tokens)) return unique(out);

  // Local similarity identifies the relation-set; role induction then broadens
  // over all grounded bindings of that same signature so current lexical values
  // cannot become accidental constants merely because their nearest examples
  // repeat one entity/value combination. This broader view is input-only: output
  // discourse keeps its local surface neighborhood.
  const learned = discourseNeighbors(episodes.filter(e => e.id !== currentEpisode.id), currentEpisode.input_tokens, true);
  if (!learned) return unique(out);
  const projected = learned.episodes.map(e => ({
    ...e,
    output_tokens: Surface.compactTokens(e.input_tokens),
  }));
  const template = Surface.buildTemplate(projected.map(e => e.output_tokens));
  const structuralTokens = Surface.compactTokens(currentEpisode.input_tokens);
  const match = template && Surface.matchTemplate(structuralTokens, template);
  if (!template || !match) return unique(out);

  const channels = new Map();
  for (const role of Surface.inferOutputRoles(projected, template)) {
    if (!match.has(role.slot)) continue;
    const value = surfaceTerm(match.get(role.slot));
    if (value !== undefined) channels.set(role.channel, value);
  }
  const subject = channels.get(0);
  if (subject === undefined) return unique(out);
  for (let i = 0; i < learned.signature.length; i++) {
    const object = channels.get(i + 1);
    if (object === undefined) continue;
    out.push({ subject, relation: learned.signature[i], object });
  }
  return unique(out);
}

function groundDiscourseFromCanonicalM(state, episodes, seq, subject) {
  const learned = discourseNeighbors(episodes, seq.input_tokens || []);
  if (!learned) return false;
  const channels = new Map([[0, subject]]);
  const grounding = [];
  for (let i = 0; i < learned.signature.length; i++) {
    const relation = learned.signature[i];
    const objects = currentObjects(state, subject, relation);
    if (objects.length !== 1) return false;
    channels.set(i + 1, objects[0]);
    grounding.push({ relation, object: objects[0] });
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
    (_channel, value) => attachedSurfacePhrase(state, value),
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

function groundSurfaceFromCanonicalM(state) {
  const seq = state.current?.sequence;
  if (!seq) return;
  const episodes = sequenceEpisodes(state);
  const directSubject = directRole(episodes, seq.input_tokens, 0);
  const frameSubject = directSubject === undefined ? directFrameSubject(episodes, seq.input_tokens) : undefined;
  const contextualSubject = directSubject === undefined && frameSubject === undefined ? contextualRole(episodes, seq.input_tokens, 0) : undefined;
  const subject = directSubject !== undefined ? directSubject : frameSubject !== undefined ? frameSubject : contextualSubject?.value;
  const directRelation = directRole(episodes, seq.input_tokens, 1);
  const contextualRelation = directRelation === undefined ? contextualRole(episodes, seq.input_tokens, 1) : undefined;
  const relation = directRelation !== undefined ? directRelation : contextualRelation?.value;
  seq.contextual_subject_resolution = !!contextualSubject; seq.contextual_relation_resolution = !!contextualRelation;
  if (contextualSubject) seq.contextual_subject_evidence = { cue: contextualSubject.cue, support: contextualSubject.support };
  if (contextualRelation) seq.contextual_relation_evidence = { cue: contextualRelation.cue, support: contextualRelation.support };
  if (subject === undefined) return;
  if (relation === undefined) {
    if (groundDiscourseFromCanonicalM(state, episodes, seq, subject)) return;
    return;
  }
  const objects = currentObjects(state, subject, relation);
  if (objects.length !== 1) { suppressUngroundedSurface(seq, subject, relation, objects); return; }
  const object = objects[0];
  const relationEpisodes = structuralNeighbors(episodes, seq.input_tokens, relation, true);
  const template = Surface.buildTemplate(relationEpisodes.map(e => e.output_tokens));
  if (!template) { suppressUngroundedSurface(seq, subject, relation, objects, 'object_warranted_expression_unlearned'); return; }
  const roles = Surface.inferOutputRoles(relationEpisodes, template);
  const channels = new Map((seq.inferred_channels || []).map(x => [x.index, x.value]));
  channels.set(0, subject); channels.set(1, relation); channels.set(2, object);
  const filled = Surface.fillTemplate(
    template,
    relationEpisodes,
    episodes,
    channels,
    roles,
    (_channel, value) => attachedSurfacePhrase(state, value),
  );
  if (!filled.tokens || filled.unresolved.length) {
    seq.output_template = template; seq.output_roles = roles; seq.output_tokens = null; seq.expression = null; seq.unresolved_output_positions = filled.unresolved;
    seq.canonical_grounding = { subject, relation, object, source: 'M.knowledge.current.facts', authority: 'canonical_M', status: 'object_warranted_expression_unlearned' }; return;
  }
  seq.output_template = template; seq.output_roles = roles;
  seq.inferred_channels = [...channels.entries()].sort((a, b) => a[0] - b[0]).map(([index, value]) => ({ index, value,
    source: index === 0 ? (contextualSubject ? 'ordered_context_relation' : 'direct_surface_role') : index === 1 ? (contextualRelation ? 'ordered_context_relation' : 'direct_surface_role') : index === 2 ? 'canonical_M_current_fact' : 'surface_completion' }));
  seq.output_tokens = filled.tokens; seq.unresolved_output_positions = []; seq.expression = Surface.renderTokens(filled.tokens);
  seq.canonical_grounding = { subject, relation, object, source: 'M.knowledge.current.facts', authority: 'canonical_M', status: 'grounded' };
}

function one(actionCount, concernCount = 1) { return Core.one(actionCount, concernCount); }
function C(state, realityContact) {
  const contact = enrichSurfaceWithRelation(realityContact);
  const rawSurfaceOnly = !!(contact && typeof contact === 'object' && contact.surface && !Array.isArray(contact.surface.channels));
  Core.C(state, contact);
  recordSurfaceRelationFrame(state, realityContact);
  recordSurfaceExpressionAttachments(state);
  if (rawSurfaceOnly) {
    const episodes = sequenceEpisodes(state); const currentEpisode = episodes.at(-1);
    for (const triple of inferRawSurfaceTriples(episodes, currentEpisode)) settleRawSurfaceProposal(state, currentEpisode.id, triple);
  }
  if (contact && typeof contact === 'object' && contact.surface && (contact.surface.output === undefined || contact.surface.output === null)) groundSurfaceFromCanonicalM(state);
  return state;
}

module.exports = { one, C };