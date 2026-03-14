import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    const isAdmin = session?.role === 'admin'

    // Usuários comuns (role !== 'admin') não veem documentos restritos
    const items = await prisma.documentoAMO.findMany({
      where: isAdmin ? {} : { acessoRestrito: false },
      include: { categoria: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, data: items })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const isAdmin = session?.role === 'admin'

    const body = await req.json()

    // Somente admins podem criar documentos com acessoRestrito = true
    const acessoRestrito = isAdmin ? (body.acessoRestrito || false) : false

    const item = await prisma.documentoAMO.create({
      data: {
        id: crypto.randomUUID(),
        titulo: body.titulo,
        descricao: body.descricao || null,
        categoriaId: body.categoriaId,
        tags: body.tags || null,
        nomeArquivo: body.nomeArquivo,
        tipoArquivo: body.tipoArquivo,
        tamanhoArquivo: body.tamanhoArquivo || null,
        urlArquivo: body.urlArquivo,
        pathArquivo: body.pathArquivo || null,
        versao: body.versao || '1.0',
        dataVigencia: body.dataVigencia ? new Date(body.dataVigencia) : null,
        dataRevisao: body.dataRevisao ? new Date(body.dataRevisao) : null,
        responsavel: body.responsavel || null,
        acessoRestrito,
        observacoes: body.observacoes || null,
        updatedAt: new Date(),
      },
      include: { categoria: true }
    })
    return NextResponse.json({ success: true, data: item })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}
