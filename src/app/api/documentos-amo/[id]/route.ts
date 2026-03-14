import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    const isAdmin = session?.role === 'admin'

    const body = await req.json()

    // Verifica se o doc atual é restrito — usuário comum não pode editá-lo
    if (!isAdmin) {
      const existing = await prisma.documentoAMO.findUnique({ where: { id: params.id }, select: { acessoRestrito: true } })
      if (existing?.acessoRestrito) {
        return NextResponse.json({ success: false, error: 'Acesso negado: este documento é restrito.' }, { status: 403 })
      }
    }

    const item = await prisma.documentoAMO.update({
      where: { id: params.id },
      data: {
        titulo: body.titulo,
        descricao: body.descricao || null,
        categoriaId: body.categoriaId,
        tags: body.tags || null,
        versao: body.versao || '1.0',
        dataVigencia: body.dataVigencia ? new Date(body.dataVigencia) : null,
        dataRevisao: body.dataRevisao ? new Date(body.dataRevisao) : null,
        responsavel: body.responsavel || null,
        // Somente admin pode alterar o campo acessoRestrito
        acessoRestrito: isAdmin ? (body.acessoRestrito || false) : undefined,
        observacoes: body.observacoes || null,
        ...(body.urlArquivo ? { nomeArquivo: body.nomeArquivo, tipoArquivo: body.tipoArquivo, tamanhoArquivo: body.tamanhoArquivo||null, urlArquivo: body.urlArquivo, pathArquivo: body.pathArquivo||null } : {}),
        updatedAt: new Date(),
      },
      include: { categoria: true }
    })
    return NextResponse.json({ success: true, data: item })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    const isAdmin = session?.role === 'admin'

    // Usuário comum não pode deletar documento restrito
    if (!isAdmin) {
      const existing = await prisma.documentoAMO.findUnique({ where: { id: params.id }, select: { acessoRestrito: true } })
      if (existing?.acessoRestrito) {
        return NextResponse.json({ success: false, error: 'Acesso negado: este documento é restrito.' }, { status: 403 })
      }
    }

    await prisma.documentoAMO.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Documento", params.id)
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}
