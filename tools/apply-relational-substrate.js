'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mindPath = path.join(root, 'one-mind.js');
const marker = '// ---------- first-class relational knowledge inside M ----------';
let source = fs.readFileSync(mindPath, 'utf8');
if (source.includes(marker)) {
  console.log('relational substrate already present');
  process.exit(0);
}

const substrate = fs.readFileSync(path.join(__dirname, 'relational-substrate.snippet.js'), 'utf8').trimEnd();
const cReplacement = fs.readFileSync(path.join(__dirname, 'C-relational-replacement.snippet.js'), 'utf8').trimEnd();

const oneNeedle = 'function one(actionCount, concernCount = 1) {';
const oneIndex = source.indexOf(oneNeedle);
if (oneIndex < 0) throw new Error('one() insertion point not found');
source = source.slice(0, oneIndex) + substrate + '\n\n' + source.slice(oneIndex);

const priorNeedle = '    prior: {\n';
const priorIndex = source.indexOf(priorNeedle, oneIndex + substrate.length);
if (priorIndex < 0) throw new Error('M prior insertion point not found');
source = source.slice(0, priorIndex) + '    knowledge: initializeRelationalKnowledge(),\n' + source.slice(priorIndex);

const cStart = source.indexOf('function C(state, realityContact) {');
const exportStart = source.indexOf('\nmodule.exports = { one, C };', cStart);
if (cStart < 0 || exportStart < 0) throw new Error('C replacement boundary not found');
source = source.slice(0, cStart) + cReplacement + source.slice(exportStart);

fs.writeFileSync(mindPath, source);
console.log('applied first-class relational substrate to one-mind.js');
