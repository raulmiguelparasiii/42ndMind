'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Fresh post-freeze certification. Vocabulary, ontology, values and numerical
// mapping are generated only at runtime. Role assignments are explicitly crossed
// so the evaluator itself cannot collapse distinct semantic roles.

let seed = 2166136261;
for (const ch of String(process.env.GITHUB_RUN_ID || 'long-life-cross-domain-certification-v2')) {
  seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0;
}
function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function rnd() { return rnd32() / 0x100000000; }
function word(prefix) { return `${prefix}_${rnd32().toString(36)}`; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
const V = name => ({ var: String(name) });

const M = Mind.one(2, 1);
function currentHas(subject, relation, object) {
  return (M.knowledge?.current?.facts || []).some(f => same(f.subject, subject) && f.relation === relation && same(f.object, object));
}
function paired(input, output, facts, channels) {
  const surface = { input, output };
  if (channels) surface.channels = channels;
  Mind.C(M, { surface, relations: { facts } });
}
function probe(input) {
  const P = structuredClone(M);
  Mind.C(P, { surface: { input } });
  return P.current?.sequence;
}

// Long unrelated symbolic life first.
const BG_RELATIONS = Array.from({ length: 5 }, () => word('bgrel'));
const BG_VALUES = Array.from({ length: 11 }, () => word('bgval'));
const BG_ENTITIES = Array.from({ length: 20 }, () => word('bgentity'));
const BACKGROUND_EPISODES = 64;
for (let i = 0; i < BACKGROUND_EPISODES; i++) {
  const e = BG_ENTITIES[i % BG_ENTITIES.length];
  const r = BG_RELATIONS[(i * 3 + Math.floor(i / 7)) % BG_RELATIONS.length];
  const v = BG_VALUES[(i * 5 + Math.floor(i / 9)) % BG_VALUES.length];
  paired(`archive ${e} carries ${v}.`, i % 2 ? 'logged.' : 'recorded.', [[e, r, v]], [e, r, v]);
}
assert((M.structure?.surface_episode_index?.episode_count || 0) >= BACKGROUND_EPISODES,
  'long symbolic life did not accumulate');

// Late ontology, absent from the earlier life.
const REL_TONE = word('relTone');
const REL_SIGNAL = word('relSignal');
const REL_STATUS = word('relStatus');
const ENTITIES = Array.from({ length: 6 }, () => word('entity'));
const TONES = Array.from({ length: 3 }, () => word('tone'));
const SIGNALS = Array.from({ length: 3 }, () => word('signal'));
const STATUSES = Array.from({ length: 3 }, () => word('status'));
const toneIx   = [0, 0, 1, 1, 2, 2];
const signalIx = [0, 1, 0, 2, 1, 2];
const statusIx = [0, 1, 2, 0, 2, 1];

assert(!(M.knowledge?.facts || []).some(f => [REL_TONE, REL_SIGNAL, REL_STATUS].includes(f.relation)),
  'late ontology leaked before schooling');

// Evaluator validity: each role varies independently inside each other role.
for (let k = 0; k < 3; k++) {
  const byTone = ENTITIES.map((_, i) => i).filter(i => toneIx[i] === k);
  const bySignal = ENTITIES.map((_, i) => i).filter(i => signalIx[i] === k);
  const byStatus = ENTITIES.map((_, i) => i).filter(i => statusIx[i] === k);
  assert(new Set(byTone.map(i => signalIx[i])).size > 1 && new Set(byTone.map(i => statusIx[i])).size > 1,
    'invalid evaluator: tone identifies another role');
  assert(new Set(bySignal.map(i => toneIx[i])).size > 1 && new Set(bySignal.map(i => statusIx[i])).size > 1,
    'invalid evaluator: signal identifies another role');
  assert(new Set(byStatus.map(i => toneIx[i])).size > 1 && new Set(byStatus.map(i => signalIx[i])).size > 1,
    'invalid evaluator: status identifies another role');
}

for (let round = 0; round < 3; round++) {
  for (let i = 0; i < ENTITIES.length; i++) {
    const e = ENTITIES[i], tone = TONES[toneIx[i]], signal = SIGNALS[signalIx[i]], status = STATUSES[statusIx[i]];
    paired(`${e} bears ${tone} while signals ${signal}.`, 'noted.', [[e, REL_TONE, tone], [e, REL_SIGNAL, signal]]);
    paired(`what tone marks ${e}?`, `tone ${tone}.`, [[e, REL_TONE, tone]]);
    paired(`what signal marks ${e}?`, `signal ${signal}.`, [[e, REL_SIGNAL, signal]]);
    paired(`what status marks ${e}?`, `status ${status}.`, [[e, REL_STATUS, status]]);
    paired(`tell me about ${e}.`, `${e} has tone ${tone}. signal ${signal}. status ${status}.`, [
      [e, REL_TONE, tone], [e, REL_SIGNAL, signal], [e, REL_STATUS, status],
    ]);
  }
}

// Target identity only; no semantic triples for its evaluated truth.
const TARGET = word('target');
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `meet ${TARGET}.`, output: 'noted.', channels: [TARGET] } });
assert(!(M.knowledge?.facts || []).some(f => f.subject === TARGET && [REL_TONE, REL_SIGNAL, REL_STATUS].includes(f.relation)),
  'target truth leaked before raw contact');

