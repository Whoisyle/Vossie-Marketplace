import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
await p.getByText('Account',{exact:true}).last().click(); await p.waitForTimeout(1500);
await p.getByText('Switch role').first().click(); await p.waitForTimeout(1200);
await p.getByText(/^Seller$/).first().click(); await p.waitForTimeout(2500);
const log = async n => { console.log('##', n, p.url().replace('http://localhost:8092',''), JSON.stringify(await visible(p))); await p.screenshot({ path: `shots/q_${n}.png` }); };
await p.waitForTimeout(4500); await log('welcome');
for (let i=0;i<7;i++){
  const t = await visible(p);
  const cand = ['Set up my shop','Continue','Next','Get started','Submit','Done','Open my shop','Go to my shop','Finish','Submit for review','Send','Confirm','Continue to shop'].find(c => t.some(x => x.startsWith(c)));
  if (!cand) { console.log('no cand'); break; }
  if (t.includes('Student seller')) await p.getByText('Student seller').first().click().catch(()=>{});
  // fill any inputs
  const inputs = p.locator('input:visible'); const n = await inputs.count();
  for (let k=0;k<n;k++) { const v = await inputs.nth(k).inputValue(); if(!v) await inputs.nth(k).fill(k===0?'Vumisa Threads':'0821234567').catch(()=>{}); }
  await p.getByText(cand).first().click().catch(e=>console.log('click fail',cand)); await p.waitForTimeout(4500); await log('step'+i+'_'+cand.replace(/\W/g,''));
}
await b.close();
