'use strict';

const fs = require('fs');
const path = require('path');
const { one, F } = require('./universal-language');

const STATE_PATH = process.env.STATE_PATH || path.join(__dirname, 'state', 'universal-language-english.json');
const RESET = process.env.RESET_ENGLISH === '1';

function loadState() {
  if (!RESET && fs.existsSync(STATE_PATH)) return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  return one({ config: { history_limit: 20000, fixed_point_passes: 4, resolve_iterations: 45 } });
}

function saveState(U) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(U, null, 2));
}

const S = (id, label, evidence, examples, extra = {}) => ({ id, label, evidence, examples, ...extra });

const EXEC = {
  open: { before: { open: false }, after: { open: true }, action: 'open' },
  close: { before: { open: true }, after: { open: false }, action: 'close' },
  start: { before: { running: false }, after: { running: true }, action: 'start' },
  stop: { before: { running: true }, after: { running: false }, action: 'stop' },
  show: { before: { visible: false }, after: { visible: true }, action: 'show' },
  hide: { before: { visible: true }, after: { visible: false }, action: 'hide' },
  create: { before: { exists: false }, after: { exists: true }, action: 'create' },
  delete: { before: { exists: true }, after: { exists: false }, action: 'delete' },
  copy: { before: { source_exists: true, copy_exists: false }, after: { source_exists: true, copy_exists: true }, action: 'copy' },
  move: { before: { source_exists: true, destination_exists: false }, after: { source_exists: false, destination_exists: true }, action: 'move' },
  increase: { before: { value: 2 }, after: { value: 3 }, action: 'increase' },
  decrease: { before: { value: 3 }, after: { value: 2 }, action: 'decrease' },
};

