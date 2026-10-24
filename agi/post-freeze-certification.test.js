'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Mind = require('./mind.js');

// ---------------------------------------------------------------------------
// 0. Certification begins by proving cognition is exactly the frozen candidate.
// ---------------------------------------------------------------------------

function gitBlobSha(file) {
  const data = fs.readFileSync(file);
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${data.length}\0`))
    .update(data)
    .digest('hex');
}

const frozen = {
  '../one-mind.js': '922347a5ed55eeaa1340bcdbe9524825db79642a',
  'one-live-blueprint.js': 'bb8a89b9b604608acc4549bc07698f30209d527e',
  'mind.js': '4f0f7143ccfd11a6a1cc42b09c7c00efbc35d825',
  'surface-template.js': '0adb80505814407f2991057e6e77be347015cd5e',
  'BLUEPRINT.tex': '0087c891493123de7186ce80e78eff503115e7f4',
};
for (const [relative, sha] of Object.entries(frozen)) {
  assert.strictEqual(gitBlobSha(path.join(__dirname, relative)), sha, `frozen cognition changed: ${relative}`);
}

// Runtime vocabulary depends on the certification run, not on frozen cognition.
let seed = 2166136261;
for (const ch of String(process.env.GITHUB_RUN_ID || Date.now())) {
  seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0;
}
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function word(prefix) { return `${prefix}${rnd().toString(36)}`; }

const entity = Array.from({ length: 9 }, () => word('n'));
const target = word('target');
const auxiliary = word('aux');
const toneValues = [word('tv'), word('tv'), word('tv')];
const formValues = [word('fv'), word('fv'), word('fv')];
const correctedTone = word('newtone');
const riskValue = word('risk');
const bandValue = word('band');

const REL_TONE = word('rTone');
const REL_FORM = word('rForm');
const REL_KIND = word('rKind');
const REL_TOPIC = word('rTopic');
const REL_SHADE = word('rShade');
const REL_BAND = word('rBand');
const REL_RISK = word('rRisk');

const V = name => ({ var: String(name) });
const M = Mind.one(2, 1);

// ---------------------------------------------------------------------------
// 1. One physical life: development, then a receptor and actuator added later.
// ---------------------------------------------------------------------------

for (let i = 0; i < 18; i++) Mind.C(M, { frame: [i % 3, (i * 5) % 7, 30] });
for (let i = 0; i < 24; i++) {
  const x = i % 3;
  Mind.C(M, {
    frame: [x, (i * 5) % 7, 700 + x, 30],
    actuators: i === 0 ? [word('tool')] : [],
  });
}
assert.strictEqual(M.action_count, 3, 'late actuator did not enlarge action boundary');
assert(M.structure.patterns.some(p => p.active !== false && (
  (p.target === 'p2' && p.conditions.some(c => c.feature === 'p0')) ||
  (p.target === 'p0' && p.conditions.some(c => c.feature === 'p2'))
)), 'frozen C did not discover the late receptor relation');

function paired(input, output, fact) {
  Mind.C(M, { surface: { input, output }, relations: { facts: [fact] } });
}
function has(subject, relation, object) {
  return M.knowledge.current.facts.some(f => f.subject === subject && f.relation === relation && f.object === object);
}

// ---------------------------------------------------------------------------
// 2. Crossed schooling: learn surface topology, not target answers.
// ---------------------------------------------------------------------------

for (let round = 0; round < 3; round++) {
  for (let i = 0; i < 6; i++) {
    const e = entity[i];
    const tone = toneValues[i % toneValues.length];
    const form = formValues[(i + 1) % formValues.length];

    paired(`${e} has tone ${tone}.`, 'acknowledged.', [e, REL_TONE, tone]);
    const toneReply = i % 3 === 0 ? `it sounds ${tone}.`
      : i % 3 === 1 ? `it sounds very ${tone}.`
      : `it sounds especially soft ${tone}.`;
    paired(`what tone is ${e}?`, toneReply, [e, REL_TONE, tone]);

    paired(`${e} has form ${form}.`, 'recorded.', [e, REL_FORM, form]);
    paired(`what form is ${e}?`, `its form is ${form}.`, [e, REL_FORM, form]);
  }

  // Ordered discourse examples across several subjects.
  for (let i = 0; i < 4; i++) {
    const e = entity[i];
    const form = formValues[(i + 1) % formValues.length];
    paired(`consider ${e}.`, 'noted.', [e, REL_TOPIC, 'active']);
    paired('what form is it?', `its form is ${form}.`, [e, REL_FORM, form]);
  }

  // Risk expression is schooled on other entities only.
  paired(`what risk is ${entity[6]}?`, `risk is ${riskValue}.`, [entity[6], REL_RISK, riskValue]);
  paired(`what risk is ${entity[7]}?`, `risk is ${riskValue}.`, [entity[7], REL_RISK, riskValue]);
}

// Target is identifiable but none of its tone/form/risk facts are supplied.
for (let i = 0; i < 3; i++) paired(`${target} is specimen.`, 'noted.', [target, REL_KIND, 'specimen']);
assert(!M.knowledge.facts.some(f => f.subject === target && [REL_TONE, REL_FORM, REL_RISK].includes(f.relation)),
  'target answer leaked into structured schooling');

// ---------------------------------------------------------------------------
// 3. Raw surface-only teaching. One assertion proposes; recurrence warrants.
// ---------------------------------------------------------------------------

const targetTone = toneValues[1];
const targetForm = formValues[2];

Mind.C(M, { surface: { input: `${target} has tone ${targetTone}.`, output: 'acknowledged.' } });
assert(!has(target, REL_TONE, targetTone), 'single raw assertion became timeless truth');
Mind.C(M, { surface: { input: `${target} has tone ${targetTone}.`, output: 'acknowledged.' } });
Mind.C(M, { surface: { input: `${target} has tone ${targetTone}.`, output: 'acknowledged.' } });

for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `${target} has form ${targetForm}.`, output: 'recorded.' } });

assert(has(target, REL_TONE, targetTone), 'raw tone teaching did not settle into canonical M');
assert(has(target, REL_FORM, targetForm), 'raw form teaching did not settle into canonical M');
assert(M.knowledge.facts.some(f => f.relation === 'ρ:proposes_relation' && f.object && f.object.subject === target),
  'surface-only teaching bypassed M-owned proposal state');

// Direct held-out questions.
const toneProbe = structuredClone(M);
Mind.C(toneProbe, { surface: { input: `what tone is ${target}?` } });
assert.strictEqual(toneProbe.current.sequence.canonical_grounding.authority, 'canonical_M');
assert.strictEqual(toneProbe.current.sequence.canonical_grounding.object, targetTone);
assert(toneProbe.current.sequence.expression.includes(targetTone), 'variable-length reply did not realize target tone');

const formProbe = structuredClone(M);
Mind.C(formProbe, { surface: { input: `what form is ${target}?` } });
assert.strictEqual(formProbe.current.sequence.expression, `its form is ${targetForm}.`);

// ---------------------------------------------------------------------------
// 4. Multi-turn discourse: follow-up omits target entirely.
// ---------------------------------------------------------------------------

paired(`consider ${target}.`, 'noted.', [target, REL_TOPIC, 'active']);
const contextProbe = structuredClone(M);
Mind.C(contextProbe, { surface: { input: 'what form is it?' } });
assert.strictEqual(contextProbe.current.sequence.expression, `its form is ${targetForm}.`);
assert.strictEqual(contextProbe.current.sequence.canonical_grounding.subject, target);
assert.strictEqual(contextProbe.current.sequence.contextual_subject_resolution, true);

// ---------------------------------------------------------------------------
// 5. Canonical multi-hop reasoning over a relation learned from raw language.
// ---------------------------------------------------------------------------

Mind.C(M, { relations: { rules: [
  {
    id: word('ruleToneBand'),
    premises: [[V('x'), REL_TONE, targetTone]],
    conclusion: [V('x'), REL_BAND, bandValue],
    categorical: true,
  },
  {
    id: word('ruleBandRisk'),
    premises: [[V('x'), REL_BAND, bandValue]],
    conclusion: [V('x'), REL_RISK, riskValue],
    categorical: true,
  },
] } });
assert(has(target, REL_RISK, riskValue), 'two-hop canonical closure failed over raw-learned premise');

const riskProbe = structuredClone(M);
Mind.C(riskProbe, { surface: { input: `what risk is ${target}?` } });
assert.strictEqual(riskProbe.current.sequence.expression, `risk is ${riskValue}.`);
assert.strictEqual(riskProbe.current.sequence.canonical_grounding.authority, 'canonical_M');

// ---------------------------------------------------------------------------
// 6. Later raw correction introduces an object absent from all prior experience.
// ---------------------------------------------------------------------------

assert(!M.knowledge.facts.some(f => f.object === correctedTone), 'runtime correction value was not novel');
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `${target} has tone ${correctedTone}.`, output: 'acknowledged.' } });
assert(!has(target, REL_TONE, targetTone), 'old surface-induced route survived recurrent contradiction');
assert(has(target, REL_TONE, correctedTone), 'unseen correction did not become current canonical relation');

// Teach only how that novel object can be rendered, on an unrelated relation.
for (let i = 0; i < 3; i++) paired(`${auxiliary} has shade ${correctedTone}.`, `it sounds ${correctedTone}.`, [auxiliary, REL_SHADE, correctedTone]);
const correctedProbe = structuredClone(M);
Mind.C(correctedProbe, { surface: { input: `what tone is ${target}?` } });
assert.strictEqual(correctedProbe.current.sequence.canonical_grounding.object, correctedTone);
assert(correctedProbe.current.sequence.expression.includes(correctedTone));

// Old raw and structured occurrences remain as lived history.
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && String(f.object).includes(targetTone)));

for (const forbidden of ['language_state', 'memory_state', 'semantic_dictionary', 'response_table', 'planner', 'truth_ledger']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  freeze_verified: true,
  runtime_generated_vocabulary: true,
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  late_sensor_relation_discovered: true,
  late_actuator_integrated: true,
  raw_surface_learning_became_canonical: true,
  single_assertion_was_only_proposal: true,
  variable_length_reply: toneProbe.current.sequence.expression,
  contextual_followup_reply: contextProbe.current.sequence.expression,
  canonical_two_hop_reply: riskProbe.current.sequence.expression,
  unseen_raw_correction_reply: correctedProbe.current.sequence.expression,
  historical_contact_retained: true,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('POST-FREEZE CROSS-DOMAIN CERTIFICATION: PASS');
