'use strict';

// Wider grounded mathematical-anatomy regression.
// Human family names live only in this evaluator. F receives a fresh opaque
// relation handle for each paraphrase plus actual before/after contact.

const { one, F, mathematicalEquivalent } = require('./universal-language');

const E=(key,context,a,b,c,h)=>({key,context,train:[a,b,c],holdout:h});
const ex=(utterance,before,after,action)=>({utterance,before,after,action});

const families=[
  E('open',{zone:'za'},
    ex('open the file',{open:false},{open:true},'open'),
    ex('open this document',{open:false},{open:true},'launch'),
    ex('make the resource open',{open:false},{open:true},'activate'),
    'please open this resource'),
  E('terminate',{zone:'za'},
    ex('close the program',{running:true,visible:true,file:true},{running:false,visible:false,file:true},'close'),
    ex('quit this application',{running:true,visible:true,file:true},{running:false,visible:false,file:true},'quit'),
    ex('exit the app',{running:true,visible:true,file:true},{running:false,visible:false,file:true},'exit'),
    'please close this application'),
  E('conceal',{zone:'za'},
    ex('hide the window',{running:true,visible:true},{running:true,visible:false},'hide'),
    ex('conceal this panel',{running:true,visible:true},{running:true,visible:false},'conceal'),
    ex('make the interface disappear',{running:true,visible:true},{running:true,visible:false},'minimize'),
    'please hide this interface'),
  E('delete',{zone:'za'},
    ex('delete the file',{exists:true},{exists:false},'delete'),
    ex('erase this record',{exists:true},{exists:false},'erase'),
    ex('remove the folder',{exists:true},{exists:false},'remove'),
    'please delete this record'),
  E('copy',{zone:'za'},
    ex('copy the file',{source:true,copies:1},{source:true,copies:2},'copy'),
    ex('duplicate this record',{source:true,copies:1},{source:true,copies:2},'duplicate'),
    ex('clone the folder',{source:true,copies:1},{source:true,copies:2},'clone'),
    'please copy this record'),
  E('move',{zone:'za'},
    ex('move the file',{location:'a'},{location:'b'},'move'),
    ex('relocate this record',{location:'a'},{location:'b'},'relocate'),
    ex('transfer the folder',{location:'a'},{location:'b'},'transfer'),
    'please move this record'),
  E('rename',{zone:'za'},
    ex('rename the file',{name:'a'},{name:'b'},'rename'),
    ex('change this record name',{name:'a'},{name:'b'},'retitle'),
    ex('give the folder a new name',{name:'a'},{name:'b'},'rename'),
    'please rename this record'),
  E('create',{zone:'za'},
    ex('create the file',{exists:false},{exists:true},'create'),
    ex('make this record',{exists:false},{exists:true},'make'),
    ex('add a new folder',{exists:false},{exists:true},'add'),
    'please create this record'),
  E('save',{zone:'za'},
    ex('save the document',{saved:false},{saved:true},'save'),
    ex('store this project',{saved:false},{saved:true},'store'),
    ex('preserve the current state',{saved:false},{saved:true},'persist'),
    'please save this project'),
  E('undo',{zone:'zb'},
    ex('undo the change',{version:2},{version:1},'undo'),
    ex('revert this edit',{version:2},{version:1},'revert'),
    ex('go back one version',{version:2},{version:1},'back'),
    'please undo this edit'),
  E('enable',{zone:'zb'},
    ex('enable the feature',{enabled:false},{enabled:true},'enable'),
    ex('turn this setting on',{enabled:false},{enabled:true},'on'),
    ex('activate the option',{enabled:false},{enabled:true},'activate'),
    'please enable this setting'),
  E('disable',{zone:'zb'},
    ex('disable the feature',{enabled:true},{enabled:false},'disable'),
    ex('turn this setting off',{enabled:true},{enabled:false},'off'),
    ex('deactivate the option',{enabled:true},{enabled:false},'deactivate'),
    'please disable this setting'),
  E('increase',{zone:'zc'},
    ex('increase the value',{value:1},{value:2},'increase'),
    ex('raise this level',{value:1},{value:2},'raise'),
    ex('turn the amount up',{value:1},{value:2},'up'),
    'please increase this level'),
  E('decrease',{zone:'zc'},
    ex('decrease the value',{value:2},{value:1},'decrease'),
    ex('lower this level',{value:2},{value:1},'lower'),
    ex('turn the amount down',{value:2},{value:1},'down'),
    'please decrease this level'),
  E('pause',{zone:'zd'},
    ex('pause the process',{active:true,paused:false},{active:true,paused:true},'pause'),
    ex('pause this task',{active:true,paused:false},{active:true,paused:true},'hold'),
    ex('temporarily stop playback',{active:true,paused:false},{active:true,paused:true},'pause'),
    'please pause this task'),
  E('resume',{zone:'zd'},
    ex('resume the process',{active:true,paused:true},{active:true,paused:false},'resume'),
    ex('continue this task',{active:true,paused:true},{active:true,paused:false},'continue'),
    ex('restart paused playback',{active:true,paused:true},{active:true,paused:false},'resume'),
    'please resume this task'),
];

