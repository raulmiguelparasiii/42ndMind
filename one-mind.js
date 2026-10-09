'use strict';

// Unified embodied 42ndMind.
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// This file contains embodiment, not an authored psychology. The body supplies
// primitive motor possibilities, ordinary perception, and distinct interoceptive
// concern magnitudes. Everything learned about what a motor does comes from
// actual contact:
//
//   perception_before -> motor -> perception_after
//
// The important distinction is purpose versus reward. A non-zero interoceptive
// concern is an open bodily relation. Because the interface supplies a magnitude,
// zero means absence of that pressure and numeric order is physically meaningful.
// Therefore "after < before" is an ordinary relation between two experienced
// magnitudes. It is not a Stone sign, success label, reward, or utility score.
//
// Past experience is integrated as one relation containing both the motor and its
// experienced consequence. The same generic compressor can consequently use the
// relation in either direction. When a concern is presently open, the unresolved
// relation "this concern becomes less" may make an experienced motor relevant.
// No candidate futures are simulated or scored. Once the concern is absent, that
// purpose is absent too, so the same action loses that source of authority.
//
// If reality has not yet grounded a motor completion, M contains no warranted
// preference. The body still has to continue physically, so it contributes
// spontaneous motor variation. That variation has no cognitive authority and no
// world semantics; it is merely the embodied source of new action/consequence
// contact from which learned relations can develop.

const Rel = require('./one-rule.js');

const LESS = 'less';
const SAME = 'same';
const GREATER = 'greater';

function splitContact(state, frame) {
  const cut = frame.length - state.concern_count;
  return {
    percept: frame.slice(0, cut),
    concern: frame.slice(cut),
  };
}

function magnitudeOrder(after, before) {
  if (after < before) return LESS;
  if (after > before) return GREATER;
  return SAME;
}

function relationSample(state, beforeFrame, action, afterFrame) {
  const before = splitContact(state, beforeFrame);
  const after = splitContact(state, afterFrame);
  const sample = {
    percept_before: before.percept,
    concern_before: before.concern,
    action,
    percept_after: after.percept,
    concern_after: after.concern,
  };

  // These are pure order relations on channels the embodiment explicitly says
  // are magnitudes. They carry no good/bad interpretation by themselves.
  for (let i = 0; i < state.concern_count; i++) {
    sample[`concern_${i}_order`] = magnitudeOrder(after.concern[i], before.concern[i]);
  }
  return sample;
}

function recordExperience(state, beforeFrame, action, afterFrame) {
  const experience = {
    before: beforeFrame.slice(),
    action,
    after: afterFrame.slice(),
  };
  state.experiences.push(experience);
  state.kernel = Rel.integrate(state.kernel, {
    id: `embodied:${state.experiences.length - 1}`,
    sample: relationSample(state, beforeFrame, action, afterFrame),
    provenance: 'actual sensorimotor relation',
    raw: experience,
  });
}

function presentRelation(state, frame) {
  const contact = splitContact(state, frame);
  return {
    contact,
    values: {
      percept_before: contact.percept,
      concern_before: contact.concern,
    },
  };
}

function livePurpose(state, frame) {
  const present = presentRelation(state, frame);
  let open = 0;

  // A pressure magnitude greater than zero is literally an unresolved bodily
  // concern in this primitive interface. Its most conservative closure relation
  // is simply less of that same pressure. No scalar trade-off is introduced.
  for (let i = 0; i < state.concern_count; i++) {
    if (present.contact.concern[i] > 0) {
      present.values[`concern_${i}_order`] = LESS;
      open++;
    }
  }
  return open ? present : null;
}

function contradictsMaterialConcern(state, frame, action) {
  const present = presentRelation(state, frame);
  present.values.action = action;
  const consequence = Rel.predict(state.kernel, present.values).best_by_target;

  // If learned reality specifically says this continuation increases a distinct
  // concern, OneLogic does not permit silently hiding that relation. We also do
  // not invent a numerical exchange rate that would make the increase acceptable.
  // A later learned higher relation may ground such a trade-off; until then it is
  // unresolved rather than automatically justified.
  for (let i = 0; i < state.concern_count; i++) {
    const evidence = consequence[`concern_${i}_order`];
    if (evidence && evidence.expected === GREATER) return true;
  }
  return false;
}

function groundedPurposeCompletion(state, frame) {
  const purpose = livePurpose(state, frame);
  if (!purpose) return null;

  // `action` is just another missing term in the same learned relation. The
  // compressor is not asked to run a planner or assign utility. It is asked what
  // action, if any, its grounded relational descriptions complete here when the
  // current open concern relation is included in the referent.
  const completion = Rel.predict(state.kernel, purpose.values).best_by_target.action;
  if (!completion || !Number.isInteger(completion.expected)) return null;
  if (completion.expected < 0 || completion.expected >= state.action_count) return null;
  if (contradictsMaterialConcern(state, frame, completion.expected)) return null;
  return completion.expected;
}

function spontaneousMotor(state) {
  // Physical motor variability when cognition has no warranted completion.
  // This is intentionally non-semantic and does not seek a named outcome.
  state.motor_variation = (Math.imul(state.motor_variation, 1664525) + 1013904223) >>> 0;
  return state.motor_variation % state.action_count;
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
    motor_variation: (0x9e3779b9 ^ actionCount ^ (concernCount << 8)) >>> 0,
    prior: {
      stone: {
        axes: {
          x: { negative: 'Practicality', positive: 'Empathy' },
          z: { negative: 'Knowledge', positive: 'Wisdom' },
          y: { negative: 'Insulation', positive: 'Answerability' },
        },
        note: 'Stone signs describe cognition orientation relative to reality; they are not outcome valence or pressure direction.',
        answerability: 'materially relevant relations remain jointly exposed; an inconvenient consequence cannot be hidden to preserve a preferred conclusion',
      },
      onelogic: 'preserve undefeated possibilities; conclude only what grounded relations force; unresolved remains unresolved and correction remains open',
      embodiment: 'interoceptive pressure channels are bodily concern magnitudes; their numeric order is physical contact, not reward or a Stone coordinate',
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

  const completion = groundedPurposeCompletion(state, frame);
  state.motor = completion == null ? spontaneousMotor(state) : completion;
  return state;
}

module.exports = { one, C };
