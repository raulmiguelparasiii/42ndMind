'use strict';

// Unified embodied 42ndMind prototype.
//
// Public developmental law:
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// There is deliberately no planner, policy, reward function, chooseAction(),
// graph search, or forward simulator in this module. New reality-contact closes
// the same evolving relational state. The motor continuation is one component of
// the resulting M, just as learned relations are components of M.
//
// Stone is prior knowledge about orientation: materially relevant pressure must
// be answered without hiding one pressure inside another, and continued reality-
// contact must remain open. Practicality is the reality of finite runway: direct
// trial is affordable only while the embodied relation leaves enough room for it.
// OneLogic keeps unresolved alternatives unresolved and lets warranted empirical
// relations, not fabricated certainty, constrain continuation.

const Rel = require('./one-rule.js');

const HORIZON = 12;
const SAMPLE_EVERY = 4;

function maxIndex(xs) {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[best]) best = i;
  return best;
}
function max(xs) { return xs.length ? Math.max(...xs) : 0; }
function mean(xs) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}

function pressureVector(state, frame) {
  return frame.slice(frame.length - state.pressure_count);
}
function continuity(state, frame) {
  return frame.at(-(state.pressure_count + 1));
}
function worldContact(state, frame) {
  return frame.slice(0, frame.length - state.pressure_count - 1);
}
function sceneSignature(state, frame) {
  // Generic, lossy contact signature. No channel receives a semantic name.
  // Local spatial contact is kept somewhat finer than the remaining channels.
  const w = worldContact(state, frame);
  return w.map((x,i) => Math.floor(x / (i < 9 ? 32 : 64))).join('.');
}
function pressureBand(p) {
  if (p < 32) return 'low';
  if (p < 96) return 'present';
  if (p < 160) return 'high';
  if (p < 224) return 'urgent';
  return 'critical';
}

function learnedRunway(state, frame) {
  const current = pressureVector(state, frame);
  const recent = state.contacts.slice(-20);
  if (recent.length < 3) return Infinity;
  const slopes = current.map((_, i) => {
    const deltas = [];
    for (let j = 1; j < recent.length; j++) {
      const a = pressureVector(state, recent[j-1]);
      const b = pressureVector(state, recent[j]);
      const d = b[i] - a[i];
      if (d > 0 && d < 48) deltas.push(d);
    }
    return deltas.length ? mean(deltas) : 0;
  });
  let runway = Infinity;
  for (let i = 0; i < current.length; i++) {
    if (slopes[i] > 0.05) runway = Math.min(runway, (255-current[i])/slopes[i]);
  }
  return runway;
}
function runwayBand(r) {
  if (!Number.isFinite(r) || r > 80) return 'wide';
  if (r > 32) return 'bounded';
  if (r > 14) return 'tight';
  return 'immediate';
}

function outcomeOf(state, startFrame, endFrame, purposeIndex) {
  if (continuity(state, endFrame) <= 0) return 'closed';
  const a = pressureVector(state, startFrame);
  const b = pressureVector(state, endFrame);
  const targetDelta = b[purposeIndex] - a[purposeIndex];
  let collateral = -Infinity;
  for (let i = 0; i < a.length; i++) collateral = Math.max(collateral, b[i]-a[i]);
  if (targetDelta <= -8 && collateral <= 12) return 'open_relief';
  if (targetDelta >= 8 || collateral >= 24) return 'open_worse';
  return 'open_mixed';
}

function sampleFromTrace(state, endFrame) {
  if (state.transitions.length < HORIZON) return null;
  const start = state.transitions[state.transitions.length - HORIZON];
  const pv = pressureVector(state, start.before);
  const purpose = maxIndex(pv);
  const r = start.runway;
  return {
    purpose,
    pressure_band: pressureBand(pv[purpose]),
    runway_band: runwayBand(r),
    scene: sceneSignature(state, start.before),
    action: start.action,
    outcome: outcomeOf(state, start.before, endFrame, purpose),
  };
}

function relationFor(state, frame, action) {
  const pv = pressureVector(state, frame);
  const purpose = maxIndex(pv);
  const runway = learnedRunway(state, frame);
  const partial = {
    purpose,
    pressure_band: pressureBand(pv[purpose]),
    runway_band: runwayBand(runway),
    scene: sceneSignature(state, frame),
    action,
  };
  const prediction = Rel.predict(state.kernel, partial);
  const pattern = prediction.best_by_target.outcome || null;
  return { action, partial, pattern };
}

function patternRank(pattern) {
  if (!pattern) return Infinity;
  return pattern.predictive_code_bits;
}

function leastUsed(state, candidates) {
  let best = candidates[0];
  for (const a of candidates) {
    if (state.uses[a] < state.uses[best]) best = a;
  }
  return best;
}

