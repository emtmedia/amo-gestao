import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function formatNumero(seq: number) {
  return `RB-${String(seq).padStart(6, '0')}`
}

// GET — returns the next sequence number (preview only, does not reserve)
export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ ultimo: number }[]>`
      SELECT "ultimo" FROM "ReciboContador" WHERE "id" = 1
    `
    const ultimo = rows[0]?.ultimo ?? 0
    return NextResponse.json({ success: true, proximo: formatNumero(ultimo + 1) })
  } catch {
    return NextResponse.json({ success: true, proximo: formatNumero(1) })
  }
}

// POST — atomically increments counter, saves receipt, returns assigned number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Atomically increment and get new sequence
    const rows = await prisma.$queryRaw<{ ultimo: number }[]>`
      UPDATE "ReciboContador"
      SET "ultimo" = "ultimo" + 1
      WHERE "id" = 1
      RETURNING "ultimo"
    `
    const seq = rows[0].ultimo
    const numero = formatNumero(seq)

    await prisma.recibo.create({
      data: {
        numero,
        sequencia: seq,
        data:          body.data,
        hora:          body.hora,
        nomeRecebedor: body.nomeRecebedor,
        cpfRecebedor:  body.cpfRecebedor,
        valor:         parseFloat(body.valor),
        descricao:     body.descricao,
      },
    })

    await logAudit('CRIAR', 'Recibo', numero, `Emitido para ${body.nomeRecebedor}`)
    return NextResponse.json({ success: true, numero })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
