import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChequeReciboAnexo" (
        "id"              TEXT PRIMARY KEY,
        "chequeReciboId"  TEXT NOT NULL REFERENCES "ChequeRecibo"("id") ON DELETE CASCADE,
        "descricao"       TEXT NOT NULL,
        "nomeArquivo"     TEXT NOT NULL,
        "tipoArquivo"     TEXT NOT NULL,
        "tamanhoArquivo"  INTEGER NOT NULL,
        "urlArquivo"      TEXT NOT NULL,
        "pathArquivo"     TEXT,
        "origemCaptura"   TEXT NOT NULL DEFAULT 'upload',
        "valorDocumento"  DOUBLE PRECISION NOT NULL DEFAULT 0,
        "enviadoPorId"    TEXT NOT NULL,
        "enviadoPorNome"  TEXT NOT NULL,
        "enviadoPorEmail" TEXT NOT NULL,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
