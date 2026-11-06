import { chromium } from 'playwright-core';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('CON', m.text()));
await p.goto(url); await p.waitForFunction(() => window.done, null, { timeout: 60000 });
await p.screenshot({ path: out }); await b.close(); console.log('ok');
