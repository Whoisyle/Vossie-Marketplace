// usage: node tools/wordmark.mjs <out.png> <width_px>   Renders film/wordmark.svg in ivory on a transparent background.
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
const [out, w] = [process.argv[2], Number(process.argv[3])];
const svg = 'data:image/svg+xml;base64,' + fs.readFileSync(path.resolve('film/wordmark.svg')).toString('base64');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: w, height: Math.round(w * 0.36) } });
await p.setContent(`<body style="margin:0"><img src="${svg}" style="width:${w}px;filter:brightness(0) invert(.95)"></body>`);
await p.waitForTimeout(600);
await p.screenshot({ path: out, omitBackground: true });
await b.close();
