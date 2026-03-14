import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const item = await prisma.categoriaDocumento.update({ where: { id: params.id }, data: { nome: body.nome, descricao: body.descricao||null, cor: body.cor||'#4B5563', icone: body.icone||'FileText', updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const count = await prisma.documentoAMO.count({ where: { categoriaId: params.id } })
    if (count > 0) return NextResponse.json({ success: false, error: `Esta categoria possui ${count} documento(s) vinculado(s). Remova os documentos antes de excluir a categoria.` }, { status: 400 })
    await prisma.categoriaDocumento.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}
