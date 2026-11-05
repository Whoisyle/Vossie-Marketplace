import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
await p.getByText('Account',{exact:true}).locator('visible=true').last().click(); await p.waitForTimeout(2500);
const l = p.getByText(/Vossie Points/).locator('visible=true').first();
try { await l.click({timeout:4000}); } catch(e){ console.log(e.message.split('\n').filter(x=>/intercepts|resolved/.test(x)).slice(0,3).join('\n')); }
await p.screenshot({path:'shots/k2.png'});
for (const [i,t] of [[1,'Subscriptions'],[2,'Wallet'],[3,'Vouchers']]) {}
await p.evaluate(()=>{const el=[...document.querySelectorAll('div')].filter(e=>e.scrollHeight>e.clientHeight+40&&getComputedStyle(e).overflowY!=='visible').sort((a,b)=>b.scrollHeight-a.scrollHeight)[0]; el&&(el.scrollTop=2000)});
await p.waitForTimeout(800);
console.log(JSON.stringify(await visible(p)));
await p.screenshot({path:'shots/k3.png'});
await b.close();
