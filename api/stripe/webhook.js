const crypto = require('node:crypto');

const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded'
]);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        reject(new Error('Webhook payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  const left = Buffer.from(a || '', 'utf8');
  const right = Buffer.from(b || '', 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  if (!signatureHeader || !secret) return false;
  const parts = String(signatureHeader).split(',').map(part => part.trim());
  const timestampPart = parts.find(part => part.startsWith('t='));
  const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3));
  if (!timestampPart || !signatures.length) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  return signatures.some(signature => safeEqual(signature, expected));
}

function campaignIdFor(event) {
  const object = event?.data?.object || {};
  return object?.metadata?.campaign_id || object?.metadata?.ad_campaign_id || null;
}

function billingUpdateFor(event) {
  const object = event?.data?.object || {};
  switch (event.type) {
    case 'checkout.session.completed':
      return object.payment_status === 'paid'
        ? { billing_status: 'paid', payment_reference: object.payment_intent || object.id }
        : { billing_status: 'pending', payment_reference: object.payment_intent || object.id };
    case 'checkout.session.async_payment_succeeded':
    case 'payment_intent.succeeded':
      return { billing_status: 'paid', payment_reference: object.payment_intent || object.id };
    case 'checkout.session.async_payment_failed':
    case 'payment_intent.payment_failed':
      return { billing_status: 'unpaid', payment_reference: object.payment_intent || object.id };
    case 'charge.refunded':
      return { billing_status: 'refunded', payment_reference: object.payment_intent || object.id };
    default:
      return null;
  }
}

async function updateCampaign(campaignId, patch) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase webhook environment is not configured');
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/ad_campaigns?id=eq.${encodeURIComponent(campaignId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase campaign update failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      service: 'drivers-lounge-stripe-webhook',
      mode: process.env.VERCEL_ENV || 'unknown',
      signatureVerification: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      supabaseWriteback: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      handledEvents: Array.from(HANDLED_EVENTS)
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return send(res, 503, { ok: false, error: 'Stripe webhook secret is not configured' });

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    return send(res, 413, { ok: false, error: error.message });
  }

  const signature = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return send(res, 400, { ok: false, error: 'Invalid Stripe signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return send(res, 400, { ok: false, error: 'Invalid JSON payload' });
  }

  if (!event?.id || !event?.type) return send(res, 400, { ok: false, error: 'Invalid Stripe event' });
  if (!HANDLED_EVENTS.has(event.type)) return send(res, 200, { ok: true, received: event.id, ignored: event.type });

  const campaignId = campaignIdFor(event);
  const patch = billingUpdateFor(event);
  if (!campaignId || !patch) {
    return send(res, 200, {
      ok: true,
      received: event.id,
      handled: event.type,
      writeback: 'skipped-no-campaign-metadata'
    });
  }

  try {
    await updateCampaign(campaignId, patch);
    return send(res, 200, { ok: true, received: event.id, handled: event.type, campaignId, billingStatus: patch.billing_status });
  } catch (error) {
    console.error('Stripe webhook writeback failed', { eventId: event.id, eventType: event.type, campaignId, message: error.message });
    return send(res, 500, { ok: false, error: 'Webhook processing failed' });
  }
};
