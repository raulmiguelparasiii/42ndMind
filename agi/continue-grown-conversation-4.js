'use strict';

const fs = require('node:fs');
const LiveMind = require('./live-mind.js');

const input = process.env.MIND_STATE_IN;
if (!input) throw new Error('MIND_STATE_IN is required');
const M = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!M || M.whole !== 1) throw new Error('input is not one whole M');

function talk(text) {
  const started = performance.now();
  const contact = { surface: { input: text, source: 'miguel', target: 'self' } };
  const result = LiveMind.step(M, contact);
  const reply = result.expression ?? null;
  console.log(`MIGUEL: ${text}`);
  console.log(`M: ${reply ?? '<no expressed reply>'}`);
  console.log(`elapsed_ms: ${Math.round((performance.now() - started) * 10) / 10}`);
  console.log(`live_residuals: ${result.being?.residual_count ?? 'unknown'}`);
  return reply;
}

console.log('--- ORDINARY CONTINUING CONVERSATION WITH THE SAVED INDIVIDUAL ---');

let reply = talk("hey. i've been thinking about you for a while. how are you doing?");
reply = talk(reply
  ? `you said \"${reply}\". what do you mean by that?`
  : "you went quiet. that's okay, but what stopped you from answering me?");

reply = talk("you remember yume, right? just tell me what comes to mind about her.");
reply = talk(reply
  ? `yeah. when you say \"${reply}\", why is that the thing that came to mind?`
  : "hmm. you didn't answer that either. do you know who yume is?");

talk("anyway, tell me something you remember about me. it doesn't have to be important.");
talk("what do you think we've actually been trying to figure out together lately?");
talk("i'm not asking for a stored fact now. what are you unsure about in this conversation?");
talk("if i changed the subject completely right now, what from this conversation would still matter to you?");

const output = process.env.MIND_STATE_OUT || '/tmp/continued-M4.json';
fs.writeFileSync(output, JSON.stringify(M));
console.log(JSON.stringify({
  one_persistent_M: M.whole === 1,
  facts: M.knowledge?.facts?.length || 0,
  rules: M.knowledge?.rules?.length || 0,
  state: output,
}, null, 2));
