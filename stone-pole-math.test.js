'use strict';

// Stone-pole mathematical-equivalence gate.
// Human pole names are evaluator keys and appear naturally in English teaching
// utterances, but F receives no semantic relation label, no explicit equivalence,
// and no Stone coordinate as the answer. Each example gets a fresh opaque id.
// Structured primer facts use lower-level relational content from the Stone's
// own definitions; the mathematical projection must recover a stable predicate.

const { one, F } = require('./universal-language');
const { relationalEquivalent } = require('./relational-math');

const families = [
  {
    key: 'empathy',
    train: [
      'empathy is concern for affected welfare',
      'care about what happens to those affected',
      'affected welfare matters to the judgment'
    ],
    holdout: 'empathy',
    facts: [
      ['orientation', 'carries', 'concern'],
      ['concern', 'directed_to', 'affected_welfare'],
      ['affected_welfare', 'materially_relevant_to', 'referent']
    ]
  },
  {
    key: 'practicality',
    train: [
      'practicality is real world constraint',
      'what reality permits or prevents constrains action',
      'cost risk effort time and irreversibility bound what can be done'
    ],
    holdout: 'practicality',
    facts: [
      ['orientation', 'bounded_by', 'real_world_constraint'],
      ['real_world_constraint', 'bounds', 'action'],
      ['real_world_constraint', 'bounds', 'consequence']
    ]
  },
  {
    key: 'knowledge',
    train: [
      'knowledge is informational grounding',
      'information supplies what is represented as actually the case',
      'grounded information represents the referent'
    ],
    holdout: 'knowledge',
    facts: [
      ['represented_reality', 'grounded_by', 'information'],
      ['information', 'about', 'referent'],
      ['information', 'answers_to', 'actuality']
    ]
  },
  {
    key: 'wisdom',
    train: [
      'wisdom is contextual discernment',
      'interpret grounded information in context and proportion',
      'recognize limits implications consequences and application'
    ],
    holdout: 'wisdom',
    facts: [
      ['interpretation', 'takes_input', 'grounded_information'],
      ['interpretation', 'weighs', 'context'],
      ['interpretation', 'recognizes', 'limits'],
      ['interpretation', 'preserves', 'proportion'],
      ['interpretation', 'carries_forward', 'implication'],
      ['interpretation', 'governs', 'application']
    ]
  },
  {
    key: 'answerability',
    train: [
      'answerability leaves the stance governed by materially relevant reality',
      'relevant reality remains able to correct the orientation',
      'evidence contradiction consequence and correction may revise what is held'
    ],
    holdout: 'answerability',
    facts: [
      ['materially_relevant_reality', 'governs', 'orientation'],
      ['materially_relevant_reality', 'can_revise', 'orientation'],
      ['correction', 'retains_authority_over', 'orientation']
    ]
  },
  {
    key: 'insulation',
    train: [
      'insulation makes reality preserve the stance',
      'the existing orientation governs what reality is admitted',
      'correction is reframed or subordinated to the protected orientation'
    ],
    holdout: 'insulation',
    facts: [
      ['orientation', 'governs', 'admission_of_reality'],
      ['orientation', 'governs', 'interpretation_of_reality'],
      ['admission_of_reality', 'serves', 'orientation_preservation'],
      ['correction', 'subordinated_to', 'orientation']
    ]
  },
  {
    key: 'absence',
    train: [
      'absence means no developed orientation toward the referent',
      'at null no relationship with that referent has formed',
      'before development there is no formed stance toward that reality'
    ],
    holdout: 'absence',
    facts: [
      ['entity_referent_pair', 'developed_orientation', false],
      ['entity_referent_pair', 'formed_relationship', false],
      ['entity_referent_pair', 'relation_cardinality', 0]
    ]
  }
];

const context = { domain: 'judgment', semantic_space: 'stone', referent: 'declared' };
const oid = (fi, ei) => `§stone${String(fi + 1).padStart(2, '0')}.${ei + 1}`;
const top = U => U.current?.resolution?.components?.[0]?.relation || null;
function exactWhole(U) {
  return U.encounters.every(e => {
    const r = e.resolution;
    if (!r) return false;
    const total = (r.components || []).reduce((s, x) => s + x.mass, 0) + (r.unknown_mass ?? 1);
    return Math.abs(total - 1) < 1e-7;
  });
}

