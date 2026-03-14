import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.receitaServico.findMany({ orderBy: { createdAt: 'desc' } })
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
    const dateFields = ['dataEntrada']
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === 'string') {
        body[f] = new Date(body[f]).toISOString()
      }
    }

    // Garante que campos numéricos sejam number
    const numFields = ['valorReceita', 'valorContribuicao', 'valorRecurso']
    for (const f of numFields) {
      if (body[f] !== undefined) body[f] = parseFloat(body[f])
    }

    // Campos opcionais: converte string vazia em null
    const optionals = ['email', 'observacoes', 'arquivosReferencia', 'projetoDirecionado', 'eventoDirecionado', 'nomeContato', 'telefoneContato', 'emailContato']
    for (const f of optionals) {
      if (body[f] === '') body[f] = null
    }

    const item = await prisma.receitaServico.create({ data: body })
    await logAudit("CRIAR", "Receita Serviço", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST /api/receitas/servicos error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
