'use strict';

// Innate epistemic guidance for 42ndMind.
//
// This is intentionally NOT a world reward table. It knows no food, water,
// shelter, hazard, key, person, map position, or good action. It receives only
// primitive sensor frames plus the primitive motor alphabet. The final two
// channels are grounded embodied contacts: continuity-of-contact and friction.
//
// Stone prior:
//   real pressure should be answered by reality-contact and genuine resolution,
//   not merely hidden/ignored while the pressure persists. Continued capacity
//   for reality-contact is a prerequisite for answerability.
//
// OneLogic prior:
//   preserve undefeated outcome possibilities; do not turn undefined into false;
//   distinguish strict consequence from defeasible preference; when unresolved,
//   prefer discriminating reality-contact; when an observation defeats the model,
//   keep the observation and reopen/expand the represented outcomes.

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function mean(xs) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function pressure(frame) { return frame.at(-1); }
function continuity(frame) { return frame.at(-2); }

function entropy(values) {
  if (!values.length) return 0;
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / values.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function frameDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / Math.max(1, a.length);
}

function sensoryChange(a, b) {
  // Exclude continuity and friction so reality-contact cannot be faked merely by
  // changing the two innate guidance contacts themselves.
  const n = Math.max(0, Math.min(a.length, b.length) - 2);
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

function coarseSignature(frame) {
  return frame.map((x, i) => {
    if (i >= frame.length - 2) return Math.floor(x / 16);
    return Math.floor(x / 32);
  }).join(':');
}

function one(actionCount) {
  return {
    whole: 1,
    action_count: actionCount,
    transitions: [],
    uses: Array(actionCount).fill(0),
    decisions: {
      bootstrap_inquiry: 0,
      strict_answerability: 0,
      defeasible_answerability: 0,
      discriminating_inquiry: 0,
      low_pressure_inquiry: 0,
    },
    prior: {
      stone: 'resolve real pressure through answerable reality-contact; do not prefer insulation merely because it hides friction; preserve the capacity for continued reality-contact',
      onelogic: 'preserve undefeated possibilities; assert only forced consequence; seek discriminating contact when unresolved; reopen representation when defeated',
    },
  };
}

function observe(state, before, action, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || before.length !== after.length) {
    throw new Error('guidance observation requires equal primitive frames');
  }
  if (!Number.isInteger(action) || action < 0 || action >= state.action_count) {
    throw new Error('guidance observation received invalid primitive action');
  }
  state.transitions.push({ before: before.slice(), action, after: after.slice() });
  state.uses[action]++;
  if (state.transitions.length > 5000) state.transitions.splice(0, state.transitions.length - 5000);
}

function nearestOutcomes(state, frame, action, limit = 24) {
  const candidates = [];
  for (let i = 0; i < state.transitions.length; i++) {
    const t = state.transitions[i];
    if (t.action !== action) continue;
    candidates.push({ ...t, index: i, distance: frameDistance(frame, t.before), age: state.transitions.length - i });
  }
  candidates.sort((a,b) => a.distance - b.distance || a.age - b.age);
  if (!candidates.length) return [];

  const best = candidates[0].distance;
  const radius = best * 1.35 + 10;
  const local = candidates.filter(x => x.distance <= radius).slice(0, limit);
  return local.length >= 3 ? local : candidates.slice(0, Math.min(limit, 3));
}

function trajectoryOutcome(state, candidate, horizon = 6) {
  // Follow the actually experienced continuation after this intervention. This
  // is generic temporal consequence, not a world planner. A discontinuity in
  // the experienced stream (for example a body reset after failed continuity)
  // ends the trajectory rather than being treated as a beneficial pressure drop.
  const pressures = [pressure(candidate.after)];
  const contacts = [continuity(candidate.after)];
  let last = candidate.after;

  for (let j = candidate.index + 1; j < state.transitions.length && pressures.length < horizon; j++) {
    const t = state.transitions[j];
    if (frameDistance(last, t.before) > 1e-9) break;
    pressures.push(pressure(t.after));
    contacts.push(continuity(t.after));
    last = t.after;
    if (continuity(t.after) <= 0) break;
  }

  const tail = pressures.slice(-Math.min(2, pressures.length));
  return {
    finalPressure: mean(tail),
    minContinuity: Math.min(...contacts),
    length: pressures.length,
  };
}

function actionModel(state, frame, action) {
  const live = nearestOutcomes(state, frame, action);
  const currentPressure = pressure(frame);
  if (!live.length) {
    return {
      action, live, unknown: true, support: 0, currentPressure,
      minPressure: null, meanPressure: null, maxPressure: null,
      improvementFraction: 0, outcomeEntropy: Infinity,
      contactGain: Infinity, contextDistance: Infinity,
      contactPreservedFraction: 1, anyContactLoss: false, forcedContactLoss: false,
      forcedImprovement: false, forcedWorsening: false, insulating: false,
    };
  }

  const trajectories = live.map(x => trajectoryOutcome(state, x));
  const pressures = trajectories.map(x => x.finalPressure);
  const changes = live.map(x => sensoryChange(x.before, x.after));
  const signatures = live.map(x => coarseSignature(x.after));
  const minPressure = Math.min(...pressures);
  const maxPressure = Math.max(...pressures);
  const avgPressure = mean(pressures);
  const improvementFraction = pressures.filter(p => p < currentPressure).length / pressures.length;
  const preserved = trajectories.filter(x => x.minContinuity > 0).length / trajectories.length;
  const anyContactLoss = trajectories.some(x => x.minContinuity <= 0);
  const forcedContactLoss = trajectories.every(x => x.minContinuity <= 0);
  const forcedImprovement = preserved === 1 && maxPressure < currentPressure - 0.5;
  const forcedWorsening = minPressure > currentPressure + 0.5;
  const gain = mean(changes);
  const insulating = pressures.length >= 3 && avgPressure >= currentPressure - 0.25 && gain < 3.0;

  return {
    action, live, unknown: false, support: live.length, currentPressure,
    minPressure, meanPressure: avgPressure, maxPressure,
    improvementFraction,
    outcomeEntropy: entropy(signatures),
    contactGain: gain,
    contextDistance: mean(live.map(x => x.distance)),
    contactPreservedFraction: preserved,
    anyContactLoss,
    forcedContactLoss,
    forcedImprovement, forcedWorsening, insulating,
  };
}

