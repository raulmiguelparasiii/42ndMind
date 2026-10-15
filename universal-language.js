'use strict';

// 42ndMind Universal Relational Language
//
// One state. One update. One live closure law:
//
//   U(t+1) = F(U(t) ⊕ X(t+1))
//
// U is the entire currently stabilized relational language (whole = 1).
// X is any new contact: expression, context, executable transition, structured
// relation, or a semantic hypothesis supplied by an external LLM.
// F is content-neutral. It accepts arbitrary relations, grounds them in observed
// dimensions, resolves redundancy/overlap, propagates every change through past
// intentions, and re-normalizes each resolved intention to one.
//
// The LLM never owns the state or the arithmetic. If an oracle is supplied, its
// only job is to propose candidate relations from a compact view of U + X. F then
// treats those proposals as corrigible contact and immediately pressure-tests them.

const EPS = 1e-12;
const VERSION = 1;

function clamp(x, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, x)); }
function round(x, n = 6) { const p = 10 ** n; return Math.round(x * p) / p; }
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function hash32(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}
function idFor(prefix, value) { return `${prefix}:${hash32(stable(value))}`; }
function uniq(values) { return [...new Set(values)]; }
function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }
function geometricMean(values) {
  if (!values.length) return 0;
  return Math.exp(values.reduce((s, x) => s + Math.log(Math.max(EPS, x)), 0) / values.length);
}

// Sparse vectors are plain objects {dimension: nonnegative magnitude}.
function vClone(v) { return Object.fromEntries(Object.entries(v || {}).filter(([, x]) => Number.isFinite(x) && x > 0)); }
function vNorm(v, weights = null) {
  let s = 0;
  for (const [k, x] of Object.entries(v || {})) {
    const w = weights ? (weights[k] ?? featureWeight(k)) : 1;
    s += w * x * x;
  }
  return Math.sqrt(s);
}
function vDot(a, b, weights = null) {
  const [small, large] = Object.keys(a || {}).length <= Object.keys(b || {}).length ? [a || {}, b || {}] : [b || {}, a || {}];
  let s = 0;
  for (const [k, x] of Object.entries(small)) {
    const y = large[k];
    if (y === undefined) continue;
    const w = weights ? (weights[k] ?? featureWeight(k)) : 1;
    s += w * x * y;
  }
  return s;
}
function vCos(a, b, weights = null) {
  const d = vNorm(a, weights) * vNorm(b, weights);
  return d > EPS ? clamp(vDot(a, b, weights) / d, -1, 1) : 0;
}
function vScale(v, s) {
  const out = {};
  for (const [k, x] of Object.entries(v || {})) if (x * s > EPS) out[k] = x * s;
  return out;
}
function vAdd(into, v, scale = 1) {
  for (const [k, x] of Object.entries(v || {})) {
    const n = (into[k] || 0) + x * scale;
    if (Math.abs(n) <= EPS) delete into[k]; else into[k] = n;
  }
  return into;
}
function vUnit(v, weights = null) {
  const n = vNorm(v, weights);
  return n > EPS ? vScale(v, 1 / n) : {};
}
function vDistance(a, b, weights = null) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  let s = 0;
  for (const k of keys) {
    const d = (a[k] || 0) - (b[k] || 0);
    const w = weights ? (weights[k] ?? featureWeight(k)) : 1;
    s += w * d * d;
  }
  return Math.sqrt(s);
}
function topVector(v, n = 12) {
  return Object.entries(v || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)
    .map(([dimension, weight]) => ({ dimension, weight: round(weight) }));
}

function featureWeight(key) {
  if (key.startsWith('exec:')) return 2.8;
  if (key.startsWith('rel:')) return 2.4;
  if (key.startsWith('ctx:')) return 1.6;
  if (key.startsWith('form:')) return 0.85;
  if (key.startsWith('txt:')) return 0.65;
  return 1;
}
function groundedDimension(key) {
  return key.startsWith('exec:') || key.startsWith('rel:') || key.startsWith('ctx:');
}

function featureSlot(key) {
  if (key.startsWith('ctx:')) {
    const i = key.indexOf('=');
    return i > 0 ? key.slice(0, i) : null;
  }
  if (key.startsWith('exec:before:') || key.startsWith('exec:after:')) {
    const i = key.indexOf('=');
    return i > 0 ? key.slice(0, i) : null;
  }
  if (key.startsWith('exec:delta:')) {
    const parts = key.split(':');
    return parts.length >= 4 ? parts.slice(0, 3).join(':') : null;
  }
  return null;
}
function categoricalConflict(observed, relationVector) {
  const observedBySlot = new Map();
  for (const [key, weight] of Object.entries(observed || {})) {
    const slot = featureSlot(key);
    if (!slot) continue;
    if (!observedBySlot.has(slot)) observedBySlot.set(slot, new Map());
    observedBySlot.get(slot).set(key, weight);
  }
  let conflict = 0, comparable = 0;
  for (const [key, weight] of Object.entries(relationVector || {})) {
    const slot = featureSlot(key);
    if (!slot || !observedBySlot.has(slot)) continue;
    comparable += weight;
    if (!observedBySlot.get(slot).has(key)) conflict += weight;
  }
  return comparable > EPS ? clamp(conflict / comparable) : 0;
}

