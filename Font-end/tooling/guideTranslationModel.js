import { createHash } from 'node:crypto';
const text=value=>typeof value==='string'&&value.trim().length>0;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const fingerprint=entry=>createHash('sha256').update(JSON.stringify(entry)).digest('hex');
const texts=(values,count)=>Array.isArray(values)&&values.length===count&&values.every(text);
function only(value,keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key))) throw Error('Unknown guide translation field');
}
export function compileGuideTranslations(copies,entries,today=new Date().toISOString().slice(0,10)) {
  if(!Array.isArray(copies)||copies.length>200) throw Error('Invalid guide translations');
  const ids=new Set();
  return copies.map(copy=>{
    only(copy,['id','reviewedAt','title','summary','sourceLabels','sourceLocators','productLabels','sections','limits','reviewScope','sourceSha256']);
    const entry=entries.find(entry=>entry.id===copy.id&&entry.type==='guide'&&entry.status==='published'&&entry.language==='fr');
    if(!entry||ids.has(copy.id)) throw Error('Unknown or duplicate translated guide');
    ids.add(copy.id);
    if(copy.sourceSha256!==fingerprint(entry)) throw Error('French guide changed; review English translation: '+copy.id);
    if(!date(copy.reviewedAt)||copy.reviewedAt<entry.reviewedAt||copy.reviewedAt>today) throw Error('Invalid guide translation date');
    if(!text(copy.title)||!text(copy.summary)||!text(copy.reviewScope)||!texts(copy.limits,entry.limits.length)||
      !texts(copy.sourceLabels,entry.sources.length)||!texts(copy.sourceLocators,entry.sources.length)||!texts(copy.productLabels,entry.products.length)||
      !Array.isArray(copy.sections)||copy.sections.length!==entry.sections.length) throw Error('Incomplete translated guide');
    const sections=copy.sections.map((section,index)=>{
      only(section,['id','title','paragraphs','bullets','table']);
      const original=entry.sections[index];
      if(section.id!==original.id||!text(section.title)||!texts(section.paragraphs,original.paragraphs.length)||!texts(section.bullets,original.bullets.length)||
        Boolean(section.table)!==Boolean(original.table)) throw Error('Translated section differs from the reviewed source structure');
      if(section.table) {
        only(section.table,['caption','headers','rows']);
        if(!text(section.table.caption)||!texts(section.table.headers,original.table.headers.length)||!Array.isArray(section.table.rows)||
          section.table.rows.length!==original.table.rows.length||section.table.rows.some(row=>!texts(row,original.table.headers.length))) throw Error('Invalid translated table');
      }
      return {...section,sources:original.sources};
    });
    return {id:entry.id+'-en',sourceId:entry.id,sourceSha256:copy.sourceSha256,slug:entry.slug,language:'en',type:'guide',
      title:copy.title,summary:copy.summary,createdAt:entry.createdAt,reviewedAt:copy.reviewedAt,
      families:entry.families,products:entry.products.map((product,index)=>({...product,label:copy.productLabels[index]})),
      sources:entry.sources.map((source,index)=>({...source,label:copy.sourceLabels[index],locator:copy.sourceLocators[index]})),
      sections,limits:copy.limits,review:{method:entry.review.method,scope:copy.reviewScope}};
  });
}
export const guideTranslationModule=entries=>'// Prepared English translations; not a publication registry. Routes must opt in after full locale verification.\n'+
  `export const preparedEnglishGuides = ${JSON.stringify(entries,null,2)};\n`;
