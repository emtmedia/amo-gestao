import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ReciboContador" (
        "id"     INTEGER PRIMARY KEY DEFAULT 1,
        "ultimo" INTEGER NOT NULL DEFAULT 0
      )
    `)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ReciboContador" ("id", "ultimo")
      VALUES (1, 0)
      ON CONFLICT ("id") DO NOTHING
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Recibo" (
        "id"            TEXT PRIMARY KEY,
        "numero"        TEXT UNIQUE NOT NULL,
        "sequencia"     INTEGER NOT NULL,
        "data"          TEXT NOT NULL,
        "hora"          TEXT NOT NULL,
        "nomeRecebedor" TEXT NOT NULL,
        "cpfRecebedor"  TEXT NOT NULL,
        "valor"         DOUBLE PRECISION NOT NULL,
        "descricao"     TEXT NOT NULL,
        "createdAt"     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
