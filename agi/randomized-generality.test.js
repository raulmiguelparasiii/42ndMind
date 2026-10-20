'use strict';

const assert = require('assert');
const Mind = require('./one-live-blueprint.js');

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0x100000000);
}
function word(random, prefix) {
  const a = 'bcdfghjklmnpqrstvwxyz', b = 'aeiou';
  let out = prefix;
  for (let i = 0; i < 4; i++) out += (i % 2 ? b : a)[Math.floor(random() * (i % 2 ? b.length : a.length))];
  return out;
}
function shuffle(xs, random) {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

for (let seed = 1; seed <= 8; seed++) {
  const random = rng(9000 + seed * 101);
  const M = Mind.one(1, 1);
  const relA = word(random, 'r');
  const relB = word(random, 's');
  const relLate = word(random, 't');
  const entities = Array.from({ length: 8 }, (_, i) => word(random, `e${i}`));
  const valsA = [word(random, 'a'), word(random, 'b'), word(random, 'c')];
  const valsB = [word(random, 'd'), word(random, 'f'), word(random, 'g')];
  const valsLate = [word(random, 'h'), word(random, 'j'), word(random, 'k')];
  const entityCodes = entities.map((_, i) => 1000 + seed * 100 + i);
  const aCodes = valsA.map((_, i) => 2000 + seed * 100 + i);
  const bCodes = valsB.map((_, i) => 3000 + seed * 100 + i);
  const lateCodes = valsLate.map((_, i) => 4000 + seed * 100 + i);

  // Independent crossings: neither A nor B is a function of the other, so the
  // physical role is objectively identifiable rather than merely equivalent.
  const aPattern = [0, 0, 1, 1, 2, 2, 0, 1];
  const bPattern = [0, 1, 0, 1, 0, 1, 2, 2];
  const latePattern = [1, 2, 0, 2, 1, 0, 0, 1];

  const channelOrder = shuffle(['entity', 'a', 'b'], random);
  function channels(entity, a, b, late) {
    const map = { entity, a, b };
    const out = channelOrder.map(k => map[k]);
    if (late !== undefined) out.push(late);
    return out;
  }
  const channelIndex = Object.fromEntries(channelOrder.map((x, i) => [x, i]));

  const rows = entities.map((name, i) => ({
    name,
    entity: entityCodes[i],
    av: valsA[aPattern[i]], ac: aCodes[aPattern[i]],
    bv: valsB[bPattern[i]], bc: bCodes[bPattern[i]],
    lv: valsLate[latePattern[i]], lc: lateCodes[latePattern[i]],
  }));

  function live(input, output, ch) { Mind.C(M, { surface: { input, output, channels: ch } }); }
  function ask(input) {
    const q = structuredClone(M);
    Mind.C(q, { surface: { input } });
    return q.current.sequence;
  }

  for (let round = 0; round < 3; round++) for (const r of rows) {
    live(`${r.name} ${relA} ${r.av}.`, `it is ${r.av}.`, channels(r.entity, r.ac, r.bc));
    live(`${r.name} ${relB} ${r.bv}.`, `it is ${r.bv}.`, channels(r.entity, r.ac, r.bc));
  }
  for (let round = 0; round < 3; round++) for (const r of rows.slice(1)) {
    live(`what ${relA} is ${r.name}?`, `it is ${r.av}.`, channels(r.entity, r.ac, r.bc));
    live(`what ${relB} is ${r.name}?`, `it is ${r.bv}.`, channels(r.entity, r.ac, r.bc));
  }

  const held = rows[0];
  const qa = ask(`what ${relA} is ${held.name}?`);
  const qb = ask(`${held.name} is what ${relB}?`);
  assert.strictEqual(qa.expression, `it is ${held.av}.`, `seed ${seed}: randomized role A failed`);
  assert.strictEqual(qb.expression, `it is ${held.bv}.`, `seed ${seed}: randomized role B failed`);
  assert(qa.output_roles.some(x => x.position === 2 && x.channel === channelIndex.a), `seed ${seed}: A role tied to wrong channel`);
  assert(qb.output_roles.some(x => x.position === 2 && x.channel === channelIndex.b), `seed ${seed}: B role tied to wrong channel`);

  for (let round = 0; round < 3; round++) for (const r of rows) {
    live(`${r.name} ${relLate} ${r.lv}.`, `it is ${r.lv}.`, channels(r.entity, r.ac, r.bc, r.lc));
  }
  for (let round = 0; round < 3; round++) for (const r of rows.slice(1)) {
    live(`what ${relLate} is ${r.name}?`, `it is ${r.lv}.`, channels(r.entity, r.ac, r.bc, r.lc));
  }
  const late = ask(`what ${relLate} is ${held.name}?`);
  assert.strictEqual(late.expression, `it is ${held.lv}.`, `seed ${seed}: late relation failed`);
  assert(late.output_roles.some(x => x.position === 2 && x.channel === 3), `seed ${seed}: late channel role not learned`);

  const replacement = word(random, 'z');
  const replacementCode = 9000 + seed;
  for (let round = 0; round < 3; round++) {
    live(`${held.name} ${relA} ${replacement}.`, `it is ${replacement}.`, channels(held.entity, replacementCode, held.bc, held.lc));
  }
  const corrected = ask(`what ${relA} is ${held.name}?`);
  assert.strictEqual(corrected.expression, `it is ${replacement}.`, `seed ${seed}: randomized correction failed`);
}

console.log(JSON.stringify({
  independent_lives: 8,
  runtime_generated_vocabulary: true,
  randomized_physical_channel_order: true,
  independently_identifiable_relation_roles: true,
  heldout_entity_relation_composition: true,
  new_relation_and_channel_added_after_development: true,
  correction_without_reset: true,
  C_changed_between_lives: false,
  unrestricted_AGI_demonstrated: false,
}, null, 2));
console.log('RANDOMIZED GENERALITY FALSIFICATION: PASS');
