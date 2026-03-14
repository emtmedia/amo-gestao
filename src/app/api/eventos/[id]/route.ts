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

    const data: Record<string, unknown> = {
      nome:                    body.nome,
      dataInicio:              body.dataInicio ? new Date(body.dataInicio).toISOString() : undefined,
      dataEncerramento:        body.dataEncerramento ? new Date(body.dataEncerramento).toISOString() : undefined,
      responsavel:             body.responsavel,
      emailResponsavel:        body.emailResponsavel || null,
      telefoneResponsavel:     body.telefoneResponsavel,
      orcamentoEstimado:       body.orcamentoEstimado ? parseFloat(body.orcamentoEstimado) : undefined,
      contaBancariaVinculada1: body.contaBancariaVinculada1 || null,
      contaBancariaVinculada2: body.contaBancariaVinculada2 || null,
      paisRealizacao:          body.paisRealizacao || 'Brasil',
      estadoRealizacao:        body.estadoRealizacao || null,
      cidadeRealizacao:        body.cidadeRealizacao || null,
      enderecoGoogleMaps:      body.enderecoGoogleMaps || null,
      numeroVoluntarios:       body.numeroVoluntarios ? parseInt(body.numeroVoluntarios) : null,
      comentarios:             body.comentarios || null,
      arquivosReferencia:      body.arquivosReferencia || null,
      updatedAt:               new Date(),
    }

    // Remove undefined fields
    Object.keys(data).forEach(k => { if (data[k] === undefined) delete data[k] })

    // Handle relation field
    if (body.projetoVinculadoId) {
      data.projeto = { connect: { id: body.projetoVinculadoId } }
    } else if (body.projetoVinculadoId === null || body.projetoVinculadoId === '') {
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
