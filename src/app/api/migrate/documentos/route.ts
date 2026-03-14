import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CategoriaDocumento" (
        "id" TEXT PRIMARY KEY,
        "nome" TEXT NOT NULL UNIQUE,
        "descricao" TEXT,
        "cor" TEXT DEFAULT '#4B5563',
        "icone" TEXT DEFAULT 'FileText',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DocumentoAMO" (
        "id" TEXT PRIMARY KEY,
        "titulo" TEXT NOT NULL,
        "descricao" TEXT,
        "categoriaId" TEXT NOT NULL,
        "tags" TEXT,
        "nomeArquivo" TEXT NOT NULL,
        "tipoArquivo" TEXT NOT NULL,
        "tamanhoArquivo" INTEGER,
        "urlArquivo" TEXT NOT NULL,
        "pathArquivo" TEXT,
        "versao" TEXT DEFAULT '1.0',
        "dataVigencia" TIMESTAMP(3),
        "dataRevisao" TIMESTAMP(3),
        "responsavel" TEXT,
        "acessoRestrito" BOOLEAN DEFAULT false,
        "observacoes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    // Seed default categories
    const cats = [
      { nome: 'Contratos', cor: '#2563EB', icone: 'FileSignature' },
      { nome: 'Laudos e Certificados', cor: '#16A34A', icone: 'Award' },
      { nome: 'Procedimentos Operacionais', cor: '#7C3AED', icone: 'ClipboardList' },
      { nome: 'Normas e Regulamentos', cor: '#B45309', icone: 'BookOpen' },
      { nome: 'Estatuto e Regimento', cor: '#DC2626', icone: 'Scale' },
      { nome: 'Alvarás e Licenças', cor: '#0891B2', icone: 'BadgeCheck' },
      { nome: 'Documentos de Bombeiro', cor: '#EA580C', icone: 'ShieldAlert' },
      { nome: 'Documentos de Prefeitura', cor: '#65A30D', icone: 'Building2' },
      { nome: 'Financeiro e Contábil', cor: '#0D9488', icone: 'BarChart2' },
      { nome: 'Outros', cor: '#6B7280', icone: 'FolderOpen' },
    ]
    for (const cat of cats) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "CategoriaDocumento" ("id","nome","cor","icone","createdAt","updatedAt") VALUES (gen_random_uuid()::text,$1,$2,$3,NOW(),NOW()) ON CONFLICT ("nome") DO NOTHING`,
        cat.nome, cat.cor, cat.icone
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