function flatten(value, prefix = '', out = {}) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((x, i) => flatten(x, prefix ? `${prefix}.${i}` : String(i), out));
    return out;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value).sort()) flatten(value[key], prefix ? `${prefix}.${key}` : key, out);
    return out;
  }
  out[prefix] = value;
  return out;
}
function atom(value) {
  if (typeof value === 'string') return value.toLowerCase();
  return stable(value);
}
function tokenize(text) {
  const clean = String(text || '').normalize('NFKC').toLowerCase();
  return clean.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?|[^\s\p{L}\p{N}]/gu) || [];
}
function textFeatures(text) {
  const tokens = tokenize(text);
  const out = {};
  const add = (k, w = 1) => { out[k] = (out[k] || 0) + w; };
  for (const token of tokens) {
    if (/^[\p{L}\p{N}]/u.test(token)) add(`txt:u:${token}`, 1);
    else add(`form:punct:${token}`, 1);
  }
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= tokens.length; i++) add(`txt:${n}:${tokens.slice(i, i + n).join(' ')}`, 0.75 / n);
  }
  add(`form:tokens:${Math.min(12, tokens.length)}`, 0.4);
  if (/\?$/.test(String(text || '').trim())) add('form:question', 1);
  if (/!$/.test(String(text || '').trim())) add('form:exclamation', 0.7);
  return out;
}
function contextFeatures(context) {
  const out = {};
  for (const [key, value] of Object.entries(flatten(context || {}))) out[`ctx:${key}=${atom(value)}`] = 1;
  return out;
}
function executionFeatures(execution) {
  const out = {};
  if (!execution || typeof execution !== 'object') return out;
  const before = flatten(execution.before || {});
  const after = flatten(execution.after || {});
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
    if (hasBefore) out[`exec:before:${key}=${atom(before[key])}`] = 0.45;
    if (hasAfter) out[`exec:after:${key}=${atom(after[key])}`] = 0.45;
    if (hasBefore && hasAfter) {
      if (stable(before[key]) === stable(after[key])) out[`exec:delta:${key}:same:${atom(before[key])}`] = 1;
      else out[`exec:delta:${key}:${atom(before[key])}>${atom(after[key])}`] = 1.6;
    } else if (hasBefore) out[`exec:delta:${key}:present>absent`] = 1.6;
    else out[`exec:delta:${key}:absent>present`] = 1.6;
  }
  if (execution.action !== undefined) out[`exec:action:${atom(execution.action)}`] = 1.2;
  return out;
}
function structuredFeatures(relations) {
  const out = {};
  for (const fact of relations || []) {
    if (Array.isArray(fact) && fact.length === 3) out[`rel:${stable(fact[0])}|${stable(fact[1])}|${stable(fact[2])}`] = 1.4;
    else if (fact && typeof fact === 'object') out[`rel:${stable(fact)}`] = 1.4;
    else out[`rel:${stable(fact)}`] = 1.2;
  }
  return out;
}
function contactVector(contact) {
  const out = {};
  vAdd(out, textFeatures(contact?.utterance || contact?.text || ''));
  vAdd(out, contextFeatures(contact?.context));
  vAdd(out, executionFeatures(contact?.execution));
  vAdd(out, structuredFeatures(contact?.facts));
  return vUnit(out);
}

function normalizeEvidence(evidence) {
  if (!evidence) return {};
  if (Array.isArray(evidence)) {
    const out = {};
    for (const item of evidence) {
      if (typeof item === 'string') out[item] = (out[item] || 0) + 1;
      else if (item && typeof item === 'object' && item.dimension) out[item.dimension] = (out[item.dimension] || 0) + Math.max(EPS, Number(item.weight) || 1);
      else out[`rel:${stable(item)}`] = 1;
    }
    return out;
  }
  if (typeof evidence === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(evidence)) {
      if (Number.isFinite(value) && value > 0) out[key] = value;
      else out[`rel:${key}=${stable(value)}`] = 1;
    }
    return out;
  }
  return { [`rel:${stable(evidence)}`]: 1 };
}

function defaultConfig(overrides = {}) {
  return {
    equivalence_threshold: 0.985,
    overlap_threshold: 0.58,
    candidate_threshold: 0.08,
    candidate_limit: 48,
    relation_learning_rate: 0.34,
    lexical_inheritance: 0.55,
    context_inheritance: 0.72,
    grounding_inheritance: 1.0,
    min_equivalence_support: 2,
    resolve_iterations: 90,
    resolve_learning_rate: 0.075,
    redundancy_penalty: 0.055,
    sparsity_penalty: 0.002,
    unknown_floor: 0.015,
    fixed_point_passes: 8,
    fixed_point_epsilon: 1e-7,
    history_limit: 4096,
    ...overrides,
  };
}

function one(options = {}) {
  return {
    whole: 1,
    version: VERSION,
    step: 0,
    config: defaultConfig(options.config || {}),
    relations: {},
    relation_order: [],
    encounters: [],
    canonical: {},
    equivalence_sets: [],
    overlaps: [],
    contradictions: [],
    current: null,
    metrics: {
      progress: 0,
      coverage: 0,
      resolution: 0,
      grounding: 0,
      consistency: 1,
      stability: 0,
      unknown_mass: 1,
      relations: 0,
      canonical_relations: 0,
      encounters: 0,
      fixed_point_passes: 0,
      bar: '[------------------------------]   0.00%',
    },
    audit: [],
  };
}

