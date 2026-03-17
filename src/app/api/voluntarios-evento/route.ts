import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.voluntarioEvento.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = {
      voluntarioId:      body.voluntarioId,
      eventoId:          body.eventoId,
      funcaoCargo:       body.funcaoCargo,
      cpf:               body.cpf,
      igrejaOrigem:      body.igrejaOrigem      || null,
      fotografia:        body.fotografia        || null,
      arquivosReferencia: body.arquivosReferencia || null,
      dataNascimento:    new Date(body.dataNascimento).toISOString(),
      dataInicio:        new Date(body.dataInicio).toISOString(),
      dataSaida:         body.dataSaida ? new Date(body.dataSaida).toISOString() : null,
    }
    const item = await prisma.voluntarioEvento.create({ data })
    await logAudit("CRIAR", "Voluntário Evento", item.id, `Criado: ${JSON.stringify(data).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
