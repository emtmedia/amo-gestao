import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function formatNumero(seq: number) {
  const ano = new Date().getFullYear()
  return `N° ${String(seq).padStart(4, '0')}/${ano}`
}

// GET — retorna lista de todos os termos + próximo número
export async function GET() {
  try {
    type TermoRow = {
      id: string; numero: string; sequencia: number
      voluntarioId: string; voluntarioNome: string; voluntarioCpf: string
      projetoNome: string | null; eventoNome: string | null
      emitidoEm: Date; createdAt: Date
      docAssinadoUrl: string | null; docAssinadoPath: string | null; docAssinadoNome: string | null
    }
    const [items, rows] = await Promise.all([
      prisma.$queryRaw<TermoRow[]>`SELECT * FROM "TermoVoluntariado" ORDER BY sequencia DESC`,
      prisma.$queryRaw<{ ultimo: number }[]>`SELECT "ultimo" FROM "TermoVoluntariadoContador" WHERE "id" = 1`,
    ])
    const ultimo = rows[0]?.ultimo ?? 0
    return NextResponse.json({ success: true, data: items, proximo: formatNumero(ultimo + 1) })
  } catch {
    return NextResponse.json({ success: true, data: [], proximo: formatNumero(1) })
  }
}

// POST — incrementa contador, salva histórico, retorna número atribuído
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const rows = await prisma.$queryRaw<{ ultimo: number }[]>`
      UPDATE "TermoVoluntariadoContador"
      SET "ultimo" = "ultimo" + 1
      WHERE "id" = 1
      RETURNING "ultimo"
    `
    const seq = rows[0].ultimo
    const numero = formatNumero(seq)

    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TermoVoluntariado" (
        "id", "numero", "sequencia",
        "voluntarioId", "voluntarioNome", "voluntarioCpf",
        "projetoNome", "eventoNome",
        "emitidoEm", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
    `, id, numero, seq,
       body.voluntarioId, body.voluntarioNome, body.voluntarioCpf,
       body.projetoNome ?? null, body.eventoNome ?? null)

    await logAudit('CRIAR', 'Termo de Voluntariado', numero, `Emitido para ${body.voluntarioNome}`)
    return NextResponse.json({ success: true, numero })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