const SPECS = [
  S('r:open-state', 'open state', ['sem:state:closed>open'], ['open the door', 'please open this panel', 'unseal the hatch'], { context: { object_type: 'barrier' }, execution: EXEC.open }),
  S('r:close-state', 'closed state', ['sem:state:open>closed'], ['close the door', 'please shut this panel', 'seal the hatch'], { context: { object_type: 'barrier' }, execution: EXEC.close }),
  S('r:start-process', 'start process', ['sem:process:inactive>active'], ['start the program', 'launch the application', 'begin the process'], { context: { object_type: 'process' }, execution: EXEC.start }),
  S('r:stop-process', 'stop process', ['sem:process:active>inactive'], ['stop the program', 'quit the application', 'end the process'], { context: { object_type: 'process' }, execution: EXEC.stop }),
  S('r:show-interface', 'make visible', ['sem:visibility:hidden>visible'], ['show the window', 'display the panel', 'make the interface visible'], { context: { object_type: 'interface' }, execution: EXEC.show }),
  S('r:hide-interface', 'make hidden', ['sem:visibility:visible>hidden'], ['hide the window', 'conceal the panel', 'make the interface invisible'], { context: { object_type: 'interface' }, execution: EXEC.hide }),
  S('r:create-object', 'create object', ['sem:existence:absent>present'], ['create a file', 'make a new document', 'generate a record'], { context: { object_type: 'persistent-object' }, execution: EXEC.create }),
  S('r:delete-object', 'delete object', ['sem:existence:present>absent'], ['delete the file', 'remove the document', 'erase the record'], { context: { object_type: 'persistent-object' }, execution: EXEC.delete }),
  S('r:copy-object', 'copy object', ['sem:source:preserved', 'sem:duplicate:created'], ['copy the file', 'duplicate the document', 'make a copy of the record'], { context: { object_type: 'persistent-object' }, execution: EXEC.copy }),
  S('r:move-object', 'move object', ['sem:source:vacated', 'sem:destination:occupied'], ['move the file', 'relocate the document', 'transfer the record to another folder'], { context: { object_type: 'persistent-object' }, execution: EXEC.move }),
  S('r:increase', 'increase magnitude', ['sem:order:greater-after'], ['increase the volume', 'raise the value', 'make the number larger'], { context: { quantity: 'magnitude' }, execution: EXEC.increase }),
  S('r:decrease', 'decrease magnitude', ['sem:order:less-after'], ['decrease the volume', 'lower the value', 'make the number smaller'], { context: { quantity: 'magnitude' }, execution: EXEC.decrease }),

  S('r:possession', 'possession', ['sem:relation:possess'], ['I have the key', 'she owns the car', 'they possess the document'], { facts: [['agent', 'possesses', 'object']] }),
  S('r:give', 'transfer possession', ['sem:transfer:ownership'], ['give him the book', 'hand her the key', 'transfer the object to them'], { facts: [['source', 'transfers_possession_to', 'recipient']] }),
  S('r:lend', 'temporary transfer from owner', ['sem:transfer:temporary-out'], ['lend me the book', 'she loaned him the car', 'let them borrow the tool'], { facts: [['owner', 'temporarily_transfers_to', 'borrower']] }),
  S('r:borrow', 'temporary receipt from owner', ['sem:transfer:temporary-in'], ['borrow the book from her', 'he borrowed my car', 'take the tool on loan'], { facts: [['borrower', 'temporarily_receives_from', 'owner']] }),

  S('r:desire', 'desire', ['sem:attitude:toward-target'], ['I want water', 'she desires peace', 'they would like a better result'], { facts: [['agent', 'directed_toward', 'target']] }),
  S('r:need', 'need', ['sem:requirement:goal-dependent'], ['I need water', 'she requires more time', 'they need an answer'], { facts: [['goal', 'requires', 'condition']] }),
  S('r:preference', 'preference', ['sem:ranking:preferred'], ['I prefer tea to coffee', 'she would rather stay home', 'they favor the first option'], { facts: [['agent', 'ranks_above', 'alternative']] }),
  S('r:intention', 'intention', ['sem:commitment:future-action'], ['I intend to leave', 'she plans to call', 'they mean to finish the work'], { facts: [['agent', 'committed_toward', 'future_action']] }),
  S('r:belief', 'belief', ['sem:epistemic:held-true'], ['I believe the claim', 'she thinks it will rain', 'they accept that the report is accurate'], { facts: [['agent', 'holds_true', 'proposition']] }),
  S('r:knowledge', 'knowledge', ['sem:epistemic:warranted-actuality'], ['I know the answer', 'she knows that the door is open', 'they are aware of the result'], { facts: [['agent', 'has_warranted_contact_with', 'proposition']] }),
  S('r:uncertainty', 'uncertainty', ['sem:epistemic:unresolved'], ['I am not sure', 'she is uncertain about the result', 'they do not know which option is correct'], { facts: [['agent', 'leaves_unresolved', 'alternatives']] }),
  S('r:possibility', 'possibility', ['sem:modal:possible'], ['it may rain', 'this could work', 'perhaps the result will change'], { facts: [['proposition', 'modal_status', 'possible']] }),
  S('r:necessity', 'necessity', ['sem:modal:necessary'], ['it must happen', 'this is required', 'the result has to follow'], { facts: [['proposition', 'modal_status', 'necessary']] }),

  S('r:cause', 'causal relation', ['sem:logic:cause'], ['the heat caused the ice to melt', 'pressing the switch made the light turn on', 'the impact produced the crack'], { facts: [['cause', 'brings_about', 'effect']] }),
  S('r:condition', 'conditional relation', ['sem:logic:if-then'], ['if it rains then the ground gets wet', 'if you press the button the system starts', 'provided the key fits the lock opens'], { facts: [['condition', 'licenses', 'consequence']] }),
  S('r:negation', 'negation', ['sem:logic:not'], ['the door is not open', 'she did not leave', 'this is not the answer'], { facts: [['proposition', 'polarity', 'negative']] }),
  S('r:question', 'question', ['sem:speech-act:request-information'], ['where is the key?', 'did she leave?', 'what happened here?'], { facts: [['speaker', 'requests_information_about', 'issue']] }),
  S('r:request', 'request', ['sem:speech-act:request-action'], ['please open the door', 'could you send the file?', 'would you help me?'], { facts: [['speaker', 'requests_action_from', 'addressee']] }),
  S('r:command', 'command', ['sem:speech-act:directive'], ['open the door now', 'send the file', 'stop the process'], { facts: [['speaker', 'directs_action_by', 'addressee']] }),
  S('r:permission', 'permission', ['sem:norm:allowed'], ['you may leave', 'she is allowed to enter', 'they have permission to use it'], { facts: [['action', 'norm_status', 'permitted']] }),
  S('r:obligation', 'obligation', ['sem:norm:required'], ['you must leave', 'she is required to report it', 'they have to finish the task'], { facts: [['action', 'norm_status', 'obligatory']] }),

  S('r:greater-than', 'greater than', ['sem:comparison:greater'], ['five is greater than three', 'this box is heavier than that one', 'she is taller than him'], { facts: [['left', 'greater_than', 'right']] }),
  S('r:less-than', 'less than', ['sem:comparison:less'], ['three is less than five', 'this box is lighter than that one', 'she is shorter than him'], { facts: [['left', 'less_than', 'right']] }),
  S('r:equality', 'equality', ['sem:comparison:equal'], ['two plus two equals four', 'these values are equal', 'both lengths are the same'], { facts: [['left', 'equal_to', 'right']] }),
  S('r:before', 'temporal before', ['sem:time:before'], ['breakfast comes before lunch', 'she arrived before he left', 'first the light flashed then the sound came'], { facts: [['event_a', 'before', 'event_b']] }),
  S('r:after', 'temporal after', ['sem:time:after'], ['lunch comes after breakfast', 'she arrived after he left', 'the sound came after the light flashed'], { facts: [['event_a', 'after', 'event_b']] }),
  S('r:inside', 'spatial inside', ['sem:space:inside'], ['the key is inside the box', 'the cat is in the room', 'the file is within the folder'], { facts: [['object', 'inside', 'container']] }),
  S('r:above', 'spatial above', ['sem:space:above'], ['the lamp is above the table', 'the shelf is over the desk', 'the label sits higher than the button'], { facts: [['object', 'above', 'reference']] }),
  S('r:near', 'spatial near', ['sem:space:near'], ['the chair is near the table', 'the store is close to the station', 'the two objects are nearby'], { facts: [['object', 'near', 'reference']] }),
  S('r:part-of', 'part whole relation', ['sem:mereology:part-of'], ['the wheel is part of the car', 'the chapter belongs to the book', 'the button is a component of the interface'], { facts: [['part', 'part_of', 'whole']] }),
  S('r:identity', 'identity relation', ['sem:identity:same-entity'], ['Clark Kent is Superman', 'this is the same file as before', 'the two names refer to one person'], { facts: [['name_a', 'same_referent_as', 'name_b']] }),
  S('r:similarity', 'similarity', ['sem:comparison:similar'], ['these shapes are similar', 'the two plans resemble each other', 'her answer is like mine'], { facts: [['left', 'similar_to', 'right']] }),
  S('r:contrast', 'contrast', ['sem:comparison:contrast'], ['these outcomes differ', 'the two plans are unlike each other', 'his answer contrasts with mine'], { facts: [['left', 'contrasts_with', 'right']] }),

  S('r:promise', 'promise', ['sem:social:commitment-to-other'], ['I promise I will return', 'she promised to call', 'they gave their word that they would finish'], { facts: [['speaker', 'undertakes_commitment_to', 'other']] }),
  S('r:apology', 'apology', ['sem:social:acknowledge-wrong'], ['I am sorry for being late', 'she apologized for the mistake', 'they said sorry for what happened'], { facts: [['speaker', 'acknowledges_wrong_toward', 'other']] }),
];

