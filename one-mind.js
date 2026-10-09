'use strict';

// Unified embodied 42ndMind.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// There is one cognitive authority: reality-preserving recompression. The two
// helpers below are not planner/memory/policy faculties. They are already-tested
// finite realizations of the same C objective over two structures that reality
// supplies simultaneously: co-present relations and succession of contacts.
// Their outputs are recursively fed back into the same present M.
//
// Nothing here names food, water, danger, shelter, reward, success, curiosity,
// plans, scenes, goals, or good actions. Exact lived transitions remain the
// grounding. Learned structure can reorganize because it is rebuilt from that
// grounding whenever reality changes.

const Sim = require('./recursive-recompression.js');
const Order = require('./sequence-recompression.js');

const LESS = 'less';
const SAME = 'same';
const GREATER = 'greater';

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function same(a, b) { return stable(a) === stable(b); }

function splitContact(state, frame) {
  const cut = frame.length - state.concern_count;
  return { percept: frame.slice(0, cut), concern: frame.slice(cut) };
}

function magnitudeOrder(after, before) {
  if (after < before) return LESS;
  if (after > before) return GREATER;
  return SAME;
}

// Channel decomposition is not scene extraction. A body/sensor interface already
// supplies distinct simultaneous channels. C is simply allowed to notice that a
// relation can recur on one channel even when the rest of the percept differs.
function presentFeatures(state, frame) {
  const contact = splitContact(state, frame);
  const values = {};
  for (let i = 0; i < contact.percept.length; i++) values[`p${i}`] = contact.percept[i];
  for (let i = 0; i < contact.concern.length; i++) {
    values[`c${i}`] = contact.concern[i];
    values[`c${i}_open`] = contact.concern[i] > 0;
  }
  return { contact, values };
}

function directSamples(state) {
  return state.experiences.map((experience, index) => {
    const start = presentFeatures(state, experience.before);
    const end = splitContact(state, experience.after);
    const values = { ...start.values, action: experience.action, relation_kind: 'direct', relation_depth: 0 };
    for (let i = 0; i < state.concern_count; i++) {
      const order = magnitudeOrder(end.concern[i], start.contact.concern[i]);
      values[`immediate_c${i}_order`] = order;
      values[`relation_c${i}_order`] = order;
    }
    return { id: `e${index}`, values };
  });
}

function expandedSample(sim, sample) {
  return Sim.predict(sim, sample.values).expanded_experience;
}

function baseDependencies(feature, byFeature, trail = new Set()) {
  const symbol = byFeature.get(feature);
  if (!symbol) return new Set([feature]);
  if (trail.has(feature)) return new Set();
  const nextTrail = new Set(trail); nextTrail.add(feature);
  const out = new Set();
  for (const atom of symbol.definition) {
    for (const dependency of baseDependencies(atom.feature, byFeature, nextTrail)) out.add(dependency);
  }
  return out;
}

function groundedSimultaneousSymbols(sim) {
  const byFeature = new Map(sim.symbols.map(symbol => [symbol.feature, symbol]));
  const safe = new Set();
  for (const symbol of sim.symbols) {
    const dependencies = baseDependencies(symbol.feature, byFeature);
    // Ordered descriptions are outputs of temporal C. They may be used by later
    // judgment, but they may not be fed back as evidence for discovering their
    // own temporal existence. Only direct percept/body/action/transition features
    // may ground an event token used by order compression.
    if ([...dependencies].every(feature => !feature.startsWith('relation_'))) safe.add(symbol.feature);
  }
  return safe;
}

// The event token is a compressed description of an experienced transition.
// Only simultaneous symbols whose definitions reduce entirely to directly
// grounded features are admitted, preventing circular self-supporting foresight.
function eventToken(state, sim, sample) {
  const expanded = expandedSample(sim, sample);
  const grounded = groundedSimultaneousSymbols(sim);
  const learned = Object.keys(expanded)
    .filter(key => key.startsWith('§') && expanded[key] === true && grounded.has(key))
    .sort();
  const orders = [];
  for (let i = 0; i < state.concern_count; i++) orders.push(sample.values[`immediate_c${i}_order`]);
  return { action: sample.values.action, orders, learned };
}

