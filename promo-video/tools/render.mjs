// Deterministic frame renderer for pitch/compose.html
// usage: node tools/render.mjs --meta                      -> writes out/film.json
//        node tools/render.mjs <fromFrame> <toFrame> [fps] -> writes out/render/f%06d.jpg (inclusive from, exclusive to)
//        node tools/render.mjs --at 12.5 name.jpg          -> single test frame to shots/name
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const args = process.argv.slice(2);
const URL = 'http://localhost:8093/compose.html';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=CalculateNativeWinOcclusion', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto(URL);
await page.waitForFunction(() => window.__ready, null, { timeout: 240000 });

if (args[0] === '--meta') {
  const film = await page.evaluate(() => { const F = window.FILM; return { hits: F.hits, duration: F.duration, end: F.end, scenes: F.scenes, titles: (F.titles || []).map(t => ({ text: t.text, at: t.at, dur: t.dur })) }; });
  fs.mkdirSync('out', { recursive: true });
  fs.writeFileSync('out/film.json', JSON.stringify(film, null, 1));
  console.log('film duration', film.duration.toFixed(1), 'end', film.end?.toFixed(1), 'hits', film.hits.length);
} else if (args[0] === '--at') {
  const t = parseFloat(args[1]);
  await page.evaluate(t => window.seek(t), t);
  await page.screenshot({ path: 'shots/' + args[2], type: 'jpeg', quality: 90 });
  console.log('wrote shots/' + args[2]);
} else {
  const from = parseInt(args[0], 10), to = parseInt(args[1], 10), fps = parseFloat(args[2] || '24');
  fs.mkdirSync('out/render', { recursive: true });
  const t0 = Date.now();
  const RESUME = process.env.RESUME === '1';
  let skipped = 0;
  for (let f = from; f < to; f++) {
    const fp = `out/render/f${String(f).padStart(6, '0')}.jpg`;
    if (RESUME) { try { if (fs.statSync(fp).size > 1000) { skipped++; continue; } } catch {} }
    await page.evaluate(t => window.seek(t), f / fps);
    await page.screenshot({ path: fp, type: 'jpeg', quality: 94 });
    if ((f - from) % 48 === 0) console.log(`frame ${f}/${to} (${((Date.now() - t0) / 1000 / Math.max(1, f - from + 1)).toFixed(2)} s/frame)`);
  }
  console.log('done', from, to, 'skipped', skipped);
}
await b.close();
