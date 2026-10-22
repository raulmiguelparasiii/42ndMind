'use strict';

// Zero-state structural abstraction over externally contacted symbolic relations.
// Durable schema candidates, support, and proposals are ordinary M facts. The
// local index under state.structure is rebuildable acceleration only: deleting it
// cannot change what M warrants or what historical contact exists.

const crypto = require('crypto');
const RNF = require('../relational-normal-form.js');

function stable(v) { return RNF.stable(v); }
function digest(v) { return crypto.createHash('sha256').update(stable(v)).digest('hex').slice(0, 24); }
function ref(id) { return { ref: String(id) }; }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }

const REPRESENTATION_PREDICATES = new Set(['ρ:kind', 'ρ:instantiates', 'ρ:order', 'ρ:lived_order']);
const MAX_COMPONENT_EDGES = 8;

function endpoint(v) {
  if (typeof v === 'string') return { value: v, form: 'value', key: stable(v) };
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.ref === 'string')
    return { value: v.ref, form: 'ref', key: stable(v.ref) };
  return null;
}

function contactEdges(contact) {
  const triples = contact && !Array.isArray(contact) && typeof contact === 'object' && Array.isArray(contact.relations?.facts)
    ? contact.relations.facts : [];
  const out = [];
  for (const triple of triples) {
    if (!Array.isArray(triple) || triple.length !== 3 || REPRESENTATION_PREDICATES.has(triple[1])) continue;
    const from = endpoint(triple[0]), to = endpoint(triple[2]);
    if (!from || !to) continue;
    const label = { relation: triple[1], subject_form: from.form, object_form: to.form };
    out.push({ label, labelKey: stable(label), from, to });
  }
  return out;
}

function connectedComponents(edges) {
  const byNode = new Map();
  edges.forEach((edge, i) => {
    for (const node of [edge.from.key, edge.to.key]) {
      if (!byNode.has(node)) byNode.set(node, []);
      byNode.get(node).push(i);
    }
  });
  const seen = new Set(), out = [];
  for (let start = 0; start < edges.length; start++) {
    if (seen.has(start)) continue;
    const queue = [start], component = [];
    seen.add(start);
    while (queue.length) {
      const i = queue.pop(), edge = edges[i];
      component.push(edge);
      for (const node of [edge.from.key, edge.to.key]) for (const next of byNode.get(node) || []) {
        if (seen.has(next)) continue;
        seen.add(next); queue.push(next);
      }
    }
    if (component.length >= 2 && component.length <= MAX_COMPONENT_EDGES) out.push(component);
  }
  return out;
}

function canonicalComponent(edges) {
  const canonical = RNF.canonicalGraph({
    edges: edges.map(edge => [edge.label, edge.from.value, edge.to.value]),
  }, { maxStates: 50000 });
  const bindings = unique(edges.flatMap(edge => [edge.from.value, edge.to.value])).map(stable).sort();
  return {
    signature: canonical.signature,
    edges: canonical.edges,
    binding_signature: digest(bindings),
  };
}

function relationFactsBySubject(state) {
  const groups = new Map();
  for (const f of state.knowledge?.facts || []) {
    const id = String(f.subject);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(f);
  }
  return groups;
}
function oneValue(facts, relation, predicate = () => true) {
  return (facts || []).find(f => f.relation === relation && predicate(f.object))?.object;
}

function rebuildIndex(state, throughOrder) {
  const bySignature = {}, schemas = {};
  const groups = relationFactsBySubject(state);
  for (const [id, facts] of groups) {
    const kind = oneValue(facts, 'ρ:kind', x => x === 'structural_pattern_occurrence' || x === 'structural_relation_schema_candidate');
    if (kind === 'structural_pattern_occurrence') {
      const signature = oneValue(facts, 'ρ:structural_signature', x => typeof x === 'string');
      const binding = oneValue(facts, 'ρ:binding_signature', x => typeof x === 'string');
      const edges = oneValue(facts, 'ρ:canonical_edges', Array.isArray);
      if (!signature || !binding || !edges) continue;
      if (!bySignature[signature]) bySignature[signature] = { ids: [], bindings: [], edges };
      bySignature[signature].ids.push(id);
      bySignature[signature].bindings.push(binding);
    } else if (kind === 'structural_relation_schema_candidate') {
      const signature = oneValue(facts, 'ρ:schema_signature', x => typeof x === 'string');
      const edges = oneValue(facts, 'ρ:schema_edges', Array.isArray);
      if (signature && edges) schemas[id] = { id, signature, edges };
    }
  }
  for (const record of Object.values(bySignature)) {
    record.ids = unique(record.ids.map(String)).sort();
    record.bindings = unique(record.bindings.map(String)).sort();
  }
  return { version: 1, indexed_through_order: throughOrder, by_signature: bySignature, schemas };
}

