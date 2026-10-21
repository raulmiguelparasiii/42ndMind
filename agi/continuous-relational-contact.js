'use strict';

// Pure zero-state continuous-contact relation discovery.
//
// This helper owns no memory, truth, modality model, or semantic state. It reads
// exact numerical contact already retained in M and returns ordinary relational
// contact for the same C/M authority to settle. Camera samples, waveform samples,
// body values, and future numeric receptors are intentionally indistinguishable
// here: only their variation structure matters.

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

function applyTransform(transform, x) {
  if (!transform || !finite(x)) return undefined;
  if (transform.kind === 'affine') {
    if (!finite(transform.scale) || !finite(transform.offset)) return undefined;
    return transform.scale * x + transform.offset;
  }
  if (transform.kind === 'polynomial' && Array.isArray(transform.coefficients) && transform.coefficients.length) {
    const origin = finite(transform.origin) ? transform.origin : 0;
    const scale = finite(transform.input_scale) && Math.abs(transform.input_scale) > 1e-18 ? transform.input_scale : 1;
    const z = (x - origin) / scale;
    let y = 0;
    for (let i = transform.coefficients.length - 1; i >= 0; i--) {
      const c = transform.coefficients[i];
      if (!finite(c)) return undefined;
      y = y * z + c;
    }
    return finite(y) ? y : undefined;
  }
  return undefined;
}

function transformComplexity(transform) {
  if (!transform) return Infinity;
  if (transform.kind === 'affine') return 1;
  if (transform.kind === 'polynomial') return Math.max(2, Number(transform.degree) || (transform.coefficients?.length || 1) - 1);
  return Infinity;
}

// Streaming Pearson + affine least-squares description for one temporal offset.
// The quantitative map is not a second model: it is another property of the same
// relation already warranted by retained raw contact.
function relationAtLag(contacts, start, end, source, target, lag, concernCount) {
  let count = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  const first = Math.max(start, lag);
  for (let t = first; t < end; t++) {
    const x = valueAt(contacts[t - lag], source, concernCount);
    const y = valueAt(contacts[t], target, concernCount);
    if (x === undefined || y === undefined) continue;
    count++;
    sx += x; sy += y;
    sxx += x * x; syy += y * y; sxy += x * y;
  }
  if (count < 2) return { correlation: null, support: count, transform: null, fit_rmse: null, target_rms: null, fit_score: null };
  const vx = count * sxx - sx * sx;
  const vy = count * syy - sy * sy;
  if (!(vx > 1e-18) || !(vy > 1e-18)) return { correlation: null, support: count, transform: null, fit_rmse: null, target_rms: null, fit_score: null };
  const covariance = count * sxy - sx * sy;
  const raw = covariance / Math.sqrt(vx * vy);
  const correlation = Math.max(-1, Math.min(1, raw));
  const scale = covariance / vx;
  const offset = (sy - scale * sx) / count;
  const sse = syy + scale * scale * sxx + count * offset * offset +
    2 * scale * offset * sx - 2 * scale * sxy - 2 * offset * sy;
  const fitRmse = Math.sqrt(Math.max(0, sse) / count);
  const targetRms = Math.sqrt(Math.max(0, syy) / count);
  return {
    correlation,
    support: count,
    transform: finite(scale) && finite(offset) ? { kind: 'affine', scale, offset } : null,
    fit_rmse: finite(fitRmse) ? fitRmse : null,
    target_rms: finite(targetRms) ? targetRms : null,
    fit_score: correlation * correlation,
  };
}

