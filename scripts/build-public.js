'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
require('./render-static-pages');
// Only this script's generated output directory is replaced.
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const files=['index.html','404.html','thanks.html','robots.txt','sitemap.xml','manifest.webmanifest','_headers','_redirects',
 'assets/config.js','assets/ts-runtime.js','assets/ts-lane.js','assets/ta-wave3.js','assets/heating-data.js','assets/heating-lanes.js','assets/flow.js','assets/app.js','assets/styles.css','assets/favicon.svg','assets/walnut-grain.svg',
 'assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','assets/icons/icon-192.png','assets/icons/apple-touch-icon.png'];
for(const file of files){const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
function copyDir(src,dest){fs.mkdirSync(dest,{recursive:true});for(const ent of fs.readdirSync(src,{withFileTypes:true})){const from=path.join(src,ent.name),to=path.join(dest,ent.name);if(ent.isDirectory())copyDir(from,to);else fs.copyFileSync(from,to);}}
copyDir(path.join(root,'answers'),path.join(out,'answers'));
copyDir(path.join(root,'maintenance'),path.join(out,'maintenance'));
copyDir(path.join(root,'pros'),path.join(out,'pros'));
const scan=[];
(function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(/\.(html|css|webmanifest)$/.test(ent.name))scan.push(p);}})(out);
// Fail a local or hosted build for an omitted local HTML/CSS/manifest asset.
for(const file of scan){
 const text=fs.readFileSync(file,'utf8');
 const refs=[...text.matchAll(/(?:src|href)=["']([^"']+)|url\(["']?([^)'"\s]+)|"src"\s*:\s*"([^"]+)"/g)].map(m=>m[1]||m[2]||m[3]);
 for(const ref of refs){if(/^(?:[a-z]+:|#|\/\/)/i.test(ref))continue;const local=ref.split(/[?#]/)[0];if(!local||local==='/')continue;const dest=local.startsWith('/')?path.join(out,local):path.resolve(path.dirname(file),local);if(!fs.existsSync(dest))throw Error('Missing public asset '+path.relative(out,file)+' → '+ref);}
}
console.log('Public build: '+files.length+' allowlisted files, plus answers and maintenance.');
