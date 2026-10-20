'use strict';

// Final experimental one-live-M entrypoint for the current blueprint branch.
//
// This composes the already-general developmental C in one-live-blueprint.js
// with one ZERO-STATE bridge: when an ordered surface occurrence and an actual
// relational fact are contacted together, the fact's generic triple topology
// (subject, relation, object) becomes three ordinary contact dimensions for that
// occurrence. No English word, domain relation, or response is hard-coded.
//
// On a later surface query, direct recurrent surface-role evidence identifies the
// subject/relation terms; canonical current M supplies the object; previously
// learned expression structure realizes that object. The bridge owns no durable
// cognition and cannot overrule canonical M.

const Core = require('./one-live-blueprint.js');

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
  return [...groups.values()];
}

function tokenForObject(episodes, object, position) {
  const tokens = [];
  for (const e of episodes) {
    if (!e.channels.has(2) || !same(e.channels.get(2), object)) continue;
    if (!e.output_tokens || position >= e.output_tokens.length) continue;
    tokens.push(e.output_tokens[position]);
  }
  const variants = unique(tokens);
  return variants.length === 1 ? variants[0] : undefined;
}

function render(tokens) {
  return tokens ? tokens.join(' ').replace(/\s+([?.!,;:])/g, '$1') : null;
}

// Infer a structural channel directly from the tokens currently present, before
// any cross-channel completion. Stable token→value candidates are ranked by how
// many independent contexts they span. This makes a relation word observed across
// many entities outrank an entity-local accidental association without knowing
// what either word means.
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

function currentObjects(state, subject, relation) {
  if (subject === undefined || relation === undefined) return [];
  return unique((state.knowledge?.current?.facts || [])
    .filter(f => same(f.subject, subject) && same(f.relation, relation))
    .map(f => f.object));
}

function groundSurfaceFromCanonicalM(state) {
  const seq = state.current?.sequence;
  if (!seq) return;
  const episodes = sequenceEpisodes(state);
  const subject = directRole(episodes, seq.input_tokens, 0);
  const relation = directRole(episodes, seq.input_tokens, 1);
  const objects = currentObjects(state, subject, relation);
  if (objects.length !== 1) return;
  const object = objects[0];

  const template = seq.output_template;
  if (!Array.isArray(template)) return;
  const tokens = [];
  const unresolved = [];
  for (let pos = 0; pos < template.length; pos++) {
    const part = template[pos];
    if (part && Object.prototype.hasOwnProperty.call(part, 'constant')) {
      tokens.push(part.constant);
      continue;
    }
    const token = tokenForObject(episodes, object, pos);
    if (token === undefined) { tokens.push(null); unresolved.push(pos); }
    else tokens.push(token);
  }
  if (unresolved.length) return;

  seq.inferred_channels = (seq.inferred_channels || []).filter(x => x.index > 2);
  seq.inferred_channels.push(
    { index: 0, value: subject, source: 'direct_surface_role' },
    { index: 1, value: relation, source: 'direct_surface_role' },
    { index: 2, value: object, source: 'canonical_M_current_fact' }
  );
  seq.inferred_channels.sort((a, b) => a.index - b.index);
  seq.output_tokens = tokens;
  seq.unresolved_output_positions = [];
  seq.expression = render(tokens);
  seq.canonical_grounding = {
    subject,
    relation,
    object,
    source: 'M.knowledge.current.facts',
    authority: 'canonical_M',
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
