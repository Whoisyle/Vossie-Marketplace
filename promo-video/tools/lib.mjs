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
