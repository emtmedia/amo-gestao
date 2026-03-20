// src/app/api/inbox/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { uploadFile, ensureBucketExists } from '@/lib/supabase-storage'

const INBOX_FOLDER = 'inbox'

// GET /api/inbox — Lista todos os documentos do inbox
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const busca  = searchParams.get('busca')

    const where: Record<string, unknown> = {}
    if (status && status !== 'todos') where.status = status
    if (busca) where.descricao = { contains: busca, mode: 'insensitive' }

    const documentos = await prisma.inboxDocumento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ok: true, documentos })
  } catch (err) {
    console.error('GET /api/inbox error:', err)
    return NextResponse.json({ error: 'Erro ao buscar documentos' }, { status: 500 })
  }
}

// POST /api/inbox — Cria um novo documento no inbox
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file          = formData.get('file') as File | null
    const descricao     = formData.get('descricao') as string | null
    const dataVenc      = formData.get('dataVencimento') as string | null
    const origemCaptura = (formData.get('origemCaptura') as string) || 'upload'

    if (!file)              return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    if (!descricao?.trim()) return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 })
    if (!dataVenc)          return NextResponse.json({ error: 'Data de vencimento é obrigatória' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo excede o limite de 10 MB' }, { status: 400 })
    }

    await ensureBucketExists()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, path } = await uploadFile(buffer, file.name, file.type, INBOX_FOLDER)

    const documento = await prisma.inboxDocumento.create({
      data: {
        descricao:       descricao.trim(),
        dataVencimento:  new Date(dataVenc),
        nomeArquivo:     file.name,
        tipoArquivo:     file.type,
        tamanhoArquivo:  file.size,
        urlArquivo:      url,
        pathArquivo:     path,
        origemCaptura,
        status:          'pendente',
        enviadoPorId:    session.userId,
        enviadoPorNome:  session.nome,
        enviadoPorEmail: session.email,
      },
    })

    return NextResponse.json({ ok: true, documento }, { status: 201 })
  } catch (err) {
    console.error('POST /api/inbox error:', err)
    return NextResponse.json({ error: 'Erro ao enviar documento' }, { status: 500 })
  }
}
