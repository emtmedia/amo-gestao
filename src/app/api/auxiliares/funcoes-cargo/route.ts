import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await prisma.funcaoCargoVoluntario.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json({ success: true, data })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const { nome } = await req.json()
    const item = await prisma.funcaoCargoVoluntario.create({ data: { nome, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}
