'use strict';

// Zero-state extension of continuous relation proposal/completion to relations
// whose quantitative meaning requires more than one source. Durable meaning,
// warrant, correction, and history remain ordinary content in canonical M.

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function ref(id) { return { ref: String(id) }; }
function finite(v) { return typeof v === 'number' && Number.isFinite(v); }
function receptorCount(frame, concernCount) { return Math.max(0, (frame?.length || 0) - concernCount); }
function valueAt(frame, index, concernCount) {
  if (!Array.isArray(frame) || index < 0 || index >= receptorCount(frame, concernCount)) return undefined;
  const value = frame[index];
  return finite(value) ? value : undefined;
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (!(Math.abs(a[pivot][col]) > 1e-12)) return null;
    if (pivot !== col) [a[pivot], a[col]] = [a[col], a[pivot]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      if (Math.abs(factor) <= 1e-18) continue;
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  const out = a.map(row => row[n]);
  return out.every(finite) ? out : null;
}

function exactDegreeExponents(arity, total, prefix = [], out = []) {
  if (arity === 1) { out.push([...prefix, total]); return out; }
  for (let power = 0; power <= total; power++) exactDegreeExponents(arity - 1, total - power, [...prefix, power], out);
  return out;
}
function exponentBasis(arity, degree) {
  const out = [];
  for (let total = 0; total <= degree; total++) exactDegreeExponents(arity, total, [], out);
  return out;
}
function monomial(values, powers) {
  let product = 1;
  for (let i = 0; i < values.length; i++) product *= values[i] ** powers[i];
  return product;
}
function applyTransform(transform, values) {
  if (!transform || transform.kind !== 'multivariate_polynomial' || !Array.isArray(values) ||
      !Array.isArray(transform.origins) || !Array.isArray(transform.input_scales) ||
      !Array.isArray(transform.exponents) || !Array.isArray(transform.coefficients) ||
      transform.origins.length !== values.length || transform.input_scales.length !== values.length ||
      transform.exponents.length !== transform.coefficients.length) return undefined;
  const z = [];
  for (let i = 0; i < values.length; i++) {
    if (!finite(values[i]) || !finite(transform.origins[i]) || !finite(transform.input_scales[i]) ||
        Math.abs(transform.input_scales[i]) <= 1e-18) return undefined;
    z.push((values[i] - transform.origins[i]) / transform.input_scales[i]);
  }
  let y = 0;
  for (let i = 0; i < transform.coefficients.length; i++) {
    if (!finite(transform.coefficients[i]) || !Array.isArray(transform.exponents[i])) return undefined;
    y += transform.coefficients[i] * monomial(z, transform.exponents[i]);
  }
  return finite(y) ? y : undefined;
}

function samplesFor(state, sources, target, window = 64) {
  const contacts = state.contacts || [];
  const end = contacts.length;
  const start = Math.max(0, end - window);
  const concernCount = state.concern_count || 0;
  const maxLag = Math.max(0, ...sources.map(s => s.lag));
  const first = Math.max(start, maxLag);
  const samples = [];
  for (let t = first; t < end; t++) {
    const xs = sources.map(s => valueAt(contacts[t - s.lag], s.source, concernCount));
    const y = valueAt(contacts[t], target, concernCount);
    if (y !== undefined && xs.every(finite)) samples.push({ xs, y });
  }
  return samples;
}

function fitPolynomial(samples, degree) {
  if (!samples.length || degree < 1) return null;
  const arity = samples[0].xs.length;
  const origins = Array(arity).fill(0);
  for (const sample of samples) for (let i = 0; i < arity; i++) origins[i] += sample.xs[i];
  for (let i = 0; i < arity; i++) origins[i] /= samples.length;
  const inputScales = Array(arity).fill(0);
  for (const sample of samples) for (let i = 0; i < arity; i++) inputScales[i] += (sample.xs[i] - origins[i]) ** 2;
  for (let i = 0; i < arity; i++) inputScales[i] = Math.sqrt(inputScales[i] / samples.length);
  if (inputScales.some(scale => !(scale > 1e-12))) return null;

  const exponents = exponentBasis(arity, degree);
  if (samples.length < exponents.length + 2) return null;
  const matrix = Array.from({ length: exponents.length }, () => Array(exponents.length).fill(0));
  const vector = Array(exponents.length).fill(0);
  let sy = 0, syy = 0;
  const rows = [];
  for (const sample of samples) {
    const z = sample.xs.map((x, i) => (x - origins[i]) / inputScales[i]);
    const row = exponents.map(powers => monomial(z, powers));
    rows.push(row);
    sy += sample.y; syy += sample.y * sample.y;
    for (let i = 0; i < row.length; i++) {
      vector[i] += row[i] * sample.y;
      for (let j = 0; j < row.length; j++) matrix[i][j] += row[i] * row[j];
    }
  }
  const coefficients = solveLinearSystem(matrix, vector);
  if (!coefficients) return null;
  let sse = 0;
  for (let r = 0; r < rows.length; r++) {
    let predicted = 0;
    for (let i = 0; i < coefficients.length; i++) predicted += coefficients[i] * rows[r][i];
    const error = samples[r].y - predicted;
    sse += error * error;
  }
  const sst = syy - sy * sy / samples.length;
  if (!(sst > 1e-18)) return null;
  const transform = { kind: 'multivariate_polynomial', degree, origins, input_scales: inputScales, exponents, coefficients };
  return {
    transform,
    support: samples.length,
    fit_score: Math.max(0, Math.min(1, 1 - sse / sst)),
    fit_rmse: Math.sqrt(Math.max(0, sse) / samples.length),
    target_rms: Math.sqrt(Math.max(0, syy) / samples.length),
  };
}

function fitSimplest(state, sources, target, options = {}) {
  const window = options.window ?? 64;
  const minSupport = options.minSupport ?? 24;
  const threshold = options.threshold ?? 0.995;
  const samples = samplesFor(state, sources, target, window);
  if (samples.length < minSupport) return null;
  const evidenceDegree = Math.max(1, Math.floor(Math.log2(Math.max(1, samples.length / minSupport))) + 1);
  const maxDegree = Math.min(options.maxDegree ?? evidenceDegree, evidenceDegree);
  for (let degree = 1; degree <= maxDegree; degree++) {
    const fit = fitPolynomial(samples, degree);
    if (fit && fit.fit_score >= threshold * threshold) return fit;
  }
  return null;
}

function fitKnown(state, relation, transform, window = 64) {
  const samples = samplesFor(state, relation.sources, relation.target, window);
  if (samples.length < 2) return { support: samples.length, fit_score: null, fit_rmse: null, target_rms: null };
  let sy = 0, syy = 0, sse = 0;
  for (const sample of samples) {
    const predicted = applyTransform(transform, sample.xs);
    if (!finite(predicted)) return { support: samples.length, fit_score: null, fit_rmse: null, target_rms: null };
    sy += sample.y; syy += sample.y * sample.y;
    sse += (sample.y - predicted) ** 2;
  }
  const sst = syy - sy * sy / samples.length;
  if (!(sst > 1e-18)) return { support: samples.length, fit_score: null, fit_rmse: null, target_rms: null };
  return {
    support: samples.length,
    fit_score: Math.max(0, Math.min(1, 1 - sse / sst)),
    fit_rmse: Math.sqrt(Math.max(0, sse) / samples.length),
    target_rms: Math.sqrt(Math.max(0, syy) / samples.length),
  };
}

function topologyKey(x) {
  return `${x.sources.map(s => `${s.source}@${s.lag}`).join('+')}>${x.target}:joint`;
}
function baseRelationTermId(x) {
  return `continuous-relation:joint:${x.sources.map(s => `${s.source}@${s.lag}`).join('+')}:${x.target}`;
}
function sourceSetTermId(sources) {
  return `continuous-source-set:${sources.map(s => `p${s.source}@${s.lag}`).join('+')}`;
}
function activeRoutes(state) {
  return (state.knowledge?.rules || []).filter(rule =>
    rule.active !== false && rule.provenance?.kind === 'continuous_multisource_dependence');
}
function routeDescriptor(rule) {
  const p = rule.provenance || {};
  return { sources: Array.isArray(p.sources) ? p.sources.map(s => ({ ...s })) : [], target: p.target, orientation: 'joint', transform: p.transform };
}
function unarySameTimeTargets(state) {
  const out = new Set();
  for (const fact of state.knowledge?.current?.facts || []) {
    if (fact.relation !== 'ρ:continuous_dependence' || !fact.object || fact.object.lag !== 0 || fact.object.sources) continue;
    const match = /^receptor:p(\d+)$/.exec(String(fact.object.target));
    if (match) out.add(Number(match[1]));
  }
  return out;
}

// Candidate topology may grow combinatorially with receptor count and temporal
// depth, but proposal scheduling is not epistemic authority. Represent the whole
// search space compactly, then evaluate only a deterministic rotating budget.
function pairSourceSpace(channels, blockedTargets, maxLag) {
  const groups = [];
  const lagCount = maxLag + 1;
  const perPair = lagCount * lagCount;
  let total = 0;
  for (let target = 0; target < channels; target++) {
    if (blockedTargets.has(target)) continue;
    const sources = [];
    for (let i = 0; i < channels; i++) if (i !== target) sources.push(i);
    const pairs = [];
    for (let a = 0; a < sources.length; a++) for (let b = a + 1; b < sources.length; b++) pairs.push([sources[a], sources[b]]);
    const size = pairs.length * perPair;
    if (!size) continue;
    groups.push({ target, pairs, offset: total, size });
    total += size;
  }
  return { groups, total, lagCount, perPair };
}
function candidateAt(space, index) {
  if (!space.total) return null;
  const normalized = ((index % space.total) + space.total) % space.total;
  for (const group of space.groups) {
    if (normalized < group.offset || normalized >= group.offset + group.size) continue;
    const local = normalized - group.offset;
    const pair = group.pairs[Math.floor(local / space.perPair)];
    const remainder = local % space.perPair;
    const lagA = Math.floor(remainder / space.lagCount);
    const lagB = remainder % space.lagCount;
    return {
      sources: [{ source: pair[0], lag: lagA }, { source: pair[1], lag: lagB }],
      target: group.target,
      orientation: 'joint',
    };
  }
  return null;
}
function budgetSlice(space, n, cadence, budget) {
  if (!space.total) return [];
  const count = Math.min(space.total, budget);
  const start = space.total <= budget ? 0 : (Math.floor(n / cadence) * budget) % space.total;
  const out = [];
  for (let i = 0; i < count; i++) {
    const candidate = candidateAt(space, start + i);
    if (candidate) out.push(candidate);
  }
  return out;
}

function detect(state, options = {}) {
  const minSupport = options.minSupport ?? 24;
  const threshold = options.threshold ?? 0.995;
  const cadence = options.cadence ?? 16;
  const contacts = state.contacts || [];
  const n = contacts.length;
  if (n < minSupport) return [];
  const concernCount = state.concern_count || 0;
  const start = Math.max(0, n - (options.window ?? 64));
  let channels = 0;
  for (let i = start; i < n; i++) channels = Math.max(channels, receptorCount(contacts[i], concernCount));
  if (channels < 3) return [];

  const found = new Map();
  for (const rule of activeRoutes(state)) {
    const relation = routeDescriptor(rule);
    const fit = fitKnown(state, relation, relation.transform, options.window ?? 64);
    if (fit.support >= minSupport && fit.fit_score !== null && fit.fit_score >= threshold * threshold)
      found.set(topologyKey(relation), { ...relation, ...fit });
  }

  // Temporal reach expands only when retained evidence can support it. This is a
  // proposal horizon, not a truth boundary: older source contact stays in M and
  // the horizon grows as the life supplies more independent support.
  const evidenceMaxLag = Math.max(0, n - minSupport);
  const evidenceLagHorizon = Math.max(0, Math.floor(Math.log2(Math.max(1, n / minSupport))) + 1);
  const requestedMaxLag = options.maxLag === undefined ? evidenceLagHorizon : Math.max(0, options.maxLag);
  const maxLag = Math.min(evidenceMaxLag, requestedMaxLag);
  const space = pairSourceSpace(channels, unarySameTimeTargets(state), maxLag);
  const budget = Math.max(1, options.pairBudget ?? 256);
  for (const relation of budgetSlice(space, n, cadence, budget)) {
    const fit = fitSimplest(state, relation.sources, relation.target, options);
    if (!fit) continue;
    const candidate = { ...relation, ...fit };
    const key = topologyKey(candidate);
    const old = found.get(key);
    if (!old || candidate.fit_score > old.fit_score + 1e-12 ||
        (Math.abs(candidate.fit_score - old.fit_score) <= 1e-12 && candidate.transform.degree < old.transform.degree))
      found.set(key, candidate);
  }
  return [...found.values()];
}

function nextRouteId(state) {
  let max = 0;
  for (const rule of state.knowledge?.rules || []) {
    const m = /^continuous-multisource-dependence:(\d+)$/.exec(String(rule.id));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `continuous-multisource-dependence:${max + 1}`;
}
function knownRelationTerms(state) {
  return new Set((state.knowledge?.facts || []).filter(f => f.relation === 'ρ:kind' && f.object === 'relation_term').map(f => String(f.subject)));
}
function termForRoute(state, routeId, knownTerms) {
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:grounded_by' || !knownTerms.has(String(fact.subject))) continue;
    if (fact.object?.ref === String(routeId)) return String(fact.subject);
  }
  return null;
}
function nextRelationTermId(knownTerms, relation) {
  const base = baseRelationTermId(relation);
  if (!knownTerms.has(base)) return base;
  let version = 2;
  while (knownTerms.has(`${base}:v${version}`)) version++;
  return `${base}:v${version}`;
}
function routeStillFits(state, rule, relation, options = {}) {
  if (topologyKey(routeDescriptor(rule)) !== topologyKey(relation)) return false;
  const oldTransform = rule.provenance?.transform;
  if (!oldTransform || oldTransform.kind !== relation.transform?.kind) return false;
  const oldFit = fitKnown(state, relation, oldTransform, options.window ?? 64);
  const newRmse = finite(relation.fit_rmse) ? relation.fit_rmse : 0;
  const floor = 1e-9 * Math.max(1, finite(relation.target_rms) ? relation.target_rms : 1);
  return finite(oldFit.fit_rmse) && oldFit.fit_rmse <= Math.max(floor, 2 * newRmse + floor);
}
function evaluableSupport(state, relation, window = 64) {
  return samplesFor(state, relation.sources, relation.target, window).length;
}

function relationalUpdate(state, options = {}) {
  const n = state.contacts?.length || 0;
  const cadence = options.cadence ?? 16;
  const minSupport = options.minSupport ?? 24;
  if (n < minSupport || n % cadence !== 0) return null;

  const detected = detect(state, { ...options, cadence });
  const detectedByTopology = new Map(detected.map(x => [topologyKey(x), x]));
  const active = activeRoutes(state);
  const compatible = new Map();
  for (const relation of detected) {
    const route = active.find(rule => routeStillFits(state, rule, relation, options));
    if (route) compatible.set(topologyKey(relation), route);
  }
  const facts = [], rules = [];
  const knownTerms = knownRelationTerms(state);

  for (const rule of active) {
    const descriptor = routeDescriptor(rule);
    const key = topologyKey(descriptor);
    const relation = detectedByTopology.get(key);
    if (relation && compatible.get(key)?.id === rule.id) continue;
    if (!relation && evaluableSupport(state, descriptor, options.window ?? 64) < minSupport) continue;
    facts.push([ref(rule.id), 'counterexample', {
      kind: 'later_continuous_contact', window_end: n, retained_history: true, quantitative_revision: !!relation,
    }]);
  }

  for (const relation of detected) {
    const key = topologyKey(relation);
    const descriptor = {
      target: `receptor:p${relation.target}`,
      sources: relation.sources.map(s => ({ source: `receptor:p${s.source}`, lag: s.lag })),
      orientation: 'joint',
      transform: relation.transform,
    };
    let route = compatible.get(key);
    const sourceSet = sourceSetTermId(relation.sources);
    if (!route) {
      const id = nextRouteId({ knowledge: { rules: [...(state.knowledge?.rules || []), ...rules] } });
      route = { id, provenance: {
        kind: 'continuous_multisource_dependence', sources: relation.sources.map(s => ({ ...s })),
        target: relation.target, orientation: 'joint', transform: relation.transform,
        authority: 'M_retained_numeric_contact',
      } };
      facts.push(
        [ref(id), 'ρ:continuous_support', 'current_window'],
        [ref(id), 'ρ:continuous_evidence', { support: relation.support, fit_quality: relation.fit_score, fit_rmse: relation.fit_rmse, window_end: n }],
        [sourceSet, 'ρ:kind', 'continuous_source_set'],
      );
      for (const source of descriptor.sources) facts.push([sourceSet, 'ρ:source_member', source]);
      rules.push({
        id,
        premises: [[ref(id), 'ρ:continuous_support', 'current_window']],
        conclusion: [sourceSet, 'ρ:continuous_dependence', descriptor],
        categorical: true,
        provenance: route.provenance,
      });
    }

    let termId = termForRoute(state, route.id, knownTerms);
    if (!termId) {
      termId = nextRelationTermId(knownTerms, relation);
      facts.push(
        [termId, 'ρ:kind', 'relation_term'],
        [termId, 'ρ:relation_subject', sourceSet],
        [termId, 'ρ:relation_predicate', 'ρ:continuous_dependence'],
        [termId, 'ρ:relation_object', descriptor],
      );
      knownTerms.add(termId);
    }
    facts.push([termId, 'ρ:grounded_by', ref(route.id)]);
    const occurrenceId = `relation-occurrence:continuous:${n}:${termId}`;
    facts.push(
      [occurrenceId, 'ρ:kind', 'relation_occurrence'],
      [occurrenceId, 'ρ:instantiates', ref(termId)],
      [occurrenceId, 'ρ:order', n],
      [occurrenceId, 'ρ:grounded_by', ref(route.id)],
      [occurrenceId, 'ρ:evidence', { support: relation.support, fit_quality: relation.fit_score, fit_rmse: relation.fit_rmse, window_end: n }],
      ['self', 'ρ:experienced', occurrenceId],
    );
  }

  return facts.length || rules.length ? { relations: { facts, rules } } : null;
}

function receptorIndex(term) {
  const match = /^receptor:p(\d+)$/.exec(String(term));
  return match ? Number(match[1]) : null;
}
function numericallySame(a, b) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * scale;
}

