// Build from an explicit source allowlist. Never follow shared node_modules or copy .env files.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { root, runtime } = require('../sandbox/config.cjs');
const source = path.join(root,'Back-end');
const context = path.join(runtime,'image-builds',String(Date.now()),'context');
fs.mkdirSync(context,{recursive:true});
const files=[];
function copy(relative) {
  const original = path.join(source,relative);
  const info=fs.lstatSync(original);
  if(info.isSymbolicLink()) throw new Error('Build input must not be a symlink');
  if(info.isDirectory()) {
    for(const name of fs.readdirSync(original)) copy(path.join(relative,name));
    return;
  }
  if(relative.endsWith('.spec.ts')) return;
  if(path.basename(relative).startsWith('.env')) throw new Error('Environment files are excluded');
  const bytes=fs.readFileSync(original);
  const target=path.join(context,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  files.push({path:relative.replaceAll('\\','/'),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
for(const name of ['package.json','package-lock.json','prisma.config.ts','tsconfig.json','tsconfig.build.json',
  'nest-cli.json','Dockerfile.preproduction','Dockerfile.preproduction.dockerignore','src','prisma/schema.prisma',
  'prisma/migrations','scripts/start-preproduction.cjs','scripts/verify-release-schema.cjs',
  'scripts/release-schema-contract.cjs','scripts/release-schema.json']) copy(name);
// The physical context is already minimal; this also supports classic Docker builders.
fs.copyFileSync(path.join(context,'Dockerfile.preproduction.dockerignore'),path.join(context,'.dockerignore'));
const report={date:new Date().toISOString(),context,files,environmentFilesIncluded:false,sharedDependenciesCopied:false};
fs.writeFileSync(path.join(root,'docs/refonte-e/captures/image-build-inputs.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(runtime,'image-builds/latest.json'),JSON.stringify({context},null,2)+'\n');
console.log(JSON.stringify({context,files:files.length,bytes:files.reduce((sum,f)=>sum+f.bytes,0)}));
