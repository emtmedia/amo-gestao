import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.chequeRecibo.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    delete body.id; delete body.createdAt; delete body.updatedAt
    delete body.numero; delete body.sequencia

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (prisma.chequeRecibo.update as any)({
      where: { id: params.id },
      data: {
        nomeOperador: body.nomeOperador,
        dataTransferencia: new Date(body.dataTransferencia),
        valorConcedido: parseFloat(body.valorConcedido),
        metodoTransferencia: body.metodoTransferencia || 'Espécie',
        nomeRecebedor: body.nomeRecebedor,
        cpfRecebedor: body.cpfRecebedor,
        dataAcertoNotas: new Date(body.dataAcertoNotas),
        observacoes: body.observacoes || null,
        projetoId: body.projetoId || null,
        eventoId: body.eventoId || null,
      },
    })
    await logAudit('EDITAR', 'ChequeRecibo', params.id)
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.chequeRecibo.delete({ where: { id: params.id } })
    await logAudit('EXCLUIR', 'ChequeRecibo', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