function closeMotorRelation(state, frame) {
  const pv = pressureVector(state, frame);
  const active = max(pv);
  const runway = learnedRunway(state, frame);
  const rb = runwayBand(runway);
  const relations = Array.from({length:state.action_count},(_,a)=>relationFor(state,frame,a));

  // The Stone supplies orientation, not a domain answer. Among learned
  // continuations, a relation that has compressed repeated open relief outranks a
  // relation that has compressed worsening or closure. Within the same status,
  // the shortest predictive code is the same C objective already used to retain
  // learned descriptions.
  const relief = relations.filter(x => x.pattern && x.pattern.expected === 'open_relief');
  if (relief.length) {
    relief.sort((a,b)=>patternRank(a.pattern)-patternRank(b.pattern) || b.pattern.support-a.pattern.support || a.action-b.action);
    state.mode = 'answerable_completion';
    return relief[0].action;
  }

  const mixed = relations.filter(x => x.pattern && x.pattern.expected === 'open_mixed');
  if ((rb === 'tight' || rb === 'immediate') && mixed.length) {
    mixed.sort((a,b)=>patternRank(a.pattern)-patternRank(b.pattern) || b.pattern.support-a.pattern.support || a.action-b.action);
    state.mode = 'practical_completion';
    return mixed[0].action;
  }

  // OneLogic leaves the unresolved unresolved. With runway, use reality-contact
  // to resolve it. This is not a curiosity reward: finite practical slack is what
  // makes direct inquiry affordable.
  const nonDefeated = relations.filter(x => !x.pattern || (x.pattern.expected !== 'closed' && x.pattern.expected !== 'open_worse'));
  if (rb === 'wide' || rb === 'bounded') {
    const pool = nonDefeated.length ? nonDefeated.map(x=>x.action) : relations.map(x=>x.action);
    state.mode = 'answerable_inquiry';
    return leastUsed(state, pool);
  }

  // If direct inquiry is no longer affordable and no relief relation is known,
  // retain the least contradicted learned continuation. If none exists, there is
  // genuinely a gap; deterministic least-use is only a motor tie-break, not a
  // claim that the action is good.
  const known = nonDefeated.filter(x=>x.pattern);
  if (known.length) {
    known.sort((a,b)=>patternRank(a.pattern)-patternRank(b.pattern) || a.action-b.action);
    state.mode = 'practical_gap';
    return known[0].action;
  }
  state.mode = 'unresolved_gap';
  return leastUsed(state, relations.map(x=>x.action));
}

function one(actionCount, pressureCount=1) {
  if (!Number.isInteger(actionCount) || actionCount < 1) throw new Error('actionCount must be positive');
  if (!Number.isInteger(pressureCount) || pressureCount < 1) throw new Error('pressureCount must be positive');
  return {
    whole: 1,
    kernel: Rel.one(),
    action_count: actionCount,
    pressure_count: pressureCount,
    contacts: [],
    transitions: [],
    previous_frame: null,
    motor: null,
    uses: Array(actionCount).fill(0),
    samples_integrated: 0,
    mode: 'uncontacted',
    prior: {
      stone: 'answer every materially relevant pressure without insulating from another pressure; keep reality-contact open',
      practicality: 'finite runway limits direct trial, so warranted learned relations must govern continuation when waiting would consume the possibility of correction',
      onelogic: 'preserve undefeated possibilities, distinguish warranted completion from unresolved gap, and use affordable contact to resolve uncertainty',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  if (!Array.isArray(realityContact) || realityContact.length < state.pressure_count + 1) throw new Error('invalid reality-contact');
  const frame = realityContact.slice();

  if (state.previous_frame && state.motor != null) {
    const before = state.previous_frame;
    const runway = learnedRunway(state, before);
    state.transitions.push({ before: before.slice(), action: state.motor, after: frame.slice(), runway });
    state.uses[state.motor]++;
  }
  state.contacts.push(frame.slice());
  if (state.contacts.length > 4096) state.contacts.shift();
  if (state.transitions.length > 4096) state.transitions.shift();

  // Recompress one delayed action/consequence relation periodically. This is
  // empirical foresight: a present continuation is constrained by what actually
  // followed similar earlier continuations, not by an internal future simulator.
  if (state.transitions.length >= HORIZON && state.transitions.length % SAMPLE_EVERY === 0) {
    const sample = sampleFromTrace(state, frame);
    if (sample) {
      state.kernel = Rel.integrate(state.kernel, {
        id: `embodied:${state.samples_integrated}`,
        sample,
        provenance: 'same-C embodied action/consequence relation',
      });
      state.samples_integrated++;
    }
  }

  state.previous_frame = frame;
  if (continuity(state, frame) <= 0) {
    state.motor = null;
    state.mode = 'closed';
    return state;
  }

  state.motor = closeMotorRelation(state, frame);
  return state;
}

module.exports = { one, C };
