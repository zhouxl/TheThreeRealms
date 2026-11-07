import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {generateTravelerGLB} from './generateTravelerGLB.mjs';
const output=resolve(dirname(fileURLToPath(import.meta.url)),'../public/models/traveler-tech-demo.glb');
mkdirSync(dirname(output),{recursive:true});
const bytes=generateTravelerGLB();
writeFileSync(output,bytes);
console.log(`Wrote reproducible technical traveler GLB (${bytes.length} bytes): ${output}`);
