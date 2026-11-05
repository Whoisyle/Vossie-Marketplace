import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: 'out/raw', size: { width: 1920, height: 1080 } } });
const p = await ctx.newPage();
await p.goto('http://localhost:8090/');
await p.addStyleTag({ content: '#hud,#help,#bar{display:none!important}' });
await p.waitForTimeout(500);
await p.keyboard.press('a');
// Act I ends when it advances to chapter 1 (HUD cue becomes REVEAL)
await p.waitForFunction(() => document.querySelector('#h-cue').textContent === 'REVEAL', null, { timeout: 420000 });
await p.waitForTimeout(500);
await ctx.close(); await b.close();