function occurrenceAt(tokens, start, expansion) {
  if (start + expansion.length > tokens.length) return false;
  for (let j = 0; j < expansion.length; j++) if (!same(tokens[start + j], expansion[j])) return false;
  return true;
}

function temporalDescriptions(state, samples, tokens, orderState) {
  const descriptions = Array(samples.length).fill(null);
  const expansions = Order.learnedExpansions(orderState);

  // C itself decides which ordered description is reusable. When several learned
  // descriptions start at the same lived contact, the one that saved more code
  // has greater representational authority; depth/extent only break exact ties.
  for (const learned of expansions) {
    const length = learned.expansion.length;
    if (length < 2) continue;
    for (let i = 0; i + length <= tokens.length; i++) {
      if (!occurrenceAt(tokens, i, learned.expansion)) continue;
      const candidate = { symbol: learned.symbol, depth: learned.depth, length, savings: learned.savings };
      const old = descriptions[i];
      if (!old || candidate.savings > old.savings ||
          (candidate.savings === old.savings && candidate.depth > old.depth) ||
          (candidate.savings === old.savings && candidate.depth === old.depth && candidate.length > old.length)) {
        descriptions[i] = candidate;
      }
    }
  }
  return descriptions;
}

function annotateTemporalRelations(state, baseSamples, descriptions) {
  return baseSamples.map((sample, index) => {
    const values = { ...sample.values };
    const description = descriptions[index];
    if (!description) return { id: sample.id, values };

    const first = state.experiences[index];
    const last = state.experiences[index + description.length - 1];
    if (!first || !last) return { id: sample.id, values };
    const before = splitContact(state, first.before).concern;
    const after = splitContact(state, last.after).concern;

    // This is not temporal credit assignment. The sequence already became one
    // learned relation by exact order compression. We now expose ordinary endpoint
    // relations of that learned whole so the same C can reuse it like any other
    // relation. Intermediate adverse changes remain in the exact expansion.
    values.relation_kind = 'ordered';
    values.relation_depth = description.depth;
    values.relation_symbol = description.symbol;
    values.relation_extent = description.length;
    for (let i = 0; i < state.concern_count; i++) {
      values[`relation_c${i}_order`] = magnitudeOrder(after[i], before[i]);
    }
    return { id: sample.id, values };
  });
}

function recompressWhole(state) {
  if (state.experiences.length < 4) {
    return {
      simultaneous: Sim.one(),
      ordered: Order.one(),
      samples: directSamples(state),
      tokens: [],
      fixed_point_passes: 0,
    };
  }

  let samples = directSamples(state);
  let previousKey = '';
  let simultaneous = Sim.one();
  let ordered = Order.one();
  let tokens = [];
  let passes = 0;

  // Reapply the same C to its own descriptions until this finite implementation
  // stops changing, with a finite search guard. The guard limits computation, not
  // semantic depth: later contacts can reopen the process and grow it further.
  for (let pass = 0; pass < 3; pass++) {
    simultaneous = Sim.recompress(Sim.one(), samples, {
      maxConditions: 2,
      maxPasses: 2,
      maxSymbolsPerPass: 6,
    });
    tokens = samples.map(sample => eventToken(state, simultaneous, sample));
    ordered = Order.recompress(Order.one(), tokens, { maxRules: 64 });
    const descriptions = temporalDescriptions(state, samples, tokens, ordered);
    const next = annotateTemporalRelations(state, directSamples(state), descriptions);
    const key = stable(next.map(x => x.values));
    passes = pass + 1;
    samples = next;
    if (key === previousKey) break;
    previousKey = key;
  }

  // Final simultaneous C sees the current fixed-point temporal descriptions.
  simultaneous = Sim.recompress(Sim.one(), samples, {
    maxConditions: 2,
    maxPasses: 2,
    maxSymbolsPerPass: 6,
  });
  return { simultaneous, ordered, samples, tokens, fixed_point_passes: passes };
}