const PARENTS = [
  ['r:state-change', 'state change', ['r:open-state','r:close-state','r:start-process','r:stop-process','r:show-interface','r:hide-interface','r:create-object','r:delete-object','r:increase','r:decrease']],
  ['r:transfer', 'transfer relation', ['r:give','r:lend','r:borrow','r:move-object','r:copy-object']],
  ['r:attitude', 'attitude toward a target', ['r:desire','r:need','r:preference','r:intention']],
  ['r:epistemic', 'epistemic relation', ['r:belief','r:knowledge','r:uncertainty']],
  ['r:modal', 'modal relation', ['r:possibility','r:necessity','r:permission','r:obligation']],
  ['r:speech-act', 'speech act', ['r:question','r:request','r:command','r:promise','r:apology']],
  ['r:comparison', 'comparison relation', ['r:greater-than','r:less-than','r:equality','r:similarity','r:contrast']],
  ['r:temporal', 'temporal relation', ['r:before','r:after']],
  ['r:spatial', 'spatial relation', ['r:inside','r:above','r:near']],
];

const PROBES = [
  ['please shut the door', 'r:close-state', { object_type: 'barrier' }],
  ['launch this process', 'r:start-process', { object_type: 'process' }],
  ['make the panel visible', 'r:show-interface', { object_type: 'interface' }],
  ['erase this file', 'r:delete-object', { object_type: 'persistent-object' }],
  ['duplicate this file', 'r:copy-object', { object_type: 'persistent-object' }],
  ['make the value lower', 'r:decrease', { quantity: 'magnitude' }],
  ['she owns this house', 'r:possession'],
  ['let me borrow your pen', 'r:lend'],
  ['I would like an answer', 'r:desire'],
  ['we require more time', 'r:need'],
  ['I would rather choose the first', 'r:preference'],
  ['they plan to return', 'r:intention'],
  ['we think the claim is true', 'r:belief'],
  ['I am aware that it happened', 'r:knowledge'],
  ['perhaps this will work', 'r:possibility'],
  ['this has to follow', 'r:necessity'],
  ['what is the answer?', 'r:question'],
  ['could you open this?', 'r:request'],
  ['you are allowed to enter', 'r:permission'],
  ['this number is larger than that one', 'r:greater-than'],
  ['the meeting happened earlier than lunch', 'r:before'],
  ['the key is in the container', 'r:inside'],
  ['the wheel belongs to the larger machine', 'r:part-of'],
  ['the two proposals resemble one another', 'r:similarity'],
  ['I give you my word that I will return', 'r:promise'],
  ['she said sorry for the error', 'r:apology'],
];

