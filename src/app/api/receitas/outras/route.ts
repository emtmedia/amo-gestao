import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.outraReceita.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Converte campos de data string → DateTime ISO
    if (body.dataEntrada && typeof body.dataEntrada === 'string') {
      body.dataEntrada = new Date(body.dataEntrada).toISOString()
    }

    // Garante que campos numéricos sejam number
    if (body.valorContribuicao !== undefined) {
      body.valorContribuicao = parseFloat(body.valorContribuicao)
    }

    // Campos opcionais: converte string vazia em null
    const optionals = ['email', 'telefoneFixo', 'observacoes', 'arquivosReferencia', 'projetoDirecionado', 'eventoDirecionado']
    for (const f of optionals) {
      if (body[f] === '') body[f] = null
    }

    const item = await prisma.outraReceita.create({ data: body })
    await logAudit("CRIAR", "Outra Receita", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST /api/receitas/outras error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
