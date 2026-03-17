import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.despesaServicoExterno.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const data = {
      fornecedorId:          body.fornecedorId,
      servicoPrestadoId:     body.servicoPrestadoId,
      dataPagamento:         body.dataPagamento ? new Date(body.dataPagamento).toISOString() : undefined,
      valor:                 parseFloat(body.valor ?? body.valorTitulo ?? 0),
      metodoTransferenciaId: body.metodoTransferenciaId,
      contaBancariaId:       body.contaBancariaId     || null,
      projetoDirecionado:    body.projetoDirecionado   || null,
      eventoDirecionado:     body.eventoDirecionado    || null,
      observacoes:           body.observacoes          || null,
      arquivosReferencia:    body.arquivosReferencia   || null,
    }
    const item = await prisma.despesaServicoExterno.update({ where: { id: params.id }, data })
    await logAudit("EDITAR", "Despesa Externo", params.id)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('PUT despesaExterno error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.despesaServicoExterno.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Despesa Externo", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao deletar' }, { status: 500 })
  }
}
