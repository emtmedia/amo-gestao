import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { uploadFile, ensureBucketExists } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv(logs: {
  id: string; userId: string | null; userName: string; action: string
  entity: string; entityId: string | null; details: string | null; createdAt: Date
}[]): string {
  const header = ['id', 'userId', 'userName', 'action', 'entity', 'entityId', 'details', 'createdAt']
  const rows = logs.map(l => [
    l.id, l.userId, l.userName, l.action, l.entity, l.entityId, l.details,
    new Date(l.createdAt).toISOString(),
  ].map(escapeCsv).join(','))
  return [header.join(','), ...rows].join('\r\n')
}

export async function POST() {
  try {
    const session = await getSession()
    if (!session || session.role.toLowerCase() !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Acesso restrito ao SuperAdmin.' }, { status: 403 })
    }

    // 1. Busca todos os logs
    const logs = await prisma.$queryRaw<{
      id: string; userId: string | null; userName: string; action: string
      entity: string; entityId: string | null; details: string | null; createdAt: Date
    }[]>`SELECT * FROM "AuditLog" ORDER BY "createdAt" ASC`

    if (logs.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum log para exportar.' })
    }

    // 2. Gera CSV
    const csv = buildCsv(logs)
    const csvBuffer = Buffer.from('\uFEFF' + csv, 'utf-8') // BOM para compatibilidade Excel

    // 3. Nome do arquivo: YYYY-MM-DD-hh.mm.ss-LogsBckp.csv
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fileName = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}-LogsBckp.csv`

    // 4. Upload para Supabase Storage
    await ensureBucketExists()
    const { url, path } = await uploadFile(csvBuffer, fileName, 'text/csv', 'audit-backups')

    // 5. Busca uma categoria para o documento (preferência: Financeiro → Outros → primeira disponível)
    type CatRow = { id: string; nome: string }
    const cats = await prisma.$queryRaw<CatRow[]>`
      SELECT id, nome FROM "CategoriaDocumento" ORDER BY nome ASC LIMIT 20
    `
    const cat =
      cats.find(c => c.nome.toLowerCase().includes('financeiro')) ||
      cats.find(c => c.nome.toLowerCase().includes('outros')) ||
      cats[0]

    if (!cat) {
      return NextResponse.json({ success: false, error: 'Nenhuma categoria de documento encontrada. Execute a migração de documentos primeiro.' }, { status: 500 })
    }

    // 6. Cria registro na Biblioteca de Documentos com Acesso Restrito
    await prisma.$executeRawUnsafe(`
      INSERT INTO "DocumentoAMO" (
        id, titulo, descricao, "categoriaId", tags, "nomeArquivo", "tipoArquivo",
        "tamanhoArquivo", "urlArquivo", "pathArquivo", versao,
        "acessoRestrito", "responsavel", "updatedAt", "createdAt"
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, NULL, $4, 'text/csv',
        $5, $6, $7, '1.0',
        true, $8, NOW(), NOW()
      )
    `,
      `Backup de Logs — ${fileName}`,
      `Backup automático gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')} por ${session.nome}. Total: ${logs.length} registros.`,
      cat.id,
      fileName,
      csvBuffer.length,
      url,
      path,
      session.nome,
    )

    // 7. Exclui todos os logs
    await prisma.$executeRawUnsafe(`DELETE FROM "AuditLog"`)

    // 8. Registra a ação de limpeza (novo log após a limpeza)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" ("id","userId","userName","action","entity","entityId","details","createdAt") VALUES (gen_random_uuid(),$1,$2,'EXCLUIR','AuditLog',NULL,$3,NOW())`,
      session.userId,
      session.nome,
      `Log limpo por ${session.nome} (${session.email}). ${logs.length} registros exportados para "${fileName}".`,
    )

    return NextResponse.json({ success: true, fileName, totalExportados: logs.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
