import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateWenchangDeityGLB} from './generateWenchangDeityGLB.mjs';

const output=resolve(dirname(fileURLToPath(import.meta.url)),'../public/models/wenchang-deity-tech-demo.glb');
mkdirSync(dirname(output),{recursive:true});
const result=generateWenchangDeityGLB();
writeFileSync(output,result);
console.log(`Wrote ${result.byteLength} bytes: ${output}`);
