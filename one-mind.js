'use strict';

// 42ndMind infant core.
//
// M is one continuing being. It begins with no learned relations.
// Reality supplies only raw sensation plus the being's present viability.
// Viability 1 means intact; viability 0 means the being can no longer continue.
// Need is the live deficit from 1. Want is that same deficit acting through M's
// learned action/consequence relations. Nothing semantic is seeded.
//
// Conceptually:
//
//   M.whole = 1
//   need(M) = 1 - viability(M)
//   want(M) = need(M)
//   M' = C(M, R)
//
// C contains no language, planner, reward table, goal list, world model,
// Stone, OneLogic, or task-specific knowledge. M learns only from what happens
// to this same being after its own primitive actions.

const EPS = 1e-12;

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function one(actionCount = 2) {
  if (!Number.isInteger(actionCount) || actionCount < 1) {
    throw new Error('actionCount must be a positive integer');
  }

  return {
    whole: 1,
    alive: true,
    action_count: actionCount,

    // Nothing has been experienced yet.
    viability: 1,
    need: 0,
    want: 0,
    sense: null,
    action: null,
    previous: null,

    // Growth exists only as retained lived consequence and relations derived
    // from it. Both begin empty.
    experience: [],
    relations: [],

    // Unguided primitive variation before reality has taught a useful relation.
    variation: -1,
  };
}

function contact(R) {
  if (!R || typeof R !== 'object') throw new Error('R must be an object');
  if (!Array.isArray(R.sense)) throw new Error('R.sense must be an array');
  if (!R.sense.every(v => v === null || typeof v === 'boolean' || typeof v === 'string' || Number.isFinite(v))) {
    throw new Error('R.sense may contain only finite primitive values or null');
  }
  if (!Number.isFinite(R.viability) || R.viability < 0 || R.viability > 1) {
    throw new Error('R.viability must be a finite number in [0,1]');
  }
  return { sense: R.sense.slice(), viability: R.viability };
}

function relationKey(context, action) {
  return `${context === null ? '*' : stable(context)}|${action}`;
}

function observeRelation(M, context, action, delta) {
  const key = relationKey(context, action);
  let r = M.relations.find(x => x.key === key);
  if (!r) {
    r = {
      key,
      context: context === null ? null : context.slice(),
      action,
      seen: 0,
      delta_sum: 0,
      mean_delta: 0,
    };
    M.relations.push(r);
  }
  r.seen += 1;
  r.delta_sum += delta;
  r.mean_delta = r.delta_sum / r.seen;
}

function learn(M, before, action, after) {
  const delta = after.viability - before.viability;
  M.experience.push({
    sense: before.sense.slice(),
    action,
    viability_before: before.viability,
    viability_after: after.viability,
    delta_viability: delta,
  });

  // Retain only the raw situation/action/consequence relation actually lived.
  // No semantic categories or hand-authored generalization are supplied.
  observeRelation(M, before.sense, action, delta);
}

function estimate(M, sense, action) {
  const exact = M.relations.find(r => r.key === relationKey(sense, action));
  return exact ? { delta: exact.mean_delta, seen: exact.seen } : null;
}

function choose(M, sense) {
  const known = [];
  const unknown = [];

  for (let action = 0; action < M.action_count; action++) {
    const e = estimate(M, sense, action);
    if (e) known.push({ action, ...e });
    else unknown.push(action);
  }

  // Reuse an experienced action that has actually increased this being's
  // viability in the present raw situation.
  const helpful = known.filter(x => x.delta > EPS).sort((a, b) =>
    b.delta - a.delta || b.seen - a.seen || a.action - b.action
  );
  if (helpful.length) return helpful[0].action;

  // If this situation is still unresolved, try an action whose consequence here
  // has never been lived. Variation only breaks symmetry among unknown actions.
  if (unknown.length) {
    M.variation = (M.variation + 1) % M.action_count;
    for (let offset = 0; offset < M.action_count; offset++) {
      const candidate = (M.variation + offset) % M.action_count;
      if (unknown.includes(candidate)) {
        M.variation = candidate;
        return candidate;
      }
    }
  }

  // If every available action has been tried and all currently appear harmful,
  // use the least harmful lived relation. There is still no external reward.
  known.sort((a, b) => b.delta - a.delta || b.seen - a.seen || a.action - b.action);
  return known[0].action;
}

function C(M, realityContact) {
  if (!M || M.whole !== 1) throw new Error('C requires one whole M');
  if (!M.alive) return M;

  const now = contact(realityContact);

  if (M.previous && Number.isInteger(M.action)) {
    learn(M, M.previous, M.action, now);
  }

  M.sense = now.sense.slice();
  M.viability = now.viability;
  M.need = 1 - now.viability;
  M.want = M.need;

  // At zero viability there is no later cognition to schedule. The same M has
  // reached its actual continuation boundary.
  if (M.viability <= 0) {
    M.alive = false;
    M.action = null;
    M.previous = now;
    return M;
  }

  // When intact there is no survival deficit. If reality later pulls viability
  // below 1, want becomes positive again immediately on contact.
  M.action = M.want > EPS ? choose(M, now.sense) : null;
  M.previous = now;
  return M;
}

module.exports = { one, C };
