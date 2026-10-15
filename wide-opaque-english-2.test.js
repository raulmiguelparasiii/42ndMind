'use strict';

// Second wide opaque-English falsification.
// Family names exist only in this evaluator. F receives only English, an opaque
// context zone, an opaque grounding signature, and a fresh opaque relation id.
// No semantic relation labels or explicit equivalences are supplied to F.

const { one, F } = require('./universal-language');

const rows = [
// reference / entity structure
['identity','za','A is the same entity as B','A and B are identical','A is identical to B'],
['nonidentity','za','A differs from B','A is a different entity from B','A is different from B'],
['possession','za','the key belongs to Mira','Mira owns the key','this key belongs to Mira'],
['membership','za','Mira belongs to the group','Mira is a member of the group','Mira is in the group as a member'],
['part-whole','za','the wheel is part of the car','the car includes the wheel as a part','the wheel forms part of the car'],
['source','za','the package came from Toronto','Toronto is the source of the package','the package is from Toronto'],
['destination','za','the parcel is going to Calgary','Calgary is the parcel destination','the parcel goes to Calgary'],
['instrument','za','she cut it with a knife','the knife was used to cut it','she used a knife to cut it'],
['location','za','the book is at the library','the library is where the book is','the book is located at the library'],
['coreference','za','Mira arrived and she sat down','she refers back to Mira','Mira arrived; she then sat down'],

// change / causal structure
['become','zb','the water became ice','the water changed into ice','the water becomes ice'],
['remain','zb','the door remained open','the door stayed open','the door remains open'],
['cause','zb','the impact caused the crack','the crack happened because of the impact','the impact causes the crack'],
['enable','zb','the key enabled entry','the key made entry possible','the key enables entry'],
['prevent','zb','the lock prevented entry','the lock stopped entry from happening','the lock prevents entry'],
['begin','zb','the meeting began','the meeting started','the meeting begins'],
['finish','zb','the meeting finished','the meeting ended','the meeting finishes'],
['continue','zb','the process continued','the process kept going','the process continues'],
['interrupt','zb','the alarm interrupted the process','the alarm broke the process flow','the alarm interrupts the process'],
['restore','zb','the backup restored the file','the backup returned the file to its earlier state','the backup restores the file'],

// modality / epistemic force
['possible','zc','the event may happen','the event is possible','it is possible that the event happens'],
['impossible','zc','the event cannot happen','the event is impossible','it is impossible for the event to happen'],
['necessary','zc','the condition must hold','the condition is necessary','it is necessary that the condition holds'],
['permitted','zc','you may enter','entry is permitted','you are permitted to enter'],
['forbidden','zc','you may not enter','entry is forbidden','you are forbidden to enter'],
['likely','zc','the event is likely','the event will probably happen','it is likely that the event happens'],
['unlikely','zc','the event is unlikely','the event probably will not happen','it is unlikely that the event happens'],
['certain','zc','the result is certain','the result will definitely happen','it is certain that the result holds'],
['uncertain','zc','the result is uncertain','we are not sure of the result','the result remains uncertain'],
['counterfactual','zc','if I had left earlier I would have arrived','I did not leave earlier but imagine that I had','had I left earlier I would have arrived'],

// mental / affective relations
['love','zd','Mira loves the song','Mira feels love for the song','Mira really loves this song'],
['dislike','zd','Mira dislikes the noise','Mira does not like the noise','Mira really dislikes the noise'],
['trust','zd','Mira trusts Leo','Mira considers Leo reliable','Mira continues to trust Leo'],
['distrust','zd','Mira distrusts Leo','Mira does not consider Leo reliable','Mira continues to distrust Leo'],
['remember','zd','Mira remembers the address','the address remains in Mira memory','Mira still remembers the address'],
['forget','zd','Mira forgot the address','the address left Mira memory','Mira has forgotten the address'],
['understand','zd','Mira understands the explanation','the explanation makes sense to Mira','Mira clearly understands the explanation'],
['misunderstand','zd','Mira misunderstood the explanation','Mira interpreted the explanation incorrectly','Mira still misunderstands the explanation'],
['notice','zd','Mira noticed the change','Mira became aware of the change','Mira notices the change'],
['ignore','zd','Mira ignored the warning','Mira deliberately paid no attention to the warning','Mira ignores the warning'],

// social / economic relations
['buy','ze','Mira bought the book','Mira purchased the book','Mira buys the book'],
['sell','ze','Mira sold the book','Mira transferred the book for payment','Mira sells the book'],
['pay','ze','Mira paid Leo ten dollars','Mira gave Leo ten dollars as payment','Mira pays Leo ten dollars'],
['owe','ze','Mira owes Leo ten dollars','Mira has a ten dollar debt to Leo','Mira still owes Leo ten dollars'],
['own','ze','Mira owns the bicycle','the bicycle is Mira property','Mira still owns the bicycle'],
['share','ze','Mira shared the food with Leo','Mira let Leo have some of the food','Mira shares the food with Leo'],
['cooperate','ze','Mira cooperated with Leo','Mira and Leo worked together','Mira cooperates with Leo'],
['compete','ze','Mira competed with Leo','Mira and Leo acted as rivals','Mira competes with Leo'],
['agree','ze','Mira agrees with Leo','Mira accepts Leo position','Mira still agrees with Leo'],
['disagree','ze','Mira disagrees with Leo','Mira rejects Leo position','Mira still disagrees with Leo'],
['invite','ze','Mira invited Leo to dinner','Mira asked Leo to come to dinner','Mira invites Leo to dinner'],
['refuse','ze','Mira refused the request','Mira declined the request','Mira refuses the request'],

// quantity / comparison
['equal','zf','A equals B','A and B have equal value','A is equal to B'],
['greater','zf','A is greater than B','A exceeds B','A remains greater than B'],
['less','zf','A is less than B','A falls below B','A remains less than B'],
['more','zf','there are more apples than pears','the apple count is higher than the pear count','there are more apples than pears now'],
['fewer','zf','there are fewer apples than pears','the apple count is lower than the pear count','there are fewer apples than pears now'],
['all','zf','all items passed','every item passed','all of the items passed'],
['some','zf','some items passed','at least one item passed','some of the items passed'],
['none','zf','no items passed','none of the items passed','no item passed'],
['exactly','zf','there are exactly ten items','the item count is precisely ten','there are exactly ten items here'],
['approximately','zf','there are about ten items','the item count is approximately ten','there are approximately ten items here'],
['maximum','zf','ten is the maximum value','no allowed value exceeds ten','the maximum value is ten'],
['minimum','zf','two is the minimum value','no allowed value falls below two','the minimum value is two'],

// aspect / temporal relations
['ongoing','zg','Mira is reading now','the reading is currently in progress','Mira is still reading now'],
['habitual','zg','Mira reads every morning','reading every morning is Mira habit','Mira usually reads every morning'],
['completed','zg','Mira finished reading','the reading has been completed','Mira has completed the reading'],
['future','zg','Mira will read tomorrow','the reading is in the future','Mira is going to read tomorrow'],
['before','zg','A happened before B','A preceded B','A occurred before B'],
['after','zg','A happened after B','A followed B','A occurred after B'],
['simultaneous','zg','A happened while B happened','A and B occurred at the same time','A occurred while B was happening'],
['duration','zg','the task lasted two hours','the task duration was two hours','the task lasts for two hours'],
['frequency','zg','the event happens three times a week','the weekly frequency is three','the event occurs three times each week'],
['once','zg','the event happened once','the event occurred one time','the event happened only once'],
['again','zg','the event happened again','the event repeated','the event occurs again'],
['until','zg','Mira waited until noon','the waiting continued up to noon','Mira keeps waiting until noon'],

// discourse / linguistic acts
['question','zh','Mira asked whether it worked','Mira posed a question about whether it worked','Mira asks whether it worked'],
['answer','zh','Leo answered the question','Leo provided an answer','Leo answers the question'],
['assert','zh','Mira asserted that it worked','Mira stated that it worked','Mira asserts that it worked'],
['deny','zh','Mira denied that it worked','Mira said that it did not work','Mira denies that it worked'],
['explain','zh','Mira explained why it worked','Mira gave the reason it worked','Mira explains why it worked'],
['infer','zh','Mira inferred B from A','Mira concluded B based on A','Mira infers B from A'],
['imply','zh','A implies B','A carries B as an implication','A still implies B'],
['quote','zh','Mira quoted Leo words','Mira repeated Leo exact words as a quotation','Mira quotes Leo words'],
['paraphrase','zh','Mira paraphrased Leo statement','Mira restated Leo meaning in different words','Mira paraphrases Leo statement'],
['correct','zh','Mira corrected the statement','Mira replaced the error with the right statement','Mira corrects the statement'],
['contrast','zh','Mira contrasted A with B','Mira highlighted the difference between A and B','Mira contrasts A with B'],
['exception','zh','all passed except Mira','Mira was excluded from the otherwise general result','everyone passed except Mira'],
];

