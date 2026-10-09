'use strict';

// Unified embodied 42ndMind.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// The embodied path intentionally has no scene recognizer, pressure bands,
// urgency/runway bands, reward, success/failure labels, fixed consequence
// horizon, sequence-replay rule, planner, policy, or future simulator.
//
// The body supplies only two primitive interfaces:
//   1. a finite set of motor commands;
//   2. reality-contact in which the final N channels are distinct interoceptive
//      concern magnitudes. Their world meanings are unknown to the mind.
//
// Experience is the actual sensorimotor relation
//
//   perception_before -> motor -> perception_after
//
// preserved exactly in M. The generic relational kernel may compress recurring
// regularities in those experiences. Numeric change is ordinary subtraction
// between two perceived states; it is NOT a Philosopher's Stone signed axis and
// carries no success/failure valence by itself.
//
// The only motor-closing commitments made here are consequences of the admitted
// priors rather than extra faculties:
//   - OneLogic: an ungrounded continuation remains unresolved and is contacted
//     rather than silently treated as false;
//   - Stone answerability: distinct material concerns are not collapsed into an
//     invented scalar utility. Grounded consequence vectors are compared only by
//     component-wise dominance. If neither dominates, the relation stays open.
//
// This is deliberately conservative. If these priors are insufficient for useful
// continuation, the failure belongs to the developmental law; do not patch it
// with a task-specific decision rule.

const Rel = require('./one-rule.js');

function splitContact(state, frame) {
  const cut = frame.length - state.concern_count;
  return {
    percept: frame.slice(0, cut),
    concern: frame.slice(cut),
  };
}

function difference(after, before) {
  return after.map((value, i) => value - before[i]);
}

function recordExperience(state, beforeFrame, action, afterFrame) {
  const before = splitContact(state, beforeFrame);
  const after = splitContact(state, afterFrame);
  const experience = {
    before: beforeFrame.slice(),
    action,
    after: afterFrame.slice(),
  };
  state.experiences.push(experience);
  state.action_counts[action]++;

  // The learned sample contains only relations available from the actual
  // before/action/after contact. No outcome class or hand-selected scene exists.
  state.kernel = Rel.integrate(state.kernel, {
    id: `embodied:${state.experiences.length - 1}`,
    sample: {
      percept_before: before.percept,
      concern_before: before.concern,
      action,
      percept_change: difference(after.percept, before.percept),
      concern_change: difference(after.concern, before.concern),
    },
    provenance: 'actual sensorimotor relation',
    raw: experience,
  });
}

function consequenceFor(state, contact, action) {
  const prediction = Rel.predict(state.kernel, {
    percept_before: contact.percept,
    concern_before: contact.concern,
    action,
  });
  const evidence = prediction.best_by_target.concern_change || null;
  if (!evidence || !Array.isArray(evidence.expected) || evidence.expected.length !== state.concern_count) return null;
  if (!evidence.expected.every(Number.isFinite)) return null;
  return {
    action,
    change: evidence.expected.slice(),
    after: contact.concern.map((value, i) => value + evidence.expected[i]),
    evidence,
  };
}

function dominates(a, b) {
  let strict = false;
  for (let i = 0; i < a.after.length; i++) {
    if (a.after[i] > b.after[i]) return false;
    if (a.after[i] < b.after[i]) strict = true;
  }
  return strict;
}

function leastContacted(state, candidates) {
  let best = candidates[0];
  for (const candidate of candidates.slice(1)) {
    if (state.action_counts[candidate] < state.action_counts[best] ||
        (state.action_counts[candidate] === state.action_counts[best] && candidate < best)) best = candidate;
  }
  return best;
}

function closeMotorRelation(state, frame) {
  const contact = splitContact(state, frame);
  const known = [];
  const unresolved = [];

  for (let action = 0; action < state.action_count; action++) {
    const consequence = consequenceFor(state, contact, action);
    if (consequence) known.push(consequence);
    else unresolved.push(action);
  }

  // OneLogic: an available continuation that reality has not grounded remains a
  // live possibility. Contact the least-grounded one rather than pretending that
  // absence of evidence is negative evidence.
  if (unresolved.length) return leastContacted(state, unresolved);

  // No concern may buy improvement by silently hiding damage to another. Pareto
  // dominance is the strongest comparison available without inventing weights or
  // trade-off preferences that reality has not supplied.
  const frontier = known.filter(candidate =>
    !known.some(other => other.action !== candidate.action && dominates(other, candidate))
  );

  if (frontier.length === 1) return frontier[0].action;

  // If several grounded continuations remain non-dominated, OneLogic still does
  // not force a conclusion. Further contact is the only warranted discriminator.
  return leastContacted(state, frontier.map(x => x.action));
}

function one(actionCount, concernCount = 1) {
  if (!Number.isInteger(actionCount) || actionCount < 1) throw new Error('actionCount must be positive');
  if (!Number.isInteger(concernCount) || concernCount < 1) throw new Error('concernCount must be positive');
  return {
    whole: 1,
    kernel: Rel.one(),
    action_count: actionCount,
    concern_count: concernCount,
    contacts: [],
    experiences: [],
    previous_contact: null,
    motor: null,
    action_counts: Array(actionCount).fill(0),
    prior: {
      stone: {
        axes: {
          x: ['Practicality', 'Empathy'],
          z: ['Knowledge', 'Wisdom'],
          y: ['Insulation', 'Answerability'],
        },
        note: 'Stone signs describe cognition orientation relative to reality; they are not outcome valence or pressure direction.',
        answerability: 'materially relevant relations remain jointly exposed to reality; one concern cannot be hidden by an invented scalar trade-off',
      },
      onelogic: 'preserve undefeated possibilities; conclude only what grounded relations force; seek discriminating reality-contact when unresolved',
      embodiment: 'interoceptive concern channels are perceived bodily magnitudes, not rewards and not Stone coordinates',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  if (!Array.isArray(realityContact) || realityContact.length <= state.concern_count) throw new Error('invalid reality-contact');
  if (!realityContact.every(Number.isFinite)) throw new Error('reality-contact must be finite numeric perception');

  const frame = realityContact.slice();
  if (state.previous_contact && state.motor != null) {
    recordExperience(state, state.previous_contact, state.motor, frame);
  }

  state.contacts.push(frame.slice());
  state.previous_contact = frame;
  state.motor = closeMotorRelation(state, frame);
  return state;
}

module.exports = { one, C };
