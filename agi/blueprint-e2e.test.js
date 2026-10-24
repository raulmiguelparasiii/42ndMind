'use strict';

// Blueprint gate for the one-live-M architecture.
// The experimental entrypoint owns no cognitive state beyond canonical M.
// The local boundary code is mechanical S/A only: token/code conversion and
// frame placement. It contains no semantic dictionary, parser, planner, truth
// ledger, or task-specific rule inside C.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./one-live-blueprint.js');

assert.deepStrictEqual(Object.keys(Mind).sort(), ['C', 'one']);
const sources = [
  fs.readFileSync(path.join(__dirname, '..', 'one-mind.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'one-live-blueprint.js'), 'utf8'),
].join('\n');
for (const forbidden of ['alpha_entity', 'heldout_alpha', 'question_answer_gate']) {
  assert.ok(!sources.includes(forbidden), `test-specific content leaked into C: ${forbidden}`);
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}

class TextBoundary {
  constructor() {
    this.next = 10000;
    this.toCode = new Map();
    this.toToken = new Map();
  }
  tokenize(text) {
    // Mechanical surface segmentation only. Meaning remains entirely outside S.
    return String(text).toLowerCase().match(/[a-z0-9']+|[^\s\w]/g) || [];
  }
  code(token) {
    token = String(token).toLowerCase();
    if (!this.toCode.has(token)) {
      const code = this.next++;
      this.toCode.set(token, code);
      this.toToken.set(code, token);
    }
    return this.toCode.get(token);
  }
  encode(text, width) {
    const tokens = this.tokenize(text).map(t => this.code(t));
    if (tokens.length > width) throw new Error(`surface exceeds mechanical width ${width}`);
    return [...tokens, ...Array(width - tokens.length).fill(null)];
  }
  render(codes) {
    const tokens = codes.filter(x => x !== null && x !== undefined).map(code => this.toToken.get(code) || `<?>${code}`);
    return tokens.join(' ').replace(/\s+([?.!,;:])/g, '$1');
  }
}

// ---------------------------------------------------------------------------
// Gate A: a new sensor can enter an already-developed life without changing C.
// ---------------------------------------------------------------------------

const sensorMind = Mind.one(2, 1);
let frame = [0, 0, 20];
Mind.C(sensorMind, frame);

function sensorStep(a, b, extra = undefined) {
  const percept = extra === undefined ? [a, b] : [a, b, extra];
  frame = [...percept, 20];
  Mind.C(sensorMind, frame);
}

// Establish a prior life before the new receptor exists.
for (let i = 0; i < 18; i++) sensorStep(i % 3, (i * 2) % 5);
const contactsBeforeNewSensor = sensorMind.contacts.length;

// Attach p2 later. Its value is coupled to p0 while p1 varies independently.
for (let i = 0; i < 36; i++) {
  const x = i % 3;
  sensorStep(x, (i * 7) % 11, 700 + x);
}

assert(sensorMind.contacts.length > contactsBeforeNewSensor);
assert(sensorMind.contacts.slice(contactsBeforeNewSensor).every(x => x.length === 4), 'new sensor was not retained as ordinary contact');
assert(sensorMind.structure.patterns.some(p =>
  p.active !== false &&
  ((p.target === 'p2' && p.conditions.some(a => a.feature === 'p0')) ||
   (p.target === 'p0' && p.conditions.some(a => a.feature === 'p2')))
), 'same C did not discover a relation involving the newly attached sensor');

// ---------------------------------------------------------------------------
// Gate B: ordinary text can use the SAME M/C through a dumb surface boundary.
// The curriculum supplies lived pairings; it does not inject semantic rules.
// A held-out question must be answered by recombining separately learned
// expression/world relations rather than memorizing that question/answer pair.
// ---------------------------------------------------------------------------

const text = new TextBoundary();
const IN = 8;
const OUT = 4;
const ENTITY_SLOT = IN + OUT;
const COLOR_SLOT = ENTITY_SLOT + 1;
const CONTEXT_SLOT = COLOR_SLOT + 1;
const CONCERN_SLOT = CONTEXT_SLOT + 1;
const WIDTH = CONCERN_SLOT + 1;

const conversational = Mind.one(1, 1);
const entities = [
  ['alpha', 101, 'red', 201],
  ['beta', 102, 'blue', 202],
  ['gamma', 103, 'green', 203],
  ['delta', 104, 'orange', 204],
  ['epsilon', 105, 'purple', 205],
  ['zeta', 106, 'yellow', 206],
];

function makeFrame(input, output, entityCode, colorCode, context) {
  const f = [
    ...text.encode(input, IN),
    ...text.encode(output, OUT),
    entityCode,
    colorCode,
    context,
    0,
  ];
  assert.strictEqual(f.length, WIDTH);
  return f;
}

function expose(input, output, entityCode, colorCode, context) {
  Mind.C(conversational, makeFrame(input, output, entityCode, colorCode, context));
}

// Statement experience teaches word/world attachment for every entity/color,
// including alpha. Alpha's QUESTION is never shown.
for (let round = 0; round < 5; round++) {
  for (let i = 0; i < entities.length; i++) {
    const [name, entityCode, color, colorCode] = entities[i];
    expose(`the color of ${name} is ${color}.`, `${name} is ${color}.`, entityCode, colorCode, 1000 + round * 31 + i);
  }
}

// Question/answer structure is learned only from the other five entities.
for (let round = 0; round < 6; round++) {
  for (let i = 1; i < entities.length; i++) {
    const [name, entityCode, color, colorCode] = entities[i];
    expose(`what color is ${name}?`, `it is ${color}.`, entityCode, colorCode, 2000 + round * 37 + i);
  }
}

const alpha = entities[0];
const probe = structuredClone(conversational);
Mind.C(probe, makeFrame('what color is alpha?', '', null, null, 99991));

const outCodes = [];
for (let i = 0; i < OUT; i++) outCodes.push(probe.current.completed[`p${IN + i}`]);
const reply = text.render(outCodes);

assert.strictEqual(probe.current.completed[`p${ENTITY_SLOT}`], alpha[1], 'surface alpha did not recover its grounded entity relation');
assert.strictEqual(probe.current.completed[`p${COLOR_SLOT}`], alpha[3], 'entity relation did not recover the held-out color relation');
assert.strictEqual(reply, 'it is red.', `held-out ordinary-text response was not compositionally completed: ${reply}`);
assert((probe.current.invariant_completions || []).some(x => x.feature === `p${IN + 1}`), 'zero-entropy grammar channel was not completed generically');
assert((probe.current.invariant_completions || []).some(x => x.feature === `p${IN + 3}`), 'zero-entropy punctuation channel was not completed generically');

// Exact curriculum contact is still present beneath learned abstractions.
assert.strictEqual(conversational.contacts.length, conversational.experiences.length + 1);
assert(conversational.contacts.some(f => f.includes(text.code('alpha')) && f.includes(text.code('red'))));

// No parallel cognitive authority appeared.
for (const forbidden of ['language_state', 'memory_state', 'planner', 'truth_ledger', 'semantic_dictionary']) {
  assert.strictEqual(conversational[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  blueprint_formula: 'M(t+1)=C(M(t)⊕R(t+1))',
  new_sensor_without_C_change: true,
  cross_channel_relation_discovery: true,
  one_persistent_M: conversational.whole === 1,
  one_C_entrypoint: true,
  exact_contact_retained: true,
  zero_entropy_completion_is_generic: true,
  mechanical_text_boundary_only: true,
  heldout_question: 'what color is alpha?',
  heldout_reply: reply,
  heldout_question_answer_pair_seen_during_training: false,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('AGI BLUEPRINT END-TO-END BOUNDED GATE: PASS');
