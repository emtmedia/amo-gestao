import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.evento.findUnique({ where: { id: params.id } })
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
    if (body.numeroVoluntarios !== undefined && body.numeroVoluntarios !== '') body.numeroVoluntarios = parseInt(body.numeroVoluntarios)
    const optionals = ['emailResponsavel','enderecoGoogleMaps','comentarios','arquivosReferencia','contaBancariaVinculada1','contaBancariaVinculada2','estadoRealizacao','cidadeRealizacao','ufId','cidadeId']
    for (const f of optionals) { if (body[f] === '') body[f] = null }

    // Handle relation field
    const projetoId = body.projetoVinculadoId
    delete body.projetoVinculadoId
    const data: Record<string, unknown> = { ...body, updatedAt: new Date() }
    if (projetoId) {
      data.projeto = { connect: { id: projetoId } }
    } else if (projetoId === null || projetoId === '') {
      data.projeto = { disconnect: true }
    }

    const item = await prisma.evento.update({ where: { id: params.id }, data })
    await logAudit("EDITAR", "Evento", params.id)
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [c0, c1, c2] = await prisma.$transaction([
      prisma.voluntarioEvento.count({ where: { eventoId: params.id } }),
      prisma.consolidacaoEvento.count({ where: { eventoId: params.id } }),
      prisma.receitaEvento.count({ where: { eventoId: params.id } }),
    ])
    const total = c0 + c1 + c2
    if (total > 0) {
      const detail =
        (c0 > 0 ? `\n• Voluntários no evento: ${c0}` : '') +
        (c1 > 0 ? `\n• Consolidações do evento: ${c1}` : '') +
        (c2 > 0 ? `\n• Receitas de Eventos: ${c2}` : '')
      return NextResponse.json({
        success: false,
        error: `Este evento está em uso em ${total} registro(s) e não pode ser excluído.${detail}\n\nRemova os vínculos antes de excluir este evento.`
      }, { status: 400 })
    }
    await prisma.evento.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Evento", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
