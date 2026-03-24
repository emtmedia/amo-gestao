import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

function formatNumero(seq: number) {
  const ano = new Date().getFullYear()
  return `CR-${String(seq).padStart(3, '0')}/${ano}`
}

// GET — list all records + next sequence number (preview) + anexos summary
export async function GET() {
  try {
    type CRRow = {
      id: string; numero: string; sequencia: number; nomeOperador: string;
      dataTransferencia: Date; valorConcedido: number; metodoTransferencia: string;
      nomeRecebedor: string; cpfRecebedor: string; dataAcertoNotas: Date;
      observacoes: string | null; projetoId: string | null; eventoId: string | null;
      createdAt: Date; updatedAt: Date;
    }
    const [items, rows] = await Promise.all([
      prisma.$queryRaw<CRRow[]>`
        SELECT id, numero, sequencia, "nomeOperador", "dataTransferencia", "valorConcedido",
               "metodoTransferencia", "nomeRecebedor", "cpfRecebedor", "dataAcertoNotas",
               observacoes, "projetoId", "eventoId", "createdAt", "updatedAt"
        FROM "ChequeRecibo" ORDER BY sequencia DESC
      `,
      prisma.$queryRaw<{ ultimo: number }[]>`
        SELECT "ultimo" FROM "ChequeReciboContador" WHERE "id" = 1
      `,
    ])
    const ultimo = rows[0]?.ultimo ?? 0

    // Busca anexos de todos os CRs (com tratamento se tabela ainda não existe)
    type AnexoRow = {
      id: string; chequeReciboId: string; descricao: string; nomeArquivo: string;
      tipoArquivo: string; tamanhoArquivo: number; urlArquivo: string;
      pathArquivo: string | null; origemCaptura: string; valorDocumento: number;
      enviadoPorNome: string; createdAt: Date;
    }
    let todosAnexos: AnexoRow[] = []
    try {
      todosAnexos = await prisma.$queryRaw<AnexoRow[]>`
        SELECT id, "chequeReciboId", descricao, "nomeArquivo", "tipoArquivo",
               "tamanhoArquivo", "urlArquivo", "pathArquivo", "origemCaptura",
               "valorDocumento", "enviadoPorNome", "createdAt"
        FROM "ChequeReciboAnexo"
        ORDER BY "createdAt" DESC
      `
    } catch { /* tabela ainda não foi criada */ }

    // Agrupa anexos por chequeReciboId
    const anexosMap: Record<string, AnexoRow[]> = {}
    for (const a of todosAnexos) {
      if (!anexosMap[a.chequeReciboId]) anexosMap[a.chequeReciboId] = []
      anexosMap[a.chequeReciboId].push(a)
    }

    // Busca nomes de projetos e eventos referenciados nos CRs
    type NomeRow = { id: string; nome: string }
    const projetoIds = [...new Set(items.map(c => c.projetoId).filter(Boolean))] as string[]
    const eventoIds  = [...new Set(items.map(c => c.eventoId).filter(Boolean))] as string[]
    console.log(`CRGET_EVIDS=${JSON.stringify(eventoIds)}_PRIDS=${JSON.stringify(projetoIds)}`)

    let projetosMap: Record<string, string> = {}
    let eventosMap:  Record<string, string> = {}

    if (projetoIds.length > 0) {
      try {
        const rows = await prisma.$queryRaw<NomeRow[]>`
          SELECT id, nome FROM "ProjetoFilantropia" WHERE id = ANY(${projetoIds})
        `
        for (const r of rows) projetosMap[r.id] = r.nome
      } catch { /* tabela pode ter nome diferente */ }
    }
    if (eventoIds.length > 0) {
      try {
        const rows = await prisma.$queryRaw<NomeRow[]>`
          SELECT id, nome FROM "Evento" WHERE id = ANY(${eventoIds})
        `
        for (const r of rows) eventosMap[r.id] = r.nome
      } catch { /* ok */ }
    }

    const data = items.map(cr => {
      const anexos = anexosMap[cr.id] ?? []
      const totalDocumentos = anexos.reduce((s, a) => s + Number(a.valorDocumento), 0)
      const projetoNome = cr.projetoId ? (projetosMap[cr.projetoId] ?? null) : null
      const eventoNome  = cr.eventoId  ? (eventosMap[cr.eventoId]  ?? null) : null
      return { ...cr, anexos, totalDocumentos, projetoNome, eventoNome }
    })

    return NextResponse.json({
      success: true,
      data,
      proximo: formatNumero(ultimo + 1),
    })
  } catch {
    return NextResponse.json({ success: true, data: [], proximo: formatNumero(1) })
  }
}

// POST — atomically increment counter, save record, return assigned number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const countRows = await prisma.$queryRaw<{ ultimo: number }[]>`
      UPDATE "ChequeReciboContador"
      SET "ultimo" = "ultimo" + 1
      WHERE "id" = 1
      RETURNING "ultimo"
    `
    const seq = countRows[0].ultimo
    const numero = formatNumero(seq)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = await (prisma.chequeRecibo.create as any)({
      data: {
        numero,
        sequencia: seq,
        nomeOperador: body.nomeOperador,
        dataTransferencia: new Date(body.dataTransferencia),
        valorConcedido: parseFloat(body.valorConcedido),
        metodoTransferencia: body.metodoTransferencia || 'Espécie',
        nomeRecebedor: body.nomeRecebedor,
        cpfRecebedor: body.cpfRecebedor,
        dataAcertoNotas: new Date(body.dataAcertoNotas),
        observacoes: body.observacoes || null,
        projetoId: body.projetoId || null,
        eventoId: body.eventoId || null,
      },
    })

    await logAudit('CRIAR', 'ChequeRecibo', numero, `Emitido para ${body.nomeRecebedor}`)
    return NextResponse.json({ success: true, id: item.id, numero })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
