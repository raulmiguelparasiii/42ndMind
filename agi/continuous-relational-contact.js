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

// Streaming Pearson calculation for one temporal offset. Widening the generic
// lag horizon must not allocate a fresh pair array for every source/target/lag.
function pearsonAtLag(contacts, start, end, source, target, lag, concernCount) {
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
  if (count < 2) return { correlation: null, support: count };
  const vx = count * sxx - sx * sx;
  const vy = count * syy - sy * sy;
  if (!(vx > 1e-18) || !(vy > 1e-18)) return { correlation: null, support: count };
  const raw = (count * sxy - sx * sy) / Math.sqrt(vx * vy);
  // Floating-point roundoff can put an exact affine relation infinitesimally
  // outside [-1,1]. Clamp only the numerical representation, not the evidence.
  const correlation = Math.max(-1, Math.min(1, raw));
  return { correlation, support: count };
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

  // Temporal search is bounded by evidence, not by a domain-specific constant.
  // A lag is eligible only while at least minSupport observations can exist in the
  // retained evidence horizon. Callers may still impose a smaller explicit budget.
  const evidenceMaxLag = Math.max(0, Math.min(window - minSupport, n - minSupport));
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
        const measured = pearsonAtLag(contacts, start, n, source, target, lag, concernCount);
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

module.exports = { detect, relationalUpdate };
