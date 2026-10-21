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

function pearson(pairs) {
  const n = pairs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of pairs) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n;
  let xx = 0, yy = 0, xy = 0;
  for (const [x, y] of pairs) {
    const dx = x - mx, dy = y - my;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  }
  if (!(xx > 1e-18) || !(yy > 1e-18)) return null;
  return xy / Math.sqrt(xx * yy);
}

function relationKey(x) {
  return `${x.source}>${x.target}@${x.lag}:${x.orientation}`;
}
function relationTermId(x) {
  // The ID is only an address. Meaning remains in ordinary M facts below.
  return `continuous-relation:${x.source}:${x.target}:${x.lag}:${x.orientation}`;
}

function detect(state, {
  window = 64,
  maxLag = 4,
  minSupport = 24,
  threshold = 0.995,
} = {}) {
  const contacts = state.contacts || [];
  const n = contacts.length;
  if (n < minSupport) return [];
  const concernCount = state.concern_count || 0;
  const start = Math.max(0, n - window);
  let channels = 0;
  for (let i = start; i < n; i++) channels = Math.max(channels, receptorCount(contacts[i], concernCount));
  if (channels < 2) return [];

  const found = [];
  for (let source = 0; source < channels; source++) {
    for (let target = 0; target < channels; target++) {
      if (source === target) continue;
      // Same-time dependence is symmetric. Preserve one canonical orientation.
      const firstLag = source < target ? 0 : 1;
      let best = null;
      for (let lag = firstLag; lag <= maxLag; lag++) {
        const pairs = [];
        const first = Math.max(start, lag);
        for (let t = first; t < n; t++) {
          const x = valueAt(contacts[t - lag], source, concernCount);
          const y = valueAt(contacts[t], target, concernCount);
          if (x !== undefined && y !== undefined) pairs.push([x, y]);
        }
        if (pairs.length < minSupport) continue;
        const r = pearson(pairs);
        if (r === null || Math.abs(r) < threshold) continue;
        const candidate = {
          source,
          target,
          lag,
          orientation: r >= 0 ? 'same' : 'opposed',
          correlation: r,
          support: pairs.length,
        };
        if (!best || Math.abs(candidate.correlation) > Math.abs(best.correlation) + 1e-12 ||
            (Math.abs(Math.abs(candidate.correlation) - Math.abs(best.correlation)) < 1e-12 && candidate.lag < best.lag)) best = candidate;
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
