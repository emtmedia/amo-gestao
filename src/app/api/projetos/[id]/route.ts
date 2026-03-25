import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { generateProjetoExtrato } from '@/lib/extrato-pdf'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.projetoFilantropia.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    if (body.dataInicio) body.dataInicio = new Date(body.dataInicio).toISOString()
    if (body.dataEncerramento) body.dataEncerramento = new Date(body.dataEncerramento).toISOString()
    if (body.orcamentoEstimado) body.orcamentoEstimado = parseFloat(body.orcamentoEstimado)
    delete body.ufId; delete body.cidadeId
    const item = await prisma.projetoFilantropia.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Verificar permissão
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas Admin ou SuperAdmin podem excluir projetos.' },
        { status: 403 }
      )
    }

    // 2. Verificar existência
    const projeto = await prisma.projetoFilantropia.findUnique({ where: { id: params.id } })
    if (!projeto) return NextResponse.json({ success: false, error: 'Projeto não encontrado' }, { status: 404 })

    // 3. Gerar extrato PDF e salvar na Biblioteca de Documentos
    const { documentoId, titulo } = await generateProjetoExtrato(params.id, session.nome)

    // 4. Cascade delete em ordem (respeita FKs)
    // 4a. Para cada evento vinculado: excluir voluntários, consolidação e receitas do evento
    const eventos = await prisma.evento.findMany({
      where: { projetoVinculadoId: params.id },
      select: { id: true },
    })
    for (const ev of eventos) {
      await prisma.voluntarioEvento.deleteMany({ where: { eventoId: ev.id } })
      await prisma.consolidacaoEvento.deleteMany({ where: { eventoId: ev.id } })
      await prisma.receitaEvento.deleteMany({ where: { eventoId: ev.id } })
    }
    // 4b. Excluir eventos vinculados
    await prisma.evento.deleteMany({ where: { projetoVinculadoId: params.id } })
    // 4c. Excluir voluntários e consolidação do projeto
    await prisma.voluntarioProjeto.deleteMany({ where: { projetoId: params.id } })
    await prisma.consolidacaoProjeto.deleteMany({ where: { projetoId: params.id } })
    // 4d. Excluir o projeto
    await prisma.projetoFilantropia.delete({ where: { id: params.id } })

    await logAudit('EXCLUIR', 'Projeto', params.id, `Extrato gerado: ${titulo} (ID: ${documentoId})`)
    return NextResponse.json({ success: true, documentoId, titulo })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