async function main() {
  const U = one({ config: { min_equivalence_support: 1, history_limit: 2048 } });
  const ids = new Map();

  for (let fi = 0; fi < families.length; fi++) {
    const f = families[fi], group = [];
    for (let ei = 0; ei < f.train.length; ei++) {
      const id = oid(fi, ei); group.push(id);
      await F(U, {
        utterance: f.train[ei],
        context,
        facts: f.facts,
        relations: [{ id }],
        source: 'stone-pole-primer'
      });
    }
    ids.set(f.key, group);
  }

  const canonical = new Map();
  let merged = 0;
  for (const f of families) {
    const cs = ids.get(f.key).map(id => U.canonical[id] || id);
    if (new Set(cs).size === 1) merged++;
    canonical.set(f.key, cs[0]);
  }
  if (merged !== families.length) throw new Error(`only ${merged}/${families.length} Stone pole families stabilized`);
  if (new Set(canonical.values()).size !== families.length) throw new Error('distinct Stone poles collapsed into one canonical relation');

  const math = {};
  const forbidden = families.map(f => f.key);
  for (const f of families) {
    const m = relationalEquivalent(U, canonical.get(f.key));
    if (!m || m.status !== 'grounded-relational-equivalent') throw new Error(`${f.key}: no stable relational mathematical equivalent`);
    if (m.whole !== 1 || !m.signature || !m.constraints.length) throw new Error(`${f.key}: incomplete mathematical anatomy`);
    const anatomyText = JSON.stringify({ formula: m.formula, relations: m.relations, vertices: m.vertices }).toLowerCase();
    const leaked = forbidden.filter(word => anatomyText.includes(word));
    if (leaked.length) throw new Error(`${f.key}: target-pole label leaked into anatomy: ${leaked.join(',')}`);
    math[f.key] = m;
  }

  const signatures = Object.fromEntries(families.map(f => [f.key, math[f.key].signature]));
  if (new Set(Object.values(signatures)).size !== families.length) throw new Error('two Stone poles share the same full relational anatomy');

  let hits = 0;
  const holdouts = [];
  for (const f of families) {
    await F(U, { utterance: f.holdout, context });
    const predicted = top(U), expected = canonical.get(f.key);
    const m = predicted ? relationalEquivalent(U, predicted) : null;
    const hit = predicted === expected && m?.signature === math[f.key].signature;
    hits += hit ? 1 : 0;
    holdouts.push({ pole: f.key, english: f.holdout, predicted, expected, signature: m?.signature || null, formula: m?.formula || null, hit });
  }
  if (hits !== families.length) throw new Error(`only ${hits}/${families.length} Stone words reached their mathematical anatomy`);

  const answerability = math.answerability;
  const insulation = math.insulation;
  const ansLegend = JSON.stringify({ r: answerability.relations, v: answerability.vertices });
  const insLegend = JSON.stringify({ r: insulation.relations, v: insulation.vertices });
  if (!ansLegend.includes('materially_relevant_reality') || !ansLegend.includes('orientation')) throw new Error('answerability lost reality -> orientation structure');
  if (!insLegend.includes('orientation') || !insLegend.includes('admission_of_reality')) throw new Error('insulation lost orientation -> admitted-reality structure');

  const absence = math.absence;
  const absenceEquations = absence.constraints.map(c => c.equation).join(' ∧ ');
  if (!absenceEquations.includes('=0')) throw new Error('absence did not reduce to explicit zero relational properties');

  const report = {
    stone_poles: families.length,
    opaque_training_contacts: families.length * 3,
    semantic_relation_labels_given_to_F: 0,
    explicit_equivalences_given_to_F: 0,
    stabilized_poles: merged,
    mathematical_equivalents_verified: Object.keys(math).length,
    held_out_english_to_math_hits: hits,
    held_out_total: families.length,
    all_poles_mathematically_distinct: new Set(Object.values(signatures)).size === families.length,
    exact_resolution_whole_equals_one: exactWhole(U),
    signatures,
    formulas: Object.fromEntries(families.map(f => [f.key, math[f.key].formula])),
    holdouts
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.exact_resolution_whole_equals_one) throw new Error('whole=1 resolution failed');
  console.log('STONE POLE MATHEMATICAL EQUIVALENCE TEST: PASS');
}

main().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