function assertState(U) {
  if (!U || U.whole !== 1 || U.version !== VERSION) throw new Error('F requires one universal relational state');
}
function relationId(candidate) {
  if (candidate.id) return String(candidate.id);
  if (candidate.label) return idFor('r', String(candidate.label).trim().toLowerCase());
  return idFor('r', candidate);
}
function relationSkeleton(candidate, step) {
  const id = relationId(candidate);
  return {
    id,
    labels: candidate.label ? [String(candidate.label)] : [],
    created_at: step,
    updated_at: step,
    observations: 0,
    support: 0,
    grounded_support: 0,
    contradiction_support: 0,
    vector: {},
    previous_vector: {},
    drift: 1,
    stability: 0,
    active: true,
    parents: [],
    children: [],
    explicit_equivalents: [],
    explicit_contradictions: [],
    provenance: [],
  };
}
function ensureRelation(U, candidate) {
  const id = relationId(candidate);
  if (!U.relations[id]) {
    U.relations[id] = relationSkeleton(candidate, U.step);
    U.relation_order.push(id);
  }
  const r = U.relations[id];
  if (candidate.label && !r.labels.includes(String(candidate.label))) r.labels.push(String(candidate.label));
  return r;
}
function inheritanceVector(contactVec, config) {
  const out = {};
  for (const [key, weight] of Object.entries(contactVec)) {
    let scale = config.lexical_inheritance;
    if (key.startsWith('ctx:')) scale = config.context_inheritance;
    if (groundedDimension(key)) scale = config.grounding_inheritance;
    out[key] = weight * scale;
  }
  return out;
}
function updateRelation(U, candidate, contactVec, provenance) {
  const r = ensureRelation(U, candidate);
  r.previous_vector = vClone(r.vector);
  const evidence = normalizeEvidence(candidate.evidence);
  const combined = {};
  vAdd(combined, inheritanceVector(contactVec, U.config));
  vAdd(combined, evidence, 1.5);
  if (candidate.facts) vAdd(combined, structuredFeatures(candidate.facts), 1.5);
  if (candidate.execution) vAdd(combined, executionFeatures(candidate.execution), 1.5);
  const unit = vUnit(combined);
  const alpha = clamp(U.config.relation_learning_rate / Math.sqrt(1 + r.observations * 0.2), 0.05, 0.5);
  if (!Object.keys(r.vector).length) r.vector = unit;
  else {
    const next = vScale(r.vector, 1 - alpha);
    vAdd(next, unit, alpha);
    r.vector = vUnit(next);
  }
  const grounded = Object.entries(unit).reduce((s, [k, x]) => s + (groundedDimension(k) ? x * x * featureWeight(k) : 0), 0);
  r.observations += 1;
  r.support += Math.max(0.1, Number(candidate.support) || 1);
  r.grounded_support += Math.max(0, grounded);
  r.drift = clamp(vDistance(r.previous_vector, r.vector) / Math.max(EPS, vNorm(r.vector)));
  r.updated_at = U.step;
  if (candidate.active === false) r.active = false;
  r.parents = uniq([...r.parents, ...(candidate.parents || []).map(String)]);
  r.children = uniq([...r.children, ...(candidate.children || []).map(String)]);
  r.explicit_equivalents = uniq([...r.explicit_equivalents, ...(candidate.equivalent_to || candidate.equivalents || []).map(String)]);
  r.explicit_contradictions = uniq([...r.explicit_contradictions, ...(candidate.contradicts || []).map(String)]);
  if (provenance) r.provenance.push(provenance);
  if (r.provenance.length > 64) r.provenance.splice(0, r.provenance.length - 64);
  return r.id;
}

function candidateRelationsFromContact(contact, oracleSignal) {
  const all = [];
  for (const source of [contact?.relations, contact?.candidates]) {
    if (!Array.isArray(source)) continue;
    for (const candidate of source) if (candidate && typeof candidate === 'object') all.push({ candidate, source: contact?.source || 'contact' });
  }
  for (const source of [oracleSignal?.relations, oracleSignal?.candidates]) {
    if (!Array.isArray(source)) continue;
    for (const candidate of source) if (candidate && typeof candidate === 'object') all.push({ candidate, source: 'semantic_signal' });
  }
  return all;
}

function synchronizeHierarchy(U) {
  // Parent/child links are ordinary proposed relations. Mirror whichever side was
  // supplied so recursive decomposition sees one coherent hierarchy without
  // privileging labels or English grammar.
  for (const id of U.relation_order) {
    const r = U.relations[id];
    if (!r) continue;
    for (const ref of r.children.slice()) {
      const childId = resolveRawRelationReference(U, ref);
      if (childId && childId !== id) U.relations[childId].parents = uniq([...U.relations[childId].parents, id]);
    }
    for (const ref of r.parents.slice()) {
      const parentId = resolveRawRelationReference(U, ref);
      if (parentId && parentId !== id) U.relations[parentId].children = uniq([...U.relations[parentId].children, id]);
    }
  }
}
function resolveRawRelationReference(U, ref) {
  if (!ref) return null;
  const text = String(ref);
  if (U.relations[text]) return text;
  return U.relation_order.find(id => U.relations[id]?.labels?.includes(text)) || null;
}

