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
  if (count < 2) return { correlation: null, support: count, transform: null, fit_rmse: null, target_rms: null };
  const vx = count * sxx - sx * sx;
  const vy = count * syy - sy * sy;
  if (!(vx > 1e-18) || !(vy > 1e-18)) return { correlation: null, support: count, transform: null, fit_rmse: null, target_rms: null };
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
  };
}

function topologyKey(x) {
  return `${x.source}>${x.target}@${x.lag}:${x.orientation}`;
}
function baseRelationTermId(x) {
  return `continuous-relation:${x.source}:${x.target}:${x.lag}:${x.orientation}`;
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

  // The recent window bounds which target observations currently test a relation;
  // it does not erase older retained source contact. A long lag is therefore
  // eligible whenever retained history can still provide minSupport recent pairs.
  const evidenceMaxLag = Math.max(0, n - minSupport);
  const maxLag = options.maxLag === undefined ? evidenceMaxLag : Math.min(Math.max(0, options.maxLag), evidenceMaxLag);

  const found = [];
  for (let source = 0; source < channels; source++) {
    for (let target = 0; target < channels; target++) {
      const firstLag = source === target ? 1 : (source < target ? 0 : 1);
      let best = null;
      for (let lag = firstLag; lag <= maxLag; lag++) {
        const measured = relationAtLag(contacts, start, n, source, target, lag, concernCount);
        if (measured.support < minSupport || measured.correlation === null) continue;
        const r = measured.correlation;
        if (Math.abs(r) < threshold) continue;
        const candidate = {
          source,
          target,
          lag,
          orientation: r >= 0 ? 'same' : 'opposed',
          correlation: r,
          support: measured.support,
          transform: measured.transform,
          fit_rmse: measured.fit_rmse,
          target_rms: measured.target_rms,
        };
        if (!best || Math.abs(candidate.correlation) > Math.abs(best.correlation) + 1e-12 ||
            (Math.abs(Math.abs(candidate.correlation) - Math.abs(best.correlation)) < 1e-12 && candidate.lag < best.lag)) best = candidate;
        if (Math.abs(r) >= 1 - 1e-12) break;
      }
      if (best) found.push(best);
    }
  }
  return found;
}

function activeRoutes(state) {
  return (state.knowledge?.rules || []).filter(rule =>
    rule.active !== false && rule.provenance && rule.provenance.kind === 'continuous_dependence');
}
function routeDescriptor(rule) {
  const p = rule.provenance || {};
  return { source: p.source, target: p.target, lag: p.lag, orientation: p.orientation, transform: p.transform };
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
  if (!transform || transform.kind !== 'affine' || !finite(transform.scale) || !finite(transform.offset)) return Infinity;
  const contacts = state.contacts || [];
  const end = contacts.length;
  const start = Math.max(0, end - window);
  const concernCount = state.concern_count || 0;
  const first = Math.max(start, relation.lag);
  let count = 0, sse = 0;
  for (let t = first; t < end; t++) {
    const x = valueAt(contacts[t - relation.lag], relation.source, concernCount);
    const y = valueAt(contacts[t], relation.target, concernCount);
    if (x === undefined || y === undefined) continue;
    const error = y - (transform.scale * x + transform.offset);
    sse += error * error;
    count++;
  }
  return count ? Math.sqrt(sse / count) : Infinity;
}

// A route survives coefficient estimation jitter if its old quantitative meaning
// still explains current evidence about as well as the newly fitted map. A route
// is revised only when later reality makes the old map materially worse.
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

  // Later contact defeats a route only when there is enough evaluable reality to
  // judge it. If the relevant receptors are absent/null, the relation remains
  // warranted but receives no new occurrence. A detected incompatible transform
  // is already sufficient evaluable evidence for quantitative revision.
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
          absolute_correlation: Math.abs(relation.correlation),
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

    // Relation terms are versioned by evidential route, not raw floating-point
    // coefficient strings. The first meaning retains the historical base address;
    // a materially revised meaning receives a new address while both descriptors
    // remain ordinary first-class M facts.
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
        absolute_correlation: Math.abs(relation.correlation),
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
    if (f.relation !== 'ρ:continuous_dependence' || !f.object ||
        !f.object.transform || f.object.transform.kind !== 'affine') return [];
    const source = receptorIndex(f.subject);
    const target = receptorIndex(f.object.target);
    if (source === null || target === null || !Number.isInteger(f.object.lag) || f.object.lag < 0) return [];
    const { scale, offset } = f.object.transform;
    if (!finite(scale) || !finite(offset)) return [];
    return [{ source, target, lag: f.object.lag, scale, offset }];
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
      const predicted = relation.scale * sourceValue + relation.offset;
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