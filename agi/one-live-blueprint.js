'use strict';

// One-live-M blueprint extension.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// one() returns canonical M from one-mind.js. This file owns no second cognitive
// state. C() is one developmental entrypoint for concurrent numeric contact,
// ordered discrete contact, structured relational contact, and new actuators.
// Durable cognitive content lives in canonical M; helpers are content-neutral
// transformations or disposable views over that one state.

const Base = require('../one-mind.js');
const Sequence = require('../sequence-recompression.js');

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

// ---------------------------------------------------------------------------
// Exact numeric contact. Zero-entropy structure is still exactly completable.
// ---------------------------------------------------------------------------

function invariantValueAt(state, i, minSupport = 4) {
  const values = [];
  for (const frame of state.contacts || []) {
    const cut = frame.length - state.concern_count;
    if (i >= cut) continue;
    if (frame[i] !== null && frame[i] !== undefined) values.push(frame[i]);
  }
  if (values.length < minSupport || unique(values).length !== 1) return { complete: false };
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
    const inv = invariantValueAt(state, i);
    if (!inv.complete) continue;
    state.current.completed[feature] = inv.value;
    inferred.add(feature);
    completions.push({ feature, value: inv.value, support: inv.support, kind: 'zero_entropy_invariant' });
  }
  state.current.inferred = [...inferred].sort();
  state.current.invariant_completions = completions;
}

// ---------------------------------------------------------------------------
// Mechanical ordered-sequence S boundary. It segments but does not interpret.
// ---------------------------------------------------------------------------

