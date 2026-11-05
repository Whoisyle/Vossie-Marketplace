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
const mc = async (loc) => { const bx = await loc.boundingBox(); await p.mouse.click(bx.x+bx.width/2, bx.y+bx.height/2); await p.waitForTimeout(2800); };
await p.getByText('Orders',{exact:true}).locator('visible=true').last().click(); await p.waitForTimeout(2500);
await mc(p.getByText('Accept',{exact:true}).locator('visible=true').first()); await log('accepted1');
const slide = async (re) => { const l=p.getByText(re).locator('visible=true').first(); const bx=await l.boundingBox(); const y=bx.y+bx.height/2; const x0=bx.x+bx.width/2-150, x1=bx.x+bx.width/2+150; await p.mouse.move(x0,y); await p.mouse.down(); for(let i=0;i<=25;i++){ await p.mouse.move(x0+(x1-x0)*i/25,y); await p.waitForTimeout(24);} await p.mouse.up(); await p.waitForTimeout(3500); };
const cands=[/Slide to [a-z ]+/i,/^Start packing/i,/^Start preparing/i,/^Mark (as )?(packed|ready)/i,/^Ready for/i,/^Hand ?over/i,/^Confirm/i,/^Complete/i,/^Done$/i,/^Print/i,/^Scan/i];
for (let i=0;i<7;i++){
  let found=null;
  for (const re of cands){ const l=p.getByText(re).locator('visible=true'); if (await l.count()) { found={re,txt:await l.first().innerText()}; break; } }
  console.log('STATE', i, found && found.txt);
  if(!found) break;
  if (/^Slide to/i.test(found.txt)) { await slide(new RegExp(found.txt.replace(/[^a-zA-Z ]/g,''),'i')); } else { await mc(p.getByText(found.txt,{exact:true}).locator('visible=true').first()); }
  await log('s'+i);
}
await mc(p.getByText('Payouts',{exact:true}).locator('visible=true').last()); await log('payouts');
await mc(p.getByText('Request payout',{exact:true}).locator('visible=true').first()); await log('payoutreq');
await b.close();
