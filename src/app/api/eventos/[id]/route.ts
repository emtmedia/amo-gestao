import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { generateEventoExtrato } from '@/lib/extrato-pdf'

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

    Object.keys(data).forEach(k => { if (data[k] === undefined) delete data[k] })

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
    // 1. Verificar permissão
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas Admin ou SuperAdmin podem excluir eventos.' },
        { status: 403 }
      )
    }

    // 2. Verificar existência
    const evento = await prisma.evento.findUnique({ where: { id: params.id } })
    if (!evento) return NextResponse.json({ success: false, error: 'Evento não encontrado' }, { status: 404 })

    // 3. Gerar extrato PDF e salvar na Biblioteca de Documentos
    const { documentoId, titulo } = await generateEventoExtrato(params.id, session.nome)

    // 4. Cascade delete em ordem (respeita FKs)
    await prisma.voluntarioEvento.deleteMany({ where: { eventoId: params.id } })
    await prisma.consolidacaoEvento.deleteMany({ where: { eventoId: params.id } })
    await prisma.receitaEvento.deleteMany({ where: { eventoId: params.id } })
    await prisma.evento.delete({ where: { id: params.id } })

    await logAudit('EXCLUIR', 'Evento', params.id, `Extrato gerado: ${titulo} (ID: ${documentoId})`)
    return NextResponse.json({ success: true, documentoId, titulo })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