function tokenize(raw) {
  return String(raw ?? '').toLowerCase().match(/[\p{L}\p{N}']+|[^\s\p{L}\p{N}]/gu) || [];
}

function surfaceFacts(state, contact) {
  const id = `sequence-contact:${state.knowledge.episodes.length + 1}`;
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
  for (let i = 0; i < (contact.channels || []).length; i++) {
    const value = contact.channels[i];
    if (value !== null && value !== undefined) facts.push([id, 'ρ:contact_channel', { index: i, value }]);
  }
  return { id, facts, inputTokens };
}

function sequenceEpisodes(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    if (typeof f.subject !== 'string' || !f.subject.startsWith('sequence-contact:')) continue;
    if (!groups.has(f.subject)) groups.set(f.subject, { id: f.subject, channels: new Map() });
    const e = groups.get(f.subject);
    if (f.relation === 'ρ:input_raw') e.input_raw = f.object;
    else if (f.relation === 'ρ:input_tokens' && Array.isArray(f.object)) e.input_tokens = f.object.slice();
    else if (f.relation === 'ρ:output_raw') e.output_raw = f.object;
    else if (f.relation === 'ρ:output_tokens' && Array.isArray(f.object)) e.output_tokens = f.object.slice();
    else if (f.relation === 'ρ:contact_channel' && f.object && Number.isInteger(f.object.index)) e.channels.set(f.object.index, f.object.value);
  }
  return [...groups.values()].sort((a, b) => Number(a.id.split(':').at(-1)) - Number(b.id.split(':').at(-1)));
}

// A token/channel proposal needs later recurrence before it can be used. A token
// whose channel value changes is not silently collapsed to one timeless fact.
function tokenChannelEvidence(episodes, minLaterSupport = 1) {
  const channelValues = new Map();
  for (const e of episodes) for (const [i, v] of e.channels) {
    if (!channelValues.has(i)) channelValues.set(i, []);
    channelValues.get(i).push(v);
  }
  const obs = new Map();
  for (const e of episodes) {
    const tokens = unique([...(e.input_tokens || []), ...(e.output_tokens || [])]);
    for (const token of tokens) {
      if (!obs.has(token)) obs.set(token, new Map());
      for (const [i, v] of e.channels) {
        const by = obs.get(token);
        if (!by.has(i)) by.set(i, []);
        by.get(i).push({ episode: e.id, value: v });
      }
    }
  }
  const resolved = new Map();
  for (const [token, by] of obs) {
    const rels = [];
    for (const [i, observations] of by) {
      if (unique(channelValues.get(i) || []).length < 2) continue;
      if (observations.length < 1 + minLaterSupport) continue;
      const values = unique(observations.map(x => x.value));
      if (values.length !== 1) continue;
      rels.push({
        channel: i,
        value: values[0],
        proposed_from: observations[0].episode,
        support_episodes: observations.slice(1).map(x => x.episode),
        support: observations.length - 1,
      });
    }
    if (rels.length) resolved.set(token, rels);
  }
  return resolved;
}

function inferChannels(tokens, evidence) {
  const candidates = new Map();
  for (const token of tokens) for (const r of evidence.get(token) || []) {
    if (!candidates.has(r.channel)) candidates.set(r.channel, []);
    candidates.get(r.channel).push(r);
  }
  const out = new Map(), unresolved = [];
  for (const [i, rs] of candidates) {
    const values = unique(rs.map(r => r.value));
    if (values.length === 1) out.set(i, values[0]);
    else unresolved.push(i);
  }
  return { channels: out, unresolved };
}

// Current-state inference retains all old episodes but permits a later repeated
// stable segment to supersede an earlier state for the present completion.
function currentValue(values, minCurrentSupport = 2) {
  if (!values.length) return undefined;
  if (unique(values).length === 1) return values[0];
  const last = values.at(-1);
  let run = 0;
  for (let i = values.length - 1; i >= 0 && same(values[i], last); i--) run++;
  return run >= minCurrentSupport ? last : undefined;
}

function inferChannelRelations(episodes, known) {
  const out = new Map(known);
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const [sourceIndex, sourceValue] of [...out]) {
      const matching = episodes.filter(e => e.channels.has(sourceIndex) && same(e.channels.get(sourceIndex), sourceValue));
      if (matching.length < 2) continue;
      const targets = unique(matching.flatMap(e => [...e.channels.keys()]));
      for (const target of targets) {
        if (out.has(target)) continue;
        const values = matching.filter(e => e.channels.has(target)).map(e => e.channels.get(target));
        const value = currentValue(values);
        if (value !== undefined) { out.set(target, value); changed = true; }
      }
    }
    if (!changed) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Generic structural neighborhood and role induction.
// ---------------------------------------------------------------------------

function tokenSet(xs) { return new Set(xs || []); }
function jaccard(a0, b0) {
  const a = tokenSet(a0), b = tokenSet(b0);
  if (!a.size && !b.size) return 1;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
}
function bigrams(xs) {
  const out = [];
  for (let i = 0; i + 1 < (xs || []).length; i++) out.push(`${stable(xs[i])}>${stable(xs[i + 1])}`);
  return out;
}
function structuralSimilarity(a, b) {
  return 0.72 * jaccard(a, b) + 0.28 * jaccard(bigrams(a), bigrams(b));
}

function outputTemplate(neighbors) {
  if (!neighbors.length) return null;
  const outputs = neighbors.map(e => e.output_tokens || []);
  const lengths = unique(outputs.map(x => x.length));
  if (lengths.length !== 1) return null;
  const template = [];
  for (let i = 0; i < lengths[0]; i++) {
    const values = unique(outputs.map(x => x[i]));
    template.push(values.length === 1 ? { constant: values[0] } : { variable_position: i });
  }
  return template;
}

// Learn which arbitrary contact channel fills a varying expression position.
// A good role preserves a deterministic value→surface relation and is preferred
// when the same channel value is reused across multiple independent individuals,
// because that is a shorter relational description than entity memorization.
function inferOutputRoles(neighbors, template) {
  const roles = [];
  if (!template) return roles;
  const channelIndexes = unique(neighbors.flatMap(e => [...e.channels.keys()]));
  for (let pos = 0; pos < template.length; pos++) {
    if (!Object.prototype.hasOwnProperty.call(template[pos], 'variable_position')) continue;
    const candidates = [];
    for (const channel of channelIndexes) {
      const mapping = new Map();
      let observations = 0, conflict = false;
      for (const e of neighbors) {
        if (!e.channels.has(channel) || !e.output_tokens || pos >= e.output_tokens.length) continue;
        observations++;
        const key = stable(e.channels.get(channel));
        const token = e.output_tokens[pos];
        if (mapping.has(key) && mapping.get(key) !== token) { conflict = true; break; }
        mapping.set(key, token);
      }
      if (conflict || observations < 2 || mapping.size < 2) continue;
      const reuse = observations / mapping.size;
      candidates.push({ channel, observations, distinct_values: mapping.size, reuse });
    }
    candidates.sort((a, b) => b.reuse - a.reuse || b.observations - a.observations || a.channel - b.channel);
    if (candidates.length) roles.push({ position: pos, ...candidates[0] });
  }
  return roles;
}

function tokenForChannelValue(episodes, channel, value, pos) {
  const tokens = [];
  for (const e of episodes) {
    if (!e.channels.has(channel) || !same(e.channels.get(channel), value)) continue;
    if (!e.output_tokens || pos >= e.output_tokens.length) continue;
    tokens.push(e.output_tokens[pos]);
  }
  const variants = unique(tokens);
  return variants.length === 1 && tokens.length ? variants[0] : undefined;
}

function fillTemplate(template, neighbors, historical, channels, roles) {
  if (!template) return { tokens: null, unresolved: ['template'] };
  const roleByPos = new Map(roles.map(r => [r.position, r]));
  const tokens = [], unresolved = [];
  for (let pos = 0; pos < template.length; pos++) {
    const part = template[pos];
    if (Object.prototype.hasOwnProperty.call(part, 'constant')) { tokens.push(part.constant); continue; }

    let token;
    const role = roleByPos.get(pos);
    if (role && channels.has(role.channel)) {
      const value = channels.get(role.channel);
      token = tokenForChannelValue(neighbors, role.channel, value, pos);
      if (token === undefined) token = tokenForChannelValue(historical, role.channel, value, pos);
    }

    // Fallback for cases where several inferred relations independently imply the
    // same surface value. This preserves the simpler earlier single-role cases.
    if (token === undefined) {
      const candidates = [];
      for (const [channel, value] of channels) {
        let t = tokenForChannelValue(neighbors, channel, value, pos);
        if (t === undefined) t = tokenForChannelValue(historical, channel, value, pos);
        if (t !== undefined) candidates.push(t);
      }
      const variants = unique(candidates);
      if (variants.length === 1) token = variants[0];
    }

    if (token === undefined) { tokens.push(null); unresolved.push(pos); }
    else tokens.push(token);
  }
  return { tokens: unresolved.length ? null : tokens, unresolved };
}

function renderTokens(tokens) {
  return tokens ? tokens.join(' ').replace(/\s+([?.!,;:])/g, '$1') : null;
}

// Existing exact sequence recompression is a derived view over M-owned contact.
function sequenceStructure(episodes) {
  const stream = [];
  for (const e of episodes) {
    for (const token of e.input_tokens || []) stream.push({ stream: 'input', token });
    stream.push({ boundary: e.id, stream: 'input' });
    for (const token of e.output_tokens || []) stream.push({ stream: 'output', token });
    if (e.output_tokens) stream.push({ boundary: e.id, stream: 'output' });
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
  const episodes = sequenceEpisodes(state);
  const historical = episodes.filter(e => e.id !== currentId && e.input_tokens);
  const training = historical.filter(e => e.output_tokens && e.output_tokens.length);
  const evidence = tokenChannelEvidence(historical);
  const initial = inferChannels(inputTokens, evidence);
  const channels = inferChannelRelations(historical, initial.channels);

  const ranked = training.map(e => ({ e, score: structuralSimilarity(inputTokens, e.input_tokens) }))
    .sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));
  const best = ranked[0]?.score || 0;
  const neighbors = ranked.filter(x => x.score >= Math.max(0.35, best - 0.08)).slice(0, 48).map(x => x.e);
  const template = outputTemplate(neighbors);
  const roles = inferOutputRoles(neighbors, template);
  const filled = fillTemplate(template, neighbors, historical, channels, roles);

  return {
    input_tokens: inputTokens.slice(),
    inferred_channels: [...channels.entries()].sort((a, b) => a[0] - b[0]).map(([index, value]) => ({ index, value })),
    unresolved_channels: initial.unresolved.slice().sort((a, b) => a - b),
    neighbor_count: neighbors.length,
    best_structural_similarity: best,
    output_template: template,
    output_roles: roles,
    output_tokens: filled.tokens,
    unresolved_output_positions: filled.unresolved,
    expression: renderTokens(filled.tokens),
    recurrence: sequenceStructure(episodes),
    authority: 'derived_from_retained_M_only',
  };
}

