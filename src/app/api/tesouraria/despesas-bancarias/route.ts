import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const records = await prisma.despesaBancaria.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      ok: true,
      records: records.map(r => ({
        ...r,
        itens: JSON.parse(r.itens),
        dataPagamento: r.dataPagamento.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[despesas-bancarias GET]', error)
    return NextResponse.json({ error: 'Erro ao listar despesas bancárias.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const body = await req.json() as {
      itens: { descricao: string; valor: number; label: string | null; data: string }[]
      totalValor: number
      dataPagamento: string
      banco?: string
      periodo?: string
      consolidacaoId?: string
      observacoes?: string | null
    }

    const { itens, totalValor, dataPagamento, banco, periodo, consolidacaoId, observacoes } = body

    if (!itens?.length || !totalValor || !dataPagamento) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const record = await prisma.despesaBancaria.create({
      data: {
        itens: JSON.stringify(itens),
        totalValor: Number(totalValor),
        dataPagamento: new Date(dataPagamento),
        projetoDirecionado: 'ADMINISTRAÇÃO GERAL',
        banco: banco || null,
        periodo: periodo || null,
        consolidacaoId: consolidacaoId || null,
        observacoes: observacoes || null,
        criadoPorId: session.userId,
        criadoPorNome: session.nome,
      },
    })

    return NextResponse.json({ ok: true, id: record.id })
  } catch (error) {
    console.error('[despesas-bancarias POST]', error)
    return NextResponse.json({ error: 'Erro ao lançar despesas bancárias.' }, { status: 500 })
  }
}
