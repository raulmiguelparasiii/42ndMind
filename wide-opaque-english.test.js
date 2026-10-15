'use strict';

// Wide anti-cheat English correlation test.
// F never receives the human family key, a semantic relation label, explicit
// equivalence, or semantic evidence. Each training example gets a fresh opaque
// relation id. Executable families are grounded in before/after reality contact.
// Abstract families are grounded in shared but opaque structural signatures.
// The human-readable family keys exist only in this external evaluator.

const { one, F } = require('./universal-language');

const E=(key,zone,a,b,h)=>({key,zone,kind:'exec',train:[a,b],holdout:h});
const R=(key,zone,codes,a,b,h)=>({key,zone,kind:'rel',codes,train:[a,b],holdout:h});
const ex=(utterance,before,after,action)=>({utterance,before,after,action});

const families=[
  E('open','z01',ex('open the file',{open:false},{open:true},'a01'),ex('open this document',{open:false},{open:true},'a01'),'please open the resource'),
  E('terminate','z01',ex('close the program',{running:true,visible:true,file:true},{running:false,visible:false,file:true},'a02'),ex('close this application',{running:true,visible:true,file:true},{running:false,visible:false,file:true},'a02'),'please close the app'),
  E('conceal','z01',ex('hide the window',{running:true,visible:true},{running:true,visible:false},'a03'),ex('hide this panel',{running:true,visible:true},{running:true,visible:false},'a03'),'please hide the interface'),
  E('delete','z01',ex('delete the file',{exists:true},{exists:false},'a04'),ex('delete this record',{exists:true},{exists:false},'a04'),'please delete the folder'),
  E('copy','z01',ex('copy the file',{source:true,copies:1},{source:true,copies:2},'a05'),ex('copy this record',{source:true,copies:1},{source:true,copies:2},'a05'),'please copy the folder'),
  E('move','z01',ex('move the file',{location:'a'},{location:'b'},'a06'),ex('move this record',{location:'a'},{location:'b'},'a06'),'please move the folder'),
  E('rename','z01',ex('rename the file',{name:'a'},{name:'b'},'a07'),ex('rename this record',{name:'a'},{name:'b'},'a07'),'please rename the folder'),
  E('create','z01',ex('create the file',{exists:false},{exists:true},'a08'),ex('create this record',{exists:false},{exists:true},'a08'),'please create the folder'),
  E('save','z01',ex('save the document',{saved:false},{saved:true},'a09'),ex('save this project',{saved:false},{saved:true},'a09'),'please save the state'),
  E('undo','z01',ex('undo the change',{version:2},{version:1},'a10'),ex('undo this edit',{version:2},{version:1},'a10'),'please undo the action'),
  E('enable','z01',ex('enable the feature',{enabled:false},{enabled:true},'a11'),ex('enable this setting',{enabled:false},{enabled:true},'a11'),'please enable the option'),
  E('disable','z01',ex('disable the feature',{enabled:true},{enabled:false},'a12'),ex('disable this setting',{enabled:true},{enabled:false},'a12'),'please disable the option'),
  E('increase','z02',ex('increase the value',{value:1},{value:2},'a13'),ex('increase this level',{value:1},{value:2},'a13'),'please increase the amount'),
  E('decrease','z02',ex('decrease the value',{value:2},{value:1},'a14'),ex('decrease this level',{value:2},{value:1},'a14'),'please decrease the amount'),
  E('pause','z03',ex('pause the process',{active:true,paused:false},{active:true,paused:true},'a15'),ex('pause this task',{active:true,paused:false},{active:true,paused:true},'a15'),'please pause the playback'),
  E('resume','z03',ex('resume the process',{active:true,paused:true},{active:true,paused:false},'a16'),ex('resume this task',{active:true,paused:true},{active:true,paused:false},'a16'),'please resume the playback'),

  R('desire','z10',['d100','d101'],'I want water','they want more time','we want a solution'),
  R('need','z10',['d100','d102'],'I need water','they need more time','we need a solution'),
  R('prefer','z10',['d100','d103'],'I prefer tea','they prefer the quiet route','we prefer option two'),
  R('intend','z10',['d100','d104'],'I intend to leave','they intend to finish','we intend to call later'),
  R('hope','z10',['d100','d105'],'I hope for rain','they hope for good news','we hope for a solution'),
  R('fear','z10',['d100','d106'],'I fear failure','they fear the storm','we fear losing access'),
  R('know','z11',['d110','d111'],'I know the answer','they know the result','we know the cause'),
  R('believe','z11',['d110','d112'],'I believe the claim','they believe the report','we believe the explanation'),
  R('doubt','z11',['d110','d113'],'I doubt the claim','they doubt the report','we doubt the explanation'),
  R('wonder','z11',['d110','d114'],'I wonder about the cause','they wonder about the result','we wonder about the answer'),

  R('tell','z20',['d200','d201'],'I tell them the result','they tell her the news','we tell him the answer'),
  R('request','z20',['d200','d202'],'I request help','they request a reply','we request the file'),
  R('command','z20',['d200','d203'],'I command them to stop','they command him to wait','we command her to leave'),
  R('promise','z20',['d200','d204'],'I promise to help','they promise to return it','we promise to finish tomorrow'),
  R('permit','z20',['d200','d205'],'I permit entry','they permit the change','we permit them to leave'),
  R('forbid','z20',['d200','d206'],'I forbid entry','they forbid the change','we forbid that action'),
  R('give','z21',['d210','d211'],'I give her the book','they give him the key','we give them the item'),
  R('lend','z21',['d210','d212'],'I lend her the book','they lend him the key','we lend them the tool'),
  R('return','z21',['d210','d213'],'I return her book','they return his key','we return their item'),
  R('apologize','z22',['d220','d221'],'I apologize to you','they apologize to her','we apologize to them'),

  R('negation','z30',['d300','d301'],'the claim is not true','the event did not happen','the report is not correct'),
  R('conjunction','z30',['d300','d302'],'A and B are true','both conditions hold','the first and second claims hold'),
  R('disjunction','z30',['d300','d303'],'A or B is true','either condition can hold','the first or second claim may hold'),
  R('conditional','z30',['d300','d304'],'if A then B','if the condition holds the result follows','if this happens then that follows'),
  R('universal','z31',['d310','d311'],'every item qualifies','all cases satisfy it','every member has the property'),
  R('existential','z31',['d310','d312'],'some item qualifies','at least one case satisfies it','some member has the property'),
  R('must','z32',['d320','d321'],'the action must happen','the condition must hold','the result must occur'),
  R('may','z32',['d320','d322'],'the action may happen','the condition may hold','the result may occur'),

  R('before','z40',['d400','d401'],'A happened before B','the first event was before the second','this happened before that'),
  R('after','z40',['d400','d402'],'A happened after B','the first event was after the second','this happened after that'),
  R('during','z40',['d400','d403'],'A happened during B','the event occurred during the process','this happened during that'),
  R('future','z40',['d400','d404'],'A will happen later','the event will happen later','this will happen later'),
  R('past','z40',['d400','d405'],'A happened already','the event happened already','this happened already'),
  R('inside','z41',['d410','d411'],'A is inside B','the object is inside the box','this is inside that'),
  R('outside','z41',['d410','d412'],'A is outside B','the object is outside the box','this is outside that'),
  R('above','z41',['d410','d413'],'A is above B','the object is above the base','this is above that'),
  R('below','z41',['d410','d414'],'A is below B','the object is below the base','this is below that'),
  R('near','z41',['d410','d415'],'A is near B','the object is near the base','this is near that'),
  R('greater','z42',['d420','d421'],'A is greater than B','this value is greater than that value','the first amount is greater than the second'),
  R('equal','z42',['d420','d422'],'A equals B','this value equals that value','the first amount equals the second'),
];

