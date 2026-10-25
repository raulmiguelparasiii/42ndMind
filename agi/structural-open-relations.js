'use strict';

// Zero-state structural incompleteness over canonical M.
//
// A learned structural schema may fit the present situated event except for one
// relation whose one endpoint is not yet bound by reality. That is not a failed
// lookup and not a question generator: it is an ordinary open relation in M.
// The formation remains future-bearable through the same relation-term anatomy
// used by other temporal material, and resolves only when later reality supplies
// the missing binding for the same known endpoint.

const crypto = require('crypto');
const RNF = require('../relational-normal-form.js');

function stable(v) { return RNF.stable(v); }
function digest(v) { return crypto.createHash('sha256').update(stable(v)).digest('hex').slice(0, 24); }
function ref(id) { return { ref: String(id) }; }
function unique(xs) { const m = new Map(); for (const x of xs || []) m.set(stable(x), x); return [...m.values()]; }
function endpoint(v) {
  if (typeof v === 'string') return { value: v, form: 'value', key: stable(v) };
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && typeof v.ref === 'string')
    return { value: v.ref, form: 'ref', key: stable(v.ref) };
  return null;
}
function wrapEndpoint(ep) { return ep?.form === 'ref' ? ref(ep.value) : ep?.value; }
function decodeLabel(key) { try { return JSON.parse(key); } catch { return null; } }

const REPRESENTATION_PREDICATES = new Set(['ρ:kind', 'ρ:instantiates', 'ρ:order', 'ρ:lived_order']);

function contactEdges(contact) {
  const triples = contact && !Array.isArray(contact) && typeof contact === 'object' && Array.isArray(contact.relations?.facts)
    ? contact.relations.facts : [];
  const out = [];
  for (const triple of triples) {
    if (!Array.isArray(triple) || triple.length !== 3 || REPRESENTATION_PREDICATES.has(triple[1])) continue;
    const from = endpoint(triple[0]), to = endpoint(triple[2]);
    if (!from || !to) continue;
    const label = { relation: triple[1], subject_form: from.form, object_form: to.form };
    out.push({ label, labelKey: stable(label), from, to, triple });
  }
  return out;
}

function schemas(state) {
  const groups = new Map();
  for (const f of state.knowledge?.current?.facts || state.knowledge?.facts || []) {
    const id = String(f.subject);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(f);
  }
  const out = [];
  for (const [id, facts] of groups) {
    if (!facts.some(f => f.relation === 'ρ:kind' && f.object === 'structural_relation_schema_candidate')) continue;
    const edges = facts.find(f => f.relation === 'ρ:schema_edges' && Array.isArray(f.object))?.object;
    if (!edges?.length) continue;
    if (facts.some(f => f.relation === 'counterexample')) continue;
    out.push({ id, edges });
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
  const rankKey = i => stable([component[i].labelKey, degree(component[i].from.key), degree(component[i].to.key)]);
  function adjacent(i) {
    const out = new Set();
    for (const node of [component[i].from.key, component[i].to.key])
      for (const j of byNode.get(node) || []) if (j !== i) out.add(j);
    return out;
  }
  return { rankKey, adjacent };
}

function connectedViewsOfSize(component, size) {
  if (size < 1 || component.length < size) return [];
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

function rawComponents(edges) {
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
      const i = queue.pop();
      const edge = edges[i];
      component.push(edge);
      for (const node of [edge.from.key, edge.to.key]) for (const next of byNode.get(node) || []) {
        if (seen.has(next)) continue;
        seen.add(next); queue.push(next);
      }
    }
    if (component.length) out.push(component);
  }
  return out;
}

function candidateMappings(schemaEdges, component) {
  const roles = unique(schemaEdges.flatMap(edge => [edge[1], edge[2]])).sort((a, b) => a - b);
  const nodes = new Map();
  for (const edge of component) { nodes.set(edge.from.key, edge.from); nodes.set(edge.to.key, edge.to); }
  const cueNodes = [...nodes.keys()];
  if (cueNodes.length > roles.length) return [];
  const schemaSet = new Set(schemaEdges.map(edge => stable(edge)));
  const assigned = new Map(), used = new Set(), out = [];

  function consistent() {
    for (const edge of component) {
      if (!assigned.has(edge.from.key) || !assigned.has(edge.to.key)) continue;
      if (!schemaSet.has(stable([edge.labelKey, assigned.get(edge.from.key), assigned.get(edge.to.key)]))) return false;
    }
    return true;
  }
  function visit(i) {
    if (i === cueNodes.length) { out.push({ mapping: new Map(assigned), nodes }); return; }
    const node = cueNodes[i];
    for (const role of roles) {
      if (used.has(role)) continue;
      assigned.set(node, role); used.add(role);
      if (consistent()) visit(i + 1);
      assigned.delete(node); used.delete(role);
    }
  }
  visit(0);
  return out;
}

function partialViews(schema, edges) {
  const labels = new Set(schema.edges.map(edge => edge[0]));
  const filtered = edges.filter(edge => labels.has(edge.labelKey));
  const targetSize = schema.edges.length - 1;
  if (targetSize < 1 || filtered.length < targetSize) return [];
  return rawComponents(filtered).flatMap(component => connectedViewsOfSize(component, targetSize));
}

