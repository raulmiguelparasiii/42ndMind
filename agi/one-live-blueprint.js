'use strict';

// One-live-M blueprint extension.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// one() returns the canonical M from one-mind.js. This file owns no second
// cognitive state. C() is one entrypoint through which numeric contact, ordered
// surface contact, arbitrary relational contact, and newly available actuators
// may arrive together. All durable cognitive content is written into canonical M.
// Helpers below are content-neutral transforms/views over that one state.

const Base = require('../one-mind.js');
const Sequence = require('../sequence-recompression.js');

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(values) {
  const map = new Map();
  for (const value of values || []) map.set(stable(value), value);
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Exact numeric-contact settling.
// A historically zero-entropy channel is an exact relation even though a pure
// information-gain search assigns it zero predictive gain.
// ---------------------------------------------------------------------------

function invariantValueAt(state, perceptIndex, minSupport = 4) {
  const values = [];
  for (const frame of state.contacts || []) {
    const cut = frame.length - state.concern_count;
    if (perceptIndex >= cut) continue;
    const value = frame[perceptIndex];
    if (value === null || value === undefined) continue;
    values.push(value);
  }
  if (values.length < minSupport) return { complete: false };
  const first = stable(values[0]);
  if (!values.every(v => stable(v) === first)) return { complete: false };
  return { complete: true, value: values[0], support: values.length };
}

function settleInvariantChannels(state, frame) {
  if (!frame || !state.current) return;
  const cut = frame.length - state.concern_count;
  const inferred = new Set(state.current.inferred || []);
  const completions = [];
  for (let i = 0; i < cut; i++) {
    if (frame[i] !== null) continue;
    const feature = `p${i}`;
    if (Object.prototype.hasOwnProperty.call(state.current.completed, feature)) continue;
    const invariant = invariantValueAt(state, i);
    if (!invariant.complete) continue;
    state.current.completed[feature] = invariant.value;
    inferred.add(feature);
    completions.push({ feature, value: invariant.value, support: invariant.support, kind: 'zero_entropy_invariant' });
  }
  state.current.inferred = [...inferred].sort();
  state.current.invariant_completions = completions;
}

// ---------------------------------------------------------------------------
// Mechanical ordered-sequence transduction. Raw contact is retained beside the
// token sequence. Tokens have no semantics at this boundary.
// ---------------------------------------------------------------------------

function tokenize(raw) {
  return String(raw ?? '').toLowerCase().match(/[\p{L}\p{N}']+|[^\s\p{L}\p{N}]/gu) || [];
}

function surfaceFacts(state, contact) {
  const n = state.knowledge.episodes.length + 1;
  const id = `sequence-contact:${n}`;
  const inputRaw = String(contact.input ?? '');
  const inputTokens = tokenize(inputRaw);
  const facts = [
    [id, 'ρ:kind', 'ordered_sequence_contact'],
    [id, 'ρ:input_raw', inputRaw],
    [id, 'ρ:input_tokens', inputTokens],
    ['self', 'ρ:experienced', id],
    ['self', 'ρ:has_receptor', 'ordered_sequence'],
  ];
  if (contact.output !== undefined && contact.output !== null) {
    const outputRaw = String(contact.output);
    facts.push([id, 'ρ:output_raw', outputRaw]);
    facts.push([id, 'ρ:output_tokens', tokenize(outputRaw)]);
  }
  const channels = Array.isArray(contact.channels) ? contact.channels : [];
  for (let i = 0; i < channels.length; i++) {
    if (channels[i] === undefined || channels[i] === null) continue;
    facts.push([id, 'ρ:contact_channel', { index: i, value: channels[i] }]);
  }
  return { id, facts, inputTokens };
}

function currentSequenceEpisodes(state) {
  const groups = new Map();
  for (const fact of state.knowledge?.facts || []) {
    if (typeof fact.subject !== 'string' || !fact.subject.startsWith('sequence-contact:')) continue;
    if (!groups.has(fact.subject)) groups.set(fact.subject, { id: fact.subject, channels: new Map() });
    const ep = groups.get(fact.subject);
    if (fact.relation === 'ρ:input_raw') ep.input_raw = fact.object;
    else if (fact.relation === 'ρ:input_tokens' && Array.isArray(fact.object)) ep.input_tokens = fact.object.slice();
    else if (fact.relation === 'ρ:output_raw') ep.output_raw = fact.object;
    else if (fact.relation === 'ρ:output_tokens' && Array.isArray(fact.object)) ep.output_tokens = fact.object.slice();
    else if (fact.relation === 'ρ:contact_channel' && fact.object && Number.isInteger(fact.object.index)) ep.channels.set(fact.object.index, fact.object.value);
  }
  return [...groups.values()].sort((a, b) => Number(a.id.split(':').at(-1)) - Number(b.id.split(':').at(-1)));
}

// Proposal/evidence distinction: the first occurrence establishes a possible
// token↔channel relation; only later independent occurrences count as support.
function tokenChannelEvidence(episodes, minLaterSupport = 1) {
  const channelValues = new Map();
  for (const ep of episodes) for (const [index, value] of ep.channels) {
    if (!channelValues.has(index)) channelValues.set(index, []);
    channelValues.get(index).push(value);
  }

  const observations = new Map();
  for (const ep of episodes) {
    const tokens = unique([...(ep.input_tokens || []), ...(ep.output_tokens || [])]);
    for (const token of tokens) {
      if (!observations.has(token)) observations.set(token, new Map());
      const byChannel = observations.get(token);
      for (const [index, value] of ep.channels) {
        if (!byChannel.has(index)) byChannel.set(index, []);
        byChannel.get(index).push({ episode: ep.id, value });
      }
    }
  }

  const resolved = new Map();
  for (const [token, byChannel] of observations) {
    const relations = [];
    for (const [index, obs] of byChannel) {
      if (unique(channelValues.get(index) || []).length < 2) continue;
      if (obs.length < 1 + minLaterSupport) continue;
      const proposed = obs[0];
      const later = obs.slice(1);
      const variants = unique(obs.map(x => x.value));
      if (variants.length !== 1) continue;
      relations.push({
        channel: index,
        value: variants[0],
        proposed_from: proposed.episode,
        support_episodes: later.map(x => x.episode),
        support: later.length,
      });
    }
    if (relations.length) resolved.set(token, relations);
  }
  return resolved;
}

function inferChannels(tokens, evidence) {
  const candidates = new Map();
  for (const token of tokens) for (const relation of evidence.get(token) || []) {
    if (!candidates.has(relation.channel)) candidates.set(relation.channel, []);
    candidates.get(relation.channel).push(relation);
  }
  const out = new Map();
  const unresolved = [];
  for (const [channel, relations] of candidates) {
    const values = unique(relations.map(r => r.value));
    if (values.length === 1) out.set(channel, values[0]);
    else unresolved.push(channel);
  }
  return { channels: out, unresolved };
}

function inferChannelRelations(episodes, known) {
  const out = new Map(known);
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const [sourceIndex, sourceValue] of [...out]) {
      const matching = episodes.filter(ep => ep.channels.has(sourceIndex) && same(ep.channels.get(sourceIndex), sourceValue));
      if (matching.length < 2) continue;
      const targets = unique(matching.flatMap(ep => [...ep.channels.keys()]));
      for (const target of targets) {
        if (out.has(target)) continue;
        const values = matching.filter(ep => ep.channels.has(target)).map(ep => ep.channels.get(target));
        if (values.length < 2) continue;
        const variants = unique(values);
        if (variants.length === 1) { out.set(target, variants[0]); changed = true; }
      }
    }
    if (!changed) break;
  }
  return out;
}

function tokenSet(tokens) { return new Set(tokens || []); }
function jaccard(aTokens, bTokens) {
  const a = tokenSet(aTokens), b = tokenSet(bTokens);
  if (!a.size && !b.size) return 1;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
}
function bigrams(tokens) {
  const out = [];
  for (let i = 0; i + 1 < (tokens || []).length; i++) out.push(`${stable(tokens[i])}>${stable(tokens[i + 1])}`);
  return out;
}
function structuralSimilarity(a, b) {
  return 0.72 * jaccard(a, b) + 0.28 * jaccard(bigrams(a), bigrams(b));
}

function consensusOutputTemplate(neighbors) {
  if (!neighbors.length) return null;
  const outputs = neighbors.map(x => x.output_tokens || []);
  const lengths = unique(outputs.map(x => x.length));
  if (lengths.length !== 1) return null;
  const template = [];
  for (let i = 0; i < lengths[0]; i++) {
    const values = unique(outputs.map(x => x[i]));
    template.push(values.length === 1 ? { constant: values[0] } : { variable_position: i });
  }
  return template;
}

function tokenForChannelValue(episodes, channelIndex, channelValue, outputPosition) {
  const values = [];
  for (const ep of episodes) {
    if (!ep.channels.has(channelIndex) || !same(ep.channels.get(channelIndex), channelValue)) continue;
    if (!ep.output_tokens || outputPosition >= ep.output_tokens.length) continue;
    values.push(ep.output_tokens[outputPosition]);
  }
  const variants = unique(values);
  return variants.length === 1 && values.length ? variants[0] : undefined;
}

function fillOutputTemplate(template, episodes, channels) {
  if (!template) return { tokens: null, unresolved: ['template'] };
  const tokens = [], unresolved = [];
  for (let i = 0; i < template.length; i++) {
    const part = template[i];
    if (Object.prototype.hasOwnProperty.call(part, 'constant')) { tokens.push(part.constant); continue; }
    const candidates = [];
    for (const [channelIndex, channelValue] of channels) {
      const token = tokenForChannelValue(episodes, channelIndex, channelValue, i);
      if (token !== undefined) candidates.push(token);
    }
    const variants = unique(candidates);
    if (variants.length !== 1) { tokens.push(null); unresolved.push(i); }
    else tokens.push(variants[0]);
  }
  return { tokens: unresolved.length ? null : tokens, unresolved };
}

function renderTokens(tokens) {
  return tokens ? tokens.join(' ').replace(/\s+([?.!,;:])/g, '$1') : null;
}

// Existing generic exact sequence recompression is reused strictly as a derived
// view over M-owned occurrences. It owns no persistent truth/meaning state.
function sequenceStructure(episodes) {
  const stream = [];
  for (const ep of episodes) {
    for (const token of ep.input_tokens || []) stream.push({ stream: 'input', token });
    stream.push({ boundary: ep.id, stream: 'input' });
    for (const token of ep.output_tokens || []) stream.push({ stream: 'output', token });
    if (ep.output_tokens) stream.push({ boundary: ep.id, stream: 'output' });
  }
  const structure = Sequence.recompress(null, stream, { maxRules: 96 });
  return {
    raw_events: stream.length,
    learned_relations: Sequence.learnedExpansions(structure),
    exact_reconstruction: Sequence.decode(structure),
    description_length: structure.description_length,
    authority: 'derived_view_of_M',
  };
}

function deriveSequenceCompletion(state, currentId, inputTokens) {
  const episodes = currentSequenceEpisodes(state);
  const historical = episodes.filter(ep => ep.id !== currentId && ep.input_tokens);
  const training = historical.filter(ep => ep.output_tokens && ep.output_tokens.length);
  const evidence = tokenChannelEvidence(historical);
  const initial = inferChannels(inputTokens, evidence);
  const channels = inferChannelRelations(historical, initial.channels);
  const ranked = training.map(ep => ({ ep, score: structuralSimilarity(inputTokens, ep.input_tokens) }))
    .sort((a, b) => b.score - a.score || a.ep.id.localeCompare(b.ep.id));
  const best = ranked[0]?.score || 0;
  const neighbors = ranked.filter(x => x.score >= Math.max(0.35, best - 0.08)).slice(0, 32).map(x => x.ep);
  const template = consensusOutputTemplate(neighbors);
  const filled = fillOutputTemplate(template, historical, channels);
  return {
    input_tokens: inputTokens.slice(),
    inferred_channels: [...channels.entries()].sort((a, b) => a[0] - b[0]).map(([index, value]) => ({ index, value })),
    unresolved_channels: initial.unresolved.slice().sort((a, b) => a - b),
    neighbor_count: neighbors.length,
    best_structural_similarity: best,
    output_template: template,
    output_tokens: filled.tokens,
    unresolved_output_positions: filled.unresolved,
    expression: renderTokens(filled.tokens),
    recurrence: sequenceStructure(episodes),
    authority: 'derived_from_retained_M_only',
  };
}

// ---------------------------------------------------------------------------
// Self and extensible actuator boundary.
// Actuator IDs are ordinary M facts. The numeric motor index used by canonical
// embodiment is merely the stable physical ordinal assigned at first contact.
// ---------------------------------------------------------------------------

function actuatorDescriptors(state) {
  const out = [];
  for (const fact of state.knowledge?.facts || []) {
    if (fact.subject === 'self' && fact.relation === 'ρ:has_actuator' && fact.object && Number.isInteger(fact.object.index)) out.push(fact.object);
  }
  return out.sort((a, b) => a.index - b.index);
}

function newActuatorFacts(state, requested) {
  const known = actuatorDescriptors(state);
  const byId = new Map(known.map(x => [stable(x.id), x]));
  let next = known.length ? Math.max(...known.map(x => x.index)) + 1 : 0;
  const facts = [];
  for (const id of requested || []) {
    const key = stable(id);
    if (byId.has(key)) continue;
    const descriptor = { id, index: next++ };
    byId.set(key, descriptor);
    facts.push(['self', 'ρ:has_actuator', descriptor]);
  }
  return { facts, count: Math.max(state.action_count, next) };
}

function selfFrameFacts(state, frame) {
  if (!frame) return [];
  const cut = frame.length - state.concern_count;
  const index = state.contacts.length + 1;
  const facts = [['self', 'ρ:experienced', { frame_contact_index: index }]];
  for (let i = 0; i < cut; i++) facts.push(['self', 'ρ:has_receptor', { kind: 'numeric', index: i }]);
  for (let i = 0; i < state.concern_count; i++) facts.push(['self', 'ρ:has_internal_channel', { index: i }]);
  if (state.previous_contact && state.motor != null) facts.push(['self', 'ρ:caused', { motor_index: state.motor, transition_to_frame: index }]);
  return facts;
}

function one(actionCount, concernCount = 1) {
  const state = Base.one(actionCount, concernCount);
  const facts = [
    ['self', 'ρ:kind', 'persistent_individual'],
    ['self', 'ρ:continuity', 'same_M'],
  ];
  for (let i = 0; i < actionCount; i++) facts.push(['self', 'ρ:has_actuator', { id: `motor:${i}`, index: i }]);
  Base.C(state, { relations: { facts } });
  return state;
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');

  if (Array.isArray(realityContact)) {
    const frame = realityContact.slice();
    Base.C(state, { frame, relations: { facts: selfFrameFacts(state, frame) } });
    settleInvariantChannels(state, frame);
    return state;
  }
  if (!realityContact || typeof realityContact !== 'object') throw new Error('invalid reality-contact');

  const frame = Array.isArray(realityContact.frame) ? realityContact.frame.slice() : null;
  const surface = realityContact.surface ? surfaceFacts(state, realityContact.surface) : null;
  const actuator = newActuatorFacts(state, Array.isArray(realityContact.actuators) ? realityContact.actuators : []);
  state.action_count = actuator.count;

  const external = realityContact.relations || {};
  const facts = [
    ...(Array.isArray(external.facts) ? external.facts : []),
    ...actuator.facts,
    ...selfFrameFacts(state, frame),
    ...(surface ? surface.facts : []),
  ];
  const rules = Array.isArray(external.rules) ? external.rules : [];
  const hasRelations = facts.length || rules.length;

  if (!frame && !hasRelations) throw new Error('invalid reality-contact');
  const contact = {};
  if (frame) contact.frame = frame;
  if (hasRelations) contact.relations = { facts, rules };
  Base.C(state, contact);

  if (frame) settleInvariantChannels(state, frame);
  if (surface) {
    const derived = deriveSequenceCompletion(state, surface.id, surface.inputTokens);
    state.current = state.current && typeof state.current === 'object' ? state.current : {};
    state.current.sequence = derived;
  }
  return state;
}

module.exports = { one, C };