function oid(fi,ei){return `§${String(fi+1).padStart(3,'0')}.${ei+1}`;}
function facts(codes){return codes.map(c=>['§s',`§${c}`,'§o']);}
function top(U){return U.current?.resolution?.components?.[0]?.relation||null;}
function exact(U){return U.encounters.every(e=>{const r=e.resolution;if(!r)return false;const s=(r.components||[]).reduce((a,x)=>a+x.mass,0)+(r.unknown_mass??1);return Math.abs(s-1)<1e-7;});}

async function main(){
  const U=one({config:{min_equivalence_support:1,history_limit:12000,fixed_point_passes:2}});
  const ids=new Map();
  for(let fi=0;fi<families.length;fi++){
    const f=families[fi],group=[];
    for(let ei=0;ei<f.train.length;ei++){
      const id=oid(fi,ei);group.push(id);
      if(f.kind==='exec'){
        const x=f.train[ei];
        await F(U,{utterance:x.utterance,context:{zone:f.zone},execution:{before:x.before,after:x.after,action:x.action},relations:[{id}],source:'wide-opaque'});
      }else{
        await F(U,{utterance:f.train[ei],context:{zone:f.zone},facts:facts(f.codes),relations:[{id}],source:'wide-opaque'});
      }
    }
    ids.set(f.key,group);
  }

  const canon=new Map();let merged=0;
  for(const f of families){const cs=ids.get(f.key).map(id=>U.canonical[id]||id);if(new Set(cs).size===1)merged++;canon.set(f.key,cs[0]);}

  const mustDiffer=[['terminate','conceal'],['copy','move'],['enable','disable'],['increase','decrease'],['pause','resume'],['desire','need'],['know','believe'],['request','command'],['permit','forbid'],['give','lend'],['negation','conjunction'],['universal','existential'],['must','may'],['before','after'],['inside','outside'],['above','below'],['greater','equal']];
  const collisions=mustDiffer.filter(([a,b])=>canon.get(a)===canon.get(b));

  let hits=0;const byZone={};const misses=[];
  for(const f of families){await F(U,{utterance:f.holdout,context:{zone:f.zone}});const hit=top(U)===canon.get(f.key);hits+=hit?1:0;const z=byZone[f.zone]||(byZone[f.zone]={hits:0,total:0});z.total++;if(hit)z.hits++;else misses.push({family:f.key,text:f.holdout,predicted:top(U),expected:canon.get(f.key)});}
  for(const z of Object.values(byZone))z.accuracy=Number((z.hits/z.total).toFixed(4));

  const report={families:families.length,training_contacts:families.length*2,semantic_labels_given_to_F:0,explicit_equivalences_given_to_F:0,opaque_families_merged:merged,held_out_hits:hits,held_out_total:families.length,held_out_accuracy:Number((hits/families.length).toFixed(4)),critical_neighbor_collisions:collisions,exact_whole_equals_one:exact(U),raw_relations:U.metrics.relations,canonical_relations:U.metrics.canonical_relations,mean_unknown_mass:U.metrics.unknown_mass,progress:U.metrics.progress,by_zone:byZone,misses:misses.slice(0,12)};
  console.log(JSON.stringify(report,null,2));
  if(!report.exact_whole_equals_one)throw new Error('whole=1 closure failed');
  if(merged<Math.floor(families.length*.9))throw new Error(`only ${merged}/${families.length} opaque families stabilized`);
  if(collisions.length)throw new Error(`critical neighbor collisions: ${JSON.stringify(collisions)}`);
  if(hits<Math.floor(families.length*.8))throw new Error(`only ${hits}/${families.length} held-out English intentions resolved`);
  console.log('WIDE OPAQUE ENGLISH TEST: PASS');
}

main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