function missingOpenPatterns(schema, component) {
  const results = [];
  for (const { mapping, nodes } of candidateMappings(schema.edges, component)) {
    const roleToNode = new Map([...mapping.entries()].map(([node, role]) => [role, node]));
    const represented = new Set(component.map(edge => stable([
      edge.labelKey, mapping.get(edge.from.key), mapping.get(edge.to.key),
    ])));
    const missing = schema.edges.filter(edge => !represented.has(stable(edge)));
    if (missing.length !== 1) continue;
    const [labelKey, fromRole, toRole] = missing[0];
    const label = decodeLabel(labelKey);
    if (!label || !Object.prototype.hasOwnProperty.call(label, 'relation')) continue;
    const fromKnown = roleToNode.has(fromRole), toKnown = roleToNode.has(toRole);
    if (fromKnown === toKnown) continue; // exactly one endpoint must be grounded
    const knownRole = fromKnown ? fromRole : toRole;
    const unboundRole = fromKnown ? toRole : fromRole;
    const knownNode = roleToNode.get(knownRole);
    const knownEndpoint = nodes.get(knownNode);
    if (!knownEndpoint) continue;
    results.push({
      schema: schema.id,
      relation: label.relation,
      subject_form: label.subject_form,
      object_form: label.object_form,
      known_side: fromKnown ? 'subject' : 'object',
      known_role: knownRole,
      unbound_role: unboundRole,
      known_endpoint: wrapEndpoint(knownEndpoint),
      missing_edge: [labelKey, fromRole, toRole],
    });
  }
  return unique(results);
}

function existingOpen(state) {
  const facts = state.knowledge?.current?.facts || state.knowledge?.facts || [];
  const terms = new Map();
  const formations = new Map();
  const resolved = new Set();
  for (const f of facts) {
    const id = String(f.subject);
    if (f.relation === 'ρ:relation_object' && f.object?.kind === 'structural_open_relation') terms.set(id, f.object);
    else if (f.relation === 'ρ:unresolved_relation' && f.object?.ref !== undefined) formations.set(id, String(f.object.ref));
    else if (f.relation === 'ρ:resolved_by' && f.object?.ref !== undefined) resolved.add(id);
  }
  return [...formations.entries()].flatMap(([formation, term]) => {
    if (resolved.has(formation) || !terms.has(term)) return [];
    return [{ formation, term, pattern: terms.get(term) }];
  });
}

function edgeMatchesOpen(edge, pattern) {
  if (edge.label.relation !== pattern.relation) return false;
  if (pattern.known_side === 'subject') return stable(wrapEndpoint(edge.from)) === stable(pattern.known_endpoint);
  return stable(wrapEndpoint(edge.to)) === stable(pattern.known_endpoint);
}

function resolutionFacts(state, edges, order) {
  const facts = [];
  for (const open of existingOpen(state)) {
    const matches = edges.filter(edge => edgeMatchesOpen(edge, open.pattern));
    const concrete = unique(matches.map(edge => edge.triple));
    if (concrete.length !== 1) continue;
    const occurrence = `structural-open-resolution:${order}:${digest([open.formation, concrete[0]])}`;
    facts.push(
      [occurrence, 'ρ:kind', 'structural_relation_binding'],
      [occurrence, 'ρ:kind', 'lived_occurrence'],
      [occurrence, 'ρ:instantiates', ref(open.term)],
      [occurrence, 'ρ:lived_order', order],
      [occurrence, 'ρ:realized_relation', { subject: concrete[0][0], relation: concrete[0][1], object: concrete[0][2] }],
      [`lived-contact:${order}`, 'ρ:contains_occurrence', ref(occurrence)],
      [open.formation, 'ρ:resolved_by', ref(occurrence)],
    );
  }
  return facts;
}

function openFacts(state, edges, order) {
  const facts = [];
  const existing = new Set((state.knowledge?.facts || []).map(f => stable([f.subject, f.relation, f.object])));
  for (const schema of schemas(state)) for (const view of partialViews(schema, edges)) {
    for (const pattern of missingOpenPatterns(schema, view)) {
      const identity = [order, pattern.schema, pattern.missing_edge, pattern.known_side, pattern.known_endpoint];
      const term = `structural-open-relation-term:${digest(identity)}`;
      const formation = `structural-open-relation:${order}:${digest(identity)}`;
      const relationObject = {
        kind: 'structural_open_relation',
        relation: pattern.relation,
        known_side: pattern.known_side,
        known_endpoint: pattern.known_endpoint,
        unbound_role: pattern.unbound_role,
        subject_form: pattern.subject_form,
        object_form: pattern.object_form,
        schema: ref(pattern.schema),
        based_on_contact: ref(`lived-contact:${order}`),
      };
      const triples = [
        [term, 'ρ:kind', 'relation_term'],
        [term, 'ρ:relation_object', relationObject],
        [term, 'ρ:instantiation_kind', 'structural_relation_binding'],
        [formation, 'ρ:kind', 'structural_open_relation'],
        [formation, 'ρ:formation_status', 'open'],
        [formation, 'ρ:unresolved_relation', ref(term)],
        [formation, 'ρ:based_on_contact', ref(`lived-contact:${order}`)],
        [formation, 'ρ:grounded_by_schema', ref(pattern.schema)],
        ['self', 'ρ:has_open_relation', ref(formation)],
      ];
      for (const triple of triples) {
        const key = stable(triple);
        if (!existing.has(key)) { existing.add(key); facts.push(triple); }
      }
    }
  }
  return facts;
}

function relationalUpdate(state, contact) {
  if (!state || state.whole !== 1 || !state.structure) return null;
  const order = state.structure.lived_contact_order;
  if (!Number.isInteger(order) || order < 1) return null;
  const edges = contactEdges(contact);
  if (!edges.length) return null;

  // Resolve older open structure from actual present evidence first. New open
  // structure is then derived from the current partial fit and cannot resolve
  // itself in the same pass.
  const facts = resolutionFacts(state, edges, order);
  facts.push(...openFacts(state, edges, order));
  return facts.length ? { relations: { facts } } : null;
}

module.exports = { relationalUpdate };
