import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8091/');
await p.waitForTimeout(6000);
await p.getByText('Sign In with Eduvos').click();
await p.waitForTimeout(2000);
await p.locator('input').fill('eduv230953@vossie.net');
await p.getByText('Next', { exact: true }).click();
for (let i = 0; i < 6; i++) { await p.waitForTimeout(2500); console.log(i, p.url(), (await p.innerText('body')).replace(/\n/g,' | ').slice(0, 160)); await p.screenshot({ path: `shots/_c${i}.png` }); }
await b.close();
