'use strict';

// Experimental one-live-M public entrypoint.
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
function enrichSurfaceWithRelation(contact) {
  const out = cloneContact(contact);
  if (!out || typeof out !== 'object' || !out.surface || Array.isArray(out.surface.channels)) return out;
  const facts = out.relations && Array.isArray(out.relations.facts) ? out.relations.facts : [];
  const triples = facts.filter(x => Array.isArray(x) && x.length === 3);
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
    if (!groups.has(f.subject)) groups.set(f.subject, { id: f.subject, channels: new Map() });
    const e = groups.get(f.subject);
    if (f.relation === 'ρ:input_tokens' && Array.isArray(f.object)) e.input_tokens = f.object.slice();
    else if (f.relation === 'ρ:output_tokens' && Array.isArray(f.object)) e.output_tokens = f.object.slice();
    else if (f.relation === 'ρ:contact_channel' && f.object && Number.isInteger(f.object.index)) e.channels.set(f.object.index, f.object.value);
  }
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

function currentObjects(state, subject, relation) {
  if (subject === undefined || relation === undefined) return [];
  return unique((state.knowledge?.current?.facts || []).filter(f => same(f.subject, subject) && same(f.relation, relation)).map(f => f.object));
}
function suppressUngroundedSurface(seq, subject, relation, objects, status) {
  seq.output_tokens = null; seq.expression = null; seq.unresolved_output_positions = ['canonical_object'];
  seq.canonical_grounding = { subject, relation, candidates: objects, source: 'M.knowledge.current.facts', authority: 'canonical_M', status: status || (objects.length ? 'ambiguous' : 'unresolved') };
}
function groundSurfaceFromCanonicalM(state) {
  const seq = state.current?.sequence;
  if (!seq) return;
  const episodes = sequenceEpisodes(state);
  const directSubject = directRole(episodes, seq.input_tokens, 0);
  const contextualSubject = directSubject === undefined ? contextualRole(episodes, seq.input_tokens, 0) : undefined;
  const subject = directSubject !== undefined ? directSubject : contextualSubject?.value;
  const directRelation = directRole(episodes, seq.input_tokens, 1);
  const contextualRelation = directRelation === undefined ? contextualRole(episodes, seq.input_tokens, 1) : undefined;
  const relation = directRelation !== undefined ? directRelation : contextualRelation?.value;
  seq.contextual_subject_resolution = !!contextualSubject; seq.contextual_relation_resolution = !!contextualRelation;
  if (contextualSubject) seq.contextual_subject_evidence = { cue: contextualSubject.cue, support: contextualSubject.support };
  if (contextualRelation) seq.contextual_relation_evidence = { cue: contextualRelation.cue, support: contextualRelation.support };
  if (subject === undefined || relation === undefined) return;
  const objects = currentObjects(state, subject, relation);
  if (objects.length !== 1) { suppressUngroundedSurface(seq, subject, relation, objects); return; }
  const object = objects[0];
  const relationEpisodes = structuralNeighbors(episodes, seq.input_tokens, relation, true);
  const template = Surface.buildTemplate(relationEpisodes.map(e => e.output_tokens));
  if (!template) { suppressUngroundedSurface(seq, subject, relation, objects, 'object_warranted_expression_unlearned'); return; }
  const roles = Surface.inferOutputRoles(relationEpisodes, template);
  const channels = new Map((seq.inferred_channels || []).map(x => [x.index, x.value]));
  channels.set(0, subject); channels.set(1, relation); channels.set(2, object);
  const filled = Surface.fillTemplate(template, relationEpisodes, episodes, channels, roles);
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
  if (rawSurfaceOnly) {
    const episodes = sequenceEpisodes(state); const currentEpisode = episodes.at(-1); const triple = inferRawSurfaceTriple(episodes, currentEpisode);
    if (triple) settleRawSurfaceProposal(state, currentEpisode.id, triple);
  }
  if (contact && typeof contact === 'object' && contact.surface && (contact.surface.output === undefined || contact.surface.output === null)) groundSurfaceFromCanonicalM(state);
  return state;
}

module.exports = { one, C };
