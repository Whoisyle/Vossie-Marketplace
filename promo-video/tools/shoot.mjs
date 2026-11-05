import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
p.on('pageerror', e => console.log('ERR', e.message));
p.on('console', m => m.type()==='error' && console.log('CONSOLE', m.text()));
await p.goto('http://localhost:8090/');
await p.waitForTimeout(800);
await p.screenshot({ path: 'shots/p_intro.png' });
await p.keyboard.press('Space');
for (const [i,ms] of [[1,4500],[2,7000],[3,4000]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `shots/p_a1_${i}.png` }); }
// jump to chapters
await p.evaluate(()=>window.__pitch.gotoPos(3)); await p.waitForTimeout(6000); await p.screenshot({ path: 'shots/p_d2.png' });
await p.keyboard.press('f'); await p.waitForTimeout(500); await p.screenshot({ path: 'shots/p_fb.png' });
await p.evaluate(()=>window.__pitch.gotoPos(13)); await p.waitForTimeout(12000); await p.screenshot({ path: 'shots/p_fin.png' });
await b.close();
