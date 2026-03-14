import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.metodoTransferencia.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await prisma.metodoTransferencia.create({ data: body })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao criar registro' }, { status: 500 })
  }
}
