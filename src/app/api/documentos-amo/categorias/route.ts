import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await prisma.categoriaDocumento.findMany({ orderBy: { nome: 'asc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const item = await prisma.categoriaDocumento.create({ data: { id: crypto.randomUUID(), nome: body.nome, descricao: body.descricao||null, cor: body.cor||'#4B5563', icone: body.icone||'FileText', updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (e) { return NextResponse.json({ success: false, error: String(e) }, { status: 500 }) }
}
