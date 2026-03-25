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

    // 1. Busca todos os logs sem limite
    const logs = await prisma.$queryRaw<{
      id: string; userId: string | null; userName: string; action: string
      entity: string; entityId: string | null; details: string | null; createdAt: Date
    }[]>`SELECT * FROM "AuditLog" ORDER BY "createdAt" ASC`

    if (logs.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum log para exportar.' })
    }

    // 2. Gera CSV com BOM UTF-8
    const csv = buildCsv(logs)
    const csvBuffer = Buffer.from('\uFEFF' + csv, 'utf-8')

    // 3. Nome do arquivo: YYYY-MM-DD-hh.mm.ss-LogsBckp.csv (horário de Brasília)
    const now = new Date()
    // 'sv-SE' produz "YYYY-MM-DD HH:MM:SS" — ideal para desestruturar
    const brasiliaStr = now.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    const [datePart, timePart] = brasiliaStr.split(' ')
    const fileName = `${datePart}-${timePart.replace(/:/g, '.')}-LogsBckp.csv`

    // 4. Upload para Supabase Storage
    await ensureBucketExists()
    const { url, path } = await uploadFile(csvBuffer, fileName, 'text/csv', 'audit-backups')

    // 5. Garante que a categoria "Logs de Auditoria" existe — cria sempre se não encontrada
    type CatRow = { id: string; nome: string }

    // Tenta inserir (idempotente via ON CONFLICT)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CategoriaDocumento" ("id","nome","cor","icone","createdAt","updatedAt")
       VALUES (gen_random_uuid()::text,'Logs de Auditoria','#4B5563','ClipboardList',NOW(),NOW())
       ON CONFLICT ("nome") DO NOTHING`
    )

    const catRows = await prisma.$queryRaw<CatRow[]>`
      SELECT id, nome FROM "CategoriaDocumento" WHERE nome = 'Logs de Auditoria' LIMIT 1
    `
    const cat = catRows[0]

    if (!cat) {
      return NextResponse.json({ success: false, error: 'Não foi possível criar a categoria "Logs de Auditoria".' }, { status: 500 })
    }

    // 6. Cria registro na Biblioteca de Documentos via Prisma ORM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.documentoAMO as any).create({
      data: {
        id: crypto.randomUUID(),
        titulo: `Backup de Logs — ${fileName}`,
        descricao: `Backup automático gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')} por ${session.nome}. Total: ${logs.length} registros.`,
        categoriaId: cat.id,
        nomeArquivo: fileName,
        tipoArquivo: 'text/csv',
        tamanhoArquivo: csvBuffer.length,
        urlArquivo: url,
        pathArquivo: path,
        versao: '1.0',
        acessoRestrito: true,
        responsavel: session.nome,
        updatedAt: new Date(),
      },
    })

    // 7. Exclui todos os logs
    await prisma.$executeRaw`DELETE FROM "AuditLog"`

    // 8. Registra a própria ação de limpeza no novo log
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" ("id","userId","userName","action","entity","entityId","details","createdAt") VALUES (gen_random_uuid(),$1,$2,'EXCLUIR','AuditLog',NULL,$3,NOW())`,
      session.userId,
      session.nome,
      `Log limpo por ${session.nome} (${session.email}). ${logs.length} registros exportados para "${fileName}".`,
    )

    return NextResponse.json({ success: true, fileName, totalExportados: logs.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[audit-log/clear]', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
