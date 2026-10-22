'use strict';

// Zero-state bridge from M-owned lived occurrences to the repository's existing
// generic ordered recompression law. This file owns no temporal memory or truth
// state. Anything carrying the same minimal occurrence anatomy can participate:
//
//   occurrence --instantiates--> term
//   occurrence --lived_order-->  whole-life order
//
// Relation, expression, action, and future occurrence kinds are therefore not
// separate temporal faculties. Legacy relation occurrences without lived_order
// remain readable through their old local order for serialized-state continuity.

const crypto = require('crypto');
const Sequence = require('../sequence-recompression.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function ref(id) { return { ref: String(id) }; }

function orderedLivedOccurrences(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    const subject = String(f.subject);
    if (!groups.has(subject)) groups.set(subject, {});
    const o = groups.get(subject);
    if (f.relation === 'ρ:kind' && f.object === 'lived_occurrence') o.lived = true;
    else if (f.relation === 'ρ:kind' && f.object === 'relation_occurrence') o.legacyRelation = true;
    else if (f.relation === 'ρ:instantiates' && f.object && f.object.ref !== undefined) o.term = String(f.object.ref);
    else if (f.relation === 'ρ:lived_order' && Number.isFinite(f.object)) o.livedOrder = f.object;
    else if (f.relation === 'ρ:order' && Number.isFinite(f.object)) o.localOrder = f.object;
  }

  const occurrences = [...groups.entries()].flatMap(([id, o]) => {
    if (!o.term) return [];
    if (o.lived && Number.isFinite(o.livedOrder)) return [{ id, term: o.term, order: o.livedOrder }];
    // Backward compatibility only: new cognition uses lived_occurrence/lived_order.
    if (o.legacyRelation && Number.isFinite(o.localOrder)) return [{ id, term: o.term, order: o.localOrder }];
    return [];
  }).sort((a, b) => a.order - b.order || a.term.localeCompare(b.term) || a.id.localeCompare(b.id));

  // Simultaneous lived occurrences are one ordered event. No internal ordering is
  // invented among a sound, word, action, learned relation, or any future term
  // that happened at the same whole-life coordinate.
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

// Full lived order is retained. Search may also project around any recurrent term:
// keep the simultaneous terms invariant across that term's occurrences, while all
// non-invariant reality remains untouched in M. This is generic relevance by
// recurrence, not modality-specific attention.
function orderedViews(observations, minimumOccurrences) {
  const views = [{ kind: 'full', basis: null, stream: observations.map(o => o.relations) }];
  const anchors = new Map();
  for (const event of observations) {
    const eventSet = new Set(event.relations);
    for (const term of event.relations) {
      if (!anchors.has(term)) anchors.set(term, { count: 0, core: new Set(event.relations) });
      const record = anchors.get(term);
      record.count++;
      if (record.count > 1) for (const candidate of [...record.core]) if (!eventSet.has(candidate)) record.core.delete(candidate);
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
      kind: 'lived_occurrence_projection',
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
      // Historical field name retained for compatibility. The references are now
      // generic first-class terms and may denote relations, expressions, actions,
      // or later occurrence content.
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
      [id, 'ρ:authority', 'M_retained_lived_occurrences'],
      ['self', 'ρ:learned_relation', ref(id)],
    );
    if (view.kind !== 'full') facts.push(
      [id, 'ρ:ordered_projection_kind', view.kind],
      [id, 'ρ:ordered_projection_basis', view.basis.map(term => ref(term))],
    );
  }
}

function relationalUpdate(state, options = {}) {
  const observations = orderedLivedOccurrences(state);
  const checkpoint = Math.max(4, options.checkpoint || 8);
  if (observations.length < checkpoint) return null;

  // Scheduling belongs to the public one-C boundary. Every exact occurrence is
  // already in M; this is only a disposable proposal search over that authority.
  const existing = existingTemporalIds(state);
  const facts = [];
  for (const view of orderedViews(observations, checkpoint)) {
    const compressed = Sequence.recompress(null, view.stream, { maxRules: options.maxRules || 128 });
    appendCompressedFacts(compressed, view, existing, facts);
  }
  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
