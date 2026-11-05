import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
const log = async n => { console.log('##', n, p.url().replace('http://localhost:8092',''), JSON.stringify((await visible(p)).slice(0,26))); await p.screenshot({ path: `shots/c_${n}.png` }); };
const tv = async t => { await p.getByText(t,{exact:true}).locator('visible=true').first().click(); await p.waitForTimeout(3500); };
await p.getByText('Account',{exact:true}).last().click(); await p.waitForTimeout(1500);
await p.getByText('Switch role').first().click(); await p.waitForTimeout(1200);
await p.getByText(/^Courier$/).first().click(); await p.waitForTimeout(5000); await log('welcome');
const up = async (label) => { await p.getByText(label,{exact:true}).locator('visible=true').first().click(); await p.waitForTimeout(1200);
  const [fc] = await Promise.all([p.waitForEvent('filechooser',{timeout:4000}).catch(()=>null), p.getByText(label==='Selfie check'?'Photo library':'Files',{exact:true}).locator('visible=true').first().click().catch(()=>{})]);
  if (fc) await fc.setFiles(IMG); await p.waitForTimeout(1800); };
await tv('Become a courier'); await p.waitForTimeout(500); const ins0=p.locator('input:visible'); for (let k=0;k<await ins0.count();k++){ const v=await ins0.nth(k).inputValue(); if(!v) await ins0.nth(k).fill(k===0?'Vumisa Dlamini':'0821234567').catch(()=>{}); } await tv('Continue');
const ins=p.locator('input:visible'); for (let k=0;k<await ins.count();k++){ const v=await ins.nth(k).inputValue(); if(!v) await ins.nth(k).fill(k===0?'Vumisa Dlamini':'0821234567').catch(()=>{}); }
await log('details');
await up('ID document'); await up('Selfie check'); await log('verifyfilled');
await tv('Submit for review'); await log('submitted');
for (let i=0;i<6;i++){
  const t = await visible(p);
  if (t.includes('Home') && t.includes('Earnings')) break;
  const inputs = p.locator('input:visible'); const n = await inputs.count();
  for (let k=0;k<n;k++){ const v=await inputs.nth(k).inputValue(); if(!v) await inputs.nth(k).fill(k===0?'Honda Fit':'CA 123 456').catch(()=>{}); }
  for (const up of t.filter(x=>/Tap to upload|Required/.test(x)).slice(0,0)) {}
  const c = ['Become a courier','Get started','Continue','Next','Finish','Submit for review','Submit','Save & continue','Go online','Done'].find(x=>t.some(y=>y===x||y.startsWith(x)));
  if(!c){ console.log('NO CAND', t); break; }
  await p.getByText(c).locator('visible=true').first().click().catch(e=>console.log('clickfail',c)); await p.waitForTimeout(4000); await log('s'+i);
}
await b.close();
