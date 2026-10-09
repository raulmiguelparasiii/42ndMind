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
// Practicality prior:
//   reality imposes finite time/capacity and some consequences are irreversible.
//   Directly trying every live possibility is therefore not always available.
//   When learned relations can project consequences, use them before committing;
//   as embodied constraint rises, demand stronger warrant for risky inquiry.
//
// OneLogic prior:
//   preserve undefeated outcome possibilities; do not turn undefined into false;
//   distinguish strict consequence from defeasible preference; when unresolved,
//   prefer discriminating reality-contact that does not gratuitously destroy the
//   capacity for further contact; reopen/expand the representation when defeated.

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
      foresight_strict: 0,
      foresight_defeasible: 0,
      practical_inquiry: 0,
    },
    prior: {
      stone: 'resolve real pressure through answerable reality-contact; do not prefer insulation merely because it hides friction; preserve the capacity for continued reality-contact',
      practicality: 'finite time/capacity makes exhaustive direct trial impossible; use learned consequence structure to infer before irreversible commitment, with warrant proportional to constraint',
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

function keepDiverse(nodes, limit) {
  if (nodes.length <= limit) return nodes;
  const chosen = [];
  const seen = new Set();
  function take(sorted, n) {
    for (const x of sorted) {
      const k = `${x.firstAction}|${x.depth}|${coarseSignature(x.frame)}|${x.unknown?1:0}|${x.minContinuity}`;
      if (seen.has(k)) continue;
      seen.add(k); chosen.push(x);
      if (chosen.length >= n) break;
    }
  }
  const q = Math.max(1, Math.floor(limit / 4));
  take(nodes.slice().sort((a,b)=>a.minContinuity-b.minContinuity || b.maxPressure-a.maxPressure), q);
  take(nodes.slice().sort((a,b)=>b.maxPressure-a.maxPressure || b.finalPressure-a.finalPressure), q*2);
  take(nodes.slice().sort((a,b)=>a.finalPressure-b.finalPressure || b.support-a.support), q*3);
  take(nodes.slice().sort((a,b)=>a.distance-b.distance || b.support-a.support), limit);
  return chosen.slice(0, limit);
}

function prospectAction(state, frame, firstAction, horizon = 3, beam = 28) {
  const initial = nearestOutcomes(state, frame, firstAction, 6);
  const currentPressure = pressure(frame);
  if (!initial.length) {
    return {
      action:firstAction, unknown:true, support:0, horizon,
      contactPreservedFraction:1, anyContactLoss:false, forcedContactLoss:false,
      improvementFraction:0, meanPressure:null, maxPressure:null, minPressure:null,
      uncertainty:1, information:Infinity, forcedImprovement:false,
    };
  }

  let nodes = initial.map(x => ({
    firstAction,
    frame:x.after.slice(),
    minContinuity:continuity(x.after),
    maxPressure:pressure(x.after),
    finalPressure:pressure(x.after),
    support:1,
    distance:x.distance,
    depth:1,
    unknown:false,
  }));

  for (let depth = 1; depth < horizon; depth++) {
    const expanded = [];
    for (const node of nodes) {
      if (node.minContinuity <= 0) { expanded.push(node); continue; }
      let hadKnown = false;
      for (let action = 0; action < state.action_count; action++) {
        const outs = nearestOutcomes(state, node.frame, action, 3);
        if (!outs.length) continue;
        hadKnown = true;
        for (const out of outs) {
          expanded.push({
            firstAction,
            frame:out.after.slice(),
            minContinuity:Math.min(node.minContinuity, continuity(out.after)),
            maxPressure:Math.max(node.maxPressure, pressure(out.after)),
            finalPressure:pressure(out.after),
            support:node.support + 1,
            distance:node.distance + out.distance,
            depth:depth + 1,
            unknown:false,
          });
        }
      }
      if (!hadKnown) expanded.push({ ...node, depth:depth+1, unknown:true });
    }
    nodes = keepDiverse(expanded, beam);
  }

  const preserved = nodes.filter(x=>x.minContinuity>0).length / nodes.length;
  const finals = nodes.map(x=>x.finalPressure);
  const unknownFraction = nodes.filter(x=>x.unknown).length / nodes.length;
  const improvementFraction = finals.filter(p=>p<currentPressure).length / finals.length;
  const signatures = nodes.map(x=>coarseSignature(x.frame));
  return {
    action:firstAction,
    unknown:false,
    support:initial.length,
    horizon,
    leaves:nodes.length,
    contactPreservedFraction:preserved,
    anyContactLoss:nodes.some(x=>x.minContinuity<=0),
    forcedContactLoss:nodes.every(x=>x.minContinuity<=0),
    improvementFraction,
    meanPressure:mean(finals),
    maxPressure:Math.max(...finals),
    minPressure:Math.min(...finals),
    uncertainty:unknownFraction,
    information:entropy(signatures),
    forcedImprovement:unknownFraction===0 && preserved===1 && Math.max(...finals)<currentPressure-0.5,
  };
}

function leastUsed(state) {
  let best = 0;
  for (let a = 1; a < state.action_count; a++) if (state.uses[a] < state.uses[best]) best = a;
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

  const currentPressure = pressure(frame);
  const constraint = clamp(currentPressure / 255, 0, 1);

  // Practicality changes bootstrap behavior: early inquiry is necessary, but as
  // embodied constraint rises it is no longer rational to insist on exhaustively
  // sampling every primitive intervention before using what has already been learned.
  if (state.transitions.length < state.action_count * 2 && constraint < 0.35) {
    const action = leastUsed(state);
    state.decisions.bootstrap_inquiry++;
    return { action, mode:'bootstrap_inquiry', models:[], prospects:[] };
  }

  const models = Array.from({length:state.action_count}, (_, action)=>actionModel(state, frame, action));
  const horizon = constraint >= 0.55 ? 4 : constraint >= 0.25 ? 3 : 2;
  const prospects = Array.from({length:state.action_count}, (_, action)=>prospectAction(state, frame, action, horizon));

  // Under real constraint, infer before committing. Strict foresight means every
  // represented continuation for the first action preserves contact and resolves
  // pressure. This is not a reward maximum; it is a forced consequence claim over
  // the currently represented live futures.
  if (currentPressure >= 8) {
    const strict = prospects.filter(p=>!p.unknown && p.support>=2 && p.forcedImprovement && !p.forcedContactLoss);
    if (strict.length) {
      strict.sort((a,b)=>a.maxPressure-b.maxPressure || b.contactPreservedFraction-a.contactPreservedFraction || b.support-a.support || a.action-b.action);
      state.decisions.foresight_strict++;
      return { action:strict[0].action, mode:'foresight_strict', models, prospects };
    }

    // Defeasible foresight: choose the action whose currently live projected
    // futures best preserve continued contact and resolve pressure, while making
    // uncertainty increasingly costly as practical constraint rises.
    const plausible = prospects.filter(p=>
      !p.unknown && !p.forcedContactLoss && p.contactPreservedFraction >= 0.85 &&
      p.improvementFraction >= 0.50
    );
    if (plausible.length) {
      plausible.sort((a,b)=>{
        const score = p =>
          (p.contactPreservedFraction * 24)
          + (currentPressure - p.meanPressure)
          - Math.max(0,p.maxPressure-currentPressure)*0.45
          - p.uncertainty*(8 + constraint*24)
          + Math.min(6,p.information)*0.15;
        return score(b)-score(a) || b.support-a.support || a.action-b.action;
      });
      state.decisions.foresight_defeasible++;
      return { action:plausible[0].action, mode:'foresight_defeasible', models, prospects };
    }
  }

  // If foresight cannot warrant a trajectory, inquiry remains legitimate, but
  // Practicality forbids treating all experiments as equally affordable. As
  // pressure rises, reject represented continuity loss and strongly prefer an
  // informative intervention whose projected futures preserve capacity.
  let admissible = prospects.filter(p=>!p.forcedContactLoss && p.contactPreservedFraction >= (constraint>0.5?0.9:0.65));
  if (!admissible.length) admissible = prospects.filter(p=>!p.forcedContactLoss);
  if (!admissible.length) admissible = prospects.slice();
  admissible.sort((a,b)=>{
    const score = p => {
      if (p.unknown) return constraint < 0.25 ? 40 - state.uses[p.action] : -40 - state.uses[p.action];
      return p.information*1.6 + p.contactPreservedFraction*12 - p.uncertainty*(6+constraint*20)
        - Math.max(0,p.meanPressure-currentPressure)*(0.08+constraint*0.25);
    };
    return score(b)-score(a) || a.action-b.action;
  });
  state.decisions.practical_inquiry++;
  return { action:admissible[0].action, mode:'practical_inquiry', models, prospects };
}

module.exports = {
  one, observe, chooseAction, actionModel, nearestOutcomes, frameDistance,
  trajectoryOutcome, prospectAction,
};
