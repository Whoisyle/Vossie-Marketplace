import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 })).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
const txt = async () => (await p.innerText('body')).replace(/\n+/g,' | ').slice(0,260);
const snap = async n => { await p.screenshot({ path: `shots/x_${n}.png` }); console.log(n, p.url().replace('http://localhost:8092',''), '::', await txt()); };
await p.goto('http://localhost:8092/'); await p.waitForTimeout(6000); await snap('0welcome');
await p.getByText('Sign In with Eduvos').click(); await p.waitForTimeout(1500);
await p.locator('input').fill('eduv230953@vossie.net');
await p.getByText('Next', { exact: true }).click(); await p.waitForTimeout(3000); await snap('1after-next');
for (let i=2;i<7;i++){ const btns = await p.getByRole('button').allInnerTexts().catch(()=>[]); console.log('buttons', btns.slice(0,12)); await p.waitForTimeout(2500); await snap(i+'step'); if (/Home|Explore/.test(await txt()) && p.url().includes('/home')) break; }
await b.close();
