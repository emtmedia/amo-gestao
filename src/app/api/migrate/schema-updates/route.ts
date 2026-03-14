import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function POST() {
  const results: string[] = []
  try {
    // 1. FuncaoCargoVoluntario table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FuncaoCargoVoluntario" (
        "id" TEXT NOT NULL,
        "nome" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FuncaoCargoVoluntario_pkey" PRIMARY KEY ("id")
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "FuncaoCargoVoluntario_nome_key" ON "FuncaoCargoVoluntario"("nome")`)
    results.push('FuncaoCargoVoluntario: OK')

    const defaults = [
      'Líder de Equipe','Auxiliar Administrativo','Cozinheiro Chef','Auxiliar de Cozinha',
      'Tesoureiro','Auxiliar de Logística','Coordenador','Monitor','Recepcionista','Motorista',
      'Médico Voluntário','Enfermeiro Voluntário','Professor Voluntário','Assistente Social',
      'Fotógrafo','Comunicação e Mídia','Suporte Técnico',
    ]
    for (const nome of defaults) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "FuncaoCargoVoluntario" ("id","nome","updatedAt") VALUES (gen_random_uuid(),$1,NOW()) ON CONFLICT ("nome") DO NOTHING`,
        nome
      )
    }
    results.push('FuncaoCargoVoluntario seeds: OK')

    // 2. telefoneFixo columns
    await prisma.$executeRawUnsafe(`ALTER TABLE "ReceitaPublica" ADD COLUMN IF NOT EXISTS "telefoneFixo" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ReceitaPessoaFisica" ADD COLUMN IF NOT EXISTS "telefoneFixo" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ReceitaPessoaJuridica" ADD COLUMN IF NOT EXISTS "telefoneFixo" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "OutraReceita" ADD COLUMN IF NOT EXISTS "telefoneFixo" TEXT`)
    results.push('telefoneFixo columns: OK')

    // 3. ufId/cidadeId on ProjetoFilantropia
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProjetoFilantropia" ADD COLUMN IF NOT EXISTS "ufId" TEXT`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProjetoFilantropia" ADD COLUMN IF NOT EXISTS "cidadeId" TEXT`)
    results.push('ProjetoFilantropia ufId/cidadeId: OK')

    return NextResponse.json({ success: true, results })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e), results }, { status: 500 })
  }
}
