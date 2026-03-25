import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DespesaPrebenda" WHERE id = $1`, params.id
    )
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: rows[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    await prisma.$executeRawUnsafe(
      `UPDATE "DespesaPrebenda" SET
         "nomePrebendado"        = $1,
         "cpfPrebendado"         = $2,
         "dataPagamento"         = $3,
         "valorPagamento"        = $4,
         "contaBancariaId"       = $5,
         "metodoTransferenciaId" = $6,
         "mesReferencia"         = $7,
         "anoReferencia"         = $8,
         "reciboId"              = $9,
         "observacoes"           = $10,
         "arquivosReferencia"    = $11,
         "updatedAt"             = NOW()
       WHERE id = $12`,
      body.nomePrebendado,
      body.cpfPrebendado,
      new Date(body.dataPagamento),
      parseFloat(body.valorPagamento),
      body.contaBancariaId,
      body.metodoTransferenciaId,
      parseInt(body.mesReferencia),
      parseInt(body.anoReferencia),
      body.reciboId || null,
      body.observacoes || null,
      body.arquivosReferencia || null,
      params.id,
    )
    await logAudit('EDITAR', 'DespesaPrebenda', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Buscar o registro
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "reciboId" FROM "DespesaPrebenda" WHERE id = $1`, params.id
    )
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })

    const { reciboId } = rows[0]

    // Verificar se o Recibo vinculado já possui documento assinado
    if (reciboId) {
      const reciboRows = await prisma.$queryRaw<Array<{ docAssinadoUrl: string | null }>>`
        SELECT "docAssinadoUrl" FROM "Recibo" WHERE id = ${reciboId}
      `
      if (reciboRows.length > 0 && reciboRows[0].docAssinadoUrl) {
        return NextResponse.json({
          success: false,
          error: 'Este registro não pode ser excluído pois o Recibo de Pagamento vinculado já possui documento assinado, que constitui evidência do pagamento desta prebenda.'
        }, { status: 400 })
      }
    }

    await prisma.$executeRawUnsafe(`DELETE FROM "DespesaPrebenda" WHERE id = $1`, params.id)
    await logAudit('EXCLUIR', 'DespesaPrebenda', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
