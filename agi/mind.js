'use strict';

// Final experimental one-live-M entrypoint for the current blueprint branch.
//
// This composes the already-general developmental C in one-live-blueprint.js
// with one ZERO-STATE bridge: when an ordered surface occurrence and an actual
// relational fact are contacted together, the fact's generic triple topology
// (subject, relation, object) becomes three ordinary contact dimensions for that
// occurrence. No English word, domain relation, or response is hard-coded.
//
// On a later surface query, recurrent surface-role evidence identifies the
// subject/relation terms; canonical current M supplies the object; previously
// learned expression structure realizes that object. Ordered cross-turn reuse is
// learned from recurrence rather than hard-coding pronouns. The bridge owns no
// durable cognition and cannot overrule canonical M.

const Core = require('./one-live-blueprint.js');
const Surface = require('./surface-template.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(xs) {
  const m = new Map();
  for (const x of xs || []) m.set(stable(x), x);
  return [...m.values()];
}

function cloneContact(contact) {
  if (Array.isArray(contact)) return contact.slice();
  if (!contact || typeof contact !== 'object') return contact;
  const out = { ...contact };
  if (contact.surface) out.surface = { ...contact.surface };
  if (contact.relations) {
    out.relations = {
      ...contact.relations,
      facts: Array.isArray(contact.relations.facts) ? contact.relations.facts.map(x => Array.isArray(x) ? x.slice() : x) : contact.relations.facts,
      rules: Array.isArray(contact.relations.rules) ? contact.relations.rules.slice() : contact.relations.rules,
    };
  }
  return out;
}

// Generic relation topology only. No domain meaning is supplied here.
function enrichSurfaceWithRelation(contact) {
  const out = cloneContact(contact);
  if (!out || typeof out !== 'object' || !out.surface || Array.isArray(out.surface.channels)) return out;
  const facts = out.relations && Array.isArray(out.relations.facts) ? out.relations.facts : [];
  const triples = facts.filter(x => Array.isArray(x) && x.length === 3);
  if (triples.length === 1) out.surface.channels = triples[0].slice();
  return out;
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
  return [...groups.values()].sort((a, b) => Number(a.id.split(':').at(-1)) - Number(b.id.split(':').at(-1)));
}

// Stable token→channel evidence for a direct role.
function directRole(episodes, queryTokens, channel) {
  const candidates = [];
  for (const token of unique(queryTokens || [])) {
    const matching = episodes.filter(e => (e.input_tokens || []).includes(token) && e.channels.has(channel));
    if (matching.length < 2) continue;
    const values = unique(matching.map(e => e.channels.get(channel)));
    if (values.length !== 1) continue;
    const contextual = [];
    for (const e of matching) {
      for (const [i, value] of e.channels) if (i !== channel) contextual.push([i, value]);
    }
    candidates.push({
      value: values[0],
      token,
      support: matching.length,
      context_diversity: unique(contextual).length,
    });
  }
  if (!candidates.length) return undefined;
  candidates.sort((a, b) =>
    b.context_diversity - a.context_diversity ||
    b.support - a.support ||
    stable(a.value).localeCompare(stable(b.value))
  );
  const topScore = `${candidates[0].context_diversity}:${candidates[0].support}`;
  const top = candidates.filter(x => `${x.context_diversity}:${x.support}` === topScore);
  const values = unique(top.map(x => x.value));
  return values.length === 1 ? values[0] : undefined;
}

function previousEpisodeWithChannel(episodes, before, channel) {
  for (let i = before - 1; i >= 0; i--) if (episodes[i].channels.has(channel)) return episodes[i];
  return null;
}

// Learn an ordered carry relation rather than a pronoun rule. A surface cue may
// reuse a prior channel only when, across multiple different values, occurrences
// carrying that cue repeatedly have the same channel value as the nearest prior
// episode that exposed that channel. The cue's spelling and the channel's meaning
// are irrelevant to the mechanism.
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
    if (observations.length < minSupport) continue;
    const diversity = unique(observations.map(x => x.current)).length;
    if (diversity < 2) continue;
    if (!observations.every(x => same(x.current, x.previous))) continue;
    candidates.push({ token, support: observations.length, diversity });
  }
  if (!candidates.length) return undefined;
  candidates.sort((a, b) => b.support - a.support || b.diversity - a.diversity || a.token.localeCompare(b.token));

  // The current query occurrence is normally the final episode and has no
  // semantic channels yet. Reuse the nearest preceding contacted value.
  const prior = previousEpisodeWithChannel(episodes, episodes.length, channel);
  if (!prior) return undefined;
  return { value: prior.channels.get(channel), cue: candidates[0].token, support: candidates[0].support };
}

