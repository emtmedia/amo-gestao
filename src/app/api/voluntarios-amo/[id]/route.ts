import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    if (body.dataNascimento) body.dataNascimento = new Date(body.dataNascimento).toISOString()
    const item = await prisma.voluntarioAMO.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [c0, c1] = await prisma.$transaction([
      prisma.voluntarioProjeto.count({ where: { voluntarioId: params.id } }),
      prisma.voluntarioEvento.count({ where: { voluntarioId: params.id } }),
    ])
    const total = c0 + c1
    if (total > 0) {
      const detail =
        (c0 > 0 ? `\n• Projetos em que participa: ${c0}` : '') +
        (c1 > 0 ? `\n• Eventos em que participa: ${c1}` : '')
      return NextResponse.json({
        success: false,
        error: `Este voluntário está vinculado a ${total} registro(s) e não pode ser excluído.${detail}\n\nRemova o voluntário dos projetos/eventos antes de excluir seu cadastro.`
      }, { status: 400 })
    }
    await prisma.voluntarioAMO.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Voluntário AMO", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
