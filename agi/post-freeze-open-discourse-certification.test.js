'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Mind = require('./mind.js');

// ---------------------------------------------------------------------------
// 0. Prove this is exactly the candidate frozen before this evaluation existed.
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
  'mind.js': '0cc07dc63b485acc9798b5a65a1b9829e61d6c4f',
  'surface-template.js': 'c9f2ed689301759f7ad65e53e92088446795eacd',
  'BLUEPRINT.tex': '0087c891493123de7186ce80e78eff503115e7f4',
};
for (const [relative, sha] of Object.entries(frozen)) {
  assert.strictEqual(gitBlobSha(path.join(__dirname, relative)), sha, `frozen cognition changed: ${relative}`);
}

// Evaluation ontology is generated at runtime after the freeze.
let seed = 2166136261;
for (const ch of String(process.env.GITHUB_RUN_ID || 'post-freeze-open-discourse')) {
  seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0;
}
function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function word(prefix) { return `${prefix}${rnd().toString(36)}`; }

const entities = Array.from({ length: 6 }, () => word('entity'));
const target = word('target');
const tones = [word('tone'), word('tone'), word('tone')];
const forms = [word('form'), word('form'), word('form')];
const risks = [word('risk'), word('risk'), word('risk')];
const bands = [word('band'), word('band'), word('band')];
const REL_TONE = word('relTone');
const REL_FORM = word('relForm');
const REL_BAND = word('relBand');
const REL_RISK = word('relRisk');

// Independent crossing: no target role can be inferred from another role.
const toneIx = [0, 0, 1, 1, 2, 2];
const formIx = [0, 1, 0, 2, 1, 2];
const riskIx = [0, 1, 1, 2, 2, 0];
const V = name => ({ var: String(name) });
const M = Mind.one(2, 1);

function paired(input, output, facts) {
  Mind.C(M, { surface: { input, output }, relations: { facts } });
}
function current(subject, relation, object) {
  return M.knowledge.current.facts.some(f => f.subject === subject && f.relation === relation && f.object === object);
}
function relationMap(seq) {
  return new Map((seq.canonical_grounding?.relations || []).map(x => [x.relation, x.object]));
}

// ---------------------------------------------------------------------------
// 1. Learn several independent relation roles and a broad discourse form.
// ---------------------------------------------------------------------------
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    const tone = tones[toneIx[i]];
    const form = forms[formIx[i]];
    const risk = risks[riskIx[i]];

    paired(`${e} has tone ${tone}.`, 'noted.', [[e, REL_TONE, tone]]);
    paired(`what tone is ${e}?`, `it sounds ${tone}.`, [[e, REL_TONE, tone]]);
    paired(`${e} has form ${form}.`, 'noted.', [[e, REL_FORM, form]]);
    paired(`what form is ${e}?`, `its form is ${form}.`, [[e, REL_FORM, form]]);
    paired(`what risk is ${e}?`, `its risk is ${risk}.`, [[e, REL_RISK, risk]]);

    const facts = [[e, REL_TONE, tone], [e, REL_FORM, form], [e, REL_RISK, risk]];
    paired(`tell me about ${e}.`, `${e} sounds ${tone}. its form is ${form}, and its risk is ${risk}.`, facts);
    paired(`what do you know about ${e}?`, `${e} sounds ${tone}. its form is ${form}, and its risk is ${risk}.`, facts);
  }
}

for (let a = 0; a < 3; a++) {
  const toneRows = entities.map((_, i) => i).filter(i => toneIx[i] === a);
  assert(new Set(toneRows.map(i => formIx[i])).size > 1, 'evaluation accidentally lets tone predict form');
  assert(new Set(toneRows.map(i => riskIx[i])).size > 1, 'evaluation accidentally lets tone predict risk');
}

// ---------------------------------------------------------------------------
// 2. Fresh target: identity only, then two facts acquired from raw language.
// ---------------------------------------------------------------------------
for (let i = 0; i < 3; i++) {
  Mind.C(M, { surface: { input: `meet ${target}.`, output: 'noted.', channels: [target] } });
}

const initialTone = tones[1];
const correctedTone = tones[2]; // known as an expression elsewhere, not as target truth
const targetForm = forms[1];
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `${target} has tone ${initialTone}.`, output: 'noted.' } });
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `${target} has form ${targetForm}.`, output: 'noted.' } });

assert(current(target, REL_TONE, initialTone), 'raw tone experience did not become current M knowledge');
assert(current(target, REL_FORM, targetForm), 'raw form experience did not become current M knowledge');

