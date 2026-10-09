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
const DELAYED_SAMPLE_EVERY = 8;
const MATERIAL_PRESSURE_DELTA = 6;

function maxIndex(xs) {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[best]) best = i;
  return best;
}
function mean(xs) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }

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
  // Preserve primitive distinctions that can materially change an intervention
  // while still avoiding whole-frame memorization. The mind receives no labels
  // for these values. In the current body/world interface the first nine contacts
  // are local contact values and one later primitive contact carries orientation.
  const w = worldContact(state, frame);
  const local = w.slice(0, Math.min(9, w.length));
  const center = local[4] || 0;
  const dir = Math.floor((w[12] || 0) / 64) & 3;
  const frontIndex = [1,5,7,3][dir];
  const front = local[frontIndex] || 0;
  const lightBand = Math.floor((w[9] || 0) / 64);
  return `${center}:${front}:${dir}:${lightBand}`;
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

function contextOf(state, frame, action, lag) {
  const pv = pressureVector(state, frame);
  const purpose = maxIndex(pv);
  return {
    purpose,
    pressure_band: pressureBand(pv[purpose]),
    runway_band: runwayBand(learnedRunway(state, frame)),
    scene: sceneSignature(state, frame),
    action,
    lag,
  };
}

function sampleImmediate(state, before, action, after) {
  const pv = pressureVector(state, before);
  const purpose = maxIndex(pv);
  return {
    ...contextOf(state, before, action, 'immediate'),
    outcome: outcomeOf(state, before, after, purpose),
  };
}

function sampleDelayed(state, endFrame) {
  if (state.transitions.length < HORIZON) return null;
  const start = state.transitions[state.transitions.length - HORIZON];
  const pv = pressureVector(state, start.before);
  const purpose = maxIndex(pv);
  return {
    ...contextOf(state, start.before, start.action, 'delayed'),
    outcome: outcomeOf(state, start.before, endFrame, purpose),
  };
}

function materialImmediate(state, before, after) {
  if (continuity(state,before) !== continuity(state,after)) return true;
  const a = pressureVector(state,before), b = pressureVector(state,after);
  return a.some((x,i)=>Math.abs(b[i]-x) >= MATERIAL_PRESSURE_DELTA);
}

function integrateSample(state, sample, provenance) {
  state.kernel = Rel.integrate(state.kernel, {
    id: `embodied:${state.samples_integrated}`,
    sample,
    provenance,
  });
  state.samples_integrated++;
  const k = `${sample.lag}:${sample.outcome}`;
  state.outcome_counts[k] = (state.outcome_counts[k] || 0) + 1;
}

function patternFor(state, frame, action) {
  const candidates = [];
  for (const lag of ['immediate','delayed']) {
    const partial = contextOf(state, frame, action, lag);
    const prediction = Rel.predict(state.kernel, partial);
    const p = prediction.best_by_target.outcome || null;
    if (p && !candidates.some(x=>x.pattern.id===p.id)) candidates.push({pattern:p,lag,partial});
  }
  candidates.sort((a,b)=>
    a.pattern.predictive_code_bits-b.pattern.predictive_code_bits ||
    b.pattern.bits_saved-a.pattern.bits_saved ||
    b.pattern.covered-a.pattern.covered ||
    (a.lag==='immediate'?-1:1)
  );
  return candidates[0] || null;
}

function relationFor(state, frame, action) {
  return { action, evidence: patternFor(state,frame,action) };
}
function patternRank(evidence) { return evidence ? evidence.pattern.predictive_code_bits : Infinity; }

function contextUseKey(state, frame, action) {
  const pv=pressureVector(state,frame), purpose=maxIndex(pv);
  return `${purpose}|${pressureBand(pv[purpose])}|${sceneSignature(state,frame)}|${action}`;
}
function leastObserved(state, frame, candidates) {
  let best=candidates[0], n=state.context_uses[contextUseKey(state,frame,best)]||0;
  for (const a of candidates.slice(1)) {
    const m=state.context_uses[contextUseKey(state,frame,a)]||0;
    if (m<n || (m===n && state.uses[a]<state.uses[best])) { best=a; n=m; }
  }
  return best;
}

function closeMotorRelation(state, frame) {
  const rb = runwayBand(learnedRunway(state, frame));
  const relations = Array.from({length:state.action_count},(_,a)=>relationFor(state,frame,a));

  const relief = relations.filter(x => x.evidence && x.evidence.pattern.expected === 'open_relief');
  if (relief.length) {
    relief.sort((a,b)=>patternRank(a.evidence)-patternRank(b.evidence) ||
      b.evidence.pattern.support-a.evidence.pattern.support || a.action-b.action);
    state.mode = 'answerable_completion';
    return relief[0].action;
  }

  const mixed = relations.filter(x => x.evidence && x.evidence.pattern.expected === 'open_mixed');
  if ((rb === 'tight' || rb === 'immediate') && mixed.length) {
    mixed.sort((a,b)=>patternRank(a.evidence)-patternRank(b.evidence) ||
      b.evidence.pattern.support-a.evidence.pattern.support || a.action-b.action);
    state.mode = 'practical_completion';
    return mixed[0].action;
  }

  const nonDefeated = relations.filter(x => !x.evidence ||
    (x.evidence.pattern.expected !== 'closed' && x.evidence.pattern.expected !== 'open_worse'));

  // Inquiry is local to the current unresolved relation, not a global motor cycle.
  // Practical slack makes firsthand discrimination affordable.
  if (rb === 'wide' || rb === 'bounded') {
    const pool = nonDefeated.length ? nonDefeated.map(x=>x.action) : relations.map(x=>x.action);
    state.mode = 'answerable_inquiry';
    return leastObserved(state,frame,pool);
  }

  const known = nonDefeated.filter(x=>x.evidence);
  if (known.length) {
    known.sort((a,b)=>patternRank(a.evidence)-patternRank(b.evidence) || a.action-b.action);
    state.mode = 'practical_gap';
    return known[0].action;
  }

  state.mode = 'unresolved_gap';
  return leastObserved(state,frame,relations.map(x=>x.action));
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
    context_uses: {},
    outcome_counts: {},
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
    const transition = { before: before.slice(), action: state.motor, after: frame.slice(), runway: learnedRunway(state,before) };
    state.transitions.push(transition);
    state.uses[state.motor]++;
    const key=contextUseKey(state,before,state.motor);
    state.context_uses[key]=(state.context_uses[key]||0)+1;

    // Material immediate consequences must not be diluted inside a later window.
    // They are reality-contact of the same kind as delayed consequences and are
    // handed to the same generic compression law.
    if (materialImmediate(state,before,frame)) {
      integrateSample(state,sampleImmediate(state,before,state.motor,frame),'same-C immediate embodied consequence');
    }
  }

  state.contacts.push(frame.slice());
  if (state.contacts.length > 4096) state.contacts.shift();
  if (state.transitions.length > 4096) state.transitions.shift();

  // Delayed empirical consequence remains available as a second timescale. No
  // hypothetical future is generated: both endpoints came from actuality.
  if (state.transitions.length >= HORIZON && state.transitions.length % DELAYED_SAMPLE_EVERY === 0) {
    const sample=sampleDelayed(state,frame);
    if (sample) integrateSample(state,sample,'same-C delayed embodied consequence');
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