async function teach(U) {
  U.curriculum = U.curriculum || {};
  if (U.curriculum.english_v1) return;
  for (const spec of SPECS) {
    for (const example of spec.examples) {
      const e = typeof example === 'string' ? { text: example } : example;
      await F(U, {
        utterance: e.text,
        context: e.context || spec.context || null,
        execution: e.execution || spec.execution || null,
        facts: e.facts || spec.facts || null,
        relations: [{
          id: spec.id,
          label: spec.label,
          evidence: spec.evidence,
          children: spec.children || [],
          parents: spec.parents || [],
        }],
      });
    }
  }
  for (const [id, label, children] of PARENTS) {
    await F(U, {
      utterance: label,
      relations: [{ id, label, evidence: [`sem:family:${id.slice(2)}`], children }],
    });
  }
  U.curriculum.english_v1 = { completed_at_step: U.step, relations: SPECS.length + PARENTS.length, training_utterances: SPECS.reduce((n, s) => n + s.examples.length, 0) + PARENTS.length };
}

function hit(component, expected) {
  return !!component && (component.relation === expected || (component.members || []).includes(expected));
}

async function benchmark(U) {
  let top1 = 0, top3 = 0;
  const rows = [];
  for (const [utterance, expected, context] of PROBES) {
    await F(U, { utterance, context: context || null });
    const comps = U.current.resolution.components || [];
    const oneHit = hit(comps[0], expected);
    const threeHit = comps.slice(0, 3).some(c => hit(c, expected));
    if (oneHit) top1++;
    if (threeHit) top3++;
    rows.push({ utterance, expected, top: comps[0]?.labels?.[0] || comps[0]?.relation || null, top1: oneHit, top3: threeHit, unknown: U.current.resolution.unknown_mass });
  }
  const result = {
    probes: PROBES.length,
    top1,
    top3,
    top1_rate: top1 / PROBES.length,
    top3_rate: top3 / PROBES.length,
    mean_unknown: rows.reduce((s, r) => s + r.unknown, 0) / rows.length,
    rows,
  };
  U.benchmarks = U.benchmarks || {};
  U.benchmarks.english_v1 = result;
  return result;
}

(async () => {
  const U = loadState();
  await teach(U);
  const result = await benchmark(U);
  saveState(U);
  console.log('ENGLISH CORRELATION V1');
  console.log('training_utterances =', U.curriculum.english_v1.training_utterances);
  console.log('seeded_relations =', U.curriculum.english_v1.relations);
  console.log('raw_relations =', U.metrics.relations);
  console.log('canonical_relations =', U.metrics.canonical_relations);
  console.log('encounters =', U.metrics.encounters);
  console.log('top1 =', `${result.top1}/${result.probes}`, result.top1_rate.toFixed(4));
  console.log('top3 =', `${result.top3}/${result.probes}`, result.top3_rate.toFixed(4));
  console.log('mean_probe_unknown =', result.mean_unknown.toFixed(6));
  console.log('closure =', U.metrics.bar);
  for (const row of result.rows) console.log(`${row.top1 ? 'PASS' : row.top3 ? 'TOP3' : 'MISS'}\t${row.utterance}\t=> ${row.top}\texpected ${row.expected}\tunknown=${row.unknown.toFixed(4)}`);
  if (result.top3_rate < 0.70) throw new Error(`English correlation benchmark too weak: top3=${result.top3_rate}`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
