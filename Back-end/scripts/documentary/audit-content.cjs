'use strict';
const fs=require('node:fs');const path=require('node:path');const {decide}=require('./policy.cjs');
const input=process.env.DOCUMENTARY_TEST_INPUT;if(!input)throw Error('DOCUMENTARY_TEST_INPUT required');
const read=file=>fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const original=new Map(read(process.env.DOCUMENTARY_ORIGINAL_SNAPSHOT || path.resolve(input,'../catalog-enrichment/catalogue_complet.jsonl')).map(r=>[r.id,r]));
const current=new Map(['catalogue_complet.jsonl','produits_inactifs.jsonl'].flatMap(file=>read(path.join(input,'current-snapshot',file))).map(r=>[r.id,r]));
const proposals=read(path.join(input,'propositions_cumulees_lots_01_a_19.jsonl'));
const seen=new Set();
const results=proposals.map(proposal=>{
 const prior=original.get(proposal.id),now=current.get(proposal.id);
 const result={id:proposal.id,internal_reference:proposal.internal_reference,eligible_flag:proposal.enrichment?.auto_publish_description_eligible ?? null};
 try{
  if(seen.has(proposal.id))throw Error('DUPLICATE_UUID');seen.add(proposal.id);
  const decision=decide({proposal,original:prior?{id:prior.id,title:prior.original.title,description:prior.original.description}:null,current:now?{id:now.id,title:now.original.title,description:now.original.description,active:now.active}:null});
  return {...result,action:decision.action,reason:decision.reason || null,risks:decision.risks || []};
 }catch(e){return {...result,action:'error',reason:e.message};}
});
const counts={};for(const r of results){const k=r.reason || r.action;counts[k]=(counts[k]||0)+1;}
const summary={products:results.length,decisions:counts,scope:'Structural and conservative content checks against saved snapshots; not individual source or physical stock certification',production_written:false};
fs.writeFileSync(path.join(input,'publication_content_audit.jsonl'),results.map(r=>JSON.stringify(r)).join('\n')+'\n',{mode:0o600});
fs.writeFileSync(path.join(input,'publication_content_summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(summary));