function groundedCompletion(state, frame) {
  if (!state.structure || state.experiences.length < 4) return null;
  const present = presentFeatures(state, frame);
  const purpose = { ...present.values };
  let open = 0;

  // For primitive bodily pressure, zero is absence by interface definition. A
  // non-zero channel therefore leaves an open relation. Asking whether a learned
  // relation completes with "less" is not assigning reward; it is completing the
  // same magnitude relation the body currently presents.
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) {
      purpose[`relation_c${i}_order`] = LESS;
      open++;
    }
  }
  if (!open) return null;

  const prediction = Sim.predict(state.structure.simultaneous, purpose);
  const completion = prediction.best_by_target.action;
  if (!completion || !Number.isInteger(completion.expected)) return null;
  const action = completion.expected;
  if (action < 0 || action >= state.action_count) return null;

  // Answerability check: do not preserve a purposive completion by insulating it
  // from a separately grounded bodily consequence. This checks every concern,
  // including one currently at zero, because an action may create a new pressure.
  const consequenceQuery = { ...present.values, action };
  const consequences = Sim.predict(state.structure.simultaneous, consequenceQuery).best_by_target;
  for (let i = 0; i < state.concern_count; i++) {
    const evidence = consequences[`relation_c${i}_order`];
    if (evidence && evidence.expected === GREATER) return null;
  }
  return action;
}

function spontaneousMotor(state) {
  // Embodied variability supplies contact when cognition is genuinely unresolved.
  // It is not an exploration policy: it has no access to uncertainty, counts,
  // reward, pressure, world semantics, or predicted outcomes.
  state.motor_variation = (Math.imul(state.motor_variation, 1664525) + 1013904223) >>> 0;
  return state.motor_variation % state.action_count;
}

function one(actionCount, concernCount = 1) {
  if (!Number.isInteger(actionCount) || actionCount < 1) throw new Error('actionCount must be positive');
  if (!Number.isInteger(concernCount) || concernCount < 1) throw new Error('concernCount must be positive');
  return {
    whole: 1,
    action_count: actionCount,
    concern_count: concernCount,
    contacts: [],
    experiences: [],
    previous_contact: null,
    motor: null,
    motor_variation: (0x9e3779b9 ^ actionCount ^ (concernCount << 8)) >>> 0,
    structure: {
      simultaneous: Sim.one(),
      ordered: Order.one(),
      samples: [],
      tokens: [],
      fixed_point_passes: 0,
    },
    prior: {
      stone: 'all materially relevant relations stay answerable to reality; signs are cognitive orientations, never outcome valence',
      onelogic: 'preserve undefeated possibilities; conclude only what grounded relations force; correction reopens any description defeated by later reality',
      embodiment: 'distinct perceptual channels, motor possibilities, and interoceptive pressure magnitudes are primitive physical interfaces, not learned world semantics',
      law: 'M(t+1)=C(M(t)⊕R(t+1)); C recursively recompresses simultaneous and successive reality-contact while retaining exact grounding',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  if (!Array.isArray(realityContact) || realityContact.length <= state.concern_count) throw new Error('invalid reality-contact');
  if (!realityContact.every(Number.isFinite)) throw new Error('reality-contact must be finite numeric perception');

  const frame = realityContact.slice();
  if (state.previous_contact && state.motor != null) {
    state.experiences.push({
      before: state.previous_contact.slice(),
      action: state.motor,
      after: frame.slice(),
    });
    state.structure = recompressWhole(state);
  }

  state.contacts.push(frame.slice());
  state.previous_contact = frame;
  const completion = groundedCompletion(state, frame);
  state.motor = completion == null ? spontaneousMotor(state) : completion;
  return state;
}

module.exports = { one, C };