function currentObjects(state, subject, relation) {
  if (subject === undefined || relation === undefined) return [];
  return unique((state.knowledge?.current?.facts || [])
    .filter(f => same(f.subject, subject) && same(f.relation, relation))
    .map(f => f.object));
}

function suppressUngroundedSurface(seq, subject, relation, objects, status) {
  seq.output_tokens = null;
  seq.expression = null;
  seq.unresolved_output_positions = ['canonical_object'];
  seq.canonical_grounding = {
    subject,
    relation,
    candidates: objects,
    source: 'M.knowledge.current.facts',
    authority: 'canonical_M',
    status: status || (objects.length ? 'ambiguous' : 'unresolved'),
  };
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

  seq.contextual_subject_resolution = !!contextualSubject;
  seq.contextual_relation_resolution = !!contextualRelation;
  if (contextualSubject) seq.contextual_subject_evidence = { cue: contextualSubject.cue, support: contextualSubject.support };
  if (contextualRelation) seq.contextual_relation_evidence = { cue: contextualRelation.cue, support: contextualRelation.support };

  if (subject === undefined || relation === undefined) return;

  const objects = currentObjects(state, subject, relation);
  if (objects.length !== 1) {
    suppressUngroundedSurface(seq, subject, relation, objects);
    return;
  }
  const object = objects[0];

  const relationEpisodes = episodes.filter(e =>
    Array.isArray(e.output_tokens) && e.channels.has(1) && same(e.channels.get(1), relation));
  const template = Surface.buildTemplate(relationEpisodes.map(e => e.output_tokens));
  if (!template) {
    suppressUngroundedSurface(seq, subject, relation, objects, 'object_warranted_expression_unlearned');
    return;
  }
  const roles = Surface.inferOutputRoles(relationEpisodes, template);
  const channels = new Map((seq.inferred_channels || []).map(x => [x.index, x.value]));
  channels.set(0, subject);
  channels.set(1, relation);
  channels.set(2, object);
  const filled = Surface.fillTemplate(template, relationEpisodes, episodes, channels, roles);
  if (!filled.tokens || filled.unresolved.length) {
    seq.output_template = template;
    seq.output_roles = roles;
    seq.output_tokens = null;
    seq.expression = null;
    seq.unresolved_output_positions = filled.unresolved;
    seq.canonical_grounding = {
      subject,
      relation,
      object,
      source: 'M.knowledge.current.facts',
      authority: 'canonical_M',
      status: 'object_warranted_expression_unlearned',
    };
    return;
  }

  seq.output_template = template;
  seq.output_roles = roles;
  seq.inferred_channels = [...channels.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, value]) => ({
      index,
      value,
      source: index === 0
        ? (contextualSubject ? 'ordered_context_relation' : 'direct_surface_role')
        : index === 1
          ? (contextualRelation ? 'ordered_context_relation' : 'direct_surface_role')
          : index === 2 ? 'canonical_M_current_fact' : 'surface_completion',
    }));
  seq.output_tokens = filled.tokens;
  seq.unresolved_output_positions = [];
  seq.expression = Surface.renderTokens(filled.tokens);
  seq.canonical_grounding = {
    subject,
    relation,
    object,
    source: 'M.knowledge.current.facts',
    authority: 'canonical_M',
    status: 'grounded',
  };
}

function one(actionCount, concernCount = 1) {
  return Core.one(actionCount, concernCount);
}

function C(state, realityContact) {
  const contact = enrichSurfaceWithRelation(realityContact);
  Core.C(state, contact);
  if (contact && typeof contact === 'object' && contact.surface &&
      (contact.surface.output === undefined || contact.surface.output === null)) {
    groundSurfaceFromCanonicalM(state);
  }
  return state;
}

module.exports = { one, C };
