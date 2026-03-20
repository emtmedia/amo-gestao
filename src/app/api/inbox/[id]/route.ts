// src/app/api/inbox/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { deleteFile } from '@/lib/supabase-storage'

// DELETE /api/inbox/[id] — Exclui um documento do inbox
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { id } = params

    const documento = await prisma.inboxDocumento.findUnique({ where: { id } })
    if (!documento) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    // Remove arquivo do Supabase Storage
    if (documento.pathArquivo) {
      try {
        await deleteFile(documento.pathArquivo)
      } catch (err) {
        console.error('Erro ao remover arquivo do storage:', err)
        // Continua com a exclusão do registro mesmo se falhar no storage
      }
    }

    // Remove registro do banco
    await prisma.inboxDocumento.delete({ where: { id } })

    return NextResponse.json({ ok: true, message: 'Documento excluído com sucesso' })
  } catch (err) {
    console.error('DELETE /api/inbox/[id] error:', err)
    return NextResponse.json({ error: 'Erro ao excluir documento' }, { status: 500 })
  }
}

// PATCH /api/inbox/[id] — Atualiza status do documento
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { id } = params
    const body = await req.json()

    const documento = await prisma.inboxDocumento.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.descricao && { descricao: body.descricao }),
      },
    })

    return NextResponse.json({ ok: true, documento })
  } catch (err) {
    console.error('PATCH /api/inbox/[id] error:', err)
    return NextResponse.json({ error: 'Erro ao atualizar documento' }, { status: 500 })
  }
}
