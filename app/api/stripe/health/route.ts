import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){const configured=Boolean(process.env.STRIPE_SECRET_KEY);const webhookConfigured=Boolean(process.env.STRIPE_WEBHOOK_SECRET);const serviceRoleConfigured=Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);return NextResponse.json({stripe:configured?'configured':'missing',webhook:webhookConfigured?'configured':'missing',supabaseAdmin:serviceRoleConfigured?'configured':'missing'},{headers:{'cache-control':'no-store'}})}
