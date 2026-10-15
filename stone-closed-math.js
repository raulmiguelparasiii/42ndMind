'use strict';

// Closed mathematical projection for the Stone's basic semantic structure.
// English terms appear only in the primer/legend. The live compiled object is
// an anonymous finite relational structure plus generic numeric operators.
// This is a universal-language experiment, not canonical 42ndMind cognition.

const EPS = 1e-12;
const stable = v => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
function hash32(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
const uniq = xs => [...new Set(xs)];

// The recursive semantic primer. The upper seven entries mirror the Stone's
// own definitions. Lower entries only unpack their terms into simpler
// relation/update structures. The compiler removes every English identifier.
const PRIMER = {
  empathy: [
    ['orientation','includes','concern'],
    ['concern','tracks','affected_welfare'],
    ['affected_welfare','depends_on','consequence'],
    ['consequence','affects','affected_entity'],
    ['concern','materially_relevant_to','orientation']
  ],
  practicality: [
    ['orientation','includes','constraint'],
    ['constraint','restricts','admissible_action'],
    ['constraint','restricts','admissible_consequence'],
    ['constraint','grounded_in','actuality']
  ],
  knowledge: [
    ['orientation','includes','information'],
    ['information','represents','referent_state'],
    ['information','grounded_by','contact'],
    ['contact','constrained_by','actuality']
  ],
  wisdom: [
    ['orientation','includes','interpretation'],
    ['interpretation','takes_input','information'],
    ['interpretation','conditions_on','context'],
    ['interpretation','preserves','limit'],
    ['interpretation','preserves','proportion'],
    ['interpretation','carries_forward','implication'],
    ['interpretation','maps_to','application'],
    ['implication','includes','anticipated_consequence']
  ],
  answerability: [
    ['relevant_reality','can_update','orientation'],
    ['contact','can_defeat','held_representation'],
    ['contradiction','can_update','orientation'],
    ['consequence','can_update','orientation'],
    ['constraint','can_update','orientation'],
    ['affected_welfare','can_update','orientation'],
    ['correction','has_authority_over','orientation']
  ],
  insulation: [
    ['orientation','controls','admitted_contact'],
    ['orientation','controls','interpreted_contact'],
    ['admitted_contact','selected_for','orientation_preservation'],
    ['interpreted_contact','mapped_to','orientation_preservation'],
    ['contradiction','subordinated_to','orientation_preservation'],
    ['correction','subordinated_to','orientation_preservation']
  ],
  absence: [
    ['entity_referent_pair','developed_orientation',false],
    ['entity_referent_pair','formed_relationship',false],
    ['entity_referent_pair','relation_cardinality',0]
  ],

  // Lower semantic ingredients. Each definition removes one layer of prose by
  // reducing it to generic incidence, update, set-restriction or scalar form.
  concern: [
    ['orientation','depends_on','affected_welfare'],
    ['affected_welfare','change_can_change','orientation']
  ],
  affected_welfare: [
    ['consequence','changes','affected_state'],
    ['affected_state','belongs_to','affected_entity'],
    ['affected_state','ordered_by','better_same_worse']
  ],
  consequence: [
    ['action','under','reality_state'],
    ['action_reality_pair','maps_to','post_state']
  ],
  constraint: [
    ['actuality','restricts','possibility_set'],
    ['possibility_set','contains','admissible_action'],
    ['possibility_set','contains','admissible_consequence']
  ],
  information: [
    ['representation','about','referent_state'],
    ['contact','restricts','compatible_representation']
  ],
  contact: [
    ['reality_state','maps_through','receptor'],
    ['receptor','yields','observation']
  ],
  actuality: [
    ['reality_state','member_of','live_reality_set'],
    ['live_reality_set','nonempty',true]
  ],
  interpretation: [
    ['information_context_pair','maps_to','represented_implication'],
    ['represented_implication','bounded_by','limit'],
    ['represented_implication','scaled_by','proportion']
  ],
  context: [
    ['referent_state','embedded_in','surrounding_relations']
  ],
  limit: [
    ['admissible_inference_set','excludes','unsupported_extension']
  ],
  proportion: [
    ['contribution_vector','normalized_by','total_relevant_contribution']
  ],
  implication: [
    ['premise_set','entails_or_supports','conclusion_set']
  ],
  application: [
    ['represented_implication','maps_to','case_relation']
  ],
  relevant_reality: [
    ['reality_contact','materially_bears_on','orientation']
  ],
  contradiction: [
    ['held_representation','incompatible_with','reality_contact']
  ],
  correction: [
    ['orientation_before','plus','defeating_contact'],
    ['orientation_contact_pair','maps_to','orientation_after'],
    ['orientation_after','admits','defeating_contact']
  ],
  orientation: [
    ['entity_referent_pair','maps_to','stance_state']
  ],
  orientation_preservation: [
    ['orientation_before','equivalent_core','orientation_after'],
    ['conflicting_contact','transformed_to','compatible_contact']
  ]
};

const POLES = ['empathy','practicality','knowledge','wisdom','answerability','insulation','absence'];
const EXPANDABLE = new Set(Object.keys(PRIMER));

function recursivelyExpand(root, seen = new Set()) {
  if (!PRIMER[root] || seen.has(root)) return [];
  const nextSeen = new Set(seen); nextSeen.add(root);
  const own = PRIMER[root].map(x => x.slice());
  const children = [];
  for (const [s,,o] of own) {
    if (typeof s === 'string' && EXPANDABLE.has(s)) children.push(...recursivelyExpand(s,nextSeen));
    if (typeof o === 'string' && EXPANDABLE.has(o)) children.push(...recursivelyExpand(o,nextSeen));
  }
  const map = new Map();
  for (const f of [...own,...children]) map.set(stable(f),f);
  return [...map.values()].sort((a,b)=>stable(a).localeCompare(stable(b)));
}

function compileFacts(facts) {
  const relationNames = uniq(facts.map(f => stable(f[1]))).sort();
  const nodeNames = uniq(facts.flatMap(([s,,o]) => [s,o]).filter(x => !(typeof x === 'boolean' || typeof x === 'number' || x === null)).map(stable)).sort();
  const rIndex = new Map(relationNames.map((x,i)=>[x,i]));
  const vIndex = new Map(nodeNames.map((x,i)=>[x,i]));
  const incidence = [];
  const scalar = [];
  for (const [s,r,o] of facts) {
    const ri = rIndex.get(stable(r));
    const si = vIndex.get(stable(s));
    if (typeof o === 'boolean' || typeof o === 'number' || o === null) scalar.push([ri,si,o]);
    else incidence.push([ri,si,vIndex.get(stable(o)),1]);
  }
  incidence.sort((a,b)=>stable(a).localeCompare(stable(b)));
  scalar.sort((a,b)=>stable(a).localeCompare(stable(b)));
  const pure = { relation_count: relationNames.length, vertex_count: nodeNames.length, incidence, scalar };
  return {
    pure,
    signature: `χ_${hash32(stable(pure))}`,
    legend: {
      relations: Object.fromEntries(relationNames.map((x,i)=>[`R${i+1}`,JSON.parse(x)])),
      vertices: Object.fromEntries(nodeNames.map((x,i)=>[`v${i+1}`,JSON.parse(x)]))
    }
  };
}

function compileStone() {
  const compiled = {};
  for (const p of POLES) compiled[p] = compileFacts(recursivelyExpand(p));
  return compiled;
}

function factKey(f) { return stable(f); }
function structuralFit(patternFacts, observedFacts) {
  const p = new Set(patternFacts.map(factKey));
  const o = new Set((observedFacts || []).map(factKey));
  if (!p.size) return 0;
  let hit = 0;
  for (const k of p) if (o.has(k)) hit++;
  return hit / p.size;
}
function poleFits(observedFacts) {
  const out = {};
  for (const p of POLES) out[p] = structuralFit(recursivelyExpand(p),observedFacts);
  return out;
}
function delta(a,b) {
  a = Math.max(0,Number(a)||0); b = Math.max(0,Number(b)||0);
  return a+b <= EPS ? 0 : (a-b)/(a+b);
}
function signedCoordinatesFromFits(fits) {
  return {
    x: delta(fits.empathy, fits.practicality),
    y: delta(fits.answerability, fits.insulation),
    z: delta(fits.wisdom, fits.knowledge)
  };
}
function l1(q) { return Math.abs(q.x)+Math.abs(q.y)+Math.abs(q.z); }
function projectSurface(q) {
  const c=l1(q);
  if (c<=EPS) return {x:0,y:0,z:0,completion:0,formed:false};
  return {x:q.x/c,y:q.y/c,z:q.z/c,completion:1,formed:true};
}
function evaluateStone(observedFacts) {
  const fits=poleFits(observedFacts);
  const raw=signedCoordinatesFromFits(fits);
  return { fits, raw, completion:l1(raw), surface:projectSurface(raw) };
}

// Pure anonymous mathematical basis. This object contains no English pole or
// primitive names and is enough to reproduce the signatures and geometry.
function anonymousBasis() {
  const c=compileStone();
  return {
    structures: POLES.map(p=>({signature:c[p].signature,...c[p].pure})),
    operators: {
      signed_difference: 'δ(a,b)=0 if a+b=0; else (a-b)/(a+b)',
      completion: 'C(q)=|q1|+|q2|+|q3|',
      surface_projection: 'Π(q)=0 if C(q)=0; else q/C(q)'
    }
  };
}

module.exports = {
  PRIMER, POLES, recursivelyExpand, compileFacts, compileStone,
  structuralFit, poleFits, delta, signedCoordinatesFromFits, l1,
  projectSurface, evaluateStone, anonymousBasis
};
