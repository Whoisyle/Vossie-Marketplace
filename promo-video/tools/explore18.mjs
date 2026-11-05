import { open, signIn, visible } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const IMG = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
const log = async n => { console.log('##', n, p.url().replace('http://localhost:8092',''), JSON.stringify((await visible(p)).filter(x=>x.length<46).slice(0,34))); await p.screenshot({ path: `shots/cc_${n}.png` }); };
const tv = async (t,o={}) => { await p.getByText(t,{exact:o.exact??true}).locator('visible=true').first().click(); await p.waitForTimeout(o.w||2800); };
const mc = async (loc) => { const bx = await loc.boundingBox(); await p.mouse.click(bx.x+bx.width/2, bx.y+bx.height/2); await p.waitForTimeout(2800); };
const slide = async (re) => { const l=p.getByText(re).locator('visible=true').first(); const bx=await l.boundingBox(); const y=bx.y+bx.height/2; const x0=bx.x+bx.width/2-150, x1=bx.x+bx.width/2+150; await p.mouse.move(x0,y); await p.mouse.down(); for(let i=0;i<=25;i++){ await p.mouse.move(x0+(x1-x0)*i/25,y); await p.waitForTimeout(24);} await p.mouse.up(); await p.waitForTimeout(3500); };
const up = async (label, via='Files') => { await tv(label,{w:1000}); const [fc] = await Promise.all([p.waitForEvent('filechooser',{timeout:4000}).catch(()=>null), tv(via,{w:400}).catch(()=>{})]); if (fc) await fc.setFiles(IMG); await p.waitForTimeout(1500); };
await tv('Account',{w:1500}); await tv('Switch role',{exact:false,w:1200}); await tv('Courier',{w:5000});
await tv('Become a courier',{w:2500});
const ins=p.locator('input:visible'); await ins.nth(0).fill('Vumisa Dlamini'); await ins.nth(1).fill('0821234567');
await tv('Car',{w:1500}); await tv('Choose',{w:1500}); await tv('Toyota',{w:1300}); await tv('Choose',{w:1500}); await tv('Corolla',{w:1300}); await tv('Choose',{w:1500}); await tv('White',{w:1300});
{ const i2=p.locator('input:visible'); await i2.nth(2).fill('CA 123 456'); await i2.nth(3).fill('8012345678'); } await log('carfilled');
await tv('Continue',{w:3000}); await up('ID document'); await up('Selfie check','Photo library'); await up('Driving licence');
{ const d=p.locator('input:visible'); console.log('verify inputs', await d.count()); if (await d.count()) { await d.first().fill('30/06/2031'); } }
await log('licence'); await tv('Submit for review',{w:4000}); await log('avail');
await tv('Every day',{w:1500}); await log('everyday');
await tv('Finish',{w:3000}); await p.getByText('Go to dashboard').locator('visible=true').first().waitFor({timeout:25000}); await log('approved'); await slide(/Go to dashboard/);
await log('home');
const sw = p.locator('[role=switch]').locator('visible=true').first(); console.log('switch count', await p.locator('[role=switch]').count());
await sw.click().catch(e=>console.log('sw fail')); await p.waitForTimeout(3500); await log('online');
await p.waitForTimeout(12000); await log('wait');
await slide(/Slide to accept/); await log('accepted');
await p.waitForTimeout(2500);
{ const d=p.locator('input:visible'); console.log('active inputs', await d.count()); if (await d.count()) await d.first().fill('3091'); }
await p.waitForTimeout(800);
{ await tv('Take a photo of the parcel',{w:1000}); const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}).catch(()=>null), p.getByText(/Photo library|Files|Choose/,{exact:false}).locator('visible=true').first().click().catch(()=>{})]); if(fc) await fc.setFiles(IMG); await p.waitForTimeout(1500); }
await log('codephoto');
await mc(p.getByText(/Order label matches/).locator('visible=true').first()); await mc(p.getByText(/Parcel sealed/).locator('visible=true').first());
await log('ticked');
await mc(p.getByText('Confirm collection',{exact:false}).locator('visible=true').first()); await log('collected');
{ const t0=Date.now(); for (let k=0;k<60;k++){ if(!(await p.getByText(/Keep going/).locator('visible=true').count())) break; await p.waitForTimeout(2000); } console.log('WAITED', (Date.now()-t0)/1000); await log('arrived'); }
for (let i=0;i<8;i++){
  const cands=[/Slide to [a-z ]+/i,/^Start delivery/i,/^Scan/i,/^Arrived/i,/^Confirm (delivery|drop)/i,/^Complete/i,/^Deliver/i,/^Mark/i,/^Done$/i,/^Finish/i];
  let found=null; for (const re of cands){ const l=p.getByText(re).locator('visible=true'); if(await l.count()){ found={txt:await l.first().innerText()}; break; } }
  console.log('STATE', i, found&&found.txt); if(!found) break;
  if (/^Slide to/i.test(found.txt)) await slide(new RegExp(found.txt.replace(/[^a-zA-Z ]/g,''),'i')); else await mc(p.getByText(found.txt,{exact:true}).locator('visible=true').first());
  await log('d'+i);
}
await b.close();
