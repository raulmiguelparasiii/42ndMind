'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function compactFact(fact) {
  return {
    subject: fact.subject,
    relation: fact.relation,
    object: fact.object,
    derived_from: fact.derived_from,
  };
}

function liveSnapshot(result) {
  const field = result.field || {};
  const cues = [...new Set((field.referential_cues || []).map(f => String(f.subject)))];
  const yume = (field.affected_facts || []).filter(f => String(f.subject) === 'yume').map(compactFact);
  const violin = (field.affected_facts || []).filter(f => String(f.subject) === 'violin').map(compactFact);
  const rules = (field.rules || []).map(r => String(r.id));
  return {
    referential_subjects: cues,
    yume_live: yume,
    violin_live: violin,
    participating_rules: rules,
    affected_count: (field.affected_facts || []).length,
    residual_count: result.being?.residual_count ?? null,
  };
}

function talk(text) {
  const started = performance.now();
  const contact = { surface: { input: text, source: 'miguel', target: 'self' } };
  const result = LiveMind.step(M, contact);
  const reply = result.expression ?? null;
  console.log(`\nMIGUEL: ${text}`);
  console.log(`M: ${reply ?? '<no expressed reply>'}`);
  console.log(`elapsed_ms: ${Math.round((performance.now() - started) * 10) / 10}`);
  console.log('LIVE:', JSON.stringify(liveSnapshot(result)));
  return reply;
}

console.log('--- ORDINARY CONTACT WITH THE SAME PERSISTED INDIVIDUAL ---');

let reply = talk('hey. yume crossed my mind again.');
reply = talk(reply
  ? `when you said "${reply}", what about yume made that come to mind?`
  : 'i am curious what the name yume means to you.');

talk('violin.');
talk('yume.');

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M5.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  state: output,
}, null, 2));
