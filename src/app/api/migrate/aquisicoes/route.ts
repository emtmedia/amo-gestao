import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$transaction(async (tx) => {
      // Tipo de Item Aquisição (auxiliary table)
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TipoItemAquisicao" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "nome" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "TipoItemAquisicao_pkey" PRIMARY KEY ("id")
        )
      `)
      await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TipoItemAquisicao_nome_key" ON "TipoItemAquisicao"("nome")`)
      
      // Seed default types
      const tipos = ['Equipamento de TI', 'Mobiliário', 'Material de Escritório', 'Veículo', 'Equipamento de Som', 'Eletrodoméstico', 'Ferramenta', 'Material Didático', 'Livro/Publicação', 'Outro']
      for (const nome of tipos) {
        await tx.$executeRawUnsafe(`INSERT INTO "TipoItemAquisicao" ("id","nome","updatedAt") VALUES (gen_random_uuid(),$1,NOW()) ON CONFLICT ("nome") DO NOTHING`, nome)
      }

      // Aquisicao table
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Aquisicao" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "descricao" TEXT NOT NULL,
          "projetoId" TEXT,
          "eventoId" TEXT,
          "tipoItemId" TEXT NOT NULL,
          "dataAquisicao" TIMESTAMP(3) NOT NULL,
          "contaBancariaId" TEXT NOT NULL,
          "valorAquisicao" DOUBLE PRECISION NOT NULL,
          "metodoTransferenciaId" TEXT NOT NULL,
          "modalidadePgto" TEXT NOT NULL DEFAULT 'À vista',
          "parcelas" INTEGER,
          "observacoes" TEXT,
          "arquivosReferencia" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Aquisicao_pkey" PRIMARY KEY ("id")
        )
      `)
    }, { timeout: 15000 })
    
    return NextResponse.json({ success: true, message: 'Aquisicao tables created' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
