import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.evento.findMany({
      orderBy: { createdAt: 'desc' },
      include: { consolidacao: { select: { id: true, saldoOrcamento: true } } }
    })
    const withStatus = items.map(e => ({
      ...e,
      status: !e.consolidacao
        ? 'em_curso'
        : (e.consolidacao.saldoOrcamento ?? 0) >= 0
        ? 'encerrado_consolidado'
        : 'encerrado_pendente',
    }))
    return NextResponse.json({ success: true, data: withStatus })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Build data with only valid Evento model fields
    const data: Record<string, unknown> = {
      nome:                    body.nome,
      dataInicio:              new Date(body.dataInicio).toISOString(),
      dataEncerramento:        new Date(body.dataEncerramento).toISOString(),
      responsavel:             body.responsavel,
      emailResponsavel:        body.emailResponsavel || null,
      telefoneResponsavel:     body.telefoneResponsavel,
      orcamentoEstimado:       body.orcamentoEstimado ? parseFloat(body.orcamentoEstimado) : 0,
      contaBancariaVinculada1: body.contaBancariaVinculada1 || null,
      contaBancariaVinculada2: body.contaBancariaVinculada2 || null,
      paisRealizacao:          body.paisRealizacao || 'Brasil',
      estadoRealizacao:        body.estadoRealizacao || null,
      cidadeRealizacao:        body.cidadeRealizacao || null,
      enderecoGoogleMaps:      body.enderecoGoogleMaps || null,
      numeroVoluntarios:       body.numeroVoluntarios ? parseInt(body.numeroVoluntarios) : null,
      comentarios:             body.comentarios || null,
      arquivosReferencia:      body.arquivosReferencia || null,
    }

    // Handle relation field - Prisma needs connect syntax
    if (body.projetoVinculadoId) {
      data.projeto = { connect: { id: body.projetoVinculadoId } }
    }

    const item = await prisma.evento.create({ data })
    await logAudit("CRIAR", "Evento", item.id, `Criado: ${body.nome}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST evento error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
