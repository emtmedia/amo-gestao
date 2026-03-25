import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

type CRRow = {
  id: string; numero: string; sequencia: number; nomeOperador: string;
  dataTransferencia: Date; valorConcedido: number; metodoTransferencia: string;
  nomeRecebedor: string; cpfRecebedor: string; dataAcertoNotas: Date;
  observacoes: string | null; projetoId: string | null; eventoId: string | null;
  createdAt: Date; updatedAt: Date;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<CRRow[]>`
      SELECT id, numero, sequencia, "nomeOperador", "dataTransferencia", "valorConcedido",
             "metodoTransferencia", "nomeRecebedor", "cpfRecebedor", "dataAcertoNotas",
             observacoes, "projetoId", "eventoId", "createdAt", "updatedAt"
      FROM "ChequeRecibo" WHERE id = ${params.id}
    `
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: rows[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const dataTransferencia = new Date(body.dataTransferencia)
    const valorConcedido    = parseFloat(body.valorConcedido)
    const dataAcertoNotas   = new Date(body.dataAcertoNotas)
    const observacoes       = body.observacoes   || null
    const projetoId         = body.projetoId     || null
    const eventoId          = body.eventoId      || null

    await prisma.$executeRaw`
      UPDATE "ChequeRecibo" SET
        "nomeOperador"        = ${body.nomeOperador},
        "dataTransferencia"   = ${dataTransferencia},
        "valorConcedido"      = ${valorConcedido},
        "metodoTransferencia" = ${body.metodoTransferencia || 'Espécie'},
        "nomeRecebedor"       = ${body.nomeRecebedor},
        "cpfRecebedor"        = ${body.cpfRecebedor},
        "dataAcertoNotas"     = ${dataAcertoNotas},
        "observacoes"         = ${observacoes},
        "projetoId"           = ${projetoId},
        "eventoId"            = ${eventoId},
        "updatedAt"           = NOW()
      WHERE id = ${params.id}
    `

    await logAudit('EDITAR', 'ChequeRecibo', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verifica se CR possui documento assinado antes de arquivar
    const crRows = await prisma.$queryRaw<Array<{ docAssinadoUrl: string | null }>>`
      SELECT "docAssinadoUrl" FROM "ChequeRecibo" WHERE id = ${params.id}
    `
    if (!crRows.length) return NextResponse.json({ success: false, error: 'Cheque-Recibo não encontrado' }, { status: 404 })
    if (!crRows[0].docAssinadoUrl) {
      return NextResponse.json({
        success: false,
        error: 'É necessário anexar o CR assinado antes de arquivar. Use o AMO Scan ou o botão de doc. assinado na listagem.'
      }, { status: 400 })
    }

    await prisma.$executeRaw`
      UPDATE "ChequeRecibo"
      SET "arquivado" = true, "arquivadoEm" = NOW(), "updatedAt" = NOW()
      WHERE id = ${params.id}
    `
    await logAudit('ARQUIVAR', 'ChequeRecibo', params.id)
    return NextResponse.json({ success: true })
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
