import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.consolidacaoProjeto.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { dataConclusaoReal, dataLimiteAjuste, valorAjuste, ...rest } = body
    const item = await prisma.consolidacaoProjeto.update({
      where: { id: params.id },
      data: {
        ...rest,
        valorAjuste: valorAjuste ? parseFloat(String(valorAjuste)) : null,
        dataConclusaoReal: dataConclusaoReal ? new Date(dataConclusaoReal) : undefined,
        dataLimiteAjuste: dataLimiteAjuste ? new Date(dataLimiteAjuste) : null,
      }
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.consolidacaoProjeto.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Consolidação Projeto", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
