'use strict';

// Closed mathematical projection for the Stone's basic semantic structure.
// English terms appear only in the primer/audit legend. The compiled live
// object bottoms out in a small fixed mathematical operator basis plus
// anonymous vertices and scalar values. This is a universal-language
// experiment, not canonical 42ndMind cognition.

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

// Fixed mathematical operator basis. These are not Stone-specific semantics.
// op 0  membership:       O0(a,S)=1 iff a∈S
// op 1  mapping:          O1(f,a,b)=1 iff f(a)=b (finite graph form)
// op 2  dependence:       O2(y,x)=1 iff varying x can vary y
// op 3  restriction:      O3(A,B)=1 iff admissible(A)⊆admissible(B)
// op 4  update:           O4(s,e,s')=1 iff U(s,e)=s'
// op 5  order/scale:      O5(a,b)=1 iff a≤b in the supplied order
// op 6  entail/support:   O6(A,B)=1 iff A entails/supports B
// op 7  incompatibility:  O7(A,B)=1 iff A∩B=∅
// op 8  equivalence:      O8(A,B)=1 iff A=B under the declared core
// op 9  composition:      O9(a,b,c)=1 iff c=a⊕b
// op 10 cardinality:      O10(S)=|S|
const OPERATOR_AXIOMS = Object.freeze([
  'O0(a,S)=1⇔a∈S',
  'O1(f,a,b)=1⇔f(a)=b',
  'O2(y,x)=1⇔∃x1,x2[x1≠x2∧y(x1)≠y(x2)]',
  'O3(A,B)=1⇔Adm(A)⊆Adm(B)',
  "O4(s,e,s')=1⇔U(s,e)=s'",
  'O5(a,b)=1⇔a≤b',
  'O6(A,B)=1⇔A⊨B',
  'O7(A,B)=1⇔A∩B=∅',
  'O8(A,B)=1⇔A=B',
  'O9(a,b,c)=1⇔c=a⊕b',
  'O10(S)=|S|'
]);

// Source relation words are reduced to the fixed operator basis before they
// enter the pure mathematical object. flip=true canonicalizes membership.
const RELATION_OPERATOR = Object.freeze({
  includes:[0,true], contains:[0,true], belongs_to:[0,false], member_of:[0,false], embedded_in:[0,false], under:[0,false],
  represents:[1,false], takes_input:[1,false], carries_forward:[1,false], maps_to:[1,false], mapped_to:[1,false], about:[1,false], maps_through:[1,false], yields:[1,false], transformed_to:[1,false],
  tracks:[2,false], depends_on:[2,false], materially_relevant_to:[2,false], affects:[2,false], change_can_change:[2,false], conditions_on:[2,false], materially_bears_on:[2,false],
  restricts:[3,false], grounded_in:[3,false], grounded_by:[3,false], constrained_by:[3,false], preserves:[3,false], bounded_by:[3,false], excludes:[3,false], selected_for:[3,false], subordinated_to:[3,false], admits:[3,false],
  changes:[4,false], can_update:[4,false], can_defeat:[4,false], has_authority_over:[4,false], controls:[4,false],
  ordered_by:[5,false], scaled_by:[5,false], normalized_by:[5,false],
  entails_or_supports:[6,false], incompatible_with:[7,false], equivalent_core:[8,false], plus:[9,false],
  relation_cardinality:[10,false], nonempty:[10,false]
});

// The recursive semantic primer. Upper entries mirror the Stone definitions;
// lower entries unpack them until only the fixed operator basis remains.
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
  // Null reduces to the mathematical absence of an entity↔referent relation.
  absence: [['entity_referent_pair','relation_cardinality',0]],

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
  context: [['referent_state','embedded_in','surrounding_relations']],
  limit: [['admissible_inference_set','excludes','unsupported_extension']],
  proportion: [['contribution_vector','normalized_by','total_relevant_contribution']],
  implication: [['premise_set','entails_or_supports','conclusion_set']],
  application: [['represented_implication','maps_to','case_relation']],
  relevant_reality: [['reality_contact','materially_bears_on','orientation']],
  contradiction: [['held_representation','incompatible_with','reality_contact']],
  correction: [
    ['orientation_before','plus','defeating_contact'],
    ['orientation_contact_pair','maps_to','orientation_after'],
    ['orientation_after','admits','defeating_contact']
  ],
  orientation: [['entity_referent_pair','maps_to','stance_state']],
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

function operatorFor(relation) {
  const spec=RELATION_OPERATOR[relation];
  if (!spec) throw new Error(`unreduced relation primitive: ${relation}`);
  return spec;
}
function compileFacts(facts) {
  const nodeNames = uniq(facts.flatMap(([s,,o]) => [s,o]).filter(x => !(typeof x === 'boolean' || typeof x === 'number' || x === null)).map(stable)).sort();
  const vIndex = new Map(nodeNames.map((x,i)=>[x,i]));
  const incidence = [], scalar = [];
  for (const [rawS,r,rawO] of facts) {
    const [op,flip]=operatorFor(r);
    let s=rawS,o=rawO;
    if (flip && !(typeof o === 'boolean' || typeof o === 'number' || o === null)) [s,o]=[o,s];
    const si=vIndex.get(stable(s));
    if (op===10) {
      const value = r==='nonempty' ? (o===true?1:0) : o;
      scalar.push([op,si,value]);
    } else if (typeof o === 'boolean' || typeof o === 'number' || o === null) {
      scalar.push([op,si,o]);
    } else {
      incidence.push([op,si,vIndex.get(stable(o)),1]);
    }
  }
  incidence.sort((a,b)=>stable(a).localeCompare(stable(b)));
  scalar.sort((a,b)=>stable(a).localeCompare(stable(b)));
  const usedOps=uniq([...incidence.map(x=>x[0]),...scalar.map(x=>x[0])]).sort((a,b)=>a-b);
  const pure = { operator_basis_version:1, operators:usedOps, vertex_count:nodeNames.length, incidence, scalar };
  return {
    pure,
    signature: `χ_${hash32(stable(pure))}`,
    legend: {
      operators:Object.fromEntries(usedOps.map(i=>[`O${i}`,OPERATOR_AXIOMS[i]])),
      vertices:Object.fromEntries(nodeNames.map((x,i)=>[`v${i+1}`,JSON.parse(x)])),
      source_relation_classes:Object.fromEntries(uniq(facts.map(f=>f[1])).sort().map(r=>[r,RELATION_OPERATOR[r][0]]))
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

// Pure anonymous basis: no Stone pole names, no lower semantic ingredient
// names, and no source relation words. The only nonnumeric content is the
// fixed mathematical operator axioms and coordinate equations.
function anonymousBasis() {
  const c=compileStone();
  return {
    structures: POLES.map(p=>({signature:c[p].signature,...c[p].pure})),
    operator_axioms: OPERATOR_AXIOMS.slice(),
    signed_pairs:[[0,1],[4,5],[3,2]],
    signed_difference:'δ(a,b)=0 if a+b=0; else (a-b)/(a+b)',
    completion:'C(q)=|q1|+|q2|+|q3|',
    surface_projection:'Π(q)=0 if C(q)=0; else q/C(q)'
  };
}

module.exports = {
  PRIMER, POLES, OPERATOR_AXIOMS, RELATION_OPERATOR, recursivelyExpand,
  operatorFor, compileFacts, compileStone, structuralFit, poleFits, delta,
  signedCoordinatesFromFits, l1, projectSurface, evaluateStone, anonymousBasis
};