function ensureIndex(state, order) {
  if (!state.structure) state.structure = {};
  let cache = state.structure.structural_abstraction_index;
  if (!cache || cache.version !== 1 || cache.indexed_through_order !== order - 1) {
    cache = rebuildIndex(state, order - 1);
    state.structure.structural_abstraction_index = cache;
  }
  return cache;
}

function schemaId(signature) { return `structural-schema:${digest(signature)}`; }
function patternOccurrenceId(order, component) {
  const concrete = component.map(edge => [edge.label, edge.from.value, edge.to.value])
    .sort((a, b) => stable(a).localeCompare(stable(b)));
  return `structural-pattern-occurrence:${order}:${digest(concrete)}`;
}

function recordCurrentPatterns(state, contact, order, cache, facts) {
  const components = connectedComponents(contactEdges(contact));
  for (const component of components) {
    const canonical = canonicalComponent(component);
    const occurrence = patternOccurrenceId(order, component);
    let record = cache.by_signature[canonical.signature];
    if (!record) record = cache.by_signature[canonical.signature] = { ids: [], bindings: [], edges: canonical.edges };

    if (!record.ids.includes(occurrence)) {
      record.ids.push(occurrence);
      record.bindings.push(canonical.binding_signature);
      record.ids = unique(record.ids.map(String)).sort();
      record.bindings = unique(record.bindings.map(String)).sort();
      facts.push(
        [occurrence, 'ρ:kind', 'structural_pattern_occurrence'],
        [occurrence, 'ρ:structural_signature', canonical.signature],
        [occurrence, 'ρ:canonical_edges', canonical.edges],
        [occurrence, 'ρ:binding_signature', canonical.binding_signature],
        [occurrence, 'ρ:lived_order', order],
        [occurrence, 'ρ:based_on_contact', ref(`lived-contact:${order}`)],
      );
    }

    // Recurrence on one exact binding is not endpoint-independent evidence.
    if (record.bindings.length < 2) continue;
    const id = schemaId(canonical.signature);
    if (!cache.schemas[id]) {
      cache.schemas[id] = { id, signature: canonical.signature, edges: canonical.edges };
      facts.push(
        [id, 'ρ:kind', 'structural_relation_schema_candidate'],
        [id, 'ρ:schema_signature', canonical.signature],
        [id, 'ρ:schema_edges', canonical.edges],
        [id, 'ρ:formation_status', 'proposal'],
        ['self', 'ρ:structural_schema_candidate', ref(id)],
      );
    }
    facts.push([id, 'ρ:supported_by', ref(occurrence)]);
  }
  return components;
}

function cueGraph(component) {
  const nodes = new Map();
  for (const edge of component) {
    nodes.set(edge.from.key, edge.from.value);
    nodes.set(edge.to.key, edge.to.value);
  }
  return { nodes, edges: component };
}
function schemaEdgeKey(edge) { return stable([edge[0], edge[1], edge[2]]); }