// ---------------------------------------------------------------------------
// 3. Third fact exists only by two-hop canonical reasoning from the raw-learned form.
// ---------------------------------------------------------------------------
const targetBand = bands[0];
const targetRisk = risks[2];
Mind.C(M, { relations: { rules: [
  { id: word('formBandRule'), premises: [[V('x'), REL_FORM, targetForm]], conclusion: [V('x'), REL_BAND, targetBand], categorical: true },
  { id: word('bandRiskRule'), premises: [[V('x'), REL_BAND, targetBand]], conclusion: [V('x'), REL_RISK, targetRisk], categorical: true },
] } });
assert(current(target, REL_RISK, targetRisk), 'canonical two-hop reasoning did not derive target risk');

// ---------------------------------------------------------------------------
// 4. First broad prompt names the subject but no relation.
// ---------------------------------------------------------------------------
const first = structuredClone(M);
Mind.C(first, { surface: { input: `what can you tell me about ${target}?` } });
const firstSeq = first.current.sequence;
assert.strictEqual(firstSeq.discourse_composition, true, 'frozen AGI did not produce relation-unspecified discourse');
assert.strictEqual(firstSeq.canonical_grounding.authority, 'canonical_M');
assert.strictEqual(firstSeq.canonical_grounding.status, 'grounded_discourse');
assert.strictEqual(firstSeq.canonical_grounding.subject, target);
const firstMap = relationMap(firstSeq);
assert.strictEqual(firstMap.get(REL_TONE), initialTone);
assert.strictEqual(firstMap.get(REL_FORM), targetForm);
assert.strictEqual(firstMap.get(REL_RISK), targetRisk);
assert(firstSeq.expression.includes(initialTone));
assert(firstSeq.expression.includes(targetForm));
assert(firstSeq.expression.includes(targetRisk));
assert(firstSeq.expression.split('.').filter(Boolean).length >= 2, 'first response is not multi-sentence discourse');
assert(!/[{}\[\]]/.test(firstSeq.expression), 'first response exposed program/data syntax');

// ---------------------------------------------------------------------------
// 5. Live correction changes only tone. Form and derived risk must remain stable.
// ---------------------------------------------------------------------------
for (let i = 0; i < 3; i++) {
  Mind.C(M, { surface: { input: `${target} has tone ${correctedTone}.`, output: 'noted.' } });
}
assert(!current(target, REL_TONE, initialTone), 'superseded tone remained current after recurrent contradiction');
assert(current(target, REL_TONE, correctedTone), 'corrected tone did not become current');
assert(current(target, REL_FORM, targetForm), 'unrelated form changed during tone correction');
assert(current(target, REL_RISK, targetRisk), 'unrelated derived risk changed during tone correction');

const second = structuredClone(M);
Mind.C(second, { surface: { input: `tell me what you know about ${target}.` } });
const secondSeq = second.current.sequence;
assert.strictEqual(secondSeq.discourse_composition, true, 'corrected broad discourse was not composed');
const secondMap = relationMap(secondSeq);
assert.strictEqual(secondMap.get(REL_TONE), correctedTone, 'broad discourse did not follow corrected current tone');
assert.strictEqual(secondMap.get(REL_FORM), targetForm, 'broad discourse lost unchanged form');
assert.strictEqual(secondMap.get(REL_RISK), targetRisk, 'broad discourse lost unchanged derived risk');
assert(secondSeq.expression.includes(correctedTone));
assert(!secondSeq.expression.includes(initialTone), 'broad discourse replayed superseded tone');
assert(secondSeq.expression.includes(targetForm));
assert(secondSeq.expression.includes(targetRisk));

// Historical lived contact is pristine even though current warrant changed.
assert(M.knowledge.facts.some(f => f.relation === 'ρ:input_raw' && String(f.object).includes(initialTone)),
  'superseded raw contact was erased');

// Narrow dialogue still resolves one relation rather than dumping the broad description.
const specific = structuredClone(M);
Mind.C(specific, { surface: { input: `what tone is ${target}?` } });
assert.strictEqual(specific.current.sequence.canonical_grounding.object, correctedTone);
assert(specific.current.sequence.expression.includes(correctedTone));
assert.strictEqual(specific.current.sequence.discourse_composition, undefined);

for (const forbidden of ['language_state', 'memory_state', 'semantic_dictionary', 'response_table', 'planner', 'truth_ledger']) {
  assert.strictEqual(M[forbidden], undefined, `parallel cognitive authority appeared: ${forbidden}`);
}

console.log(JSON.stringify({
  freeze_verified: true,
  runtime_generated_evaluation_ontology: true,
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  relation_unspecified_discourse: true,
  raw_surface_facts_used: 2,
  canonical_two_hop_fact_used: true,
  first_discourse: firstSeq.expression,
  recurrent_correction_changed_one_relation: true,
  second_discourse: secondSeq.expression,
  unchanged_relations_preserved: true,
  superseded_exact_contact_retained: true,
  specific_query_remained_precise: true,
  parallel_cognitive_authority: false,
  certification_scope: 'frozen open-discourse transfer and live correction',
}, null, 2));
console.log('POST-FREEZE OPEN-DISCOURSE CERTIFICATION: PASS');
