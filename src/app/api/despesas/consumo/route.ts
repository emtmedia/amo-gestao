import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.despesaConsumo.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateFields = ['dataVencimento', 'dataPagamento']
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === 'string') body[f] = new Date(body[f]).toISOString()
    }
    const numFields = ['valorTitulo', 'valorLocacao', 'valorPagamento']
    for (const f of numFields) {
      if (body[f] !== undefined) body[f] = parseFloat(body[f])
    }
    const optionals = ['observacoes', 'arquivosReferencia', 'projetoDirecionado', 'eventoDirecionado']
    for (const f of optionals) {
      if (body[f] === '') body[f] = null
    }
    const item = await prisma.despesaConsumo.create({ data: body })
    await logAudit("CRIAR", "Despesa Consumo", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST /api/despesas/consumo error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