// ---------------------------------------------------------------------------
// Persistent self and open-ended physical action boundary.
// ---------------------------------------------------------------------------

function actuatorDescriptors(state) {
  return (state.knowledge?.facts || [])
    .filter(f => f.subject === 'self' && f.relation === 'ρ:has_actuator' && f.object && Number.isInteger(f.object.index))
    .map(f => f.object)
    .sort((a, b) => a.index - b.index);
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
  const contactIndex = state.contacts.length + 1;
  const facts = [['self', 'ρ:experienced', { frame_contact_index: contactIndex }]];
  for (let i = 0; i < cut; i++) facts.push(['self', 'ρ:has_receptor', { kind: 'numeric', index: i }]);
  for (let i = 0; i < state.concern_count; i++) facts.push(['self', 'ρ:has_internal_channel', { index: i }]);
  if (state.previous_contact && state.motor != null) facts.push(['self', 'ρ:caused', { motor_index: state.motor, transition_to_frame: contactIndex }]);
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
  const actuators = newActuatorFacts(state, Array.isArray(realityContact.actuators) ? realityContact.actuators : []);
  state.action_count = actuators.count;

  const ext = realityContact.relations || {};
  const facts = [
    ...(Array.isArray(ext.facts) ? ext.facts : []),
    ...actuators.facts,
    ...selfFrameFacts(state, frame),
    ...(surface ? surface.facts : []),
  ];
  const rules = Array.isArray(ext.rules) ? ext.rules : [];
  if (!frame && !facts.length && !rules.length) throw new Error('invalid reality-contact');

  const contact = {};
  if (frame) contact.frame = frame;
  if (facts.length || rules.length) contact.relations = { facts, rules };
  Base.C(state, contact);
  if (frame) settleInvariantChannels(state, frame);

  // Expensive query-relative sequence completion/recompression is only needed
  // when the surface did not already carry an observed output. Training contact
  // remains exact M content without repeatedly rescanning the whole life.
  if (surface && (realityContact.surface.output === undefined || realityContact.surface.output === null)) {
    state.current = state.current && typeof state.current === 'object' ? state.current : {};
    state.current.sequence = deriveSequenceCompletion(state, surface.id, surface.inputTokens);
  }
  return state;
}

module.exports = { one, C };
