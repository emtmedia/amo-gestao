import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InboxDocumento" (
        "id"               TEXT PRIMARY KEY,
        "descricao"        TEXT NOT NULL,
        "dataVencimento"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "nomeArquivo"      TEXT NOT NULL,
        "tipoArquivo"      TEXT NOT NULL,
        "tamanhoArquivo"   INTEGER NOT NULL,
        "urlArquivo"       TEXT NOT NULL,
        "pathArquivo"      TEXT,
        "origemCaptura"    TEXT NOT NULL DEFAULT 'upload',
        "status"           TEXT NOT NULL DEFAULT 'pendente',
        "enviadoPorId"     TEXT NOT NULL,
        "enviadoPorNome"   TEXT NOT NULL,
        "enviadoPorEmail"  TEXT NOT NULL,
        "createdAt"        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt"        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
