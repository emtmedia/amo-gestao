import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ufId = searchParams.get('ufId')
    const items = await prisma.cidade.findMany({
      where: ufId ? { ufId } : undefined,
      orderBy: { nome: 'asc' },
      include: { uf: { select: { codigo: true, nome: true } } },
      distinct: ['nome', 'ufId'],
    })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Prevent duplicate city for same UF
    const existing = await prisma.cidade.findFirst({
      where: { nome: body.nome, ufId: body.ufId }
    })
    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }
    const item = await prisma.cidade.create({
      data: body,
      include: { uf: { select: { codigo: true, nome: true } } }
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao criar registro' }, { status: 500 })
  }
}