function oid(fi,ei){return `§W${String(fi+1).padStart(2,'0')}.${ei+1}`;}
function top(U){return U.current?.resolution?.components?.[0]||null;}
function exact(U){return U.encounters.every(e=>{const r=e.resolution;if(!r)return false;const s=(r.components||[]).reduce((a,x)=>a+x.mass,0)+(r.unknown_mass??1);return Math.abs(s-1)<1e-7;});}

async function train(reverse=false){
  const U=one({config:{min_equivalence_support:1,history_limit:6000}}),canonical=new Map();
  for(let fi=0;fi<families.length;fi++){
    const f=families[fi],xs=reverse?[...f.train].reverse():f.train,ids=[];
    for(let ei=0;ei<xs.length;ei++){
      const x=xs[ei],id=oid(fi,ei);ids.push(id);
      await F(U,{utterance:x.utterance,context:f.context,execution:{before:x.before,after:x.after,action:x.action},relations:[{id}],source:'wide-intent-math'});
    }
    canonical.set(f.key,U.canonical[ids[0]]||ids[0]);
  }
  return{U,canonical};
}

async function main(){
  const a=await train(false),b=await train(true),math=new Map();let orderInvariant=true;
  for(const f of families){
    const x=mathematicalEquivalent(a.U,a.canonical.get(f.key));
    const y=mathematicalEquivalent(b.U,b.canonical.get(f.key));
    if(!x||x.status!=='grounded-mathematical-equivalent')throw new Error(`${f.key}: no mathematical equivalent`);
    if(x.signature!==y?.signature)orderInvariant=false;
    math.set(f.key,x);
  }
  if(!orderInvariant)throw new Error('non-temporal insertion order changed anatomy');

  const mustDiffer=[['open','delete'],['terminate','conceal'],['delete','create'],['copy','move'],['rename','move'],['save','create'],['undo','increase'],['enable','disable'],['increase','decrease'],['pause','resume']];
  const collisions=mustDiffer.filter(([a1,b1])=>math.get(a1).signature===math.get(b1).signature);
  if(collisions.length)throw new Error(`mathematical collisions: ${JSON.stringify(collisions)}`);

  let hits=0;const holdouts=[];
  for(const f of families){
    await F(a.U,{utterance:f.holdout,context:f.context});
    const t=top(a.U),expected=a.canonical.get(f.key),hit=t?.relation===expected&&t?.anatomy?.signature===math.get(f.key).signature;
    hits+=hit?1:0;holdouts.push({family:f.key,text:f.holdout,hit,formula:t?.anatomy?.formula||null});
  }
  const report={families:families.length,opaque_training_contacts:families.length*3,semantic_family_labels_given_to_F:0,mathematical_equivalents_verified:math.size,held_out_english_to_math_hits:hits,held_out_total:families.length,insertion_order_invariant:orderInvariant,critical_math_collisions:collisions,exact_whole_equals_one:exact(a.U),holdouts};
  console.log(JSON.stringify(report,null,2));
  if(hits!==families.length)throw new Error(`only ${hits}/${families.length} held-outs reached correct anatomy`);
  if(!report.exact_whole_equals_one)throw new Error('whole=1 failed');
  console.log('WIDE MATHEMATICAL INTENT TEST: PASS');
}

main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
