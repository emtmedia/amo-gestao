import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DespesaPrebenda" (
        "id"                    TEXT PRIMARY KEY,
        "nomePrebendado"        TEXT NOT NULL,
        "cpfPrebendado"         TEXT NOT NULL,
        "dataPagamento"         TIMESTAMP WITH TIME ZONE NOT NULL,
        "valorPagamento"        DOUBLE PRECISION NOT NULL,
        "contaBancariaId"       TEXT NOT NULL,
        "metodoTransferenciaId" TEXT NOT NULL,
        "mesReferencia"         INTEGER NOT NULL,
        "anoReferencia"         INTEGER NOT NULL,
        "reciboId"              TEXT,
        "observacoes"           TEXT,
        "arquivosReferencia"    TEXT,
        "createdAt"             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt"             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
