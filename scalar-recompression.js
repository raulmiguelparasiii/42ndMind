'use strict';

// A richer description language for the same developmental objective:
//
//   M(t+1) = C(M(t) ⊕ R(t+1))
//
// Contacts are raw integer sensor values. C may describe a value literally, or
// exactly as a reusable basis value plus a signed residual. Nothing names
// clusters/categories. Reuse survives only when its model + residual code is
// shorter than the literal record. Decoding must recover every original value.

function gammaBits(n) {
  n = Math.max(1, Math.floor(n));
  return 2 * Math.floor(Math.log2(n)) + 1;
}
function zigzag(n) { return n >= 0 ? 2 * n : -2 * n - 1; }
function residualBits(delta) { return gammaBits(zigzag(delta) + 1); }
function log2Factorial(n) {
  let x = 0;
  for (let i = 2; i <= n; i++) x += Math.log2(i);
  return x;
}
function assignmentBits(assignments) {
  const counts = new Map();
  for (const a of assignments) counts.set(a, (counts.get(a) || 0) + 1);
  const n = assignments.length;
  let bits = log2Factorial(n);
  for (const count of counts.values()) bits -= log2Factorial(count);
  // Enumeratively transmit symbol counts; this is model bookkeeping, not a
  // preference for any particular number of groups.
  bits += counts.size * Math.log2(n + 1);
  return bits;
}

function evaluate(raw, bases, rawBits = 8) {
  if (!bases.length) {
    return {
      bits: raw.length * rawBits,
      assignments: raw.map(() => -1),
      residuals: raw.map(x => x),
    };
  }

  const assignments = [];
  const residuals = [];
  let payload = 0;
  for (const x of raw) {
    let bestId = -1;
    let bestDelta = x;
    let bestBits = rawBits;
    for (let i = 0; i < bases.length; i++) {
      const delta = x - bases[i];
      const bits = residualBits(delta);
      if (bits < bestBits) {
        bestId = i;
        bestDelta = delta;
        bestBits = bits;
      }
    }
    assignments.push(bestId);
    residuals.push(bestDelta);
    payload += bestBits;
  }

  const n = Math.max(1, raw.length);
  const modelBits = bases.length * (rawBits + Math.ceil(Math.log2(n + 1)));
  return {
    bits: modelBits + assignmentBits(assignments) + payload,
    assignments,
    residuals,
  };
}

function learn(raw, options = {}) {
  const rawBits = options.rawBits || 8;
  const maxBases = options.maxBases || 24;
  const candidates = [...new Set(raw)].sort((a, b) => a - b);
  let bases = [];
  let best = evaluate(raw, bases, rawBits);

  // Generic forward model search under the same description-length objective.
  while (bases.length < maxBases) {
    let winner = null;
    for (const candidate of candidates) {
      if (bases.includes(candidate)) continue;
      const trialBases = [...bases, candidate];
      const trial = evaluate(raw, trialBases, rawBits);
      if (!winner || trial.bits < winner.eval.bits ||
          (trial.bits === winner.eval.bits && candidate < winner.value)) {
        winner = { value: candidate, eval: trial };
      }
    }
    if (!winner || !(winner.eval.bits + 1e-9 < best.bits)) break;
    bases.push(winner.value);
    best = winner.eval;
  }

  // Let later reality remove an earlier basis if the whole history is shorter
  // without it. This keeps development reorganizable rather than append-only.
  let changed = true;
  while (changed && bases.length) {
    changed = false;
    for (let i = 0; i < bases.length; i++) {
      const trialBases = bases.filter((_, j) => j !== i);
      const trial = evaluate(raw, trialBases, rawBits);
      if (trial.bits + 1e-9 < best.bits) {
        bases = trialBases;
        best = trial;
        changed = true;
        break;
      }
    }
  }

  return { bases, ...best };
}

function one() {
  return {
    whole: 1,
    raw_stream: [],
    bases: [],
    assignments: [],
    residuals: [],
    description_bits: 0,
    generation: 0,
    formula: 'M(t+1)=C(M(t)⊕R(t+1)); exact scalar descriptions compete by total code length',
  };
}

function recompress(prior, newExperiences, options = {}) {
  const state = prior || one();
  const incoming = Array.isArray(newExperiences) ? newExperiences : [newExperiences];
  const raw = [...state.raw_stream, ...incoming].map(x => {
    if (!Number.isInteger(x) || x < 0 || x > 255) throw new Error('scalar contact must be integer 0..255');
    return x;
  });
  const learned = learn(raw, options);
  const out = {
    whole: 1,
    raw_stream: raw,
    bases: learned.bases,
    assignments: learned.assignments,
    residuals: learned.residuals,
    description_bits: learned.bits,
    generation: state.generation + 1,
    formula: state.formula,
  };
  if (JSON.stringify(decode(out)) !== JSON.stringify(raw)) throw new Error('scalar recompression lost reality-contact');
  return out;
}

function decode(state) {
  return state.assignments.map((id, i) => id < 0 ? state.residuals[i] : state.bases[id] + state.residuals[i]);
}

function describe(state) {
  return state.bases.map((base, id) => {
    const values = [];
    const deltas = [];
    for (let i = 0; i < state.assignments.length; i++) {
      if (state.assignments[i] !== id) continue;
      values.push(state.raw_stream[i]);
      deltas.push(state.residuals[i]);
    }
    const distinct = [...new Set(values)].sort((a, b) => a - b);
    const abs = deltas.map(Math.abs).sort((a, b) => a - b);
    const p90 = abs.length ? abs[Math.floor(0.9 * (abs.length - 1))] : 0;
    return {
      id,
      base,
      support: values.length,
      distinct_values: distinct.length,
      min: distinct.length ? distinct[0] : null,
      max: distinct.length ? distinct.at(-1) : null,
      p90_abs_residual: p90,
    };
  });
}

module.exports = { one, recompress, decode, describe, learn };