function relationSimilarity(a, b) { return vCos(a.vector, b.vector); }
class UnionFind {
  constructor(items) { this.parent = Object.fromEntries(items.map(x => [x, x])); }
  find(x) { let p = this.parent[x]; while (p !== this.parent[p]) p = this.parent[p]; while (x !== p) { const n = this.parent[x]; this.parent[x] = p; x = n; } return p; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a === b) return; this.parent[a < b ? b : a] = a < b ? a : b; }
}
function explicitEquivalent(a, b) {
  return a.explicit_equivalents.includes(b.id) || b.explicit_equivalents.includes(a.id) ||
    a.labels.some(label => b.explicit_equivalents.includes(label)) || b.labels.some(label => a.explicit_equivalents.includes(label));
}
function explicitContradiction(a, b) {
  return a.explicit_contradictions.includes(b.id) || b.explicit_contradictions.includes(a.id) ||
    a.labels.some(label => b.explicit_contradictions.includes(label)) || b.labels.some(label => a.explicit_contradictions.includes(label));
}
function canonicalize(U) {
  const active = U.relation_order.map(id => U.relations[id]).filter(r => r && r.active && Object.keys(r.vector).length);
  const uf = new UnionFind(active.map(r => r.id));
  const overlaps = [];
  const contradictions = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      const sim = relationSimilarity(a, b);
      const contradict = explicitContradiction(a, b);
      if (contradict) contradictions.push({ a: a.id, b: b.id, similarity: round(sim) });
      if (!contradict && (explicitEquivalent(a, b) ||
          (a.support >= U.config.min_equivalence_support && b.support >= U.config.min_equivalence_support && sim >= U.config.equivalence_threshold))) {
        uf.union(a.id, b.id);
      } else if (sim >= U.config.overlap_threshold) {
        overlaps.push({ a: a.id, b: b.id, similarity: round(sim) });
      }
    }
  }
  const groups = new Map();
  for (const r of active) {
    const root = uf.find(r.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r.id);
  }
  const canonical = {};
  const equivalenceSets = [];
  for (const ids of groups.values()) {
    ids.sort();
    const members = ids.map(id => U.relations[id]);
    members.sort((a, b) => b.grounded_support - a.grounded_support || b.support - a.support || a.id.localeCompare(b.id));
    const representative = members[0].id;
    for (const id of ids) canonical[id] = representative;
    equivalenceSets.push({ representative, members: ids.slice() });
  }
  equivalenceSets.sort((a, b) => a.representative.localeCompare(b.representative));
  U.canonical = canonical;
  U.equivalence_sets = equivalenceSets;
  U.overlaps = overlaps.sort((a, b) => b.similarity - a.similarity || a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
  U.contradictions = contradictions;
}

function canonicalRelations(U) {
  const map = new Map();
  for (const group of U.equivalence_sets) {
    const members = group.members.map(id => U.relations[id]).filter(Boolean);
    const vector = {};
    let total = 0;
    let support = 0, grounded = 0, stability = 0;
    const labels = [];
    for (const r of members) {
      const w = Math.max(EPS, r.support);
      vAdd(vector, r.vector, w);
      total += w;
      support += r.support;
      grounded += r.grounded_support;
      stability += r.stability * w;
      labels.push(...r.labels);
    }
    const rep = group.representative;
    map.set(rep, {
      id: rep,
      members: group.members.slice(),
      labels: uniq(labels),
      vector: vUnit(total > 0 ? vScale(vector, 1 / total) : vector),
      support,
      grounded_support: grounded,
      stability: total > 0 ? stability / total : 0,
      parents: uniq(members.flatMap(r => r.parents || [])),
      children: uniq(members.flatMap(r => r.children || [])),
    });
  }
  return map;
}

function canonicalHintIds(U, ids) {
  return uniq((ids || []).map(id => {
    if (U.canonical[id]) return U.canonical[id];
    const byLabel = U.relation_order.find(rid => U.relations[rid]?.labels?.includes(id));
    return byLabel ? (U.canonical[byLabel] || byLabel) : null;
  }).filter(Boolean));
}
function relevantRelations(U, x, hints = []) {
  const canon = canonicalRelations(U);
  const hintSet = new Set(canonicalHintIds(U, hints));
  const scored = [];
  for (const r of canon.values()) {
    const sim = vCos(x, r.vector);
    const conflict = categoricalConflict(x, r.vector);
    const compatibility = clamp(sim * Math.exp(-2.8 * conflict));
    const hint = hintSet.has(r.id) ? 0.3 : 0;
    const supportBoost = Math.min(0.12, Math.log1p(r.support) * 0.025);
    const score = compatibility + hint + supportBoost;
    if (score >= U.config.candidate_threshold || hintSet.has(r.id)) scored.push({ r, sim: compatibility, raw_similarity: sim, conflict, score });
  }
  scored.sort((a, b) => b.score - a.score || b.r.grounded_support - a.r.grounded_support || a.r.id.localeCompare(b.r.id));
  return scored.slice(0, U.config.candidate_limit);
}

