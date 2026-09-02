import { readFile } from 'node:fs/promises';

const webhook = await readFile('api/stripe/webhook.js', 'utf8');
const checkout = await readFile('api/stripe/create-checkout-session.js', 'utf8');
const dashboard = await readFile('src/assets/advertiser-dashboard-rc2.js', 'utf8');
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const errors = [];
const need = (ok, message) => { if (!ok) errors.push(message); };

for (const event of ['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','payment_intent.succeeded','payment_intent.payment_failed','charge.refunded']) need(webhook.includes(event), `Webhook missing required event: ${event}`);
need(/STRIPE_WEBHOOK_SECRET/.test(webhook), 'Webhook must require STRIPE_WEBHOOK_SECRET');
need(/timingSafeEqual/.test(webhook), 'Webhook must use timing-safe signature comparison');
need(/createHmac\(['"]sha256['"]/.test(webhook), 'Webhook must verify Stripe HMAC-SHA256 signatures');
need(/300/.test(webhook), 'Webhook must enforce a timestamp tolerance');
need(/SUPABASE_SERVICE_ROLE_KEY/.test(webhook), 'Webhook must use server-only Supabase credentials for billing writeback');
need(/billing_status/.test(webhook) && /payment_reference/.test(webhook), 'Webhook must update campaign billing state and payment reference');

need(/STRIPE_SECRET_KEY/.test(checkout), 'Checkout must require a server-only Stripe secret key');
need(/\/auth\/v1\/user/.test(checkout), 'Checkout must validate the signed-in advertiser');
need(/submitted_by=eq/.test(checkout), 'Checkout must verify campaign ownership');
need(/ad_rate_cards/.test(checkout) && /minimum_spend_cents/.test(checkout), 'Checkout must calculate pricing from the RC2 rate card');
need(/metadata\[campaign_id\]/.test(checkout), 'Checkout must attach campaign metadata for webhook writeback');
need(/success_url/.test(checkout) && /cancel_url/.test(checkout), 'Checkout must define success and cancellation returns');
need(/create-checkout-session/.test(dashboard) && /Pay & continue/.test(dashboard), 'Advertiser dashboard must expose Stripe Checkout for unpaid campaigns');

need(!Array.isArray(vercel.rewrites) || !vercel.rewrites.some(r => String(r.source || '').startsWith('/api/')), 'Vercel must not rewrite API routes to the static placeholder');
for (const route of ['/api/stripe/webhook','/api/stripe/create-checkout-session']) need(vercel.headers?.some(h => h.source === route && h.headers?.some(x => x.key === 'Cache-Control' && /no-store/.test(x.value))), `${route} must be no-store`);

if (errors.length) {
  console.error('Stripe billing gate FAILED:');
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
  process.exit(1);
}
console.log('Stripe billing gate PASSED: signed webhook handling, advertiser authentication, campaign ownership, rate-card pricing, Checkout creation, metadata writeback, and API cache protection are wired.');
