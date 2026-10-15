'use strict';

// Broad English schooling/falsification for universal-language.js.
// This file is curriculum and measurement only. It is not part of F and owns no
// semantic authority. Every example enters through the same live update law.

const fs = require('fs');
const path = require('path');
const { one, F } = require('./universal-language');

const actions = [
  ['open-resource','open accessible resource',['open','launch','bring up'],['file','document','resource'],{domain:'computer',kind:'resource'},{open:false},{open:true}],
  ['terminate-process','terminate active process',['close','quit','exit'],['program','application','app'],{domain:'computer',kind:'process'},{running:true,visible:true,file_exists:true},{running:false,visible:false,file_exists:true}],
  ['hide-interface','conceal interface',['hide','conceal','minimize'],['window','panel','interface'],{domain:'computer',kind:'interface'},{running:true,visible:true},{running:true,visible:false}],
  ['delete-object','remove persisted object',['delete','erase','remove'],['file','folder','record'],{domain:'computer',kind:'persisted'},{exists:true},{exists:false}],
  ['copy-object','duplicate object',['copy','duplicate','clone'],['file','folder','record'],{domain:'computer',kind:'persisted'},{source_exists:true,copies:1},{source_exists:true,copies:2}],
  ['move-object','relocate object',['move','relocate','transfer'],['file','folder','item'],{domain:'computer',kind:'persisted'},{location:'a'},{location:'b'}],
  ['rename-object','change object name',['rename','retitle','relabel'],['file','folder','item'],{domain:'computer',kind:'persisted'},{name:'a'},{name:'b'}],
  ['create-object','bring object into existence',['create','make','new'],['file','folder','record'],{domain:'computer',kind:'persisted'},{exists:false},{exists:true}],
  ['save-state','persist current state',['save','store','persist'],['document','project','state'],{domain:'computer',kind:'state'},{saved:false},{saved:true}],
  ['undo-change','reverse previous change',['undo','revert','roll back'],['change','edit','action'],{domain:'computer',kind:'change'},{version:2},{version:1}],
  ['redo-change','reapply reversed change',['redo','reapply','repeat'],['change','edit','action'],{domain:'computer',kind:'change'},{version:1},{version:2}],
  ['search-target','seek matching information',['search','find','look for'],['text','record','item'],{domain:'computer',kind:'query'},{found:false},{found:true}],
  ['enable-feature','make capability active',['enable','activate','turn on'],['feature','option','setting'],{domain:'computer',kind:'setting'},{enabled:false},{enabled:true}],
  ['disable-feature','make capability inactive',['disable','deactivate','turn off'],['feature','option','setting'],{domain:'computer',kind:'setting'},{enabled:true},{enabled:false}],
  ['increase-value','raise magnitude',['increase','raise','turn up'],['volume','value','level'],{domain:'magnitude',direction:'up'},{value:1},{value:2}],
  ['decrease-value','lower magnitude',['decrease','lower','turn down'],['volume','value','level'],{domain:'magnitude',direction:'down'},{value:2},{value:1}],
  ['pause-process','temporarily suspend activity',['pause','suspend','hold'],['playback','process','task'],{domain:'process',phase:'active'},{active:true,paused:false},{active:true,paused:true}],
  ['resume-process','continue suspended activity',['resume','continue','carry on'],['playback','process','task'],{domain:'process',phase:'paused'},{active:true,paused:true},{active:true,paused:false}],
];