function candidateMappings(schemaEdges, component) {
  const cue = cueGraph(component);
  const roles = unique(schemaEdges.flatMap(edge => [edge[1], edge[2]])).sort((a, b) => a - b);
  const cueNodes = [...cue.nodes.keys()];
  if (cueNodes.length > roles.length) return [];

  const degree = new Map(cueNodes.map(node => [node, 0]));
  for (const edge of component) {
    degree.set(edge.from.key, degree.get(edge.from.key) + 1);
    degree.set(edge.to.key, degree.get(edge.to.key) + 1);
  }
  cueNodes.sort((a, b) => degree.get(b) - degree.get(a) || a.localeCompare(b));

  const schemaSet = new Set(schemaEdges.map(schemaEdgeKey));
  const mappings = [];
  const assigned = new Map(), used = new Set();

  function consistent() {
    for (const edge of component) {
      if (!assigned.has(edge.from.key) || !assigned.has(edge.to.key)) continue;
      if (!schemaSet.has(stable([edge.labelKey, assigned.get(edge.from.key), assigned.get(edge.to.key)]))) return false;
    }
    return true;
  }
  function visit(i) {
    if (i === cueNodes.length) { mappings.push(new Map(assigned)); return; }
    const node = cueNodes[i];
    for (const role of roles) {
      if (used.has(role)) continue;
      assigned.set(node, role); used.add(role);
      if (consistent()) visit(i + 1);
      assigned.delete(node); used.delete(role);
    }
  }
  visit(0);
  return mappings;
}

function decodeLabel(key) {
  try { return JSON.parse(key); } catch { return null; }
}
function wrapEndpoint(value, form) { return form === 'ref' ? ref(value) : value; }

function completionTriples(schema, component) {
  // Completion is intentionally conservative: exactly one schema edge may be
  // absent, and both of its endpoint roles must already be grounded by the cue.
  const cue = cueGraph(component);
  const out = [];
  for (const mapping of candidateMappings(schema.edges, component)) {
    const roleToNode = new Map([...mapping.entries()].map(([node, role]) => [role, node]));
    const represented = new Set(component.map(edge => stable([
      edge.labelKey, mapping.get(edge.from.key), mapping.get(edge.to.key),
    ])));
    const missing = schema.edges.filter(edge => !represented.has(schemaEdgeKey(edge)));
    if (missing.length !== 1) continue;
    const [labelKey, fromRole, toRole] = missing[0];
    if (!roleToNode.has(fromRole) || !roleToNode.has(toRole)) continue;
    const label = decodeLabel(labelKey);
    if (!label || !Object.prototype.hasOwnProperty.call(label, 'relation')) continue;
    const from = cue.nodes.get(roleToNode.get(fromRole));
    const to = cue.nodes.get(roleToNode.get(toRole));
    out.push([
      wrapEndpoint(from, label.subject_form),
      label.relation,
      wrapEndpoint(to, label.object_form),
    ]);
  }
  return unique(out);
}

function proposeCompletions(state, components, order, cache, facts) {
  const proposals = new Map();
  for (const schema of Object.values(cache.schemas)) for (const component of components) {
    if (component.length >= schema.edges.length) continue;
    for (const triple of completionTriples(schema, component)) {
      const key = stable(triple);
      if (!proposals.has(key)) proposals.set(key, { triple, schemas: [] });
      proposals.get(key).schemas.push(schema.id);
    }
  }

  for (const { triple, schemas } of proposals.values()) {
    const id = `structural-relation-proposal:${order}:${digest(triple)}`;
    const proposal = { subject: triple[0], relation: triple[1], object: triple[2] };
    facts.push(
      [id, 'ρ:kind', 'structural_relation_proposal'],
      [id, 'ρ:proposes_relation', proposal],
      [id, 'ρ:formation_status', 'open'],
      [id, 'ρ:based_on_contact', ref(`lived-contact:${order}`)],
      ['self', 'ρ:has_open_relation_proposal', ref(id)],
    );
    for (const schema of unique(schemas.map(String)).sort()) facts.push([id, 'ρ:grounded_by_schema', ref(schema)]);
  }
}

function relationalUpdate(state, originalContact) {
  if (!state || state.whole !== 1 || !state.structure) return null;
  const order = state.structure.lived_contact_order;
  if (!Number.isInteger(order) || order < 1) return null;
  const edges = contactEdges(originalContact);
  if (edges.length < 2) return null;

  const cache = ensureIndex(state, order);
  const facts = [];
  const components = recordCurrentPatterns(state, originalContact, order, cache, facts);
  proposeCompletions(state, components, order, cache, facts);
  cache.indexed_through_order = order;
  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
