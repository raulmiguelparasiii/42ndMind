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
  if (count < 2) return { correlation: null, support: count, transform: null };
  const vx = count * sxx - sx * sx;
  const vy = count * syy - sy * sy;
  if (!(vx > 1e-18) || !(vy > 1e-18)) return { correlation: null, support: count, transform: null };
  const covariance = count * sxy - sx * sy;
  const raw = covariance / Math.sqrt(vx * vy);
  // Floating-point roundoff can put an exact affine relation infinitesimally
  // outside [-1,1]. Clamp only the numerical representation, not the evidence.
  const correlation = Math.max(-1, Math.min(1, raw));
  const scale = covariance / vx;
  const offset = (sy - scale * sx) / count;
  return {
    correlation,
    support: count,
    transform: finite(scale) && finite(offset) ? { kind: 'affine', scale, offset } : null,
  };
}

function relationKey(x) {
  return `${x.source}>${x.target}@${x.lag}:${x.orientation}`;
}
function relationTermId(x) {
  // The ID is only an address. Meaning remains in ordinary M facts below.
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
  // Callers may impose a smaller explicit computational budget without changing
  // this evidential meaning.
  const evidenceMaxLag = Math.max(0, n - minSupport);
  const maxLag = options.maxLag === undefined ? evidenceMaxLag : Math.min(Math.max(0, options.maxLag), evidenceMaxLag);

  const found = [];
  for (let source = 0; source < channels; source++) {
    for (let target = 0; target < channels; target++) {
      // Lag zero of a receptor with itself is trivial identity and is excluded.
      // Lagged self-relations are legitimate temporal structure and are essential
      // when reality reaches the individual through only one changing receptor.
      // For distinct receptors, same-time dependence remains canonically stored
      // in only one direction while delayed dependence may remain directional.
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
        };
        if (!best || Math.abs(candidate.correlation) > Math.abs(best.correlation) + 1e-12 ||
            (Math.abs(Math.abs(candidate.correlation) - Math.abs(best.correlation)) < 1e-12 && candidate.lag < best.lag)) best = candidate;
        // No later lag can beat an exact relation, and lags are visited shortest
        // first, so stopping here is both exact and cheaper.
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
  return { source: p.source, target: p.target, lag: p.lag, orientation: p.orientation };
}
function nextRouteId(state) {
  let max = 0;
  for (const rule of state.knowledge?.rules || []) {
    const m = /^continuous-dependence:(\d+)$/.exec(String(rule.id));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `continuous-dependence:${max + 1}`;
}
function knownRelationTerms(state) {
  return new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:kind' && f.object === 'relation_term')
    .map(f => String(f.subject)));
}

function relationalUpdate(state, options = {}) {
  const contacts = state.contacts || [];
  const n = contacts.length;
  const cadence = options.cadence || 8;
  const minSupport = options.minSupport || 24;
  if (n < minSupport || n % cadence !== 0) return null;

  const detected = detect(state, options);
  const detectedByKey = new Map(detected.map(x => [relationKey(x), x]));
  const active = activeRoutes(state);
  const activeByKey = new Map(active.map(rule => [relationKey(routeDescriptor(rule)), rule]));
  const knownTerms = knownRelationTerms(state);
  const facts = [], rules = [];

  // A relation absent from the current evidence window is defeated as a current
  // categorical route. Its old rule, support, occurrences and raw contact remain.
  for (const [key, rule] of activeByKey) {
    if (detectedByKey.has(key)) continue;
    facts.push([ref(rule.id), 'counterexample', {
      kind: 'later_continuous_contact',
      window_end: n,
      retained_history: true,
    }]);
  }

  for (const [key, relation] of detectedByKey) {
    const descriptor = {
      target: `receptor:p${relation.target}`,
      lag: relation.lag,
      orientation: relation.orientation,
      transform: relation.transform,
    };
    const termId = relationTermId(relation);
    let route = activeByKey.get(key);

    // Truth/warrant route is created only when needed. Repeated observation of an
    // already-active relation does not create duplicate truth authorities.
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

    // The discovered relation is itself first-class M content. Meaning is the
    // explicit relational structure, not this stable identifier.
    if (!knownTerms.has(termId)) {
      facts.push(
        [termId, 'ρ:kind', 'relation_term'],
        [termId, 'ρ:relation_subject', `receptor:p${relation.source}`],
        [termId, 'ρ:relation_predicate', 'ρ:continuous_dependence'],
        [termId, 'ρ:relation_object', descriptor],
      );
      knownTerms.add(termId);
    }
    facts.push([termId, 'ρ:grounded_by', ref(route.id)]);

    // Every fresh evidence window that still instantiates the relation is a lived
    // occurrence. This is the temporal material from which higher relations can
    // form; it does not duplicate the categorical truth route above.
    const occurrenceId = `relation-occurrence:continuous:${n}:${termId}`;
    facts.push(
      [occurrenceId, 'ρ:kind', 'relation_occurrence'],
      [occurrenceId, 'ρ:instantiates', ref(termId)],
      [occurrenceId, 'ρ:order', n],
      [occurrenceId, 'ρ:grounded_by', ref(route.id)],
      [occurrenceId, 'ρ:evidence', {
        support: relation.support,
        absolute_correlation: Math.abs(relation.correlation),
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