const attitudes = [
  ['desire','directed wanting',['want','desire','wish for'],['water','rest','a change'],[['agent','orientation','toward-target'],['target','status','wanted']],'attitude'],
  ['need','required condition',['need','require','must have'],['water','support','more time'],[['agent','dependency','target'],['target','status','required']],'attitude'],
  ['prefer','comparative preference',['prefer','would rather have','favor'],['tea','the quiet route','option two'],[['agent','ranking','target-over-alternative']],'attitude'],
  ['intend','adopted future action',['intend to','plan to','mean to'],['leave','finish the work','call later'],[['agent','orientation','future-action'],['future-action','status','adopted']],'attitude'],
  ['hope','positive possibility orientation',['hope for','hope to get','look forward to'],['rain','good news','a solution'],[['agent','orientation','desired-possible-outcome']],'attitude'],
  ['fear','negative possibility orientation',['fear','am afraid of','worry about'],['failure','the storm','losing access'],[['agent','orientation','aversive-possible-outcome']],'attitude'],
  ['know','warranted actuality attitude',['know','am certain of','recognize'],['the answer','that fact','what happened'],[['agent','attitude','asserted-actual'],['claim','warrant','present']],'epistemic'],
  ['believe','held proposition attitude',['believe','think','hold that'],['the claim','it will work','the report'],[['agent','attitude','held-possible']],'epistemic'],
  ['suspect','tentative likelihood attitude',['suspect','have a hunch about','consider likely'],['the cause','an error','that explanation'],[['agent','attitude','tentative-likelihood']],'epistemic'],
  ['doubt','withheld commitment',['doubt','question','am unsure about'],['the claim','that story','the result'],[['agent','attitude','withheld-commitment']],'epistemic'],
  ['wonder','open inquiry attitude',['wonder about','am curious about','ask myself about'],['the cause','what happens next','the answer'],[['agent','attitude','open-question']],'epistemic'],
  ['tell','assert information to recipient',['tell','inform','say to'],['them the result','her the news','him the answer'],[['speaker','communication','assertion-to-recipient']],'communication'],
  ['request','ask recipient for action',['ask for','request','would like'],['help','a reply','the file'],[['speaker','communication','requested-action']],'communication'],
  ['command','direct recipient action',['order','command','instruct'],['them to stop','him to wait','her to leave'],[['speaker','communication','directed-action'],['force','status','authoritative']],'communication'],
  ['promise','commit future action to another',['promise','pledge','give my word about'],['helping','returning it','finishing tomorrow'],[['speaker','commitment','future-action-to-recipient']],'social'],
  ['permit','grant permission',['allow','permit','let'],['entry','them leave','the change'],[['authority','permission','granted']],'social'],
  ['forbid','deny permission',['forbid','prohibit','do not allow'],['entry','that action','the change'],[['authority','permission','denied']],'social'],
  ['give','transfer possession',['give','hand','provide'],['the book','the key','the item'],[['source','possession','before'],['recipient','possession','after']],'social'],
  ['lend','temporary transfer possession',['lend','loan','let use'],['the book','the tool','the key'],[['source','possession','retained-claim'],['recipient','possession','temporary']],'social'],
  ['borrow','receive temporary possession',['borrow','take on loan','use temporarily'],['the book','the tool','the key'],[['agent','possession','temporary'],['source','claim','retained']],'social'],
  ['return','restore possession',['return','give back','hand back'],['the book','the key','the item'],[['recipient','possession','restored']],'social'],
  ['thank','express gratitude',['thank','am grateful to','appreciate'],['you','them','her'],[['speaker','social-attitude','gratitude']],'social'],
  ['apologize','acknowledge fault or harm',['apologize to','say sorry to','ask forgiveness from'],['you','them','her'],[['speaker','social-attitude','acknowledged-fault']],'social'],
];

