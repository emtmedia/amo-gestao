import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.condicaoReceita.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const item = await prisma.condicaoReceita.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c0 = await prisma.receitaPublica.count({ where: { condicaoReceitaId: params.id } })
    const total = c0
    if (total > 0) {
      const detail = (c0 > 0 ? `\n• Receitas Públicas: ${c0}` : '')
      return NextResponse.json({
        success: false,
        error: `Este item está em uso em ${total} registro(s) e não pode ser excluído.${detail}\n\nEdite ou remova esses registros antes de excluir este item.`
      }, { status: 400 })
    }
    await prisma.condicaoReceita.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
