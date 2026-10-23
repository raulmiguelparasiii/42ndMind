'use strict';

// Zero-state structural abstraction over contacted symbolic relations.
// Durable schema candidates, support, instances, and proposals are ordinary M
// facts. The local index under state.structure is rebuildable acceleration only:
// deleting it cannot change what M warrants or what historical contact exists.

const crypto = require('crypto');
const RNF = require('../relational-normal-form.js');

function stable(v) { return RNF.stable(v); }
function digest(v) { return crypto.createHash('sha256').update(stable(v)).digest('hex').slice(0, 24); }
function ref(id) { return { ref: String(id) }; }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }

const REPRESENTATION_PREDICATES = new Set(['ρ:kind', 'ρ:instantiates', 'ρ:order', 'ρ:lived_order']);
const MAX_COMPONENT_EDGES = 8;
const INDEX_VERSION = 2;

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

function adjacencyFor(component) {
  const byNode = new Map();
  component.forEach((edge, i) => {
    for (const node of [edge.from.key, edge.to.key]) {
      if (!byNode.has(node)) byNode.set(node, []);
      byNode.get(node).push(i);
    }
  });
  const degree = key => (byNode.get(key) || []).length;
  const rankKey = i => stable([
    component[i].labelKey,
    degree(component[i].from.key),
    degree(component[i].to.key),
  ]);
  function adjacent(i) {
    const out = new Set();
    for (const node of [component[i].from.key, component[i].to.key])
      for (const j of byNode.get(node) || []) if (j !== i) out.add(j);
    return out;
  }
  return { rankKey, adjacent };
}

function connectedViewsOfSize(component, size) {
  if (component.length < size || size < 1) return [];
  if (component.length === size) return [component];
  const { rankKey, adjacent } = adjacencyFor(component);
  const views = [], seen = new Set();
  for (let anchor = 0; anchor < component.length; anchor++) {
    const selected = new Set([anchor]);
    const frontier = adjacent(anchor);
    while (selected.size < size && frontier.size) {
      let best = null, bestKey = null;
      for (const candidate of frontier) {
        const key = rankKey(candidate);
        if (best === null || key < bestKey || (key === bestKey && candidate < best)) {
          best = candidate; bestKey = key;
        }
      }
      frontier.delete(best);
      if (selected.has(best)) continue;
      selected.add(best);
      for (const next of adjacent(best)) if (!selected.has(next)) frontier.add(next);
    }
    if (selected.size !== size) continue;
    const indices = [...selected].sort((a, b) => a - b);
    const key = indices.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    views.push(indices.map(i => component[i]));
  }
  return views;
}

function boundedComponentViews(component) {
  if (component.length <= MAX_COMPONENT_EDGES) return [component];
  // One bounded connected neighborhood per edge anchor. This is local proposal
  // search, not a partition or semantic representation: exact full contact stays
  // in M and no exhaustive subgraph enumeration is introduced.
  return connectedViewsOfSize(component, MAX_COMPONENT_EDGES);
}

function rawConnectedComponents(edges) {
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
    if (component.length >= 2) out.push(component);
  }
  return out;
}

function connectedComponents(edges) {
  return rawConnectedComponents(edges).flatMap(boundedComponentViews);
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
      const depth = oneValue(facts, 'ρ:schema_depth', Number.isFinite) || 1;
      const composedFrom = facts.filter(f => f.relation === 'ρ:composed_from_schema' && f.object?.ref !== undefined)
        .map(f => String(f.object.ref));
      if (signature && edges) schemas[id] = { id, signature, edges, depth, composedFrom: unique(composedFrom).sort() };
    }
  }
  for (const record of Object.values(bySignature)) {
    record.ids = unique(record.ids.map(String)).sort();
    record.bindings = unique(record.bindings.map(String)).sort();
  }
  return { version: INDEX_VERSION, indexed_through_order: throughOrder, by_signature: bySignature, schemas };
}

