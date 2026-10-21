'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Mind = require('./mind.js');

const source = fs.readFileSync(path.join(__dirname, 'mind.js'), 'utf8').toLowerCase();
for (const fixture of ['r_tone_discourse', 'r_form_discourse', 'r_risk_discourse', 'entity_target_discourse']) {
  assert(!source.includes(fixture), `discourse fixture leaked into cognition: ${fixture}`);
}

let seed = 0x42d00d;
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function word(prefix) { return `${prefix}${rnd().toString(36)}`; }

const REL_TONE = 'r_tone_discourse';
const REL_FORM = 'r_form_discourse';
const REL_BAND = word('rband');
const REL_RISK = 'r_risk_discourse';
const target = 'entity_target_discourse';
const entities = Array.from({ length: 6 }, () => word('entity'));
const tones = [word('tone'), word('tone'), word('tone')];
const forms = [word('form'), word('form'), word('form')];
const risks = [word('risk'), word('risk'), word('risk')];
const bands = [word('band'), word('band'), word('band')];

const M = Mind.one(2, 1);
const V = name => ({ var: String(name) });

function paired(input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}

// Learn ordinary single-relation language grounding across crossed entities.
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const tone = tones[i % tones.length];
    const form = forms[(i + 1) % forms.length];
    const risk = risks[(i + 2) % risks.length];
    paired(`${e} has tone ${tone}.`, 'noted.', [[e, REL_TONE, tone]]);
    paired(`what tone is ${e}?`, `it sounds ${tone}.`, [[e, REL_TONE, tone]]);
    paired(`${e} has form ${form}.`, 'noted.', [[e, REL_FORM, form]]);
    paired(`what form is ${e}?`, `its form is ${form}.`, [[e, REL_FORM, form]]);
    paired(`what risk is ${e}?`, `its risk is ${risk}.`, [[e, REL_RISK, risk]]);

    // Broad humanlike discourse examples carry several simultaneous facts. The
    // output order/wording is learned from the surface experience, not encoded in C.
    const facts = [[e, REL_TONE, tone], [e, REL_FORM, form], [e, REL_RISK, risk]];
    paired(`tell me about ${e}.`, `${e} sounds ${tone}. its form is ${form}, and its risk is ${risk}.`, facts);
    paired(`what do you know about ${e}?`, `${e} sounds ${tone}. its form is ${form}, and its risk is ${risk}.`, facts);
  }
}

// Introduce the target as a surface identity only. No semantic relation is used
// to teach its name, so a broad query cannot accidentally resolve a relation from it.
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `meet ${target}.`, output: 'noted.', channels: [target] } });

// Target tone/form are learned from raw surface-only assertions: no triples.
const targetTone = tones[1];
const targetForm = forms[2];
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `${target} has tone ${targetTone}.`, output: 'noted.' } });
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `${target} has form ${targetForm}.`, output: 'noted.' } });

assert(M.knowledge.current.facts.some(f => f.subject === target && f.relation === REL_TONE && f.object === targetTone));
assert(M.knowledge.current.facts.some(f => f.subject === target && f.relation === REL_FORM && f.object === targetForm));

// Risk is not taught for target. It is obtained through two canonical relational hops.
const targetBand = bands[1];
const targetRisk = risks[0];
Mind.C(M, { relations: { rules: [
  { id: word('toneBandRule'), premises: [[V('x'), REL_TONE, targetTone]], conclusion: [V('x'), REL_BAND, targetBand], categorical: true },
  { id: word('bandRiskRule'), premises: [[V('x'), REL_BAND, targetBand]], conclusion: [V('x'), REL_RISK, targetRisk], categorical: true },
] } });
assert(M.knowledge.current.facts.some(f => f.subject === target && f.relation === REL_RISK && f.object === targetRisk),
  'canonical reasoning did not derive target risk');

// This exact prompt/target/output combination never occurred. The query does not
// name a relation. It asks for discourse about the subject as a whole.
const probe = structuredClone(M);
Mind.C(probe, { surface: { input: `tell me what you know about ${target}.` } });
const seq = probe.current.sequence;
assert(seq, 'no sequence response state');
assert.strictEqual(seq.discourse_composition, true, 'broad prompt did not invoke multi-relation discourse composition');
assert.strictEqual(seq.canonical_grounding.authority, 'canonical_M');
assert.strictEqual(seq.canonical_grounding.status, 'grounded_discourse');
assert.strictEqual(seq.canonical_grounding.subject, target);
assert.strictEqual(seq.canonical_grounding.relations.length, 3);
assert(seq.expression && seq.expression.includes(targetTone), 'discourse omitted current tone');
assert(seq.expression.includes(targetForm), 'discourse omitted current form');
assert(seq.expression.includes(targetRisk), 'discourse omitted canonically derived risk');
assert(seq.expression.split('.').filter(Boolean).length >= 2, 'reply did not form multi-sentence discourse');
assert(!/[{}\[\]]/.test(seq.expression), 'reply exposed program/data syntax');
assert(!/canonical|relation|channel|object|subject|undefined|null/i.test(seq.expression), 'reply exposed implementation vocabulary');

// A specific question must still use the narrower relation path rather than dump discourse.
const specific = structuredClone(M);
Mind.C(specific, { surface: { input: `what form is ${target}?` } });
assert.strictEqual(specific.current.sequence.expression, `its form is ${targetForm}.`);
assert.strictEqual(specific.current.sequence.discourse_composition, undefined);

for (const forbidden of ['language_state', 'memory_state', 'semantic_dictionary', 'response_table', 'planner', 'truth_ledger']) {
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  broad_query_relation_supplied: false,
  raw_learned_relations_used: true,
  canonically_derived_relation_used: true,
  multi_relation_discourse: seq.expression,
  specific_query_still_precise: specific.current.sequence.expression,
  program_syntax_exposed: false,
  parallel_cognitive_authority: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('OPEN DISCOURSE FALSIFICATION: PASS');
