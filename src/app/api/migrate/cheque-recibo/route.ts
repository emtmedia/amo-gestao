import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChequeReciboContador" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "ultimo" INTEGER NOT NULL DEFAULT 0
      )
    `)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ChequeReciboContador" ("id","ultimo") VALUES (1,0) ON CONFLICT DO NOTHING
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChequeRecibo" (
        "id" TEXT PRIMARY KEY,
        "numero" TEXT UNIQUE NOT NULL,
        "sequencia" INTEGER NOT NULL,
        "nomeOperador" TEXT NOT NULL,
        "dataTransferencia" TIMESTAMP NOT NULL,
        "valorConcedido" DOUBLE PRECISION NOT NULL,
        "metodoTransferencia" TEXT NOT NULL DEFAULT 'Espécie',
        "nomeRecebedor" TEXT NOT NULL,
        "cpfRecebedor" TEXT NOT NULL,
        "dataAcertoNotas" TIMESTAMP NOT NULL,
        "observacoes" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    // Colunas adicionadas posteriormente (idempotente)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "projetoId" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "eventoId" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "arquivado" BOOLEAN NOT NULL DEFAULT false`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "arquivadoEm" TIMESTAMP`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "docAssinadoUrl"  TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "docAssinadoPath" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ChequeRecibo" ADD COLUMN IF NOT EXISTS "docAssinadoNome" TEXT`)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