const tone0 = TONES[2], tone1 = TONES[1], signal0 = SIGNALS[0];
const raw0 = `${TARGET} bears ${tone0} while signals ${signal0}.`;
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
assert(!currentHas(TARGET, REL_TONE, tone0) && !currentHas(TARGET, REL_SIGNAL, signal0),
  'one raw assertion self-warranted');
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
assert(currentHas(TARGET, REL_TONE, tone0), 'late raw tone was not learned');
assert(currentHas(TARGET, REL_SIGNAL, signal0), 'late raw signal was not learned');
let seq = probe(`what signal marks ${TARGET}?`);
assert.strictEqual(seq?.canonical_grounding?.authority, 'canonical_M');
assert.strictEqual(seq.expression, `signal ${signal0}.`);

// Derive an independently crossed current status from the raw-learned signal.
// status1 is a known expression value but is not determined by signal0 in schooling.
const derivedStatus = STATUSES[1];
Mind.C(M, { relations: { rules: [{
  id: word('lateRule'),
  premises: [[V('x'), REL_SIGNAL, signal0]],
  conclusion: [V('x'), REL_STATUS, derivedStatus],
  categorical: true,
}] } });
assert(currentHas(TARGET, REL_STATUS, derivedStatus), 'canonical reasoning did not use late raw premise');
seq = probe(`what status marks ${TARGET}?`);
assert.strictEqual(seq?.canonical_grounding?.object, derivedStatus);
assert.strictEqual(seq.expression, `status ${derivedStatus}.`);

// Selectively correct tone only.
const raw1 = `${TARGET} bears ${tone1} while signals ${signal0}.`;
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: raw1, output: 'noted.' } });
assert(!currentHas(TARGET, REL_TONE, tone0), 'old tone survived recurrent correction');
assert(currentHas(TARGET, REL_TONE, tone1), 'corrected tone did not settle');
assert(currentHas(TARGET, REL_SIGNAL, signal0), 'independent signal was lost');
assert(currentHas(TARGET, REL_STATUS, derivedStatus), 'derived status was lost');

seq = probe(`tell me about ${TARGET}.`);
assert.strictEqual(seq?.canonical_grounding?.authority, 'canonical_M');
assert.strictEqual(seq?.canonical_grounding?.status, 'grounded_discourse');
assert(seq.expression?.includes(tone1) && !seq.expression?.includes(tone0), 'broad discourse did not follow corrected tone');
assert(seq.expression?.includes(signal0), 'broad discourse lost independent signal');
assert(seq.expression?.includes(derivedStatus), 'broad discourse lost canonically derived status');

const rawHistory = (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:input_raw' && (f.object === raw0 || f.object === raw1));
assert(rawHistory.length >= 6, 'exact late raw history was not retained');

// Continue the same M into an unseen numerical domain.
let scale = 0.75 + rnd() * 2.5;
if (rnd() < 0.5) scale *= -1;
const offset = rnd() * 3 - 1.5;
const concern = 17 + (rnd32() % 11);
for (let t = 0; t < 96; t++) {
  const x = rnd() * 6 - 3 + t * 1e-8;
  Mind.C(M, { frame: [x, scale * x + offset, concern] });
}
const dependence = (M.knowledge?.current?.facts || []).find(f =>
  f.subject === 'receptor:p0' && f.relation === 'ρ:continuous_dependence' && f.object &&
  f.object.target === 'receptor:p1' && f.object.lag === 0 && f.object.transform?.kind === 'affine');
assert(dependence, 'same long-lived individual did not learn later raw numeric relation');
const novel = rnd() * 4 - 2, expected = scale * novel + offset;
Mind.C(M, { frame: [novel, null, concern] });
assert.strictEqual(M.contacts.at(-1)[1], null, 'completion rewrote unobserved numeric contact');
assert.strictEqual(M.current?.observed?.p1, undefined, 'completion fabricated numeric observation');
assert(M.current?.inferred?.includes('p1') && Number.isFinite(M.current?.completed?.p1), 'missing numeric target was not completed');
assert(Math.abs(M.current.completed.p1 - expected) < 1e-8, 'numeric completion does not match learned mapping');
assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && f.object === raw0),
  'earlier symbolic contact disappeared after numeric learning');

for (const forbidden of ['language_state', 'memory_state', 'semantic_dictionary', 'response_table', 'planner', 'truth_ledger', 'numeric_model', 'world_model'])
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  freeze_verified_by_workflow: true,
  evaluator_roles_independently_crossed: true,
  runtime_generated_ontology: true,
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  unrelated_symbolic_history_before_late_domain: BACKGROUND_EPISODES,
  late_relation_learned_after_long_history: true,
  target_truth_learned_from_raw_surface_only: true,
  proposal_did_not_self_warrant: true,
  canonical_reasoning_used_late_learned_relation: true,
  selective_correction_preserved_independent_relations: true,
  broad_discourse_expressed_current_canonical_facts: true,
  later_raw_numeric_relation_learned_and_completed: true,
  exact_earlier_contact_retained: true,
  parallel_cognitive_authority: false,
  certification_scope: 'refrozen long-life symbolic-to-numeric cross-domain continuation',
}, null, 2));
console.log('POST-FREEZE LONG-LIFE CROSS-DOMAIN CERTIFICATION V2: PASS');