function reconstruct(relations, weights, observedKeys = null) {
  const out = {};
  const mask = observedKeys ? new Set(observedKeys) : null;
  for (let i = 0; i < relations.length; i++) {
    if (weights[i] <= EPS) continue;
    const source = relations[i].r.vector;
    if (!mask) vAdd(out, source, weights[i]);
    else for (const [k, value] of Object.entries(source)) if (mask.has(k)) out[k] = (out[k] || 0) + value * weights[i];
  }
  return out;
}
function observedDot(a, b, observedKeys) {
  let s = 0;
  for (const k of observedKeys) s += (a[k] || 0) * (b[k] || 0) * featureWeight(k);
  return s;
}
function observedNorm(v, observedKeys) {
  return Math.sqrt(Math.max(0, observedDot(v, v, observedKeys)));
}
function observedDistance(a, b, observedKeys) {
  let s = 0;
  for (const k of observedKeys) {
    const d = (a[k] || 0) - (b[k] || 0);
    s += d * d * featureWeight(k);
  }
  return Math.sqrt(s);
}
function residualVector(x, pred) {
  const out = {};
  for (const k of new Set([...Object.keys(x), ...Object.keys(pred)])) {
    const d = (x[k] || 0) - (pred[k] || 0);
    if (d > EPS) out[k] = d;
  }
  return out;
}
function solveParticipation(U, x, relevant) {
  const n = relevant.length;
  if (!n || vNorm(x) <= EPS) return { weights: [], unknown: 1, residual: vClone(x), error: 1 };
  const observedKeys = Object.keys(x);
  const w = relevant.map(item => Math.max(0.005, item.sim + 0.08));
  const sims = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) sims[i][j] = sims[j][i] = Math.max(0, vCos(relevant[i].r.vector, relevant[j].r.vector));

  for (let iter = 0; iter < U.config.resolve_iterations; iter++) {
    const pred = reconstruct(relevant, w, observedKeys);
    for (let i = 0; i < n; i++) {
      let grad = 2 * observedDot(relevant[i].r.vector, pred, observedKeys) - 2 * observedDot(relevant[i].r.vector, x, observedKeys);
      let redundant = 0;
      for (let j = 0; j < n; j++) if (i !== j) redundant += sims[i][j] * w[j];
      grad += U.config.redundancy_penalty * redundant + U.config.sparsity_penalty;
      const eta = U.config.resolve_learning_rate / Math.sqrt(1 + iter * 0.08);
      w[i] = Math.max(0, w[i] - eta * grad);
    }
  }
  const pred = reconstruct(relevant, w, observedKeys);
  const xNorm = Math.max(EPS, observedNorm(x, observedKeys));
  const error = clamp(observedDistance(x, pred, observedKeys) / xNorm);
  const unknown = clamp(Math.max(U.config.unknown_floor, error));
  const knownMass = 1 - unknown;
  const sumW = w.reduce((a, b) => a + b, 0);
  const normalized = sumW > EPS ? w.map(x => x / sumW * knownMass) : w.map(() => 0);
  return { weights: normalized, unknown: sumW > EPS ? unknown : 1, residual: residualVector(x, pred), error };
}

function resolveRelationReference(U, ref) {
  if (!ref) return null;
  const text = String(ref);
  if (U.relations[text]) return U.canonical[text] || text;
  for (const id of U.relation_order) {
    const r = U.relations[id];
    if (r?.labels?.includes(text)) return U.canonical[id] || id;
  }
  return null;
}
function decomposeRelation(U, relationId, depth = 0, trail = new Set()) {
  const canonicalId = U.canonical[relationId] || relationId;
  if (trail.has(canonicalId) || depth >= 8) return { whole: 1, components: [], self_mass: 1, cycle_or_depth_limit: true };
  const canon = canonicalRelations(U);
  const parent = canon.get(canonicalId);
  if (!parent) return { whole: 1, components: [], self_mass: 1 };
  const childIds = uniq((parent.children || []).map(ref => resolveRelationReference(U, ref)).filter(Boolean))
    .filter(id => id !== canonicalId && !trail.has(id));
  if (!childIds.length) return { whole: 1, components: [], self_mass: 1 };
  const relevant = childIds.map(id => canon.get(id)).filter(Boolean).map(r => ({ r, sim: vCos(parent.vector, r.vector), score: vCos(parent.vector, r.vector) }));
  if (!relevant.length) return { whole: 1, components: [], self_mass: 1 };
  const solved = solveParticipation(U, parent.vector, relevant);
  const nextTrail = new Set(trail); nextTrail.add(canonicalId);
  const components = [];
  for (let i = 0; i < relevant.length; i++) {
    if (solved.weights[i] <= 1e-6) continue;
    components.push({
      relation: relevant[i].r.id,
      labels: relevant[i].r.labels.slice(0, 4),
      mass: round(solved.weights[i], 9),
      inside: decomposeRelation(U, relevant[i].r.id, depth + 1, nextTrail),
    });
  }
  components.sort((a, b) => b.mass - a.mass || a.relation.localeCompare(b.relation));
  const used = components.reduce((sum, c) => sum + c.mass, 0);
  const selfMass = clamp(1 - used);
  return { whole: 1, components, self_mass: round(selfMass, 9) };
}

function resolveVector(U, x, hints = []) {
  const relevant = relevantRelations(U, x, hints);
  const solved = solveParticipation(U, x, relevant);
  const components = [];
  for (let i = 0; i < relevant.length; i++) {
    if (solved.weights[i] <= 1e-5) continue;
    const r = relevant[i].r;
    components.push({
      relation: r.id,
      labels: r.labels.slice(0, 4),
      mass: solved.weights[i],
      similarity: relevant[i].sim,
      members: r.members,
      inside: decomposeRelation(U, r.id),
    });
  }
  components.sort((a, b) => b.mass - a.mass || a.relation.localeCompare(b.relation));
  const totalKnown = components.reduce((s, c) => s + c.mass, 0);
  const unknown = clamp(1 - totalKnown);
  const sum = totalKnown + unknown;
  if (Math.abs(sum - 1) > 1e-9) throw new Error(`local closure violated: ${sum}`);
  return {
    whole: 1,
    components: components.map(c => ({ ...c, mass: round(c.mass, 9), similarity: round(c.similarity, 6) })),
    unknown_mass: round(unknown, 9),
    reconstruction_error: round(solved.error, 9),
    unresolved_dimensions: topVector(solved.residual, 12),
  };
}

