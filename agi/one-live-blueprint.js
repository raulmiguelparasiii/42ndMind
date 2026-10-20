'use strict';

// Experimental blueprint-conformance extension over canonical one-mind.js.
//
// Fundamental law:
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// This file owns NO parallel cognitive state. one() returns canonical M. C() is
// one developmental entrypoint. New machinery below is content-neutral:
//   (1) zero-entropy completion for explicitly unobserved numeric channels;
//   (2) exact ordered-sequence contact stored as ordinary first-class M facts;
//   (3) query-relative analogical completion derived from those retained facts.
//
// The sequence path knows only occurrence identity, order, equality/difference,
// recurrence, arbitrary accompanying channels, and structural similarity. It has
// no English dictionary, intent labels, planner, semantic status ledger, or
// canned response table. Text tokenization is a mechanical S-boundary convenience
// and can be replaced by any other ordered discrete receptor stream.

const Base = require('../one-mind.js');

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function same(a, b) { return stable(a) === stable(b); }
function unique(values) {
  const map = new Map();
  for (const value of values || []) map.set(stable(value), value);
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Numeric-contact settling: a historically zero-entropy channel is still an
// exact relation even though an information-gain learner assigns it zero gain.
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
// Ordered discrete S boundary. Tokenization does not assign meaning; raw contact
// is retained beside the mechanical token sequence so the transduction is auditable.
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
    else if (fact.relation === 'ρ:contact_channel' && fact.object && Number.isInteger(fact.object.index)) {
      ep.channels.set(fact.object.index, fact.object.value);
    }
  }
  return [...groups.values()].sort((a, b) => Number(a.id.split(':').at(-1)) - Number(b.id.split(':').at(-1)));
}

function tokenChannelEvidence(episodes, minSupport = 2) {
  const channelValues = new Map();
  for (const ep of episodes) {
    for (const [index, value] of ep.channels) {
      if (!channelValues.has(index)) channelValues.set(index, []);
      channelValues.get(index).push(value);
    }
  }
  const evidence = new Map();
  for (const ep of episodes) {
    const tokens = unique([...(ep.input_tokens || []), ...(ep.output_tokens || [])]);
    for (const token of tokens) {
      if (!evidence.has(token)) evidence.set(token, new Map());
      const byChannel = evidence.get(token);
      for (const [index, value] of ep.channels) {
        if (!byChannel.has(index)) byChannel.set(index, []);
        byChannel.get(index).push(value);
      }
    }
  }
  const resolved = new Map();
  for (const [token, byChannel] of evidence) {
    const relations = [];
    for (const [index, values] of byChannel) {
      if (values.length < minSupport) continue;
      if (unique(channelValues.get(index) || []).length < 2) continue;
      const variants = unique(values);
      if (variants.length === 1) relations.push({ channel: index, value: variants[0], support: values.length });
    }
    if (relations.length) resolved.set(token, relations);
  }
  return resolved;
}

function inferChannels(tokens, tokenEvidence) {
  const candidates = new Map();
  for (const token of tokens) {
    for (const relation of tokenEvidence.get(token) || []) {
      if (!candidates.has(relation.channel)) candidates.set(relation.channel, []);
      candidates.get(relation.channel).push(relation);
    }
  }
  const out = new Map();
  const unresolved = [];
  for (const [channel, relations] of candidates) {
    const values = unique(relations.map(r => r.value));
    if (values.length === 1) {
      out.set(channel, values[0]);
    } else unresolved.push(channel);
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
      const targetIndexes = unique(matching.flatMap(ep => [...ep.channels.keys()]));
      for (const targetIndex of targetIndexes) {
        if (out.has(targetIndex)) continue;
        const values = matching.filter(ep => ep.channels.has(targetIndex)).map(ep => ep.channels.get(targetIndex));
        if (values.length < 2) continue;
        const variants = unique(values);
        if (variants.length === 1) {
          out.set(targetIndex, variants[0]);
          changed = true;
        }
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
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  return intersection / (a.size + b.size - intersection || 1);
}
function bigrams(tokens) {
  const out = [];
  for (let i = 0; i + 1 < (tokens || []).length; i++) out.push(`${stable(tokens[i])}>${stable(tokens[i + 1])}`);
  return out;
}
function structuralSimilarity(a, b) {
  // Equality/order recurrence only. Exact token names affect similarity merely as
  // observed values; there is no vocabulary-specific weighting or stopword list.
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
  return variants.length === 1 && values.length >= 1 ? variants[0] : undefined;
}

function fillOutputTemplate(template, episodes, channels) {
  if (!template) return { tokens: null, unresolved: ['template'] };
  const tokens = [];
  const unresolved = [];
  for (let i = 0; i < template.length; i++) {
    const part = template[i];
    if (Object.prototype.hasOwnProperty.call(part, 'constant')) {
      tokens.push(part.constant);
      continue;
    }
    const candidates = [];
    for (const [channelIndex, channelValue] of channels) {
      const token = tokenForChannelValue(episodes, channelIndex, channelValue, i);
      if (token !== undefined) candidates.push(token);
    }
    const variants = unique(candidates);
    if (variants.length !== 1) {
      tokens.push(null);
      unresolved.push(i);
    } else tokens.push(variants[0]);
  }
  return { tokens: unresolved.length ? null : tokens, unresolved };
}

function renderTokens(tokens) {
  if (!tokens) return null;
  return tokens.join(' ').replace(/\s+([?.!,;:])/g, '$1');
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
  // Keep the strongest structural neighborhood rather than one memorized case.
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
    authority: 'derived_from_retained_M_only',
  };
}

function one(actionCount, concernCount = 1) {
  return Base.one(actionCount, concernCount);
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');

  // Ordered sequence contact is first transduced into ordinary relational R, then
  // canonical C ingests it. No sequence-learning state exists outside M.
  if (realityContact && typeof realityContact === 'object' && realityContact.surface) {
    const transduced = surfaceFacts(state, realityContact.surface);
    Base.C(state, { relations: { facts: transduced.facts } });
    const derived = deriveSequenceCompletion(state, transduced.id, transduced.inputTokens);
    state.current = state.current && typeof state.current === 'object' ? state.current : {};
    state.current.sequence = derived;
    return state;
  }

  Base.C(state, realityContact);
  let frame = null;
  if (Array.isArray(realityContact)) frame = realityContact;
  else if (realityContact && Array.isArray(realityContact.frame)) frame = realityContact.frame;
  if (frame) settleInvariantChannels(state, frame);
  return state;
}

module.exports = { one, C };
