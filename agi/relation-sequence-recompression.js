'use strict';

// Zero-state bridge from M-owned relation occurrences to the repository's
// existing generic ordered recompression law. This file owns no temporal memory
// or truth state. It derives a sequence from exact first-class occurrence facts,
// reuses sequence-recompression.js, and returns only new first-class relational
// structure for the same canonical M/C authority to retain.

const crypto = require('crypto');
const Sequence = require('../sequence-recompression.js');

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function same(a, b) { return stable(a) === stable(b); }
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

function relationalUpdate(state, options = {}) {
  const observations = orderedRelationOccurrences(state);
  const checkpoint = Math.max(4, options.checkpoint || 8);
  if (observations.length < checkpoint || observations.length % checkpoint !== 0) return null;

  // Exact occurrences enter M continuously. Full recursive recompression is a
  // zero-authority proposal search, so doing it for every one-event extension is
  // redundant. Deterministic count checkpoints preserve eventual learning while
  // avoiding repeated O(history) work on nearly identical streams.
  const stream = observations.map(o => o.relations);
  const compressed = Sequence.recompress(null, stream, { maxRules: options.maxRules || 128 });
  if (!compressed.rules.length) return null;

  const existing = existingTemporalIds(state);
  const symbolIds = new Map();
  const facts = [];

  for (const rule of compressed.rules) {
    const expansion = [];
    for (const token of rule.expansion) {
      if (symbolIds.has(token)) {
        expansion.push(ref(symbolIds.get(token)));
        continue;
      }
      const event = parseBaseToken(token);
      if (!Array.isArray(event)) throw new Error(`unknown ordered-recompression token: ${token}`);
      expansion.push({
        simultaneous_relations: event.map(id => ref(id)),
      });
    }

    const id = temporalId(rule.depth, expansion);
    symbolIds.set(rule.symbol, id);
    if (existing.has(id)) continue;

    facts.push(
      [id, 'ρ:kind', 'learned_ordered_relation'],
      [id, 'ρ:ordered_expansion', expansion],
      [id, 'ρ:depth', rule.depth],
      [id, 'ρ:occurrences_at_birth', rule.occurrences_at_birth],
      [id, 'ρ:compression_savings', rule.bits_saved_units],
      [id, 'ρ:authority', 'M_retained_relation_occurrences'],
      ['self', 'ρ:learned_relation', ref(id)],
    );
  }

  if (!facts.length) return null;
  return { relations: { facts } };
}

module.exports = { relationalUpdate };