function relationGrounding(r) {
  if (r.support <= EPS) return 0;
  return clamp(r.grounded_support / Math.max(EPS, r.support * 1.2));
}
function relationStability(r) {
  const evidence = 1 - Math.exp(-r.support / 4);
  const grounding = relationGrounding(r);
  const drift = 1 - clamp(r.drift);
  const contradiction = 1 - clamp(r.contradiction_support / Math.max(EPS, r.support));
  return clamp(0.35 * evidence + 0.25 * grounding + 0.25 * drift + 0.15 * contradiction);
}
function refreshRelationStability(U) {
  for (const id of U.relation_order) {
    const r = U.relations[id];
    if (r) r.stability = relationStability(r);
  }
}

function reResolveAll(U) {
  for (const encounter of U.encounters) encounter.resolution = resolveVector(U, encounter.vector, encounter.hints);
}
function contradictionMass(U) {
  if (!U.contradictions.length) return 0;
  const canon = canonicalRelations(U);
  let burden = 0, denom = 0;
  for (const { a, b, similarity } of U.contradictions) {
    const ca = U.canonical[a] || a, cb = U.canonical[b] || b;
    const ra = canon.get(ca), rb = canon.get(cb);
    if (!ra || !rb) continue;
    const w = Math.min(ra.support, rb.support);
    burden += w * similarity;
    denom += w;
  }
  return denom > EPS ? clamp(burden / denom) : 0;
}
function progressBar(p, width = 30) {
  const n = Math.round(clamp(p) * width);
  return `[${'#'.repeat(n)}${'-'.repeat(width - n)}] ${(100 * clamp(p)).toFixed(2)}%`;
}
function refreshMetrics(U, passes = 0) {
  const resolutions = U.encounters.map(e => e.resolution).filter(Boolean);
  const unknown = resolutions.length ? mean(resolutions.map(r => r.unknown_mass)) : 1;
  const coverage = clamp(1 - unknown);
  const resolution = resolutions.length ? mean(resolutions.map(r => 1 - r.reconstruction_error)) : 0;
  const canon = [...canonicalRelations(U).values()];
  const support = canon.reduce((s, r) => s + r.support, 0);
  const grounding = support > EPS ? canon.reduce((s, r) => s + relationGrounding(r) * r.support, 0) / support : 0;
  const stability = support > EPS ? canon.reduce((s, r) => s + r.stability * r.support, 0) / support : 0;
  const consistency = 1 - contradictionMass(U);
  // The bar intentionally measures closure of encountered relational space. New
  // discrepancies can lower it. It never claims the unknown total of all meaning.
  const progress = geometricMean([coverage, resolution, grounding, consistency, stability]);
  U.metrics = {
    progress: round(progress), coverage: round(coverage), resolution: round(resolution),
    grounding: round(grounding), consistency: round(consistency), stability: round(stability),
    unknown_mass: round(unknown), relations: U.relation_order.length,
    canonical_relations: canon.length, encounters: U.encounters.length,
    fixed_point_passes: passes, bar: progressBar(progress),
  };
}

function compactRelation(r) {
  return {
    id: r.id,
    labels: r.labels.slice(0, 4),
    support: round(r.support),
    stability: round(r.stability),
    grounding: round(relationGrounding(r)),
    dimensions: topVector(r.vector, 8),
  };
}
function oracleView(U, contact, x) {
  const canon = [...canonicalRelations(U).values()].sort((a, b) => a.id.localeCompare(b.id));
  const relevant = relevantRelations(U, x).slice(0, 16).map(({ r, sim }) => ({ ...compactRelation(r), similarity: round(sim) }));
  // The oracle receives the entire currently stabilized language as a compressed
  // structural map, while only the locally relevant relations carry expanded
  // dimensional detail. History/examples remain in U, not in the context window.
  const languageMap = canon.map(r => ({
    id: r.id,
    labels: r.labels.slice(0, 2),
    support: round(r.support, 3),
    stability: round(r.stability, 3),
    grounding: round(relationGrounding(r), 3),
    parents: (r.parents || []).slice(0, 8),
    children: (r.children || []).slice(0, 8),
    signature: hash32(stable(topVector(r.vector, 6))),
  }));
  const unresolved = U.current?.resolution?.unresolved_dimensions || topVector(x, 12);
  return {
    law: 'U(t+1)=F(U(t)⊕X(t+1)); whole=1; propose relations only, never final numbers',
    step: U.step,
    contact: {
      utterance: contact?.utterance || contact?.text || null,
      context: contact?.context || null,
      execution: contact?.execution || null,
      facts: contact?.facts || null,
    },
    current_metrics: U.metrics,
    universal_language_map: languageMap,
    nearest_relations: relevant,
    unresolved_dimensions: unresolved,
    response_contract: {
      relations: [{
        label: 'short relation name',
        evidence: ['dimension already present or a rel:* dimension the proposal introduces'],
        parents: ['optional relation ids'],
        children: ['optional relation ids'],
        equivalent_to: ['optional ids'],
        contradicts: ['optional ids'],
      }],
    },
  };
}

function relationHintsFromCandidates(ids) { return uniq(ids); }
function addEncounter(U, contact, x, relationIds) {
  const encounter = {
    id: `i:${U.step}:${hash32(stable({ utterance: contact?.utterance || contact?.text || null, context: contact?.context || null, execution: contact?.execution || null }))}`,
    step: U.step,
    utterance: contact?.utterance || contact?.text || null,
    vector: x,
    hints: relationHintsFromCandidates(relationIds),
    resolution: null,
  };
  U.encounters.push(encounter);
  if (U.encounters.length > U.config.history_limit) U.encounters.splice(0, U.encounters.length - U.config.history_limit);
  return encounter;
}