const structural = [
  ['negation','negation',['not true','did not happen','never occurred'], 'it is not true', [['proposition','polarity','negated']],'logic'],
  ['conjunction','joint assertion',['both A and B','A and B together','the two conditions hold'], 'both conditions hold together', [['propositions','combination','conjunction']],'logic'],
  ['disjunction','alternative assertion',['either A or B','A or B can hold','at least one is true'], 'either condition may hold', [['propositions','combination','disjunction']],'logic'],
  ['conditional','conditional dependence',['if A then B','B provided that A','when A holds B follows'], 'if the condition holds then the result follows', [['antecedent','relation','conditional-consequent']],'logic'],
  ['cause','causal production',['A caused B','A made B happen','B happened because of A'], 'A caused the result to happen', [['cause','relation','produces-effect']],'causal'],
  ['prevent','causal prevention',['A prevented B','A stopped B from happening','A kept B from occurring'], 'A prevented the result from happening', [['cause','relation','blocks-effect']],'causal'],
  ['equality','equal magnitude',['A equals B','A is the same amount as B','the values are equal'], 'these two values are equal', [['a','magnitude-relation','equal-to-b']],'quantity'],
  ['greater-than','greater magnitude',['A is greater than B','A exceeds B','A is larger than B'], 'this value is greater than the other value', [['a','magnitude-relation','greater-than-b']],'quantity'],
  ['less-than','lesser magnitude',['A is less than B','A falls below B','A is smaller than B'], 'this value is less than the other value', [['a','magnitude-relation','less-than-b']],'quantity'],
  ['universal','universal quantification',['every item has it','all cases satisfy it','each member qualifies'], 'every member qualifies', [['quantifier','scope','all-members']],'logic'],
  ['existential','existential quantification',['some item has it','at least one case satisfies it','there exists a member'], 'at least one member qualifies', [['quantifier','scope','at-least-one']],'logic'],
  ['none','empty quantification',['no item has it','none of the cases satisfy it','zero members qualify'], 'no member qualifies', [['quantifier','scope','zero-members']],'logic'],
  ['before','temporal precedence',['A happened before B','A came earlier than B','A preceded B'], 'the first event happened before the second', [['a','time-relation','before-b']],'time'],
  ['after','temporal succession',['A happened after B','A came later than B','A followed B'], 'the first event happened after the second', [['a','time-relation','after-b']],'time'],
  ['during','temporal containment',['A happened during B','A occurred while B was happening','A was within the time of B'], 'the event happened during the process', [['a','time-relation','during-b']],'time'],
  ['start','temporal beginning',['A began','A started','the beginning of A occurred'], 'the event started', [['event','phase','beginning']],'time'],
  ['end','temporal completion',['A ended','A finished','A came to an end'], 'the event ended', [['event','phase','ending']],'time'],
  ['continue','temporal persistence',['A continued','A kept going','A remained in progress'], 'the event continued', [['event','phase','persistent']],'time'],
  ['repeat','temporal recurrence',['A happened again','A repeated','A occurred another time'], 'the event happened again', [['event','phase','recurrent']],'time'],
  ['future','future temporal location',['A will happen','A is going to occur','A lies ahead'], 'the event will happen later', [['event','time-location','future']],'time'],
  ['past','past temporal location',['A happened already','A already occurred','A is in the past'], 'the event happened in the past', [['event','time-location','past']],'time'],
  ['inside','spatial inclusion',['A is inside B','A is within B','B contains A'], 'the object is inside the container', [['a','space-relation','inside-b']],'space'],
  ['outside','spatial exclusion',['A is outside B','A is beyond B','B does not contain A'], 'the object is outside the container', [['a','space-relation','outside-b']],'space'],
  ['above','vertical superiority',['A is above B','A is over B','A is higher than B'], 'the object is above the other object', [['a','space-relation','above-b']],'space'],
  ['below','vertical inferiority',['A is below B','A is under B','A is lower than B'], 'the object is below the other object', [['a','space-relation','below-b']],'space'],
  ['near','spatial proximity',['A is near B','A is close to B','A is beside B'], 'the object is near the other object', [['a','space-relation','near-b']],'space'],
  ['far','spatial distance',['A is far from B','A is distant from B','A is a long way from B'], 'the object is far from the other object', [['a','space-relation','far-from-b']],'space'],
  ['attach','physical attachment',['A is attached to B','A is connected to B','A is fastened to B'], 'the part is attached to the base', [['a','physical-relation','attached-to-b']],'space'],
  ['detach','physical separation',['A is detached from B','A is disconnected from B','A is separated from B'], 'the part is detached from the base', [['a','physical-relation','detached-from-b']],'space'],
  ['support','physical support',['A supports B','B rests on A','A holds B up'], 'the base supports the object', [['a','physical-relation','supports-b']],'space'],
  ['block','physical obstruction',['A blocks B','A obstructs B','A stands in the way of B'], 'the barrier blocks the passage', [['a','physical-relation','obstructs-b']],'space'],
];

function families() {
  const out = [];
  for (const [id,label,cues,objects,context,before,after] of actions) {
    out.push({
      id,label,context,execution:{before,after,action:cues[0]},facts:[],
      train:[`${cues[0]} the ${objects[0]}`,`please ${cues[1]} the ${objects[1]}`,`${cues[2]} this ${objects[0]}`],
      test:`can you ${cues[0]} the ${objects[2]}`,
    });
  }
  for (const [id,label,cues,targets,facts,domain] of attitudes) {
    out.push({
      id,label,context:{domain},facts,
      train:[`I ${cues[0]} ${targets[0]}`,`they ${cues[1]} ${targets[1]}`,`we ${cues[2]} ${targets[0]}`],
      test:`she ${cues[0]} ${targets[2]}`,
    });
  }
  for (const [id,label,train,test,facts,domain] of structural) out.push({id,label,context:{domain},facts,train,test});
  return out;
}

function candidate(f) { return { id:`eng:${f.id}`, label:f.label, support:1 }; }
function trainContact(f, utterance) {
  return { utterance, context:f.context, execution:f.execution, facts:f.facts, relations:[candidate(f)], source:'english-school' };
}
function canonical(U, id) { return U.canonical[`eng:${id}`] || `eng:${id}`; }
function topRelations(U, n=3) { return (U.current?.resolution?.components || []).slice(0,n).map(x => x.relation); }