// Derived current completion over M-owned joint relations. It never writes an
// inferred value back into exact contact history.
function completeCurrent(state) {
  const current = state.current;
  if (!current?.completed) return state;
  const observed = current.observed || {};
  const completed = current.completed;
  const relations = (state.knowledge?.current?.facts || []).flatMap(f => {
    if (f.relation !== 'ρ:continuous_dependence' || !f.object?.transform || !Array.isArray(f.object.sources)) return [];
    const target = receptorIndex(f.object.target);
    const sources = f.object.sources.map(s => ({ source: receptorIndex(s.source), lag: s.lag }));
    if (target === null || sources.length < 2 || sources.some(s => s.source === null || !Number.isInteger(s.lag) || s.lag < 0)) return [];
    return [{ target, sources, transform: f.object.transform }];
  });
  if (!relations.length) return state;

  const inferred = new Set(current.inferred || []);
  const unresolved = new Set(current.unresolved || []);
  const concernCount = state.concern_count || 0;
  const contacts = state.contacts || [];
  const proposals = new Map();
  for (const relation of relations) {
    const targetFeature = `p${relation.target}`;
    if (Object.prototype.hasOwnProperty.call(observed, targetFeature) || Object.prototype.hasOwnProperty.call(completed, targetFeature)) continue;
    const values = [];
    let available = true;
    for (const source of relation.sources) {
      let value;
      if (source.lag === 0) value = completed[`p${source.source}`];
      else {
        const sourceContact = contacts.length - 1 - source.lag;
        value = sourceContact >= 0 ? valueAt(contacts[sourceContact], source.source, concernCount) : undefined;
      }
      if (!finite(value)) { available = false; break; }
      values.push(value);
    }
    if (!available) continue;
    const predicted = applyTransform(relation.transform, values);
    if (!finite(predicted)) continue;
    if (!proposals.has(targetFeature)) proposals.set(targetFeature, []);
    proposals.get(targetFeature).push(predicted);
  }

  for (const [target, values] of proposals) {
    if (!values.length || Object.prototype.hasOwnProperty.call(completed, target)) continue;
    const first = values[0];
    if (!values.every(value => numericallySame(value, first))) { unresolved.add(target); continue; }
    completed[target] = values.reduce((sum, value) => sum + value, 0) / values.length;
    inferred.add(target);
    unresolved.delete(target);
  }
  current.inferred = [...inferred].sort();
  current.unresolved = [...unresolved].filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort();
  return state;
}

module.exports = { detect, relationalUpdate, completeCurrent };
