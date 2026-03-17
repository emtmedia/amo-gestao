import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.voluntarioEvento.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const item = await prisma.voluntarioEvento.update({ where: { id: params.id }, data })
    await logAudit("EDITAR", "Voluntário Evento", params.id)
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.voluntarioEvento.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Voluntário Evento", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao deletar' }, { status: 500 })
  }
}
