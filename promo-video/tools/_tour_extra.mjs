
// ================= extra screens for the full tour (appended after the story) =================
const HOLD = 2000; // sleep() multiplies by K, so this is about 3.6 s at the default pace
const hold = (n = 1) => sleep(HOLD * n);
async function openAccountRow(label, { scrollBy = 0 } = {}) {
  await tap('Account', { wait: 1600, last: true });
  await scrollTo(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 8, 500);
  const ok = await tryTap(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), { exact: false, wait: 1800, mouse: true });
  if (!ok) return false;
  mark('row:' + label);
  await hold();
  if (scrollBy) { await scroll(scrollBy, 2200); await hold(0.6); }
  return true;
}
async function logAccount(tag) {
  await tap('Account', { wait: 1600, last: true });
  for (let i = 0; i < 6; i++) { log(tag, 'texts@' + i, JSON.stringify((await visibleText()).slice(0, 40))); await scroll(420, 800); }
}

await section('x-buyer', async () => {
  await switchRole('Buyer'); await sleep(1500);
  await tap('Explore', { wait: 1800, last: true }); mark('x:explore'); await hold(); await scroll(420, 2200); await hold(0.8); await scroll(420, 2200); await hold(0.8);
  await tap('Reels', { wait: 1800, last: true }); mark('x:reels'); await hold(2); await wheel(600, 2500); await hold(1.4);
  await tap('Activity', { wait: 1800, last: true }); mark('x:activity'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tryTap(/My Orders|All orders|See all/i, { exact: false, wait: 1800 }); await hold();
  await tap('Cart', { wait: 1800, last: true }); mark('x:cart'); await hold();
  await tap('Home', { wait: 1800, last: true }); mark('x:home'); await hold(); await scroll(450, 2400); await hold(0.8); await scroll(450, 2400); await hold(0.8);
  for (const row of ['Edit Profile', 'Wallet', 'Vossie Points', 'Coupons and offers', 'Refer friends', 'Subscriptions', 'Wishlist and saved searches', 'Campus extras', 'Safety', 'Security and Settings', 'Help', 'Terms and conditions']) {
    await openAccountRow(row, { scrollBy: 380 });
  }
});

await section('x-seller', async () => {
  await switchRole('Seller'); await sleep(2000);
  mark('x:sellerHome'); await hold(); await scroll(420, 2200); await hold(0.8); await scroll(420, 2200); await hold(0.8);
  await tap('Products', { wait: 1800, last: true }); mark('x:products'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tap('Orders', { wait: 1800, last: true }); mark('x:orders'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tap('Payouts', { wait: 1800, last: true }); mark('x:payouts'); await hold(); await scroll(420, 2200); await hold(0.8);
  await logAccount('seller-account');
});

await section('x-courier', async () => {
  await switchRole('Courier'); await sleep(2000);
  mark('x:courierHome'); await hold(); await scroll(420, 2200); await hold(0.8);
  await tap('Jobs', { wait: 1800, last: true }); mark('x:jobs'); await hold(); await scroll(300, 1800); await hold(0.6);
  await tap('Active', { wait: 1800, last: true }); mark('x:active'); await hold();
  await tap('Earnings', { wait: 1800, last: true }); mark('x:earnings'); await hold(); await scroll(420, 2200); await hold(0.8);
  await logAccount('courier-account');
});

await section('x-ops', async () => {
  await switchRole('Buyer'); await sleep(1500);
  await tap('Account', { wait: 1600, last: true });
  await scrollTo(/Vossie Operations/, 8, 500);
  await tap(/Vossie Operations/, { exact: false, wait: 2400, mouse: true }); mark('x:opsHub'); await hold(1.4); await scroll(420, 2200); await hold(0.8);
  await tap('Transfers', { wait: 2000, last: true }); mark('x:opsTransfers'); await hold(1.4);
  await tap('Incubation', { wait: 2000, last: true }); mark('x:opsIncubation'); await hold(1.4);
  await tap('Log', { wait: 2000, last: true }); mark('x:opsLog'); await hold(1.4); await scroll(380, 2200); await hold(0.8);
});

