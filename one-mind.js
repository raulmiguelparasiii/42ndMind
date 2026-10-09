'use strict';

// Unified embodied 42ndMind prototype.
//
// Public developmental law:
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// There is deliberately no planner, policy, reward function, chooseAction(),
// graph search, future simulator, or hand-written success-sequence routine here.
// New reality-contact closes the same evolving relational state. Motor
// continuation is one component of M.
//
// Stone prior used here: embodied concern is already a signed relation. When
// reality-contact changes a live pressure, perception itself supplies the sign:
// pressure reduced => +1, unchanged => 0, pressure increased => -1. Repeated
// contacts accumulate as defeasible relational evidence through the same kernel.
// No semantic label such as success/failure/food/water is supplied.
//
// The remaining scene reduction, pressure bands, and runway bands are temporary
// finite representation scaffolds and remain explicit targets for later removal.

const Rel = require('./one-rule.js');

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
  // Temporary finite representation scaffold. It preserves a small reusable
  // slice of primitive contact while C is not yet able to create this reduction
  // from the full sensor field by itself.
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
  if (p < 32) return 'b0';
  if (p < 96) return 'b1';
  if (p < 160) return 'b2';
  if (p < 224) return 'b3';
  return 'b4';
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
  if (!Number.isFinite(r) || r > 80) return 'r0';
  if (r > 32) return 'r1';
  if (r > 14) return 'r2';
  return 'r3';
}

function sign(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

function signedEffect(state, before, after) {
  // Positive means actuality moved the embodied relation toward relief on that
  // pressure dimension. Negative means it moved away. Nothing here names what
  // the pressure is or what action ought to be taken.
  const a = pressureVector(state, before);
  const b = pressureVector(state, after);
  return a.map((x,i)=>sign(x-b[i]));
}

function contextOf(state, frame, action) {
  return {
    scene: sceneSignature(state, frame),
    pressures: pressureVector(state, frame).map(pressureBand).join(':'),
    runway: runwayBand(learnedRunway(state, frame)),
    action,
  };
}

function integrateExperience(state, before, action, after) {
  const effect = signedEffect(state, before, after);
  const sample = {
    ...contextOf(state, before, action),
    effect,
  };
  state.kernel = Rel.integrate(state.kernel, {
    id: `embodied:${state.samples_integrated}`,
    sample,
    provenance: 'same-C signed embodied relation from actual before/after contact',
  });
  state.samples_integrated++;
  const key = effect.join(',');
  state.outcome_counts[key] = (state.outcome_counts[key] || 0) + 1;
}

function evidenceFor(state, frame, action) {
  const prediction = Rel.predict(state.kernel, contextOf(state, frame, action));
  const p = prediction.best_by_target.effect || null;
  if (!p || !Array.isArray(p.expected) || p.expected.length !== state.pressure_count) return null;
  if (!p.expected.every(x => x === -1 || x === 0 || x === 1)) return null;
  return p;
}

function signedAlignment(state, frame, pattern) {
  if (!pattern) return null;
  const pressures = pressureVector(state, frame);
  const total = pressures.reduce((a,b)=>a+b,0);
  if (!total) return 0;
  const raw = pattern.expected.reduce((s,e,i)=>s + e * pressures[i], 0) / total;
  // Reliability changes authority, not sign. Repeated experience therefore adds
  // weight without converting a defeasible relation into truth.
  return raw * pattern.smoothed_reliability;
}

function contextUseKey(state, frame, action) {
  return `${sceneSignature(state,frame)}|${pressureVector(state,frame).map(pressureBand).join(':')}|${action}`;
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
  const relations = Array.from({length:state.action_count},(_,action)=>{
    const evidence=evidenceFor(state,frame,action);
    return {action,evidence,alignment:signedAlignment(state,frame,evidence)};
  });

  // A positive signed relation means accumulated experience says this available
  // continuation has tended to move the currently pressured whole toward greater
  // answerability. All pressure dimensions participate in the same comparison.
  const answerable = relations.filter(x=>x.alignment != null && x.alignment > 0);
  if (answerable.length) {
    answerable.sort((a,b)=>
      b.alignment-a.alignment ||
      a.evidence.predictive_code_bits-b.evidence.predictive_code_bits ||
      b.evidence.covered-a.evidence.covered ||
      a.action-b.action
    );
    state.mode='answerable_completion';
    return answerable[0].action;
  }

  const rb=runwayBand(learnedRunway(state,frame));
  const unresolved=relations.filter(x=>!x.evidence);

  // When firsthand discrimination remains affordable, unresolved alternatives
  // remain open and reality-contact is used to distinguish them.
  if ((rb==='r0'||rb==='r1') && unresolved.length) {
    state.mode='answerable_inquiry';
    return leastObserved(state,frame,unresolved.map(x=>x.action));
  }

  const known=relations.filter(x=>x.evidence);
  if (known.length) {
    known.sort((a,b)=>
      b.alignment-a.alignment ||
      a.evidence.predictive_code_bits-b.evidence.predictive_code_bits ||
      a.action-b.action
    );
    state.mode='practical_completion';
    return known[0].action;
  }

  state.mode='unresolved_gap';
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
      stone: 'embodied concern is signed; reality-contact that reduces pressure is positive relative to that concern, increase is negative, and all materially relevant pressures remain jointly answerable',
      practicality: 'finite runway limits direct trial, so warranted learned relations gain authority when further discrimination would consume the possibility of correction',
      onelogic: 'preserve undefeated possibilities, let repeated reality-contact accumulate defeasible authority, and keep unresolved alternatives open until actuality discriminates them',
    },
  };
}

function C(state, realityContact) {
  if (!state || state.whole !== 1) throw new Error('C requires one whole mind');
  if (!Array.isArray(realityContact) || realityContact.length < state.pressure_count + 1) throw new Error('invalid reality-contact');
  const frame = realityContact.slice();

  if (state.previous_frame && state.motor != null) {
    const before=state.previous_frame;
    state.transitions.push({before:before.slice(),action:state.motor,after:frame.slice()});
    state.uses[state.motor]++;
    const key=contextUseKey(state,before,state.motor);
    state.context_uses[key]=(state.context_uses[key]||0)+1;

    // Every actual transition is experience. Its usefulness is not assigned by
    // a reward label; it is already present in the signed change perceived by M.
    integrateExperience(state,before,state.motor,frame);
  }

  state.contacts.push(frame.slice());
  if (state.contacts.length > 4096) state.contacts.shift();
  if (state.transitions.length > 4096) state.transitions.shift();

  state.previous_frame=frame;
  if (continuity(state,frame)<=0) {
    state.motor=null;
    state.mode='closed';
    return state;
  }

  state.motor=closeMotorRelation(state,frame);
  return state;
}

module.exports = { one, C };
