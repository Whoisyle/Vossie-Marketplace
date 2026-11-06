// usage: node tools/frame3d.mjs <story-dir> <t1,t2,...>   -> shots/film_<t>.jpg
import { chromium } from 'playwright-core';
const [story, ts] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 300))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('CON', m.text().slice(0, 200)); });
await p.goto(`http://localhost:8094/film/index.html?story=${story}`);
await p.waitForFunction(() => window.__ready, null, { timeout: 90000 });
console.log('duration', await p.evaluate(() => window.FILM.duration));
for (const t of ts.split(',')) { await p.evaluate(t => window.seek(t), parseFloat(t)); await p.screenshot({ path: `shots/film_${t}.jpg`, type: 'jpeg', quality: 90 }); console.log('shot', t); }
await b.close();
