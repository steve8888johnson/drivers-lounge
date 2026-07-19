import {NextResponse} from 'next/server';import {petitions} from '../../../lib/data';
export async function GET(){return NextResponse.json({data:petitions});}
export async function POST(request){const body=await request.json();if(!body.slug||!body.signerName||!body.email)return NextResponse.json({error:'slug, signerName and email are required'},{status:400});return NextResponse.json({data:{verified:false,message:'Verification email would be sent in production.'}},{status:201});}