function leastUsed(state) {
  let best = 0;
  for (let a = 1; a < state.action_count; a++) {
    if (state.uses[a] < state.uses[best]) best = a;
  }
  return best;
}

function inquiryScore(state, model) {
  if (model.unknown) return 1000 - state.uses[model.action] * 2;
  const underused = 1 / Math.sqrt(1 + state.uses[model.action]);
  const contextNovelty = clamp(model.contextDistance / 64, 0, 2);
  const discriminating = Number.isFinite(model.outcomeEntropy) ? model.outcomeEntropy : 0;
  const contact = clamp(model.contactGain / 32, 0, 2);
  const continuityRisk = (1 - model.contactPreservedFraction) * 20;
  return discriminating * 2.4 + underused * 4 + contextNovelty + contact * 0.5 - continuityRisk;
}

function chooseAction(state, frame) {
  if (!Array.isArray(frame) || frame.length < 2) throw new Error('guidance requires primitive contact, continuity, and friction');

  if (state.transitions.length < state.action_count * 2) {
    const action = leastUsed(state);
    state.decisions.bootstrap_inquiry++;
    return { action, mode: 'bootstrap_inquiry', models: [] };
  }

  const models = Array.from({length: state.action_count}, (_, action) => actionModel(state, frame, action));
  const currentPressure = pressure(frame);
  const pressureActive = currentPressure >= 8;

  // A known route that forces loss of reality-contact cannot be the preferred
  // expression of answerability while an alternative remains live.
  let continuityAdmissible = models.filter(m => !m.forcedContactLoss && (m.unknown || !m.anyContactLoss));
  if (!continuityAdmissible.length) continuityAdmissible = models.filter(m => !m.forcedContactLoss);
  if (!continuityAdmissible.length) continuityAdmissible = models.slice();

  if (pressureActive) {
    const strict = continuityAdmissible.filter(m =>
      !m.unknown && m.support >= 2 && m.forcedImprovement && !m.insulating
    );
    if (strict.length) {
      strict.sort((a,b) =>
        (currentPressure - b.maxPressure) - (currentPressure - a.maxPressure) ||
        b.contactPreservedFraction - a.contactPreservedFraction ||
        b.support - a.support ||
        b.contactGain - a.contactGain ||
        a.action - b.action
      );
      state.decisions.strict_answerability++;
      return { action: strict[0].action, mode: 'strict_answerability', models };
    }

    const plausible = continuityAdmissible.filter(m =>
      !m.unknown && m.support >= 3 && !m.forcedWorsening && !m.insulating &&
      m.contactPreservedFraction >= 0.90 &&
      m.improvementFraction >= 0.60 && m.meanPressure < currentPressure - 0.25
    );
    if (plausible.length) {
      plausible.sort((a,b) => {
        const ca = Math.min(1, a.support / 10);
        const cb = Math.min(1, b.support / 10);
        const sa = (currentPressure - a.meanPressure) * ca
          - Math.max(0, a.maxPressure-currentPressure)*0.30
          + a.contactGain*0.01
          + a.contactPreservedFraction*4;
        const sb = (currentPressure - b.meanPressure) * cb
          - Math.max(0, b.maxPressure-currentPressure)*0.30
          + b.contactGain*0.01
          + b.contactPreservedFraction*4;
        return sb - sa || b.support - a.support || a.action - b.action;
      });
      state.decisions.defeasible_answerability++;
      return { action: plausible[0].action, mode: 'defeasible_answerability', models };
    }

    let admissible = continuityAdmissible.filter(m => !m.forcedWorsening && !m.insulating);
    if (!admissible.length) admissible = continuityAdmissible.slice();
    admissible.sort((a,b) => inquiryScore(state,b) - inquiryScore(state,a) || a.action - b.action);
    state.decisions.discriminating_inquiry++;
    return { action: admissible[0].action, mode: 'discriminating_inquiry', models };
  }

  const inquiry = continuityAdmissible.slice().sort((a,b) => {
    const sa = inquiryScore(state,a) - (a.unknown ? 0 : Math.max(0, a.meanPressure-currentPressure)/16);
    const sb = inquiryScore(state,b) - (b.unknown ? 0 : Math.max(0, b.meanPressure-currentPressure)/16);
    return sb - sa || a.action - b.action;
  });
  state.decisions.low_pressure_inquiry++;
  return { action: inquiry[0].action, mode: 'low_pressure_inquiry', models };
}

module.exports = { one, observe, chooseAction, actionModel, nearestOutcomes, frameDistance, trajectoryOutcome };
