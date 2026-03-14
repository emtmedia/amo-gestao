import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.evento.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateFields = ['dataInicio', 'dataEncerramento']
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === 'string') body[f] = new Date(body[f]).toISOString()
    }
    if (body.orcamentoEstimado !== undefined && body.orcamentoEstimado !== '') body.orcamentoEstimado = parseFloat(body.orcamentoEstimado)
    if (body.numeroVoluntarios !== undefined && body.numeroVoluntarios !== '') body.numeroVoluntarios = parseInt(body.numeroVoluntarios)
    const optionals = ['emailResponsavel', 'contaBancariaVinculada1', 'contaBancariaVinculada2', 'ufId', 'cidadeId', 'estadoRealizacao', 'cidadeRealizacao', 'enderecoGoogleMaps', 'comentarios', 'arquivosReferencia']
    for (const f of optionals) { if (body[f] === '' || body[f] === undefined) body[f] = null }

    // Handle relation field - Prisma needs connect syntax
    const projetoId = body.projetoVinculadoId || null
    delete body.projetoVinculadoId

    const data: Record<string, unknown> = { ...body }
    if (projetoId) {
      data.projeto = { connect: { id: projetoId } }
    }

    const item = await prisma.evento.create({ data })
    await logAudit("CRIAR", "Evento", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST evento error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
