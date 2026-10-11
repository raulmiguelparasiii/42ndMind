'use strict';

const fs = require('fs');
const file = 'one-mind.js';
let source = fs.readFileSync(file, 'utf8');

function replaceFunction(name, replacement) {
  const needle = `function ${name}(`;
  const start = source.indexOf(needle);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = null, escape = false, end = -1;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) throw new Error(`unterminated function ${name}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

function optimizedRelPremiseBindings(premises, facts) {
  // Pure index: it changes neither matching nor authority. Literal relations are
  // used to avoid scanning facts that cannot possibly satisfy the premise.
  const byRelation = new Map();
  for (const fact of facts) {
    const key = stable(fact.relation);
    if (!byRelation.has(key)) byRelation.set(key, []);
    byRelation.get(key).push(fact);
  }

  let bindings = [{}];
  for (const premise of premises) {
    const relationVariable = relVariableName(premise.relation);
    const candidates = relationVariable ? facts : (byRelation.get(stable(premise.relation)) || []);
    const next = [];
    for (const binding of bindings) {
      for (const fact of candidates) {
        const matched = matchRelPattern(premise, fact, binding);
        if (matched) next.push(matched);
      }
    }
    const uniqueBindings = new Map();
    for (const binding of next) uniqueBindings.set(stable(binding), binding);
    bindings = [...uniqueBindings.values()];
    if (!bindings.length) break;
  }
  return bindings;
}

replaceFunction('relPremiseBindings', optimizedRelPremiseBindings.toString().replace('optimizedRelPremiseBindings', 'relPremiseBindings'));
fs.writeFileSync(file, source);
console.log('Applied relation-name index without changing relational semantics');
