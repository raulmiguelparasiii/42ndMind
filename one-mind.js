'use strict';

// 42ndMind minimal developmental core.
//
// Birth contains one undifferentiated adaptive cell. There are no symbols,
// concepts, parser, rules, planner, ontology, task vocabulary, or seeded
// knowledge. Reality supplies only primitive continuous contact and viability.
//
// One law: represent what is contacted with the field that already exists;
// unresolved residual reality changes that same field. If the residual cannot
// be absorbed by the existing field, it differentiates into another cell.
// Every cell obeys the same law.

const EPS = 1e-12;
const ETA = 0.08;
const GROW = 0.12;

function norm(v) {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}
function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function unit(v) {
  const n = norm(v);
  if (n <= EPS) return v.map(() => 0);
  return v.map(x => x / n);
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function one() {
  return {
    whole: 1,
    alive: true,
    viability: 1,
    need: 0,
    want: 0,
    contact: null,
    action: 0,
    age: 0,

    // The entire developing substrate. Exactly one cell exists at birth.
    // `direction:null` means it has not yet differentiated around any contact.
    field: [{ direction: null, activity: 0, born: 0 }],

    // Developmental observables, not a second cognitive mechanism.
    residual: 1,
    growth: 0,
  };
}

function reality(R) {
  if (!R || !Array.isArray(R.sense) || R.sense.length < 1) throw new Error('R.sense must be a nonempty numeric array');
  if (!R.sense.every(Number.isFinite)) throw new Error('R.sense must contain only finite numbers');
  if (!Number.isFinite(R.viability) || R.viability < 0 || R.viability > 1) throw new Error('R.viability must be in [0,1]');
  return { sense: R.sense.slice(), viability: R.viability };
}

function padOrReject(M, x) {
  if (M.contact === null) return;
  if (M.contact.length !== x.length) throw new Error('embodiment dimension changed during one life');
}

function represent(M, x) {
  const formed = M.field.filter(c => Array.isArray(c.direction));
  const reconstruction = Array(x.length).fill(0);
  const activity = [];

  for (const cell of formed) {
    const a = dot(cell.direction, x);
    activity.push(a);
    for (let j = 0; j < x.length; j++) reconstruction[j] += a * cell.direction[j];
  }

  const residual = x.map((v, j) => v - reconstruction[j]);
  return { formed, activity, reconstruction, residual };
}

function absorb(M, x) {
  // First contact differentiates the one cell already present at birth.
  if (M.field[0].direction === null) {
    M.field[0].direction = unit(x);
    M.field[0].activity = dot(M.field[0].direction, x);
    M.residual = 0;
    return;
  }

  let view = represent(M, x);
  const xNorm = Math.max(EPS, norm(x));
  let ratio = norm(view.residual) / xNorm;

  // The same local plasticity law applies to every existing cell.
  // Each cell bends only toward the reality left unexplained by the field.
  for (let i = 0; i < view.formed.length; i++) {
    const cell = view.formed[i];
    const a = view.activity[i];
    const changed = cell.direction.map((w, j) => w + ETA * a * view.residual[j]);
    cell.direction = unit(changed);
  }

  view = represent(M, x);
  ratio = norm(view.residual) / xNorm;

  // Persistent unresolved reality differentiates the same field. The newborn
  // cell is literally the normalized residual the prior whole could not carry.
  if (ratio > GROW) {
    M.field.push({ direction: unit(view.residual), activity: 0, born: M.age });
    M.growth += 1;
    view = represent(M, x);
    ratio = norm(view.residual) / xNorm;
  }

  const formed = M.field.filter(c => Array.isArray(c.direction));
  const finalView = represent(M, x);
  for (let i = 0; i < formed.length; i++) formed[i].activity = finalView.activity[i];
  M.residual = ratio;
}

function express(M) {
  // One primitive motor surface. There is no action policy. Motor expression is
  // simply the current state of the same field exposed through the body.
  let s = 0;
  for (let i = 0; i < M.field.length; i++) {
    const a = Number.isFinite(M.field[i].activity) ? M.field[i].activity : 0;
    s += a / (i + 1);
  }
  return Math.tanh(s);
}

function C(M, incoming) {
  if (!M || M.whole !== 1 || !Array.isArray(M.field) || M.field.length < 1) throw new Error('C requires one whole M');
  if (!M.alive) return M;

  const R = reality(incoming);
  M.viability = R.viability;
  M.need = 1 - R.viability;
  M.want = M.need;

  if (R.viability <= 0) {
    M.alive = false;
    M.action = 0;
    return M;
  }

  // Need is one primitive interoceptive magnitude inside the same contact.
  // It has no semantic label or reward value inside the field.
  const x = R.sense.concat([M.need]);
  padOrReject(M, x);
  M.contact = x.slice();
  M.age += 1;

  absorb(M, x);
  M.action = clamp(express(M), -1, 1);
  return M;
}

module.exports = { one, C };
