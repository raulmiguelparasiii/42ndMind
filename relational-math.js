'use strict';

// Generic mathematical projection of stabilized structured relational contact.
// This is not a semantic dictionary and does not change F. It reads the facts
// already accumulated behind a canonical relation and expresses their stable
// intersection as a finite relational structure.

const EPS = 1e-12;
const stable = v => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
function hash32(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
const isScalar = v => v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));
function mathValue(v) {
  if (v === true) return '1';
  if (v === false) return '0';
  if (v === null) return '∅';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return `σ_${hash32(stable(v))}`;
}
function resolveCanonical(U, ref) {
  if (!U || !U.relations) return null;
  const s = String(ref);
  let id = U.relations[s] ? s : Object.keys(U.relations).find(k => (U.relations[k]?.labels || []).includes(s));
  if (!id) return null;
  return U.canonical?.[id] || id;
}
function membersOf(U, canonical) {
  const set = (U.equivalence_sets || []).find(x => x.representative === canonical);
  return set ? set.members.slice() : [canonical];
}
function factObservations(U, ref) {
  const canonical = resolveCanonical(U, ref);
  if (!canonical) return { canonical: null, observations: [] };
  const observations = [];
  for (const id of membersOf(U, canonical)) {
    const r = U.relations[id];
    for (const p of r?.provenance || []) {
      const facts = (p.facts || []).filter(f => Array.isArray(f) && f.length === 3).map(f => JSON.parse(JSON.stringify(f)));
      if (facts.length) observations.push(facts);
    }
  }
  return { canonical, observations };
}
function commonFacts(observations) {
  if (!observations.length) return [];
  const sets = observations.map(xs => new Set(xs.map(stable)));
  return observations[0].filter(f => sets.every(s => s.has(stable(f))));
}
function deriveRelationalAnatomy(observations = []) {
  const obs = observations.filter(Array.isArray).map(xs => xs.filter(f => Array.isArray(f) && f.length === 3));
  if (!obs.length) return { whole: 1, status: 'insufficient-grounding', support: 0, formula: '⊤', signature: null, relations: {}, vertices: {}, constraints: [], unresolved: [] };

  const core = commonFacts(obs).sort((a, b) => stable(a).localeCompare(stable(b)));
  const allKeys = new Map();
  for (const xs of obs) for (const f of xs) allKeys.set(stable(f), f);
  const coreKeys = new Set(core.map(stable));
  const unresolved = [...allKeys.entries()].filter(([k]) => !coreKeys.has(k)).map(([, f]) => f);
  if (!core.length) return { whole: 1, status: 'unresolved-relational-grounding', support: obs.length, formula: '⊤', signature: null, relations: {}, vertices: {}, constraints: [], unresolved };

  const relationSources = [...new Set(core.map(f => stable(f[1])))].sort();
  const relationMap = new Map(relationSources.map((k, i) => [k, `R${i + 1}`]));
  const nodeValues = [];
  for (const [s, , o] of core) {
    if (!isScalar(s)) nodeValues.push(s);
    if (!isScalar(o)) nodeValues.push(o);
  }
  const nodeSources = [...new Map(nodeValues.map(v => [stable(v), v])).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const nodeMap = new Map(nodeSources.map(([k], i) => [k, `v${i + 1}`]));

  const relations = {};
  relationSources.forEach(k => { const symbol = relationMap.get(k); relations[symbol] = { source: JSON.parse(k), source_id: `r_${hash32(k)}` }; });
  const vertices = {};
  nodeSources.forEach(([k, v]) => { const symbol = nodeMap.get(k); vertices[symbol] = { source: v, source_id: `v_${hash32(k)}` }; });

  const constraints = core.map(([s, r, o]) => {
    const relation = relationMap.get(stable(r));
    const subject = isScalar(s) ? mathValue(s) : nodeMap.get(stable(s));
    if (isScalar(o)) {
      const equation = `${relation}(${subject})=${mathValue(o)}`;
      return { kind: 'property', relation, subject, object: o, equation };
    }
    const object = nodeMap.get(stable(o));
    const equation = `${relation}(${subject},${object})=1`;
    return { kind: 'edge', relation, subject, object, equation };
  }).sort((a, b) => a.equation.localeCompare(b.equation));

  const structural = {
    relations: relationSources.map(k => `r_${hash32(k)}`).sort(),
    vertices: nodeSources.map(([k]) => `v_${hash32(k)}`).sort(),
    facts: core.map(f => [hash32(stable(f[0])), hash32(stable(f[1])), isScalar(f[2]) ? f[2] : hash32(stable(f[2]))]).sort((a, b) => stable(a).localeCompare(stable(b)))
  };
  const formula = `P_I := ${constraints.map(c => c.equation).join(' ∧ ')}`;
  return {
    whole: 1,
    status: obs.length >= 2 ? 'grounded-relational-equivalent' : 'relational-hypothesis',
    support: obs.length,
    relations,
    vertices,
    constraints,
    unresolved,
    formula,
    signature: `ν_${hash32(stable(structural))}`,
    invariant: 'The stable relational predicate defines the admissible realization set K_I; μ_I(K_I)=1. Constraints jointly define one local whole and are not probability slices.'
  };
}
function relationalEquivalent(U, ref) {
  const { canonical, observations } = factObservations(U, ref);
  if (!canonical) return null;
  return { canonical_relation: canonical, ...deriveRelationalAnatomy(observations) };
}

module.exports = { deriveRelationalAnatomy, relationalEquivalent, factObservations };
