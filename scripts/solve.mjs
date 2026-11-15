import { solveMontage } from '../src/lib/montage.js';
const { nodes, quality } = solveMontage();
const keys=Object.keys(nodes);
console.log('pos:');
for(const k of ['Fp1','Fp2','Fpz','F7','F3','Fz','F4','F8','T3','C3','Cz','C4','T4','T5','P3','Pz','P4','T6','O1','Oz','O2','A1','A2'])
  console.log(k.padEnd(4), nodes[k].pos.map(v=>v.toFixed(2)).join(' '));
console.log('\nquality dev:');
let mx=0; for(const q of quality){ if(Math.abs(q.dev)>mx) mx=Math.abs(q.dev); }
console.log('max dev', mx.toFixed(2));
for(const q of quality) console.log(`${q.a}-${q.b}`.padEnd(8), q.target, q.actual, q.dev);
// symmetry check
const sym=[['Fp1','Fp2'],['F3','F4'],['C3','C4'],['P3','P4'],['O1','O2'],['F7','F8'],['T3','T4'],['T5','T6']];
for(const [a,b] of sym){ const A=nodes[a].pos,B=nodes[b].pos; console.log('sym',a,b, Math.abs(A[0]+B[0]).toFixed(3), Math.abs(A[1]-B[1]).toFixed(3), Math.abs(A[2]-B[2]).toFixed(3)); }
