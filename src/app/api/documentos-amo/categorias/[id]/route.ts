import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const item = await prisma.categoriaDocumento.update({
      where: { id: params.id },
      data: {
        nome: body.nome,
        ...(body.descricao !== undefined && { descricao: body.descricao || null }),
        ...(body.cor       !== undefined && { cor:       body.cor }),
        ...(body.icone     !== undefined && { icone:     body.icone }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ success: true, data: item })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const count = await prisma.documentoAMO.count({ where: { categoriaId: params.id } })
    if (count > 0) return NextResponse.json({
      success: false,
      error: `Esta categoria está vinculada a ${count} documento${count > 1 ? 's' : ''}.\nReatribua ou exclua esses documentos antes de remover a categoria.`,
    }, { status: 409 })
    await prisma.categoriaDocumento.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}
