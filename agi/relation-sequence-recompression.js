'use strict';

// Zero-state bridge from M-owned relation occurrences to the repository's
// existing generic ordered recompression law. This file owns no temporal memory
// or truth state. It derives ordered views from exact first-class occurrence
// facts, reuses sequence-recompression.js, and returns only new first-class
// relational structure for the same canonical M/C authority to retain.
//
// Full lived order is always retained in M. In addition to recompressing the
// whole simultaneous-event stream, the bridge may derive an occurrence-relative
// projection: for a recurring relation term, keep the simultaneous relations
// invariant across that term's occurrences and preserve the order of those
// occurrences. This lets stable temporal structure remain discoverable when
// unrelated relations are interleaved, without deleting those relations or
// assigning modality-specific attention.

const crypto = require('crypto');
const Sequence = require('../sequence-recompression.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function ref(id) { return { ref: String(id) }; }

function orderedRelationOccurrences(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    if (!groups.has(f.subject)) groups.set(f.subject, {});
    const o = groups.get(f.subject);
    if (f.relation === 'ρ:kind' && f.object === 'relation_occurrence') o.kind = true;
    else if (f.relation === 'ρ:instantiates' && f.object && f.object.ref !== undefined) o.term = String(f.object.ref);
    else if (f.relation === 'ρ:order' && Number.isFinite(f.object)) o.order = f.object;
  }
  const occurrences = [...groups.entries()]
    .filter(([, o]) => o.kind && o.term && Number.isFinite(o.order))
    .map(([id, o]) => ({ id: String(id), term: o.term, order: o.order }))
    .sort((a, b) => a.order - b.order || a.term.localeCompare(b.term) || a.id.localeCompare(b.id));

  // Simultaneous relation activations are one ordered event, not an arbitrary
  // internal ordering among relations discovered on the same contact boundary.
  const byOrder = new Map();
  for (const o of occurrences) {
    if (!byOrder.has(o.order)) byOrder.set(o.order, []);
    byOrder.get(o.order).push(o.term);
  }
  return [...byOrder.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([order, terms]) => ({ order, relations: unique(terms).sort() }));
}

function digest(value) {
  // Hash is only a stable address. The complete ordered expansion is stored as
  // ordinary M content, so semantic identity never depends on hash authority.
  return crypto.createHash('sha256').update(stable(value)).digest('hex').slice(0, 24);
}
function parseBaseToken(token) {
  if (!String(token).startsWith('e:')) return null;
  return JSON.parse(String(token).slice(2));
}
function temporalId(depth, expansion) {
  return `ordered-relation:${depth}:${digest(expansion)}`;
}

function existingTemporalIds(state) {
  return new Set((state.knowledge?.facts || [])
    .filter(f => f.relation === 'ρ:kind' && f.object === 'learned_ordered_relation')
    .map(f => String(f.subject)));
}

// Derive search views without owning state. The first view is the exact full
// simultaneous-event stream. Additional views are anchored by recurring relation
// terms. For each anchor, the event token is the exact intersection of relations
// that co-occur every time that anchor occurs; unrelated/intermittent relations
// remain in M but cannot obscure this invariant local temporal structure.
function orderedViews(observations, minimumOccurrences) {
  const views = [{
    kind: 'full',
    basis: null,
    stream: observations.map(o => o.relations),
  }];

  const anchors = new Map();
  for (const event of observations) {
    const eventSet = new Set(event.relations);
    for (const term of event.relations) {
      if (!anchors.has(term)) anchors.set(term, { count: 0, core: new Set(event.relations) });
      const record = anchors.get(term);
      record.count++;
      if (record.count > 1) {
        for (const candidate of [...record.core]) if (!eventSet.has(candidate)) record.core.delete(candidate);
      }
    }
  }

  const seen = new Set();
  for (const [anchor, record] of [...anchors.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (record.count < minimumOccurrences || !record.core.size) continue;
    const core = [...record.core].sort();
    const key = stable(core);
    if (seen.has(key)) continue;
    seen.add(key);
    views.push({
      kind: 'relation_occurrence_projection',
      basis: core,
      anchor,
      stream: Array.from({ length: record.count }, () => core),
    });
  }
  return views;
}

function appendCompressedFacts(compressed, view, existing, facts) {
  if (!compressed.rules.length) return;
  const symbolIds = new Map();

  for (const rule of compressed.rules) {
    const expansion = [];
    for (const token of rule.expansion) {
      if (symbolIds.has(token)) {
        expansion.push(ref(symbolIds.get(token)));
        continue;
      }
      const event = parseBaseToken(token);
      if (!Array.isArray(event)) throw new Error(`unknown ordered-recompression token: ${token}`);
      expansion.push({ simultaneous_relations: event.map(id => ref(id)) });
    }

    const id = temporalId(rule.depth, expansion);
    symbolIds.set(rule.symbol, id);
    if (existing.has(id)) continue;
    existing.add(id);

    facts.push(
      [id, 'ρ:kind', 'learned_ordered_relation'],
      [id, 'ρ:ordered_expansion', expansion],
      [id, 'ρ:depth', rule.depth],
      [id, 'ρ:occurrences_at_birth', rule.occurrences_at_birth],
      [id, 'ρ:compression_savings', rule.bits_saved_units],
      [id, 'ρ:authority', 'M_retained_relation_occurrences'],
      ['self', 'ρ:learned_relation', ref(id)],
    );
    if (view.kind !== 'full') {
      facts.push(
        [id, 'ρ:ordered_projection_kind', view.kind],
        [id, 'ρ:ordered_projection_basis', view.basis.map(term => ref(term))],
      );
    }
  }
}

function relationalUpdate(state, options = {}) {
  const observations = orderedRelationOccurrences(state);
  const checkpoint = Math.max(4, options.checkpoint || 8);
  if (observations.length < checkpoint || observations.length % checkpoint !== 0) return null;

  // Exact occurrences enter M continuously. Full recursive recompression is a
  // zero-authority proposal search, so doing it for every one-event extension is
  // redundant. Deterministic count checkpoints preserve eventual learning while
  // avoiding repeated O(history) work on nearly identical streams.
  const existing = existingTemporalIds(state);
  const facts = [];
  for (const view of orderedViews(observations, checkpoint)) {
    const compressed = Sequence.recompress(null, view.stream, { maxRules: options.maxRules || 128 });
    appendCompressedFacts(compressed, view, existing, facts);
  }

  if (!facts.length) return null;
  return { relations: { facts } };
}

module.exports = { relationalUpdate };