function oid(i,j){ return `Ω${String(i+1).padStart(3,'0')}.${j+1}`; }
function canonical(U,id){ return U.canonical[id] || id; }
function top(U){ return U.current?.resolution?.components?.[0]?.relation || null; }

async function main(){
  const U = one({config:{min_equivalence_support:1,history_limit:10000}});
  const expected = new Map();
  let merged=0;

  for(let i=0;i<rows.length;i++){
    const [key,zone,a,b] = rows[i];
    const ids=[];
    for(const [j,text] of [[0,a],[1,b]]){
      const id=oid(i,j); ids.push(id);
      await F(U,{
        utterance:text,
        context:{zone},
        facts:[['g','r',`κ${String(i+1).padStart(3,'0')}`]],
        relations:[{id}],
        source:'wide-opaque-2'
      });
    }
    const cs=ids.map(id=>canonical(U,id));
    if(new Set(cs).size===1) merged++;
    expected.set(key,cs[0]);
  }

  const critical=[
    ['identity','nonidentity'],['possession','membership'],['source','destination'],
    ['cause','enable'],['enable','prevent'],['possible','impossible'],['permitted','forbidden'],
    ['likely','unlikely'],['certain','uncertain'],['trust','distrust'],['remember','forget'],
    ['understand','misunderstand'],['buy','sell'],['cooperate','compete'],['agree','disagree'],
    ['greater','less'],['more','fewer'],['all','some'],['some','none'],['exactly','approximately'],
    ['maximum','minimum'],['before','after'],['ongoing','completed'],['question','answer'],['assert','deny']
  ];
  const collisions=critical.filter(([a,b])=>expected.get(a)===expected.get(b));

  let hits=0; const misses=[]; const byZone={};
  for(const [key,zone,, ,holdout] of rows){
    await F(U,{utterance:holdout,context:{zone}});
    const predicted=top(U), want=expected.get(key), hit=predicted===want;
    if(hit) hits++; else misses.push({family:key,text:holdout,predicted,expected:want});
    byZone[zone] ||= {hits:0,total:0}; byZone[zone].total++; if(hit) byZone[zone].hits++;
  }
  for(const z of Object.values(byZone)) z.accuracy=Number((z.hits/z.total).toFixed(4));

  const exactWhole=U.encounters.every(e=>{
    const r=e.resolution;if(!r)return false;
    return Math.abs((r.components||[]).reduce((s,x)=>s+x.mass,0)+(r.unknown_mass??1)-1)<1e-7;
  });

  const report={
    families:rows.length,
    training_contacts:rows.length*2,
    semantic_labels_given_to_F:0,
    explicit_equivalences_given_to_F:0,
    opaque_families_merged:merged,
    held_out_hits:hits,
    held_out_total:rows.length,
    held_out_accuracy:Number((hits/rows.length).toFixed(4)),
    critical_neighbor_collisions:collisions,
    exact_whole_equals_one:exactWhole,
    raw_relations:U.metrics.relations,
    canonical_relations:U.metrics.canonical_relations,
    mean_unknown_mass:U.metrics.unknown_mass,
    progress:U.metrics.progress,
    by_zone:byZone,
    misses:misses.slice(0,20)
  };
  console.log(JSON.stringify(report,null,2));

  if(!exactWhole) throw new Error('wide opaque 2: whole=1 closure failed');
  if(merged < rows.length*0.95) throw new Error(`wide opaque 2: only ${merged}/${rows.length} families stabilized`);
  if(collisions.length) throw new Error(`wide opaque 2: critical neighbor collisions ${JSON.stringify(collisions)}`);
  if(hits/rows.length < 0.82) throw new Error(`wide opaque 2: held-out accuracy ${hits}/${rows.length}`);
  console.log('WIDE OPAQUE ENGLISH 2: PASS');
}

main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