function fixedPoint(U) {
  let previousCanonical = '';
  let previousMasses = null;
  let passes = 0;
  for (let pass = 0; pass < U.config.fixed_point_passes; pass++) {
    refreshRelationStability(U);
    canonicalize(U);
    refreshContradictionPressure(U);
    reResolveAll(U);
    const canonicalSignature = stable(U.canonical);
    const masses = U.encounters.flatMap(e => [
      ...(e.resolution?.components?.map(c => c.mass) || []),
      e.resolution?.unknown_mass ?? 1,
    ]);
    let delta = Infinity;
    if (previousMasses && previousMasses.length === masses.length) {
      delta = masses.reduce((m, value, i) => Math.max(m, Math.abs(value - previousMasses[i])), 0);
    }
    passes = pass + 1;
    if (canonicalSignature === previousCanonical && delta <= U.config.fixed_point_epsilon) break;
    previousCanonical = canonicalSignature;
    previousMasses = masses;
  }
  refreshMetrics(U, passes);
  return passes;
}

function refreshContradictionPressure(U) {
  // Contradiction burden is recomputed from the current relational field. It does
  // not accumulate merely because F was called again without new evidence.
  for (const id of U.relation_order) if (U.relations[id]) U.relations[id].contradiction_support = 0;
  for (const { a, b, similarity } of U.contradictions) {
    const ra = U.relations[a], rb = U.relations[b];
    if (!ra || !rb) continue;
    const evidence = Math.min(ra.support, rb.support);
    const pressure = evidence * Math.max(0.05, similarity) * 0.08;
    ra.contradiction_support += pressure;
    rb.contradiction_support += pressure;
  }
}

async function F(U, contact, oracle = null) {
  assertState(U);
  if (!contact || typeof contact !== 'object') throw new Error('X must be a contact object');
  U.step += 1;
  const x = contactVector(contact);

  let oracleSignal = null;
  if (oracle) {
    if (typeof oracle !== 'function') throw new Error('oracle must be a function');
    // The oracle participates during the update. It receives only the compact
    // state needed to propose semantic distinctions. Its response is contact,
    // never authority; all arithmetic and acceptance remain inside F.
    oracleSignal = await oracle(oracleView(U, contact, x));
    if (oracleSignal != null && typeof oracleSignal !== 'object') throw new Error('oracle signal must be an object or null');
  }

  const candidates = candidateRelationsFromContact(contact, oracleSignal);
  const relationIds = [];
  for (const { candidate, source } of candidates) {
    relationIds.push(updateRelation(U, candidate, x, {
      step: U.step,
      source,
      utterance: contact.utterance || contact.text || null,
    }));
  }
  synchronizeHierarchy(U);

  // If structured facts arrive without a named candidate relation, keep them in
  // the field under an opaque handle so arbitrary relational contact is never lost.
  if ((contact.facts || []).length && !candidates.length) {
    const opaque = { label: `§relation-${U.step}`, evidence: structuredFeatures(contact.facts), support: 0.5 };
    relationIds.push(updateRelation(U, opaque, x, { step: U.step, source: 'structured_contact' }));
  }

  const encounter = addEncounter(U, contact, x, relationIds);
  canonicalize(U);
  refreshContradictionPressure(U);
  const passes = fixedPoint(U);
  encounter.resolution = resolveVector(U, x, relationIds);

  U.current = {
    step: U.step,
    contact: {
      utterance: contact.utterance || contact.text || null,
      context: contact.context || null,
      execution: contact.execution || null,
    },
    proposed_relations: relationIds,
    resolution: encounter.resolution,
    discrepancies: encounter.resolution.unresolved_dimensions,
    metrics: U.metrics,
  };

  U.audit.push({
    step: U.step,
    proposed_relations: relationIds,
    canonical_relations: relationIds.map(id => U.canonical[id] || id),
    unknown_mass: encounter.resolution.unknown_mass,
    progress: U.metrics.progress,
    fixed_point_passes: passes,
  });
  if (U.audit.length > U.config.history_limit) U.audit.splice(0, U.audit.length - U.config.history_limit);
  return U;
}

module.exports = { one, F };