async function main() {
  const U = one({config:{history_limit:4096}});
  const set = families();
  let trained = 0;
  for (const f of set) for (const u of f.train) { await F(U, trainContact(f,u)); trained++; }

  // A handful of blindly-added duplicate names are grounded through the same
  // contact so the field must discover that they are redundant rather than being
  // told to reserve separate semantic territory for them.
  const duplicates = [
    ['terminate-process','quit active software'],['delete-object','erase persisted thing'],['desire','wanting'],['know','certainty'],
    ['believe','thinking true'],['request','asking for action'],['promise','pledged action'],['before','earlier-than relation'],
  ];
  for (const [id,label] of duplicates) {
    const f = set.find(x => x.id===id);
    await F(U,{...trainContact(f,f.train[0]),relations:[{id:`alias:${id}`,label,support:1}]});
    await F(U,{...trainContact(f,f.train[1]),relations:[{id:`alias:${id}`,label,support:1}]});
  }

  let top1=0, top3=0;
  const failures=[];
  for (const f of set) {
    await F(U,{utterance:f.test,context:f.context});
    const expected=canonical(U,f.id), top=topRelations(U,3);
    if(top[0]===expected) top1++;
    if(top.includes(expected)) top3++;
    else failures.push({id:f.id,text:f.test,expected,top:(U.current.resolution.components||[]).slice(0,3).map(x=>[x.labels?.[0]||x.relation,x.mass])});
  }

  let merged=0;
  for(const [id] of duplicates) if(canonical(U,id)===(U.canonical[`alias:${id}`]||`alias:${id}`)) merged++;

  const composites=[
    ['I do not think the program will close',['negation','believe','future','terminate-process'],{domain:'computer',kind:'process'}],
    ['I hope the file will open after the task ends',['hope','future','open-resource','after','end'],{domain:'time'}],
    ['if the value is greater then decrease the level',['conditional','greater-than','decrease-value'],{domain:'quantity'}],
    ['I doubt every item is inside the box',['doubt','universal','inside'],{domain:'logic'}],
    ['please copy the file before you delete the record',['copy-object','before','delete-object'],{domain:'computer'}],
    ['I intend to return the book after I borrow it',['intend','return','after','borrow'],{domain:'social'}],
    ['A prevented B because A blocked the passage',['prevent','cause','block'],{domain:'causal'}],
    ['they promised to give back the key in the future',['promise','return','future'],{domain:'social'}],
  ];
  let compExpected=0,compHit=0;
  const comp=[];
  for(const [text,ids,context] of composites){
    await F(U,{utterance:text,context});
    const top=topRelations(U,12), expected=ids.map(id=>canonical(U,id));
    const hits=expected.filter(id=>top.includes(id)); compExpected+=expected.length; compHit+=hits.length;
    comp.push({text,expected:expected.length,recovered:hits.length,top:(U.current.resolution.components||[]).slice(0,6).map(x=>x.labels?.[0]||x.relation)});
  }

  const exactClosure=U.encounters.every(e=>{
    const r=e.resolution;if(!r)return false;
    return Math.abs((r.components||[]).reduce((s,x)=>s+x.mass,0)+(r.unknown_mass??1)-1)<1e-7;
  });
  const allText=set.flatMap(f=>[...f.train,f.test]);
  const words=new Set(allText.join(' ').toLowerCase().match(/[a-z0-9']+/g)||[]);
  const report={
    relation_families:set.length,
    training_utterances:trained,
    held_out_utterances:set.length,
    unique_wordforms:words.size,
    held_out_top1_accuracy:Number((top1/set.length).toFixed(4)),
    held_out_top3_accuracy:Number((top3/set.length).toFixed(4)),
    blindly_added_duplicates_merged:Number((merged/duplicates.length).toFixed(4)),
    compositional_relation_recall_at_12:Number((compHit/compExpected).toFixed(4)),
    compositional_expected_relations:compExpected,
    compositional_recovered_relations:compHit,
    exact_whole_equals_one:exactClosure,
    raw_relations:U.metrics.relations,
    canonical_relations:U.metrics.canonical_relations,
    mean_unknown_mass:U.metrics.unknown_mass,
    progress:U.metrics.progress,
    progress_bar:U.metrics.bar,
    failures:failures.slice(0,10),
    composites:comp,
  };

  fs.mkdirSync(path.join(__dirname,'state'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'state','universal-language-state.json'),JSON.stringify(U));

  if(!exactClosure) throw new Error('whole=1 closure failed');
  if(report.held_out_top1_accuracy<0.72) throw new Error(`held-out top1 too low ${report.held_out_top1_accuracy}`);
  if(report.held_out_top3_accuracy<0.88) throw new Error(`held-out top3 too low ${report.held_out_top3_accuracy}`);
  if(report.blindly_added_duplicates_merged<0.75) throw new Error(`duplicate stabilization too low ${report.blindly_added_duplicates_merged}`);
  if(report.compositional_relation_recall_at_12<0.45) throw new Error(`compositional recall too low ${report.compositional_relation_recall_at_12}`);

  console.log('42ndMind broad English correlation: PASS');
  console.log(JSON.stringify(report,null,2));
}

main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
