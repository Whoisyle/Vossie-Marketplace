// usage: node tools/render-film.mjs --meta [story]
//        node tools/render-film.mjs <fromFrame> <toFrame> [story]   (env RESUME=1 skips existing frames)
import { chromium } from 'playwright-core';
import fs from 'fs';
const args = process.argv.slice(2);
const meta = args[0] === '--meta';
const story = (meta ? args[1] : args[2]) || 'story';
const FPS = 24, OUT = 'out/render';
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('PAGEERR', e.message.slice(0, 300)));
p.on('console', m => { if (m.type() === 'error') console.log('CON', m.text().slice(0, 200)); });
try {
  await p.goto(`http://localhost:8094/film/index.html?story=${story}`, { timeout: 240000 });
  await p.waitForFunction(() => window.__ready, null, { timeout: 240000 });
  if (meta) {
    const m = await p.evaluate(() => ({
      hits: (window.FILM.hits || []).map(h => ({ ...h })),
      duration: window.FILM.duration, end: window.FILM.end,
      titles: (window.FILM.titles || []).map(t => ({ text: t.text, at: t.at, dur: t.dur })),
      scenes: JSON.parse(JSON.stringify(window.FILM.scenes || {})),
    }));
    fs.mkdirSync('out', { recursive: true });
    fs.writeFileSync('out/film.json', JSON.stringify(m, null, 1));
    console.log('wrote out/film.json duration', m.duration, 'end', m.end);
  } else {
    const from = parseInt(args[0]), to = parseInt(args[1]);
    fs.mkdirSync(OUT, { recursive: true });
    const t0 = Date.now(); let n = 0;
    for (let f = from; f <= to; f++) {
      const file = `${OUT}/f${String(f).padStart(6, '0')}.jpg`;
      if (process.env.RESUME === '1' && fs.existsSync(file) && fs.statSync(file).size > 1000) continue;
      await p.evaluate(t => window.seek(t), f / FPS);
      await p.screenshot({ path: file, type: 'jpeg', quality: 94 });
      n++;
      if (n % 48 === 0) console.log(`frame ${f} (${f - from + 1}/${to - from + 1}) ${((Date.now() - t0) / n / 1000).toFixed(2)}s/frame`);
    }
    console.log('done', from, to, 'rendered', n);
  }
} finally { await b.close(); }
