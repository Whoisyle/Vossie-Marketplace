import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await (await b.newContext({ viewport: { width: 393, height: 852 } })).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:8092/'); await p.waitForTimeout(5000);
await p.getByText('Sign In with Eduvos').click(); await p.waitForTimeout(1200);
await p.locator('input').fill('eduv230953@vossie.net');
await p.getByText('Next', { exact: true }).click(); await p.waitForTimeout(3500);
const t = async () => (await p.innerText('body')).replace(/\n+/g,' | ').slice(0,420);
for (const tab of ['Reels','Explore','Activity','Cart','Account']) { await p.getByText(tab,{exact:true}).last().click(); await p.waitForTimeout(2200); console.log('##',tab,p.url().replace('http://localhost:8092',''),'::',await t()); await p.screenshot({ path: `shots/t_${tab}.png` }); }
await b.close();
