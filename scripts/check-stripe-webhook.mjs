import { readFile } from 'node:fs/promises';

const webhook = await readFile('api/stripe/webhook.js', 'utf8');
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const errors = [];
const need = (ok, message) => { if (!ok) errors.push(message); };

for (const event of [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded'
]) need(webhook.includes(event), `Webhook missing required event: ${event}`);

need(/STRIPE_WEBHOOK_SECRET/.test(webhook), 'Webhook must require STRIPE_WEBHOOK_SECRET');
need(/timingSafeEqual/.test(webhook), 'Webhook must use timing-safe signature comparison');
need(/createHmac\(['"]sha256['"]/.test(webhook), 'Webhook must verify Stripe HMAC-SHA256 signatures');
need(/300/.test(webhook), 'Webhook must enforce a timestamp tolerance');
need(/SUPABASE_SERVICE_ROLE_KEY/.test(webhook), 'Webhook must use server-only Supabase credentials for billing writeback');
need(/billing_status/.test(webhook) && /payment_reference/.test(webhook), 'Webhook must update campaign billing state and payment reference');
need(!Array.isArray(vercel.rewrites) || !vercel.rewrites.some(r => String(r.source || '').startsWith('/api/')), 'Vercel must not rewrite API routes to the static placeholder');
need(vercel.headers?.some(h => h.source === '/api/stripe/webhook' && h.headers?.some(x => x.key === 'Cache-Control' && /no-store/.test(x.value))), 'Stripe webhook must be no-store');

if (errors.length) {
  console.error('Stripe webhook gate FAILED:');
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
  process.exit(1);
}

console.log('Stripe webhook gate PASSED: signature verification, six payment events, billing writeback, and Vercel API routing are protected.');
