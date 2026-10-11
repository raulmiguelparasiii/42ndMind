'use strict';
const fs = require('fs');
const file = 'one-mind.js';
let source = fs.readFileSync(file, 'utf8');

const insertion = String.raw`
function conceptSearchRows(state, rawRows) {
  const rows = new Map([...rawRows.entries()].map(([id, values]) => [id, { ...values }]));
  const concepts = (state.knowledge.relational_concepts || []).slice()
    .sort((a, b) => (a.depth || 1) - (b.depth || 1) || a.handle.localeCompare(b.handle));
  const next = new Map();
  const previous = new Map();
  for (const fact of state.knowledge.facts || []) {
    if (fact.relation !== 'next' || contactNumber(fact.subject) === null || contactNumber(fact.object) === null) continue;
    next.set(fact.subject, fact.object);
    previous.set(fact.object, fact.subject);
  }

  function evaluable(concept, focusSubject) {
    const focusVar = relVariableName(concept.focus);
    if (!focusVar) return false;
    const binding = { [focusVar]: focusSubject };

    // Resolve structural succession variables from the actual first-class next
    // relation. This does not invent a temporal feature; it follows M's graph.
    for (const premise of concept.premises || []) {
      if (premise.relation !== 'next') continue;
      const sVar = relVariableName(premise.subject);
      const oVar = relVariableName(premise.object);
      if (sVar && oVar && binding[oVar] && !binding[sVar]) binding[sVar] = previous.get(binding[oVar]);
      else if (sVar && oVar && binding[sVar] && !binding[oVar]) binding[oVar] = next.get(binding[sVar]);
      if (sVar && !binding[sVar]) return false;
      if (oVar && !binding[oVar]) return false;
      const s = sVar ? binding[sVar] : premise.subject;
      const o = oVar ? binding[oVar] : premise.object;
      if (!s || !o || next.get(s) !== o) return false;
    }

    // A sparse concept is false only when every relation needed to evaluate its
    // definition was actually contacted. Missing relations remain undefined.
    for (const premise of concept.premises || []) {
      if (premise.relation === 'next') continue;
      const sVar = relVariableName(premise.subject);
      const subject = sVar ? binding[sVar] : premise.subject;
      if (!subject || !rows.has(subject)) return false;
      const row = rows.get(subject);
      const relation = String(premise.relation);
      if (!Object.prototype.hasOwnProperty.call(row, relation)) return false;
      const objectVar = relVariableName(premise.object);
      if (objectVar) {
        if (Object.prototype.hasOwnProperty.call(binding, objectVar) && !same(binding[objectVar], row[relation])) return false;
        binding[objectVar] = cloneRelTerm(row[relation]);
      }
    }
    return true;
  }

  for (const concept of concepts) {
    for (const [subject, row] of rows) {
      if (Object.prototype.hasOwnProperty.call(row, concept.handle)) continue;
      if (evaluable(concept, subject)) row[concept.handle] = false;
    }
  }
  return rows;
}
`;

const point = '\nfunction relationalPatternKey(';
const at = source.indexOf(point);
if (at < 0) throw new Error('relationalPatternKey insertion point missing');
source = source.slice(0, at) + '\n' + insertion.trim() + '\n' + source.slice(at);

const old = 'const rows = singleValuedRelationRows(facts);';
const replacement = 'const rows = conceptSearchRows(state, singleValuedRelationRows(facts));';
let count = 0;
while (source.includes(old)) { source = source.replace(old, replacement); count++; }
if (count < 1) throw new Error('no relational search row construction replaced');

const finalOld = 'state.knowledge.relational_patterns = discoverSameSubjectPatterns(state, singleValuedRelationRows(facts));';
const finalNew = 'state.knowledge.relational_patterns = discoverSameSubjectPatterns(state, conceptSearchRows(state, singleValuedRelationRows(facts)));';
if (!source.includes(finalOld)) throw new Error('final relational pattern refresh missing');
source = source.replace(finalOld, finalNew);

fs.writeFileSync(file, source);
console.log('Added warranted evaluation domains for first-class relational concepts');
