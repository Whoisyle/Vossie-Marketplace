import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const acctTab = () => p.getByText('Account',{exact:true}).locator('visible=true').last().click();
const where = async n => console.log(n, p.url().replace('http://localhost:8092',''));
await acctTab(); await p.waitForTimeout(2500); await where('account');
for (const label of [/Vossie Points/, 'Wallet', 'Coupons and offers', 'Subscriptions', 'Inbox']) {
  // find row; scroll account list until visible
  for (let i=0;i<8;i++){ const l = typeof label==='string' ? p.getByText(label,{exact:true}) : p.getByText(label); if (await l.locator('visible=true').count()) break; await p.evaluate(()=>{const el=[...document.querySelectorAll('div')].filter(e=>e.scrollHeight>e.clientHeight+40&&['auto','scroll'].includes(getComputedStyle(e).overflowY)).sort((a,b)=>b.scrollHeight-a.scrollHeight)[0]; el&&el.scrollBy(0,400)}); await p.waitForTimeout(500); }
  const l = (typeof label==='string' ? p.getByText(label,{exact:true}) : p.getByText(label)).locator('visible=true').first();
  const bx = await l.boundingBox().catch(()=>null); console.log(String(label), JSON.stringify(bx));
  if (!bx) continue;
  await p.mouse.click(bx.x+bx.width/2, bx.y+bx.height/2); await p.waitForTimeout(2500); await where('  opened ' + label);
  await p.screenshot({path:`shots/acc_${String(label).replace(/\W/g,'')}.png`});
  await acctTab(); await p.waitForTimeout(2000); await where('  after tab');
}
await b.close();