function pairsAtLag(contacts, start, end, source, target, lag, concernCount) {
  const pairs = [];
  const first = Math.max(start, lag);
  for (let t = first; t < end; t++) {
    const x = valueAt(contacts[t - lag], source, concernCount);
    const y = valueAt(contacts[t], target, concernCount);
    if (x !== undefined && y !== undefined) pairs.push([x, y]);
  }
  return pairs;
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

function fitPolynomial(pairs, degree) {
  if (!pairs.length || degree < 2 || pairs.length < degree + 2) return null;
  const origin = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length;
  let variance = 0;
  for (const [x] of pairs) variance += (x - origin) * (x - origin);
  const inputScale = Math.sqrt(variance / pairs.length);
  if (!(inputScale > 1e-12)) return null;

  const size = degree + 1;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const vector = Array(size).fill(0);
  for (const [x, y] of pairs) {
    const z = (x - origin) / inputScale;
    const powers = Array(2 * degree + 1).fill(1);
    for (let p = 1; p < powers.length; p++) powers[p] = powers[p - 1] * z;
    for (let i = 0; i < size; i++) {
      vector[i] += y * powers[i];
      for (let j = 0; j < size; j++) matrix[i][j] += powers[i + j];
    }
  }
  const coefficients = solveLinearSystem(matrix, vector);
  if (!coefficients) return null;
  const transform = { kind: 'polynomial', degree, origin, input_scale: inputScale, coefficients };
  let sy = 0, syy = 0, sse = 0;
  for (const [x, y] of pairs) {
    sy += y; syy += y * y;
    const predicted = applyTransform(transform, x);
    if (!finite(predicted)) return null;
    const error = y - predicted;
    sse += error * error;
  }
  const sst = syy - sy * sy / pairs.length;
  if (!(sst > 1e-18)) return null;
  const fitScore = Math.max(0, Math.min(1, 1 - sse / sst));
  return {
    transform,
    support: pairs.length,
    fit_score: fitScore,
    fit_rmse: Math.sqrt(Math.max(0, sse) / pairs.length),
    target_rms: Math.sqrt(Math.max(0, syy) / pairs.length),
  };
}

// Sparse zero-state mathematical proposal search. Degree grows with available
// evidence rather than naming a terminal nonlinear anatomy. The simplest degree
// that reaches the same stringent fit standard wins.
function nonlinearAtLag(contacts, start, end, source, target, lag, concernCount, minSupport, threshold) {
  const pairs = pairsAtLag(contacts, start, end, source, target, lag, concernCount);
  if (pairs.length < minSupport) return null;
  const maxDegree = Math.max(2, Math.floor(Math.log2(Math.max(4, pairs.length))));
  const required = threshold * threshold;
  for (let degree = 2; degree <= maxDegree; degree++) {
    const fit = fitPolynomial(pairs, degree);
    if (fit && fit.fit_score >= required) return fit;
  }
  return null;
}

function fitOfKnownTransform(contacts, start, end, source, target, lag, concernCount, transform) {
  const first = Math.max(start, lag);
  let count = 0, sy = 0, syy = 0, sse = 0;
  for (let t = first; t < end; t++) {
    const x = valueAt(contacts[t - lag], source, concernCount);
    const y = valueAt(contacts[t], target, concernCount);
    if (x === undefined || y === undefined) continue;
    const predicted = applyTransform(transform, x);
    if (!finite(predicted)) return { support: count, fit_score: null, fit_rmse: null, target_rms: null };
    count++;
    sy += y; syy += y * y;
    const error = y - predicted;
    sse += error * error;
  }
  if (count < 2) return { support: count, fit_score: null, fit_rmse: null, target_rms: null };
  const sst = syy - sy * sy / count;
  if (!(sst > 1e-18)) return { support: count, fit_score: null, fit_rmse: null, target_rms: null };
  return {
    support: count,
    fit_score: Math.max(0, Math.min(1, 1 - sse / sst)),
    fit_rmse: Math.sqrt(Math.max(0, sse) / count),
    target_rms: Math.sqrt(Math.max(0, syy) / count),
  };
}

function topologyKey(x) {
  return `${x.source}>${x.target}@${x.lag}:${x.orientation}`;
}
function baseRelationTermId(x) {
  return `continuous-relation:${x.source}:${x.target}:${x.lag}:${x.orientation}`;
}
function candidateScore(candidate) {
  return finite(candidate?.fit_score) ? candidate.fit_score :
    (finite(candidate?.correlation) ? candidate.correlation * candidate.correlation : -Infinity);
}
function betterCandidate(candidate, best) {
  if (!best) return true;
  const a = candidateScore(candidate), b = candidateScore(best);
  if (a > b + 1e-12) return true;
  if (b > a + 1e-12) return false;
  const ac = transformComplexity(candidate.transform), bc = transformComplexity(best.transform);
  if (ac !== bc) return ac < bc;
  return candidate.lag < best.lag;
}

function activeRoutes(state) {
  return (state.knowledge?.rules || []).filter(rule =>
    rule.active !== false && rule.provenance && rule.provenance.kind === 'continuous_dependence');
}
function routeDescriptor(rule) {
  const p = rule.provenance || {};
  return { source: p.source, target: p.target, lag: p.lag, orientation: p.orientation, transform: p.transform };
}

function detect(state, options = {}) {
  const window = options.window ?? 64;
  const minSupport = options.minSupport ?? 24;
  const threshold = options.threshold ?? 0.995;
  const contacts = state.contacts || [];
  const n = contacts.length;
  if (n < minSupport) return [];
  const concernCount = state.concern_count || 0;
  const start = Math.max(0, n - window);
  let channels = 0;
  for (let i = start; i < n; i++) channels = Math.max(channels, receptorCount(contacts[i], concernCount));
  if (channels < 1) return [];

  const evidenceMaxLag = Math.max(0, n - minSupport);
  const maxLag = options.maxLag === undefined ? evidenceMaxLag : Math.min(Math.max(0, options.maxLag), evidenceMaxLag);
  const nonlinearCadence = options.nonlinearCadence ?? Math.max(32, channels * 8);
  const searchNonlinear = options.searchNonlinear === true || (options.searchNonlinear !== false && n % nonlinearCadence === 0);
  const activeNonlinear = activeRoutes(state).filter(rule => rule.provenance?.transform?.kind === 'polynomial');

  const found = [];
  for (let source = 0; source < channels; source++) {
    for (let target = 0; target < channels; target++) {
      const firstLag = source === target ? 1 : (source < target ? 0 : 1);
      let best = null;

      // Existing nonlinear meanings are cheap to reality-check every evidence
      // cadence even when expensive new nonlinear proposal search is not due.
      for (const rule of activeNonlinear) {
        const p = rule.provenance;
        if (p.source !== source || p.target !== target || p.lag < firstLag || p.lag > maxLag) continue;
        const fit = fitOfKnownTransform(contacts, start, n, source, target, p.lag, concernCount, p.transform);
        if (fit.support < minSupport || fit.fit_score === null || fit.fit_score < threshold * threshold) continue;
        const candidate = {
          source, target, lag: p.lag, orientation: p.orientation,
          correlation: null, support: fit.support, transform: p.transform,
          fit_rmse: fit.fit_rmse, target_rms: fit.target_rms, fit_score: fit.fit_score,
        };
        if (betterCandidate(candidate, best)) best = candidate;
      }

      for (let lag = firstLag; lag <= maxLag; lag++) {
        const measured = relationAtLag(contacts, start, n, source, target, lag, concernCount);
        if (measured.support < minSupport) continue;
        if (measured.correlation !== null && Math.abs(measured.correlation) >= threshold) {
          const candidate = {
            source, target, lag,
            orientation: measured.correlation >= 0 ? 'same' : 'opposed',
            correlation: measured.correlation,
            support: measured.support,
            transform: measured.transform,
            fit_rmse: measured.fit_rmse,
            target_rms: measured.target_rms,
            fit_score: measured.fit_score,
          };
          if (betterCandidate(candidate, best)) best = candidate;
          if (Math.abs(measured.correlation) >= 1 - 1e-12 && transformComplexity(best.transform) === 1) break;
          continue;
        }
        if (!searchNonlinear) continue;
        const nonlinear = nonlinearAtLag(contacts, start, n, source, target, lag, concernCount, minSupport, threshold);
        if (!nonlinear) continue;
        const candidate = {
          source, target, lag, orientation: 'nonlinear', correlation: measured.correlation,
          support: nonlinear.support, transform: nonlinear.transform,
          fit_rmse: nonlinear.fit_rmse, target_rms: nonlinear.target_rms, fit_score: nonlinear.fit_score,
        };
        if (betterCandidate(candidate, best)) best = candidate;
      }
      if (best) found.push(best);
    }
  }
  return found;
}

function nextRouteId(state) {
  let max = 0;
  for (const rule of state.knowledge?.rules || []) {
    const m = /^continuous-dependence:(\d+)$/.exec(String(rule.id));
    if (m) max = Math.max(max, Number(m[1]) + 0);
  }
  return `continuous-dependence:${max + 1}`;
}
function knownRelationTerms(state) {
  return new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:kind' && f.object === 'relation_term')
    .map(f => String(f.subject)));
}
function termForRoute(state, routeId, knownTerms) {
  for (const fact of state.knowledge?.facts || []) {
    if (fact.relation !== 'ρ:grounded_by' || !knownTerms.has(String(fact.subject))) continue;
    if (fact.object && fact.object.ref === String(routeId)) return String(fact.subject);
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

function transformRmse(state, relation, transform, window = 64) {
  const contacts = state.contacts || [];
  const end = contacts.length;
  const start = Math.max(0, end - window);
  const concernCount = state.concern_count || 0;
  const fit = fitOfKnownTransform(contacts, start, end, relation.source, relation.target, relation.lag, concernCount, transform);
  return finite(fit.fit_rmse) ? fit.fit_rmse : Infinity;
}

function routeStillFits(state, rule, relation, options = {}) {
  if (topologyKey(routeDescriptor(rule)) !== topologyKey(relation)) return false;
  const oldTransform = rule.provenance?.transform;
  const newTransform = relation.transform;
  if (!oldTransform || !newTransform || oldTransform.kind !== newTransform.kind) return false;
  const oldRmse = transformRmse(state, relation, oldTransform, options.window ?? 64);
  const newRmse = finite(relation.fit_rmse) ? relation.fit_rmse : 0;
  const numericFloor = 1e-9 * Math.max(1, finite(relation.target_rms) ? relation.target_rms : 1);
  return oldRmse <= Math.max(numericFloor, 2 * newRmse + numericFloor);
}

// Missing values are epistemically unknown, not negative evidence. Count only
// recent target times at which both ends of an existing route were actually
// available to reality-check that route.
function evaluableSupport(state, relation, window = 64) {
  const contacts = state.contacts || [];
  const end = contacts.length;
  const start = Math.max(0, end - window);
  const concernCount = state.concern_count || 0;
  const first = Math.max(start, relation.lag);
  let count = 0;
  for (let t = first; t < end; t++) {
    const x = valueAt(contacts[t - relation.lag], relation.source, concernCount);
    const y = valueAt(contacts[t], relation.target, concernCount);
    if (x !== undefined && y !== undefined) count++;
  }
  return count;
}

function relationalUpdate(state, options = {}) {
  const contacts = state.contacts || [];
  const n = contacts.length;
  const cadence = options.cadence || 8;
  const minSupport = options.minSupport || 24;
  if (n < minSupport || n % cadence !== 0) return null;

  const detected = detect(state, options);
  const detectedByTopology = new Map(detected.map(x => [topologyKey(x), x]));
  const active = activeRoutes(state);
  const compatibleRoute = new Map();
  for (const relation of detected) {
    const route = active.find(rule => routeStillFits(state, rule, relation, options));
    if (route) compatibleRoute.set(topologyKey(relation), route);
  }
  const knownTerms = knownRelationTerms(state);
  const facts = [], rules = [];

  for (const rule of active) {
    const descriptor = routeDescriptor(rule);
    const key = topologyKey(descriptor);
    const relation = detectedByTopology.get(key);
    if (relation && compatibleRoute.get(key)?.id === rule.id) continue;
    if (!relation && evaluableSupport(state, descriptor, options.window ?? 64) < minSupport) continue;
    facts.push([ref(rule.id), 'counterexample', {
      kind: 'later_continuous_contact',
      window_end: n,
      retained_history: true,
      quantitative_revision: !!relation,
    }]);
  }

  for (const relation of detected) {
    const key = topologyKey(relation);
    const descriptor = {
      target: `receptor:p${relation.target}`,
      lag: relation.lag,
      orientation: relation.orientation,
      transform: relation.transform,
    };
    let route = compatibleRoute.get(key);

    if (!route) {
      const id = nextRouteId({ knowledge: { rules: [...(state.knowledge?.rules || []), ...rules] } });
      route = {
        id,
        provenance: {
          kind: 'continuous_dependence',
          source: relation.source,
          target: relation.target,
          lag: relation.lag,
          orientation: relation.orientation,
          transform: relation.transform,
          authority: 'M_retained_numeric_contact',
        },
      };
      facts.push(
        [ref(id), 'ρ:continuous_support', 'current_window'],
        [ref(id), 'ρ:continuous_evidence', {
          support: relation.support,
          absolute_correlation: finite(relation.correlation) ? Math.abs(relation.correlation) : null,
          fit_quality: candidateScore(relation),
          fit_rmse: relation.fit_rmse,
          window_end: n,
        }],
      );
      rules.push({
        id,
        premises: [[ref(id), 'ρ:continuous_support', 'current_window']],
        conclusion: [`receptor:p${relation.source}`, 'ρ:continuous_dependence', descriptor],
        categorical: true,
        provenance: route.provenance,
      });
    }

    let termId = termForRoute(state, route.id, knownTerms);
    if (!termId) {
      termId = nextRelationTermId(knownTerms, relation);
      facts.push(
        [termId, 'ρ:kind', 'relation_term'],
        [termId, 'ρ:relation_subject', `receptor:p${relation.source}`],
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
      [occurrenceId, 'ρ:evidence', {
        support: relation.support,
        absolute_correlation: finite(relation.correlation) ? Math.abs(relation.correlation) : null,
        fit_quality: candidateScore(relation),
        fit_rmse: relation.fit_rmse,
        window_end: n,
      }],
      ['self', 'ρ:experienced', occurrenceId],
    );
  }

  if (!facts.length && !rules.length) return null;
  return { relations: { facts, rules } };
}

function receptorIndex(term) {
  const match = /^receptor:p(\d+)$/.exec(String(term));
  return match ? Number(match[1]) : null;
}
function numericallySame(a, b) {
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-9 * scale;
}

// Current quantitative completion is a disposable view over M-owned relations.
// It writes no sensor value into contact history and owns no prediction state.
// Multiple independent relations must agree before an open target is completed.
function completeCurrent(state) {
  const current = state.current;
  if (!current || !current.completed) return state;
  const observed = current.observed || {};
  const completed = current.completed;
  const relations = (state.knowledge?.current?.facts || []).flatMap(f => {
    if (f.relation !== 'ρ:continuous_dependence' || !f.object || !f.object.transform) return [];
    const source = receptorIndex(f.subject);
    const target = receptorIndex(f.object.target);
    if (source === null || target === null || !Number.isInteger(f.object.lag) || f.object.lag < 0) return [];
    if (applyTransform(f.object.transform, 0) === undefined) return [];
    return [{ source, target, lag: f.object.lag, transform: f.object.transform }];
  });
  if (!relations.length) return state;

  const inferred = new Set(current.inferred || []);
  const unresolved = new Set(current.unresolved || []);
  const concernCount = state.concern_count || 0;
  const contacts = state.contacts || [];

  for (let pass = 0; pass < Math.min(16, relations.length + 1); pass++) {
    const proposals = new Map();
    for (const relation of relations) {
      const targetFeature = `p${relation.target}`;
      if (Object.prototype.hasOwnProperty.call(observed, targetFeature) ||
          Object.prototype.hasOwnProperty.call(completed, targetFeature)) continue;

      let sourceValue;
      if (relation.lag === 0) sourceValue = completed[`p${relation.source}`];
      else {
        const sourceContact = contacts.length - 1 - relation.lag;
        if (sourceContact < 0) continue;
        sourceValue = valueAt(contacts[sourceContact], relation.source, concernCount);
      }
      if (!finite(sourceValue)) continue;
      const predicted = applyTransform(relation.transform, sourceValue);
      if (!finite(predicted)) continue;
      if (!proposals.has(targetFeature)) proposals.set(targetFeature, []);
      proposals.get(targetFeature).push(predicted);
    }

    let changed = false;
    for (const [target, values] of proposals) {
      if (Object.prototype.hasOwnProperty.call(completed, target) || !values.length) continue;
      const first = values[0];
      if (!values.every(value => numericallySame(value, first))) {
        unresolved.add(target);
        continue;
      }
      completed[target] = values.reduce((sum, value) => sum + value, 0) / values.length;
      inferred.add(target);
      unresolved.delete(target);
      changed = true;
    }
    if (!changed) break;
  }

  current.inferred = [...inferred].sort();
  current.unresolved = [...unresolved]
    .filter(feature => !Object.prototype.hasOwnProperty.call(completed, feature)).sort();
  return state;
}

module.exports = { detect, relationalUpdate, completeCurrent };
