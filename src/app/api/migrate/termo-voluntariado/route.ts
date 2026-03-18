import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Tabela de contador
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TermoVoluntariadoContador" (
        "id"     INTEGER PRIMARY KEY DEFAULT 1,
        "ultimo" INTEGER NOT NULL DEFAULT 0
      )
    `)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "TermoVoluntariadoContador" ("id", "ultimo")
      VALUES (1, 0)
      ON CONFLICT ("id") DO NOTHING
    `)

    // Tabela de histórico de termos emitidos
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TermoVoluntariado" (
        "id"             TEXT PRIMARY KEY,
        "numero"         TEXT UNIQUE NOT NULL,
        "sequencia"      INTEGER NOT NULL,
        "voluntarioId"   TEXT NOT NULL,
        "voluntarioNome" TEXT NOT NULL,
        "voluntarioCpf"  TEXT NOT NULL,
        "projetoNome"    TEXT,
        "eventoNome"     TEXT,
        "emitidoEm"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "createdAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
