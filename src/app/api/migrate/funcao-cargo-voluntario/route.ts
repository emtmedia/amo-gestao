import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

const DEFAULTS = [
  'Líder de Equipe', 'Auxiliar Administrativo', 'Cozinheiro Chef',
  'Auxiliar de Cozinha', 'Tesoureiro', 'Auxiliar de Logística',
  'Coordenador', 'Monitor', 'Recepcionista', 'Motorista',
  'Médico Voluntário', 'Enfermeiro Voluntário', 'Professor Voluntário',
  'Assistente Social', 'Fotógrafo', 'Comunicação e Mídia', 'Suporte Técnico',
]

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FuncaoCargoVoluntario" (
        "id" TEXT NOT NULL,
        "nome" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FuncaoCargoVoluntario_pkey" PRIMARY KEY ("id")
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "FuncaoCargoVoluntario_nome_key" ON "FuncaoCargoVoluntario"("nome")
    `)
    // Seed defaults
    for (const nome of DEFAULTS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "FuncaoCargoVoluntario" ("id","nome","updatedAt") VALUES (gen_random_uuid(),$1,NOW()) ON CONFLICT ("nome") DO NOTHING`,
        nome
      )
    }
    const count = await prisma.$queryRaw<[{count:bigint}]>`SELECT COUNT(*) as count FROM "FuncaoCargoVoluntario"`
    return NextResponse.json({ success: true, count: Number(count[0].count) })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
