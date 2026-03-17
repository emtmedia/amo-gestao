import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.despesaServicoExterno.findMany({ orderBy: { createdAt: 'desc' } })
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
      servicoPrestadoId:     body.servicoPrestadoId,
      dataPagamento:         body.dataPagamento ? new Date(body.dataPagamento).toISOString() : null,
      valor:                 parseFloat(body.valor ?? body.valorTitulo ?? 0),
      metodoTransferenciaId: body.metodoTransferenciaId,
      contaBancariaId:       body.contaBancariaId     || null,
      projetoDirecionado:    body.projetoDirecionado   || null,
      eventoDirecionado:     body.eventoDirecionado    || null,
      observacoes:           body.observacoes          || null,
      arquivosReferencia:    body.arquivosReferencia   || null,
    }
    const item = await prisma.despesaServicoExterno.create({ data })
    await logAudit("CRIAR", "Despesa Externo", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST /api/despesas/externos error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
