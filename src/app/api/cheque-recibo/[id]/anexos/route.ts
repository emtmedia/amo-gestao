import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { uploadFile, ensureBucketExists } from '@/lib/supabase-storage'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const CR_FOLDER = 'cheque-recibos'

// GET /api/cheque-recibo/[id]/anexos — lista anexos do CR
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string; descricao: string; nomeArquivo: string; tipoArquivo: string;
      tamanhoArquivo: number; urlArquivo: string; pathArquivo: string | null;
      origemCaptura: string; valorDocumento: number; enviadoPorNome: string;
      enviadoPorEmail: string; createdAt: Date;
    }>>`
      SELECT id, descricao, "nomeArquivo", "tipoArquivo", "tamanhoArquivo",
             "urlArquivo", "pathArquivo", "origemCaptura", "valorDocumento",
             "enviadoPorNome", "enviadoPorEmail", "createdAt"
      FROM "ChequeReciboAnexo"
      WHERE "chequeReciboId" = ${params.id}
      ORDER BY "createdAt" DESC
    `
    return NextResponse.json({ success: true, data: rows })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}

// POST /api/cheque-recibo/[id]/anexos — faz upload e vincula ao CR
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    // Verifica se o CR existe
    const cr = await prisma.chequeRecibo.findUnique({ where: { id: params.id } })
    if (!cr) return NextResponse.json({ error: 'Cheque-Recibo não encontrado' }, { status: 404 })

    const formData = await req.formData()
    const file          = formData.get('file') as File | null
    const descricao     = formData.get('descricao') as string | null
    const valorStr      = formData.get('valorDocumento') as string | null
    const origemCaptura = (formData.get('origemCaptura') as string) || 'upload'

    if (!file)              return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    if (!descricao?.trim()) return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 })
    if (!valorStr)          return NextResponse.json({ error: 'Valor do documento é obrigatório' }, { status: 400 })

    const valorDocumento = parseFloat(valorStr.replace(',', '.'))
    if (isNaN(valorDocumento) || valorDocumento < 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo excede o limite de 10 MB' }, { status: 400 })
    }

    await ensureBucketExists()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, path } = await uploadFile(buffer, file.name, file.type, CR_FOLDER)

    const newId = randomUUID()
    const now = new Date()

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ChequeReciboAnexo"
         (id, "chequeReciboId", descricao, "nomeArquivo", "tipoArquivo", "tamanhoArquivo",
          "urlArquivo", "pathArquivo", "origemCaptura", "valorDocumento",
          "enviadoPorId", "enviadoPorNome", "enviadoPorEmail", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      newId, params.id, descricao.trim(), file.name, file.type, file.size,
      url, path, origemCaptura, valorDocumento,
      session.userId, session.nome, session.email, now, now
    )

    return NextResponse.json({ success: true, id: newId, numero: cr.numero }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
