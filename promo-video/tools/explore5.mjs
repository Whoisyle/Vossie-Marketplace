import { open, signIn } from './lib.mjs';
const { b, p } = await open(); await signIn(p);
const step = async (name, fn) => { try { await fn(); } catch(e){ console.log('FAIL', name, e.message.split('\n')[0]); } await p.waitForTimeout(1800); await p.screenshot({ path: `shots/b_${name}.png` }); console.log(name, p.url().replace('http://localhost:8092','')); };
await step('1food', () => p.getByText('Food',{exact:true}).first().click());
await step('2listing', () => p.getByText('Burger & Chips').first().click());
await step('3add', () => p.getByText(/Add to cart/i).first().click());
await step('4cart', () => p.getByText('Cart',{exact:true}).last().click());
await step('5checkout', () => p.getByText(/Checkout/i).first().click());
await b.close();
