import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function formatNumero(seq: number) {
  const ano = new Date().getFullYear()
  return `CR-${String(seq).padStart(3, '0')}/${ano}`
}

// GET — list all records + next sequence number (preview)
export async function GET() {
  try {
    const [items, rows] = await Promise.all([
      prisma.chequeRecibo.findMany({ orderBy: { sequencia: 'desc' } }),
      prisma.$queryRaw<{ ultimo: number }[]>`
        SELECT "ultimo" FROM "ChequeReciboContador" WHERE "id" = 1
      `,
    ])
    const ultimo = rows[0]?.ultimo ?? 0
    return NextResponse.json({
      success: true,
      data: items,
      proximo: formatNumero(ultimo + 1),
    })
  } catch {
    return NextResponse.json({ success: true, data: [], proximo: formatNumero(1) })
  }
}

// POST — atomically increment counter, save record, return assigned number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const countRows = await prisma.$queryRaw<{ ultimo: number }[]>`
      UPDATE "ChequeReciboContador"
      SET "ultimo" = "ultimo" + 1
      WHERE "id" = 1
      RETURNING "ultimo"
    `
    const seq = countRows[0].ultimo
    const numero = formatNumero(seq)

    const item = await prisma.chequeRecibo.create({
      data: {
        numero,
        sequencia: seq,
        nomeOperador: body.nomeOperador,
        dataTransferencia: new Date(body.dataTransferencia),
        valorConcedido: parseFloat(body.valorConcedido),
        metodoTransferencia: body.metodoTransferencia || 'Espécie',
        nomeRecebedor: body.nomeRecebedor,
        cpfRecebedor: body.cpfRecebedor,
        dataAcertoNotas: new Date(body.dataAcertoNotas),
        observacoes: body.observacoes || null,
      },
    })

    await logAudit('CRIAR', 'ChequeRecibo', numero, `Emitido para ${body.nomeRecebedor}`)
    return NextResponse.json({ success: true, id: item.id, numero })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
