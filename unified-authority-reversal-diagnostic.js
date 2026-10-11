'use strict';

const Mind = require('./one-mind.js');
const m = Mind.one(4, 2);
let frame = [0, 0, 255, 32, 24];
Mind.C(m, frame);

function advance(preferred) {
  const action = m.motor;
  let p0 = frame.at(-2) + 2;
  let p1 = frame.at(-1) + 1;
  if (action === preferred) { p0 -= 11; p1 -= 7; }
  else { p0 += 2; p1 += 2; }
  p0 = Math.max(1, Math.min(220, p0));
  p1 = Math.max(1, Math.min(220, p1));
  const t = m.experiences.length;
  frame = [t % 3, (t * 2) % 5, 255, p0, p1];
  Mind.C(m, frame);
  return action;
}

const first = [];
for (let i = 0; i < 20; i++) first.push(advance(2));
const second = [];
for (let i = 0; i < 24; i++) second.push(advance(1));

const actionPatterns = (m.structure.patterns || [])
  .filter(p => p.active !== false && p.target === 'action')
  .sort((a,b) => a.predictive_code_bits-b.predictive_code_bits || b.bits_saved-a.bits_saved || b.covered-a.covered)
  .slice(0, 20)
  .map(p => ({
    expected:p.expected,
    conditions:p.conditions,
    predictive_code_bits:p.predictive_code_bits,
    bits_saved:p.bits_saved,
    covered:p.covered,
    support:p.support,
    exceptions:p.exceptions,
    reliability:p.reliability,
  }));
const learnedActionRules = (m.knowledge.learned_rules || [])
  .filter(r => r.conclusion?.relation === 'action')
  .sort((a,b)=>(a.authority??Infinity)-(b.authority??Infinity))
  .slice(0,20)
  .map(r => ({id:r.id, expected:r.conclusion.object, premises:r.premises, authority:r.authority, source:r.source}));

console.log(JSON.stringify({
  first,
  first_late:first.slice(12),
  second,
  second_late:second.slice(14),
  current: m.current,
  motor:m.motor,
  action_patterns:actionPatterns,
  learned_action_rules:learnedActionRules,
  learned_rule_count:(m.knowledge.learned_rules||[]).length,
}, null, 2));