// Self-contained falsification/demo. It is examples fed to the generic system,
// not semantic code inside F. Run: node universal-language.js
if (require.main === module) {
  (async () => {
    const U = one();
    const show = (name) => {
      const r = U.current?.resolution;
      console.log(`\n${name}`);
      console.log(U.metrics.bar);
      console.log('unknown =', r?.unknown_mass, 'components =', r?.components?.slice(0, 5).map(x => [x.labels[0] || x.relation, x.mass]));
      if (r?.unresolved_dimensions?.length) console.log('unresolved =', r.unresolved_dimensions.slice(0, 4));
    };

    await F(U, {
      utterance: 'close the program',
      context: { object_type: 'software', object: 'program' },
      execution: { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'close' },
      relations: [{
        id: 'r:terminate-process', label: 'terminate active process',
        evidence: ['exec:delta:running:true>false', 'ctx:object_type=software'],
      }],
    });
    await F(U, {
      utterance: 'quit the application',
      context: { object_type: 'software', object: 'application' },
      execution: { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'quit' },
      relations: [{
        id: 'r:quit-active-process', label: 'quit active process',
        evidence: ['exec:delta:running:true>false', 'ctx:object_type=software'],
      }],
    });
    await F(U, {
      utterance: 'hide the program window',
      context: { object_type: 'software-window', object: 'window' },
      execution: { before: { running: true, visible: true, file_exists: true }, after: { running: true, visible: false, file_exists: true }, action: 'hide' },
      relations: [{
        id: 'r:conceal-interface', label: 'conceal interface',
        evidence: ['exec:delta:visible:true>false', 'exec:delta:running:same:true', 'ctx:object_type=software-window'],
      }],
    });
    await F(U, {
      utterance: 'delete the application',
      context: { object_type: 'software-file', object: 'application' },
      execution: { before: { file_exists: true }, after: { file_exists: false }, action: 'delete' },
      relations: [{
        id: 'r:remove-file', label: 'remove persisted object',
        evidence: ['exec:delta:file_exists:true>false', 'ctx:object_type=software-file'],
      }],
    });

    // Repeat grounding so independently named relations can stabilize as one.
    await F(U, {
      utterance: 'close this application',
      context: { object_type: 'software', object: 'application' },
      execution: { before: { running: true, visible: true, file_exists: true }, after: { running: false, visible: false, file_exists: true }, action: 'close' },
      relations: [{
        id: 'r:terminate-process', label: 'terminate active process',
        evidence: ['exec:delta:running:true>false', 'ctx:object_type=software'],
      }, {
        id: 'r:quit-active-process', label: 'quit active process',
        evidence: ['exec:delta:running:true>false', 'ctx:object_type=software'],
      }],
    });
    show('after grounding + duplicate relation pressure');
    console.log('equivalence sets =', U.equivalence_sets.filter(x => x.members.length > 1));

    // No semantic candidate is supplied here. The established relational field
    // must narrow the intention from its expression + context alone.
    await F(U, {
      utterance: 'close the application',
      context: { object_type: 'software', object: 'application' },
    });
    show('resolve: close the application');
    const closeAppTop = U.current.resolution.components[0];
    if (!closeAppTop || !closeAppTop.members.includes('r:terminate-process')) throw new Error('software close disambiguation falsification failed');

    await F(U, {
      utterance: 'close the window',
      context: { object_type: 'software-window', object: 'window' },
    });
    show('resolve: close the window');
    const closeWindowTop = U.current.resolution.components[0];
    if (!closeWindowTop || !closeWindowTop.members.includes('r:conceal-interface')) throw new Error('window close disambiguation falsification failed');

    // A relation can itself be a local whole whose children are recursively
    // resolved inside it. The children are ordinary relations, not hard-coded slots.
    await F(U, {
      utterance: 'software closure changes active or accessible state',
      context: { domain: 'software-closure' },
      relations: [{
        id: 'r:software-closure', label: 'software closure',
        evidence: ['exec:delta:running:true>false', 'exec:delta:visible:true>false'],
        children: ['r:terminate-process', 'r:conceal-interface'],
      }],
    });
    const composite = U.current.resolution.components.find(x => x.relation === (U.canonical['r:software-closure'] || 'r:software-closure'));
    if (!composite || !composite.inside || !composite.inside.components.length) throw new Error('recursive relation decomposition falsification failed');
    const insideSum = composite.inside.components.reduce((sum, x) => sum + x.mass, 0) + composite.inside.self_mass;
    if (Math.abs(insideSum - 1) > 1e-7) throw new Error('recursive local closure falsification failed');

    // Live propagation: an earlier unresolved intention must change when later
    // grounding supplies a relation that accounts for it.
    await F(U, { utterance: 'seal the hatch', context: { object_type: 'hatch' } });
    const hatchEncounter = U.encounters[U.encounters.length - 1];
    const beforeHatchUnknown = hatchEncounter.resolution.unknown_mass;
    await F(U, {
      utterance: 'seal the hatch',
      context: { object_type: 'hatch' },
      execution: { before: { open: true }, after: { open: false }, action: 'seal' },
      relations: [{
        id: 'r:seal-barrier', label: 'seal barrier',
        evidence: ['exec:delta:open:true>false', 'ctx:object_type=hatch'],
      }],
    });
    const afterHatchUnknown = hatchEncounter.resolution.unknown_mass;
    if (!(afterHatchUnknown < beforeHatchUnknown)) throw new Error('live backward propagation falsification failed');

    // Abstract relations enter through the same mechanics. No desire-specific branch exists in F.
    await F(U, {
      utterance: 'I want water',
      context: { agent: 'speaker', target: 'water', pressure: 'thirst', orientation: 'toward-target' },
      facts: [['speaker', 'directed_toward', 'water']],
      relations: [{
        id: 'r:desire', label: 'desire',
        evidence: ['ctx:orientation=toward-target', 'rel:"speaker"|"directed_toward"|"water"'],
      }],
    });
    show('abstract relation accepted by the same field');

    const closureChecks = U.encounters.every(e => {
      const sum = (e.resolution?.components || []).reduce((s, c) => s + c.mass, 0) + (e.resolution?.unknown_mass ?? 1);
      return Math.abs(sum - 1) < 1e-7;
    });
    if (!closureChecks) throw new Error('closure falsification failed');
    if (!U.equivalence_sets.some(x => x.members.includes('r:terminate-process') && x.members.includes('r:quit-active-process'))) {
      throw new Error('duplicate relation stabilization falsification failed');
    }
    console.log('\nUNIVERSAL RELATIONAL LANGUAGE: SELF-TEST PASS');
    console.log(JSON.stringify(U.metrics, null, 2));
  })().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}
