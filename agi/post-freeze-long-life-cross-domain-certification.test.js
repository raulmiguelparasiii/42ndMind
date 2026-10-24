'use strict';

const assert = require('assert');
const Mind = require('./mind.js');

// Post-freeze certification only. The vocabulary, relations, values, background
// life, and numeric mapping are generated at runtime after cognition was frozen.
// Failure rejects this frozen candidate; this file must not become a tuning set.

let seed = 2166136261;
for (const ch of String(process.env.GITHUB_RUN_ID || 'long-life-cross-domain-certification')) {
  seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619) >>> 0;
}
function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
function rnd() { return rnd32() / 0x100000000; }
function word(prefix) { return `${prefix}_${rnd32().toString(36)}`; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

const M = Mind.one(2, 1);
const V = name => ({ var: String(name) });
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

// ---------------------------------------------------------------------------
// 1. Long unrelated symbolic life before the evaluated domain exists.
// ---------------------------------------------------------------------------
const BG_RELATIONS = Array.from({ length: 5 }, () => word('bgrel'));
const BG_VALUES = Array.from({ length: 13 }, () => word('bgval'));
const BG_ENTITIES = Array.from({ length: 24 }, () => word('bgentity'));
const BACKGROUND_EPISODES = 72;
for (let i = 0; i < BACKGROUND_EPISODES; i++) {
  const e = BG_ENTITIES[i % BG_ENTITIES.length];
  const r = BG_RELATIONS[(i * 3 + Math.floor(i / 7)) % BG_RELATIONS.length];
  const v = BG_VALUES[(i * 5 + Math.floor(i / 11)) % BG_VALUES.length];
  paired(`archive ${e} carries ${v}.`, i % 2 ? 'logged.' : 'recorded.', [[e, r, v]], [e, r, v]);
}
assert((M.structure?.surface_episode_index?.episode_count || 0) >= BACKGROUND_EPISODES,
  'long symbolic history did not accumulate in the continuing individual');

// ---------------------------------------------------------------------------
// 2. A genuinely late relation/domain is introduced only after that life.
// ---------------------------------------------------------------------------
const REL_TONE = word('relTone');
const REL_LATE = word('relSignal');
const REL_STATUS = word('relStatus');
const ENTITIES = Array.from({ length: 6 }, () => word('entity'));
const TONES = Array.from({ length: 3 }, () => word('tone'));
const SIGNALS = Array.from({ length: 3 }, () => word('signal'));
const STATUSES = Array.from({ length: 3 }, () => word('status'));
const toneIx = [0, 0, 1, 1, 2, 2];
const signalIx = [0, 1, 0, 2, 1, 2];

assert(!(M.knowledge?.facts || []).some(f => [REL_TONE, REL_LATE, REL_STATUS].includes(f.relation)),
  'held-out late ontology existed before late schooling');

for (let round = 0; round < 3; round++) {
  for (let i = 0; i < ENTITIES.length; i++) {
    const e = ENTITIES[i], tone = TONES[toneIx[i]], signal = SIGNALS[signalIx[i]];
    paired(`${e} bears ${tone} while signals ${signal}.`, 'noted.', [
      [e, REL_TONE, tone], [e, REL_LATE, signal],
    ]);
    paired(`what tone marks ${e}?`, `tone ${tone}.`, [[e, REL_TONE, tone]]);
    paired(`what signal marks ${e}?`, `signal ${signal}.`, [[e, REL_LATE, signal]]);

    const status = STATUSES[signalIx[i]];
    paired(`what status marks ${e}?`, `status ${status}.`, [[e, REL_STATUS, status]]);
    paired(`tell me about ${e}.`, `${e} has tone ${tone}. signal ${signal}. status ${status}.`, [
      [e, REL_TONE, tone], [e, REL_LATE, signal], [e, REL_STATUS, status],
    ]);
  }
}
for (let k = 0; k < 3; k++) {
  const rows = ENTITIES.map((_, i) => i).filter(i => toneIx[i] === k);
  assert(new Set(rows.map(i => signalIx[i])).size > 1, 'held-out schooling accidentally lets tone identify signal');
}

// ---------------------------------------------------------------------------
// 3. Target truth is acquired only from recurrent raw surface contact.
// ---------------------------------------------------------------------------
const TARGET = word('target');
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: `meet ${TARGET}.`, output: 'noted.', channels: [TARGET] } });
assert(!(M.knowledge?.facts || []).some(f => f.subject === TARGET && [REL_TONE, REL_LATE, REL_STATUS].includes(f.relation)),
  'target semantics leaked before raw teaching');

const tone0 = TONES[2];
const tone1 = TONES[1];
const signal0 = SIGNALS[0];
const raw0 = `${TARGET} bears ${tone0} while signals ${signal0}.`;
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
assert(!currentHas(TARGET, REL_TONE, tone0) && !currentHas(TARGET, REL_LATE, signal0),
  'single raw target assertion self-warranted');
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
Mind.C(M, { surface: { input: raw0, output: 'noted.' } });
assert(currentHas(TARGET, REL_TONE, tone0), 'late raw tone did not settle into canonical M');
assert(currentHas(TARGET, REL_LATE, signal0), 'late raw signal did not settle into canonical M');

