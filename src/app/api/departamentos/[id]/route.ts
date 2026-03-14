import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    if (body.orcamentoAnual !== undefined) body.orcamentoAnual = body.orcamentoAnual ? parseFloat(body.orcamentoAnual) : null
    const item = await prisma.departamento.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c0 = await prisma.projetoFilantropia.count({ where: { departamentoId: params.id } })
    if (c0 > 0) {
      return NextResponse.json({
        success: false,
        error: `Este departamento está vinculado a ${c0} projeto(s) e não pode ser excluído.\n• Projetos vinculados: ${c0}\n\nEdite os projetos removendo o vínculo com este departamento antes de excluir.`
      }, { status: 400 })
    }
    await prisma.departamento.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
