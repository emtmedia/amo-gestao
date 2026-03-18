import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // 1. Tabela de contador
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

    // 2. Tabela de histórico de termos emitidos
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

    // 3. Seed do documento template na Biblioteca de Documentos (somente uma vez)
    const existing = await prisma.$queryRaw<{ count: string }[]>`
      SELECT COUNT(*) as count FROM "DocumentoAMO"
      WHERE "titulo" = 'Template_Termo_Voluntariado_Date'
    `
    const alreadyExists = parseInt(String(existing[0]?.count ?? '0')) > 0

    if (!alreadyExists) {
      // Busca ou cria categoria "Normas e Regulamentos"
      let categoria = await prisma.categoriaDocumento.findFirst({
        where: { nome: { contains: 'Normas' } }
      })
      if (!categoria) {
        categoria = await prisma.categoriaDocumento.create({
          data: { nome: 'Normas e Regulamentos', descricao: 'Normas, regulamentos e políticas internas', cor: '#1e40af', icone: 'FileText' }
        })
      }

      const docId = crypto.randomUUID()

      await prisma.$executeRawUnsafe(`
        INSERT INTO "DocumentoAMO" (
          "id", "titulo", "descricao", "categoriaId", "tags",
          "nomeArquivo", "tipoArquivo", "tamanhoArquivo", "urlArquivo", "pathArquivo",
          "versao", "statusDocumento", "dataVigencia", "dataRevisao",
          "responsavel", "acessoRestrito", "observacoes",
          "createdAt", "updatedAt"
        ) VALUES (
          '${docId}',
          'Template_Termo_Voluntariado_Date',
          'Template do termo de voluntariado',
          '${categoria.id}',
          '["Termo","Voluntariado"]',
          'Template_Termo_Voluntariado_Date.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          NULL,
          '#template-interno',
          NULL,
          '1.0',
          'ativo',
          '2026-12-31 00:00:00+00',
          '2027-01-30 00:00:00+00',
          'Anderson Souto',
          false,
          NULL,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `)
    }

    return NextResponse.json({ success: true, documentoJaExistia: alreadyExists })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
