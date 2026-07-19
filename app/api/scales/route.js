import {NextResponse} from 'next/server';import {scales} from '../../../lib/data';
export async function GET(){return NextResponse.json({data:scales,source:'prototype'});}
export async function POST(request){const body=await request.json();if(!body.placeId||!body.status)return NextResponse.json({error:'placeId and status are required'},{status:400});return NextResponse.json({data:{id:crypto.randomUUID(),...body,createdAt:new Date().toISOString() }},{status:201});}
