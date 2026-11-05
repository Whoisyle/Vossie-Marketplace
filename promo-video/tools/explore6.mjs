import { open, signIn } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const step = async (name, fn) => { try { await fn(); } catch(e){ console.log('FAIL', name, e.message.split('\n')[0]); } await p.waitForTimeout(2000); await p.screenshot({ path: `shots/s_${name}.png` }); console.log(name, p.url().replace('http://localhost:8092','')); };
await step('1acct', () => p.getByText('Account',{exact:true}).last().click());
await step('2switch', () => p.getByText('Switch role').first().click());
await step('3seller', () => p.getByText(/Seller/).first().click());
await step('4after', () => p.waitForTimeout(500));
await b.close();
