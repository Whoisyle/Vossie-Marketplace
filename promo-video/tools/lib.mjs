import { chromium } from 'playwright-core';
export async function open(opts={}) {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, ...opts })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  return { b, p };
}
export async function signIn(p, base='http://localhost:8092/') {
  await p.goto(base); await p.waitForTimeout(5000);
  await p.getByText('Sign In with Eduvos').click(); await p.waitForTimeout(1200);
  await p.locator('input').fill('eduv230953@vossie.net');
  await p.getByText('Next', { exact: true }).click(); await p.waitForTimeout(3500);
}
export async function visible(p) {
  return p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div,span')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim(); if (!t) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.top >= 0 && r.bottom <= innerHeight + 2 && r.left >= 0 && r.right <= innerWidth + 2 && getComputedStyle(el).visibility !== 'hidden') out.push(t);
    }
    return [...new Set(out)].slice(0, 40);
  });
}
export const IMGP = 'C:/Users/PABAL/Vossie Marketplace Build/projects/Vossie-Marketplace-1/promo-video/shots/s_1acct.png';
export function mk(p, prefix) {
  const log = async n => { const t = (await visible(p)).filter(x => x.length < 46); console.log('##', n, p.url().replace('http://localhost:8092', ''), JSON.stringify(t.slice(0, 26))); await p.screenshot({ path: `shots/${prefix}_${n}.png` }); };
  const tv = async (t, o = {}) => { const l = (t instanceof RegExp ? p.getByText(t) : p.getByText(t, { exact: o.exact ?? true })).locator('visible=true'); const el = o.last ? l.last() : l.first(); await el.waitFor({ state: 'visible', timeout: 6000 }); await el.scrollIntoViewIfNeeded().catch(() => {}); const bx = await el.boundingBox(); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(o.w || 2500); };
  const up = async (label, via = 'Files') => { await tv(label, { w: 1000 }); const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }).catch(() => null), tv(via, { w: 400 }).catch(() => {})]); if (fc) await fc.setFiles(IMGP); await p.waitForTimeout(1500); };
  const slide = async (re) => { const l = p.getByText(re).locator('visible=true').first(); const bx = await l.boundingBox(); const y = bx.y + bx.height / 2; const x0 = 48, x1 = 345; await p.mouse.move(x0, y); await p.mouse.down(); for (let i = 0; i <= 25; i++) { await p.mouse.move(x0 + (x1 - x0) * i / 25, y); await p.waitForTimeout(24); } await p.mouse.up(); await p.waitForTimeout(3200); };
  return { log, tv, up, slide };
}
