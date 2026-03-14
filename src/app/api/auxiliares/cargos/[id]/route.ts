import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.cargo.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const item = await prisma.cargo.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c0 = await prisma.funcionarioCLT.count({ where: { cargoId: params.id } })
    const c1 = await prisma.funcionarioPJ.count({ where: { cargoId: params.id } })
    const total = c0 + c1
    if (total > 0) {
      const detail = (c0 > 0 ? `\n• Funcionários CLT: ${c0}` : '') + (c1 > 0 ? `\n• Funcionários PJ: ${c1}` : '')
      return NextResponse.json({
        success: false,
        error: `Este item está em uso em ${total} registro(s) e não pode ser excluído.${detail}\n\nEdite ou remova esses registros antes de excluir este item.`
      }, { status: 400 })
    }
    await prisma.cargo.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
