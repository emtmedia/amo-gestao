import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

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
    const [c0, c1, c2] = await prisma.$transaction([
      prisma.evento.count({ where: { projetoVinculadoId: params.id } }),
      prisma.voluntarioProjeto.count({ where: { projetoId: params.id } }),
      prisma.consolidacaoProjeto.count({ where: { projetoId: params.id } }),
    ])
    const total = c0 + c1 + c2
    if (total > 0) {
      const detail =
        (c0 > 0 ? `\n• Eventos vinculados: ${c0}` : '') +
        (c1 > 0 ? `\n• Voluntários no projeto: ${c1}` : '') +
        (c2 > 0 ? `\n• Consolidações: ${c2}` : '')
      return NextResponse.json({
        success: false,
        error: `Este projeto está em uso em ${total} registro(s) e não pode ser excluído.${detail}\n\nRemova os vínculos antes de excluir este projeto.`
      }, { status: 400 })
    }
    await prisma.projetoFilantropia.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Projeto", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
