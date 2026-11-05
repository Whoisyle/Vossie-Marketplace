import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 } })).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8092/'); await p.waitForTimeout(5000);
await p.getByText('Sign In with Eduvos').click(); await p.waitForTimeout(1200);
await p.locator('input').fill('eduv230953@vossie.net');
await p.getByText('Next', { exact: true }).click(); await p.waitForTimeout(3500);
const go = async (path) => { await p.evaluate(pth => { history.pushState({}, '', pth); dispatchEvent(new PopStateEvent('popstate')); }, path); await p.waitForTimeout(2500); const t=(await p.innerText('body')).replace(/\n+/g,' | ').slice(0,150); console.log(path, '=>', p.url().replace('http://localhost:8092',''), '::', t); };
console.log('tabbar', await p.locator('[role=tab],[role=link]').allInnerTexts());
for (const path of ['/reels','/explore','/cart','/activity','/account','/seller/home','/courier/home']) { await go(path); await p.screenshot({ path: `shots/n_${path.replace(/\//g,'_')}.png` }); }
await b.close();
