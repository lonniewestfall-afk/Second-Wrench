'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
// Only this script's generated output directory is replaced.
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out);
const files=['index.html','404.html','thanks.html','robots.txt','sitemap.xml','manifest.webmanifest','_headers','_redirects',
 'assets/config.js','assets/ts-runtime.js','assets/ts-lane.js','assets/heating-data.js','assets/heating-lanes.js','assets/flow.js','assets/app.js','assets/styles.css','assets/favicon.svg','assets/walnut-grain.svg',
 'assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','assets/icons/icon-192.png','assets/icons/apple-touch-icon.png'];
for(const file of files){const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
// Fail a local or hosted build for an omitted local HTML/CSS/manifest asset.
for(const file of ['index.html','404.html','thanks.html','assets/styles.css','manifest.webmanifest']){
 const text=fs.readFileSync(path.join(out,file),'utf8');
 const refs=[...text.matchAll(/(?:src|href)=["']([^"']+)|url\(["']?([^)'"\s]+)|"src"\s*:\s*"([^"]+)"/g)].map(m=>m[1]||m[2]||m[3]);
 for(const ref of refs){if(/^(?:[a-z]+:|#|\/\/)/i.test(ref))continue;const local=ref.split(/[?#]/)[0];if(!local||local==='/')continue;const dest=local.startsWith('/')?path.join(out,local):path.resolve(path.dirname(path.join(out,file)),local);if(!fs.existsSync(dest))throw Error('Missing public asset '+file+' → '+ref);}
}
console.log('Public build: '+files.length+' allowlisted files.');