function ensureIndex(state, order) {
  if (!state.structure) state.structure = {};
  let cache = state.structure.structural_abstraction_index;
  if (!cache || cache.version !== INDEX_VERSION || cache.indexed_through_order !== order - 1) {
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

function recordComponents(state, components, order, cache, facts, metadata = {}) {
  const depth = Number.isFinite(metadata.depth) ? metadata.depth : 1;
  const composedFrom = unique((metadata.composedFrom || []).map(String)).sort();
  const instanceIds = unique((metadata.instanceIds || []).map(String)).sort();

  for (const component of components) {
    const canonical = canonicalComponent(component);
    let record = cache.by_signature[canonical.signature];
    if (!record) record = cache.by_signature[canonical.signature] = { ids: [], bindings: [], edges: canonical.edges };

    // Exact raw/derived grounding already remains in M. The same concrete binding
    // is not new endpoint-independent evidence.
    const newBinding = !record.bindings.includes(canonical.binding_signature);
    let occurrence = null;
    if (newBinding) {
      occurrence = patternOccurrenceId(order, component);
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
      for (const instance of instanceIds) facts.push([occurrence, 'ρ:derived_from_schema_instance', ref(instance)]);
    }

    if (record.bindings.length < 2) continue;
    const id = schemaId(canonical.signature);
    if (!cache.schemas[id]) {
      cache.schemas[id] = { id, signature: canonical.signature, edges: canonical.edges, depth, composedFrom };
      facts.push(
        [id, 'ρ:kind', 'structural_relation_schema_candidate'],
        [id, 'ρ:schema_signature', canonical.signature],
        [id, 'ρ:schema_edges', canonical.edges],
        [id, 'ρ:schema_depth', depth],
        [id, 'ρ:formation_status', 'proposal'],
        ['self', 'ρ:structural_schema_candidate', ref(id)],
      );
      for (const source of composedFrom) facts.push([id, 'ρ:composed_from_schema', ref(source)]);
    }
    if (occurrence) facts.push([id, 'ρ:supported_by', ref(occurrence)]);
  }
  return components;
}

function recordCurrentPatterns(state, contact, order, cache, facts) {
  const components = connectedComponents(contactEdges(contact));
  recordComponents(state, components, order, cache, facts, { depth: 1 });
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

function counterexampledSchemas(state) {
  // Counterevidence remains ordinary M content. This derived view owns no status:
  // rebuilding it from canonical facts must always yield the same proposal
  // eligibility. Support/history stays present even when a schema is reopened.
  const out = new Set();
  for (const fact of state.knowledge?.current?.facts || state.knowledge?.facts || [])
    if (fact.relation === 'counterexample') out.add(String(fact.subject));
  return out;
}

function schemaRelevantViews(schema, component) {
  // Matching may ignore edges whose relation label is not represented anywhere in
  // the learned schema, but only as a disposable search view. Exact contacted
  // reality is never rewritten. This avoids exhaustive subgraph enumeration while
  // allowing a known local relation to remain usable inside a cluttered world.
  const labels = new Set(schema.edges.map(edge => edge[0]));
  const filtered = component.filter(edge => labels.has(edge.labelKey));
  if (filtered.length < 2) return [];
  return connectedComponents(filtered)
    .filter(view => view.length >= 2 && view.length < schema.edges.length);
}

function proposeCompletions(state, components, order, cache, facts) {
  const counterexampled = counterexampledSchemas(state);
  const proposals = new Map();
  for (const schema of Object.values(cache.schemas)) {
    if (counterexampled.has(String(schema.id))) continue;
    for (const component of components) {
      for (const view of schemaRelevantViews(schema, component)) {
        for (const triple of completionTriples(schema, view)) {
          const key = stable(triple);
          if (!proposals.has(key)) proposals.set(key, { triple, schemas: [] });
          proposals.get(key).schemas.push(schema.id);
        }
      }
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

function concreteEdgeKey(edge) { return stable([edge.labelKey, edge.from.key, edge.to.key]); }
function nodeEndpoints(component) {
  const out = new Map();
  for (const edge of component) {
    out.set(edge.from.key, edge.from);
    out.set(edge.to.key, edge.to);
  }
  return out;
}
function fullSchemaMappings(schema, component) {
  if (component.length !== schema.edges.length) return [];
  const schemaSet = new Set(schema.edges.map(schemaEdgeKey));
  return candidateMappings(schema.edges, component).filter(mapping => {
    const represented = new Set(component.map(edge => stable([
      edge.labelKey, mapping.get(edge.from.key), mapping.get(edge.to.key),
    ])));
    return represented.size === schemaSet.size && [...schemaSet].every(key => represented.has(key));
  });
}
function schemaInstanceViews(schema, allEdges) {
  const labels = new Set(schema.edges.map(edge => edge[0]));
  const filtered = allEdges.filter(edge => labels.has(edge.labelKey));
  if (filtered.length < schema.edges.length) return [];
  const views = [];
  for (const component of rawConnectedComponents(filtered))
    views.push(...connectedViewsOfSize(component, schema.edges.length));
  return views;
}

function recognizeSchemaInstances(state, schemas, allEdges, order, facts) {
  const defeated = counterexampledSchemas(state);
  const instances = [], seen = new Set();
  for (const schema of schemas) {
    if (!schema?.edges?.length || defeated.has(String(schema.id))) continue;
    for (const view of schemaInstanceViews(schema, allEdges)) {
      const endpoints = nodeEndpoints(view);
      for (const mapping of fullSchemaMappings(schema, view)) {
        const bindings = [...mapping.entries()].map(([key, role]) => {
          const ep = endpoints.get(key);
          return { role, value: ep.value, form: ep.form, key: ep.key };
        }).sort((a, b) => a.role - b.role || stable(a.value).localeCompare(stable(b.value)));
        const identity = [schema.id, bindings.map(x => [x.role, x.value, x.form])];
        const id = `structural-schema-instance:${order}:${digest(identity)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const covered = new Set(view.map(concreteEdgeKey));
        const instance = { id, schema, depth: schema.depth || 1, bindings, covered };
        instances.push(instance);
        facts.push(
          [id, 'ρ:kind', 'structural_schema_instance'],
          [id, 'ρ:instantiates_schema', ref(schema.id)],
          [id, 'ρ:schema_depth', instance.depth],
          [id, 'ρ:schema_bindings', bindings.map(x => ({ role: x.role, value: x.value, form: x.form }))],
          [id, 'ρ:formation_status', 'proposal'],
          [id, 'ρ:based_on_contact', ref(`lived-contact:${order}`)],
        );
      }
    }
  }
  return instances;
}

function schemaRoleEdge(instance, binding) {
  const relation = `ρ:structural-schema-role:${digest([instance.schema.signature, binding.role])}`;
  const from = endpoint(instance.id);
  const to = { value: binding.value, form: binding.form, key: binding.key };
  const label = { relation, subject_form: from.form, object_form: to.form };
  return { label, labelKey: stable(label), from, to };
}

function compositionViews(instances, rawEdges) {
  const out = [];
  for (let i = 0; i < instances.length; i++) for (let j = i + 1; j < instances.length; j++) {
    const a = instances[i], b = instances[j];
    if (a.id === b.id) continue;
    const aKeys = new Set(a.bindings.map(x => x.key));
    const bKeys = new Set(b.bindings.map(x => x.key));
    const bound = new Set([...aKeys, ...bKeys]);
    const shared = [...aKeys].some(key => bKeys.has(key));
    const covered = new Set([...a.covered, ...b.covered]);
    const connectors = rawEdges.filter(edge => bound.has(edge.from.key) && bound.has(edge.to.key) && !covered.has(concreteEdgeKey(edge)));
    if (!shared && !connectors.length) continue;

    const edges = [
      ...a.bindings.map(binding => schemaRoleEdge(a, binding)),
      ...b.bindings.map(binding => schemaRoleEdge(b, binding)),
      ...connectors,
    ];
    if (edges.length < 2 || edges.length > MAX_COMPONENT_EDGES) continue;
    out.push({
      component: edges,
      depth: Math.max(a.depth, b.depth) + 1,
      composedFrom: unique([a.schema.id, b.schema.id]).sort(),
      instanceIds: [a.id, b.id].sort(),
    });
  }
  return out;
}

function relationalUpdate(state, originalContact) {
  if (!state || state.whole !== 1 || !state.structure) return null;
  const order = state.structure.lived_contact_order;
  if (!Number.isInteger(order) || order < 1) return null;
  const edges = contactEdges(originalContact);
  if (edges.length < 2) return null;

  const cache = ensureIndex(state, order);
  // Only schemas that predate this contact may instantiate on it. A schema first
  // proposed by the current contact cannot recursively support itself.
  const schemasBefore = Object.values(cache.schemas).map(schema => ({
    ...schema,
    edges: schema.edges.map(edge => [...edge]),
    composedFrom: [...(schema.composedFrom || [])],
  }));

  const facts = [];
  const components = recordCurrentPatterns(state, originalContact, order, cache, facts);
  proposeCompletions(state, components, order, cache, facts);

  // Complete lower schemas are now first-class grounded instances. Pairwise
  // recompression replaces each matched local graph with role-binding edges only
  // in a disposable derived view; exact raw edges remain untouched in M.
  const instances = recognizeSchemaInstances(state, schemasBefore, edges, order, facts);
  const composed = compositionViews(instances, edges);
  for (const view of composed) {
    recordComponents(state, [view.component], order, cache, facts, view);
  }
  if (composed.length) proposeCompletions(state, composed.map(x => x.component), order, cache, facts);

  cache.indexed_through_order = order;
  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
