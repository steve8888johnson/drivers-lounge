import {NextResponse} from 'next/server';import {jobs} from '../../../lib/data';
export async function GET(){return NextResponse.json({data:jobs});}
export async function POST(request){const body=await request.json();if(!body.title||!body.origin||!body.destination)return NextResponse.json({error:'title, origin and destination are required'},{status:400});return NextResponse.json({data:{id:crypto.randomUUID(),...body,createdAt:new Date().toISOString()}},{status:201});}
