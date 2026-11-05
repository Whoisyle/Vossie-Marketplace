import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
const log = async n => { console.log('##', n, p.url().replace('http://localhost:8092',''), JSON.stringify((await visible(p)).slice(0,30))); await p.screenshot({ path: `shots/o_${n}.png` }); };
const tv = async (t,o={}) => { await p.getByText(t,{exact:o.exact??true}).locator('visible=true').first().click(); await p.waitForTimeout(o.w||2800); };
const up = async (label, via='Files') => { await tv(label,{w:1000}); const [fc] = await Promise.all([p.waitForEvent('filechooser',{timeout:4000}).catch(()=>null), tv(via,{w:400}).catch(()=>{})]); if (fc) await fc.setFiles(IMG); await p.waitForTimeout(1500); };
await tv('Account',{w:1500}); await tv('Switch role',{exact:false,w:1200}); await tv('Seller',{w:5000});
await tv('Set up my shop',{w:3000}); await tv('Student seller',{w:800});
const ins=p.locator('input:visible'); await ins.nth(0).fill('Vumisa Threads'); await ins.nth(1).fill('0821234567');
await tv('Continue',{w:3000}); await up('ID document'); await up('Proof of address'); await tv('Submit for review',{w:4500}); await tv('Continue',{w:3000});
const tas=p.locator('textarea:visible, input:visible'); for (let k=0;k<await tas.count();k++){ if(!(await tas.nth(k).inputValue())) await tas.nth(k).fill('Thrifted fashion').catch(()=>{}); }
await tv('Choose',{w:2500}); await tv('Use this place',{w:2500}); await tv('Save & continue',{w:4000});
await p.mouse.move(48,804); await p.mouse.down(); for (let x=48;x<=345;x+=15){ await p.mouse.move(x,804); await p.waitForTimeout(16);} await p.mouse.up(); await p.waitForTimeout(4000);
await log('dash');
await p.getByText('Orders',{exact:true}).locator('visible=true').last().click(); await p.waitForTimeout(2500); await log('orders');
await p.getByText(/#VM-/).locator('visible=true').first().click().catch(e=>console.log('no order click')); await p.waitForTimeout(2500); await log('order1');
for (let i=0;i<4;i++){ const t=await visible(p); const c=['Accept order','Accept','Start preparing','Mark as ready','Mark ready','Ready for pickup','Hand over','Handover','Confirm'].find(x=>t.some(y=>y===x||y.startsWith(x))); if(!c){console.log('no action');break;} await tv(c,{exact:false,w:3000}).catch(e=>console.log('fail',c)); await log('act'+i+'_'+c.replace(/\W/g,'')); }
await p.getByText('Payouts',{exact:true}).locator('visible=true').last().click().catch(()=>{}); await p.waitForTimeout(2500); await log('payouts');
await b.close();