let seq = probe(`what signal marks ${TARGET}?`);
assert.strictEqual(seq?.canonical_grounding?.authority, 'canonical_M');
assert.strictEqual(seq.expression, `signal ${signal0}.`);

// Canonical reasoning must use the late raw-learned relation.
const derivedStatus = STATUSES[2];
Mind.C(M, { relations: { rules: [{
  id: word('lateRule'),
  premises: [[V('x'), REL_LATE, signal0]],
  conclusion: [V('x'), REL_STATUS, derivedStatus],
  categorical: true,
}] } });
assert(currentHas(TARGET, REL_STATUS, derivedStatus), 'canonical reasoning did not use the late raw-learned premise');
seq = probe(`what status marks ${TARGET}?`);
assert.strictEqual(seq?.canonical_grounding?.object, derivedStatus);
assert.strictEqual(seq.expression, `status ${derivedStatus}.`);

// Correct only tone through the same raw compound surface. Signal and its derived
// status are independent and must survive.
const raw1 = `${TARGET} bears ${tone1} while signals ${signal0}.`;
for (let i = 0; i < 3; i++) Mind.C(M, { surface: { input: raw1, output: 'noted.' } });
assert(!currentHas(TARGET, REL_TONE, tone0), 'superseded late tone remained current');
assert(currentHas(TARGET, REL_TONE, tone1), 'late raw correction did not settle');
assert(currentHas(TARGET, REL_LATE, signal0), 'independent late signal was lost during tone correction');
assert(currentHas(TARGET, REL_STATUS, derivedStatus), 'derived status was lost during unrelated correction');

seq = probe(`tell me about ${TARGET}.`);
assert.strictEqual(seq?.canonical_grounding?.authority, 'canonical_M');
assert(seq.expression?.includes(tone1), 'broad discourse did not follow corrected tone');
assert(!seq.expression?.includes(tone0), 'broad discourse replayed superseded tone');
assert(seq.expression?.includes(signal0), 'broad discourse lost late signal');
assert(seq.expression?.includes(derivedStatus), 'broad discourse lost canonical derived status');

const rawHistory = (M.knowledge?.facts || []).filter(f => f.relation === 'ρ:input_raw' && (f.object === raw0 || f.object === raw1));
assert(rawHistory.length >= 6, 'exact late raw history was not retained');

// ---------------------------------------------------------------------------
// 4. The same symbolic life continues directly into novel raw numeric learning.
// ---------------------------------------------------------------------------
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
assert(dependence, 'same long-lived individual did not discover the later raw numeric relation');

const novel = rnd() * 4 - 2;
const expected = scale * novel + offset;
Mind.C(M, { frame: [novel, null, concern] });
assert.strictEqual(M.contacts.at(-1)[1], null, 'numeric completion rewrote unobserved contact');
assert.strictEqual(M.current?.observed?.p1, undefined, 'numeric completion fabricated observation');
assert(M.current?.inferred?.includes('p1') && Number.isFinite(M.current?.completed?.p1),
  'same individual did not complete the later missing numeric target');
assert(Math.abs(M.current.completed.p1 - expected) < 1e-8,
  'later numeric completion does not follow the learned transformation');

// Earlier symbolic life is still present after the numerical domain arrives.
assert((M.knowledge?.facts || []).some(f => f.relation === 'ρ:input_raw' && f.object === raw0),
  'earlier symbolic contact disappeared after numeric learning');
for (const forbidden of ['language_state', 'memory_state', 'semantic_dictionary', 'response_table', 'planner', 'truth_ledger', 'numeric_model', 'world_model'])
  assert.strictEqual(M[forbidden], undefined, `parallel authority appeared: ${forbidden}`);

console.log(JSON.stringify({
  freeze_verified_by_workflow: true,
  runtime_generated_ontology: true,
  one_persistent_M: M.whole === 1,
  one_C_entrypoint: true,
  unrelated_symbolic_history_before_late_domain: BACKGROUND_EPISODES,
  late_relation_learned_after_long_history: true,
  target_truth_learned_from_raw_surface_only: true,
  proposal_did_not_self_warrant: true,
  canonical_reasoning_used_late_learned_relation: true,
  selective_late_correction_preserved_independent_relations: true,
  broad_discourse_followed_current_canonical_M: true,
  later_raw_numeric_relation_learned_and_completed: true,
  exact_earlier_contact_retained: true,
  parallel_cognitive_authority: false,
  certification_scope: 'frozen long-life symbolic-to-numeric cross-domain continuation',
}, null, 2));
console.log('POST-FREEZE LONG-LIFE CROSS-DOMAIN CERTIFICATION: PASS');
