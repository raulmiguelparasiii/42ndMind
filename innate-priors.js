'use strict';

// Innate epistemic guidance for 42ndMind.
//
// This is intentionally NOT a world reward table. It knows no food, water,
// shelter, hazard, key, person, map position, or good action. It receives only
// primitive sensor frames whose final channel is embodied friction, plus the
// primitive motor alphabet.
//
// Stone prior:
//   real pressure should be answered by reality-contact and genuine resolution,
//   not merely hidden/ignored while the pressure persists.
//
// OneLogic prior:
//   preserve undefeated outcome possibilities; do not turn undefined into false;
//   distinguish strict consequence from defeasible preference; when unresolved,
//   prefer discriminating reality-contact; when an observation defeats the model,
//   keep the observation and reopen/expand the represented outcomes.

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function mean(xs) { return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }

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
  // Exclude the final friction contact so "reality-contact" cannot be faked by
  // merely changing the pressure number itself.
  const n = Math.max(0, Math.min(a.length, b.length) - 1);
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}

function coarseSignature(frame) {
  // Generic observational signature for inquiry discrimination only. It is not
  // asserted as truth and it carries no domain semantics.
  return frame.map((x, i) => {
    if (i === frame.length - 1) return Math.floor(x / 16);
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
      stone: 'resolve real pressure through answerable reality-contact; do not prefer insulation merely because it hides friction',
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
  // Keep reality-contact bounded in this finite demonstrator without inventing a
  // preferred conclusion. Recent experience is retained alongside a substantial
  // historical window; the raw developmental tests preserve exact history elsewhere.
  if (state.transitions.length > 5000) state.transitions.splice(0, state.transitions.length - 5000);
}

function nearestOutcomes(state, frame, action, limit = 24) {
  const candidates = [];
  for (let i = 0; i < state.transitions.length; i++) {
    const t = state.transitions[i];
    if (t.action !== action) continue;
    candidates.push({ ...t, distance: frameDistance(frame, t.before), age: state.transitions.length - i });
  }
  candidates.sort((a,b) => a.distance - b.distance || a.age - b.age);
  if (!candidates.length) return [];

  // Preserve a local live possibility set rather than choosing one nearest past.
  // The radius is relative to the best admitted analogue, with a small absolute
  // allowance for noisy primitive contact.
  const best = candidates[0].distance;
  const radius = best * 1.35 + 10;
  const local = candidates.filter(x => x.distance <= radius).slice(0, limit);
  return local.length >= 3 ? local : candidates.slice(0, Math.min(limit, 3));
}

function actionModel(state, frame, action) {
  const live = nearestOutcomes(state, frame, action);
  const currentPressure = frame.at(-1);
  if (!live.length) {
    return {
      action, live, unknown: true, support: 0, currentPressure,
      minPressure: null, meanPressure: null, maxPressure: null,
      improvementFraction: 0, outcomeEntropy: Infinity,
      contactGain: Infinity, contextDistance: Infinity,
      forcedImprovement: false, forcedWorsening: false, insulating: false,
    };
  }

  const pressures = live.map(x => x.after.at(-1));
  const changes = live.map(x => sensoryChange(x.before, x.after));
  const signatures = live.map(x => coarseSignature(x.after));
  const minPressure = Math.min(...pressures);
  const maxPressure = Math.max(...pressures);
  const avgPressure = mean(pressures);
  const improvementFraction = pressures.filter(p => p < currentPressure).length / pressures.length;
  const forcedImprovement = maxPressure < currentPressure - 0.5;
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
  return discriminating * 2.4 + underused * 4 + contextNovelty + contact * 0.5;
}

function chooseAction(state, frame) {
  if (!Array.isArray(frame) || !frame.length) throw new Error('guidance requires a primitive sensor frame');

  // Before any outcome model exists, OneLogic requires reality-contact rather
  // than fabricated certainty. Exercise the least-observed intervention.
  if (state.transitions.length < state.action_count * 2) {
    const action = leastUsed(state);
    state.decisions.bootstrap_inquiry++;
    return { action, mode: 'bootstrap_inquiry', models: [] };
  }

  const models = Array.from({length: state.action_count}, (_, action) => actionModel(state, frame, action));
  const pressure = frame.at(-1);
  const pressureActive = pressure >= 8;

  if (pressureActive) {
    // Strict OneLogic + Stone case: every currently live analogous outcome for
    // this action resolves some of the active pressure. Prefer the action with
    // the strongest worst-case resolution. This is the closest thing here to a
    // categorical action warrant.
    const strict = models.filter(m => !m.unknown && m.support >= 2 && m.forcedImprovement && !m.insulating);
    if (strict.length) {
      strict.sort((a,b) =>
        (pressure - b.maxPressure) - (pressure - a.maxPressure) ||
        b.support - a.support ||
        b.contactGain - a.contactGain ||
        a.action - b.action
      );
      state.decisions.strict_answerability++;
      return { action: strict[0].action, mode: 'strict_answerability', models };
    }

    // Defeasible preference is explicitly not strict entailment. Use it only
    // when most relevant experience points toward pressure resolution and no
    // live local outcome forces worsening.
    const plausible = models.filter(m =>
      !m.unknown && m.support >= 3 && !m.forcedWorsening && !m.insulating &&
      m.improvementFraction >= 0.60 && m.meanPressure < pressure - 0.25
    );
    if (plausible.length) {
      plausible.sort((a,b) => {
        const ca = Math.min(1, a.support / 10);
        const cb = Math.min(1, b.support / 10);
        const sa = (pressure - a.meanPressure) * ca - Math.max(0, a.maxPressure-pressure)*0.30 + a.contactGain*0.01;
        const sb = (pressure - b.meanPressure) * cb - Math.max(0, b.maxPressure-pressure)*0.30 + b.contactGain*0.01;
        return sb - sa || b.support - a.support || a.action - b.action;
      });
      state.decisions.defeasible_answerability++;
      return { action: plausible[0].action, mode: 'defeasible_answerability', models };
    }

    // Pressure is real but the model does not yet warrant a resolving action.
    // Do not pretend. Seek discriminating contact, while avoiding an action whose
    // entire live local set currently forces worsening when alternatives exist.
    let admissible = models.filter(m => !m.forcedWorsening && !m.insulating);
    if (!admissible.length) admissible = models.slice();
    admissible.sort((a,b) => inquiryScore(state,b) - inquiryScore(state,a) || a.action - b.action);
    state.decisions.discriminating_inquiry++;
    return { action: admissible[0].action, mode: 'discriminating_inquiry', models };
  }

  // With little embodied pressure, use spare capacity to improve contact with
  // reality. This is not curiosity-for-reward: unresolved intervention outcomes
  // are themselves epistemic gaps under OneLogic.
  const inquiry = models.slice().sort((a,b) => {
    const sa = inquiryScore(state,a) - (a.unknown ? 0 : Math.max(0, a.meanPressure-pressure)/16);
    const sb = inquiryScore(state,b) - (b.unknown ? 0 : Math.max(0, b.meanPressure-pressure)/16);
    return sb - sa || a.action - b.action;
  });
  state.decisions.low_pressure_inquiry++;
  return { action: inquiry[0].action, mode: 'low_pressure_inquiry', models };
}

module.exports = { one, observe, chooseAction, actionModel, nearestOutcomes, frameDistance };
