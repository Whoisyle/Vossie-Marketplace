import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
const log = async n => { console.log('##', n, p.url().replace('http://localhost:8092',''), JSON.stringify((await visible(p)).slice(0,24))); await p.screenshot({ path: `shots/w_${n}.png` }); };
const upload = async (label) => { await p.getByText(label,{exact:true}).first().click(); await p.waitForTimeout(1200);
  const [fc] = await Promise.all([p.waitForEvent('filechooser',{timeout:4000}).catch(()=>null), p.getByText('Files',{exact:true}).first().click()]);
  if (fc) await fc.setFiles(IMG); await p.waitForTimeout(1800); };
await p.getByText('Account',{exact:true}).last().click(); await p.waitForTimeout(1500);
await p.getByText('Switch role').first().click(); await p.waitForTimeout(1200);
await p.getByText(/^Seller$/).first().click(); await p.waitForTimeout(5000);
await p.getByText('Set up my shop').click(); await p.waitForTimeout(3500);
await p.getByText('Student seller').first().click();
const ins = p.locator('input:visible'); await ins.nth(0).fill('Vumisa Threads'); await ins.nth(1).fill('0821234567');
await p.getByText('Continue',{exact:true}).click(); await p.waitForTimeout(3500);
await upload('ID document'); await upload('Proof of address'); await log('docs');
await p.getByText('Submit for review').click(); await p.waitForTimeout(6000); await log('submitted');
await p.getByText('Continue',{exact:true}).locator('visible=true').first().click(); await p.waitForTimeout(4000);
const ta = p.locator('textarea:visible, input:visible'); const cnt = await ta.count(); console.log('inputs', cnt);
for (let k=0;k<cnt;k++){ const v=await ta.nth(k).inputValue(); if(!v) await ta.nth(k).fill('Thrifted and upcycled fashion from campus').catch(()=>{}); }
await p.getByText('Choose',{exact:true}).locator('visible=true').first().click(); await p.waitForTimeout(3000); await log('place');
const tv = async t => { await p.getByText(t,{exact:true}).locator('visible=true').first().click(); await p.waitForTimeout(3500); };
await tv('Use this place'); await log('placed');
await tv('Save & continue'); await log('shopdone');
await p.waitForTimeout(1500);
await p.mouse.move(48,804); await p.mouse.down(); for (let x=48;x<=345;x+=15){ await p.mouse.move(x,804); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(4000); await log('dash');
console.log('BOTTOM', JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('div,span')].filter(e=>!e.children.length&&e.textContent.trim()&&e.getBoundingClientRect().top>770&&e.getBoundingClientRect().bottom<=852).map(e=>e.textContent.trim()))));
for (let i=0;i<0;i++){ const t = await visible(p); const c=['Continue','Next','Open my shop','Go to my shop','Done','Start selling'].find(x=>t.some(y=>y.startsWith(x))); if(!c) break; await p.getByText(c,{exact:true}).locator('visible=true').first().click(); await p.waitForTimeout(4000); await log('s'+i); }
await b.close();
