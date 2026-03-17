import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.despesaCopaCozinha.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = {
      fornecedorId:          body.fornecedorId,
      itemCopaCozinhaId:     body.itemCopaCozinhaId,
      dataPagamento:         body.dataPagamento ? new Date(body.dataPagamento).toISOString() : null,
      valorPagamento:        parseFloat(body.valorPagamento ?? body.valorTitulo ?? 0),
      metodoTransferenciaId: body.metodoTransferenciaId,
      contaBancariaId:       body.contaBancariaId     || null,
      projetoDirecionado:    body.projetoDirecionado   || null,
      eventoDirecionado:     body.eventoDirecionado    || null,
      observacoes:           body.observacoes          || null,
      arquivosReferencia:    body.arquivosReferencia   || null,
    }
    const item = await prisma.despesaCopaCozinha.create({ data })
    await logAudit("CRIAR", "Despesa Copa", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST /api/despesas/copa-cozinha error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
