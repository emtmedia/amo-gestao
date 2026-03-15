import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchLookups, fetchTransacoesEvento } from '@/lib/extrato'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventoId = searchParams.get('eventoId')
  if (!eventoId) return NextResponse.json({ success: false, error: 'eventoId obrigatório' }, { status: 400 })

  try {
    const [evento, L] = await Promise.all([
      prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true, nome: true, dataInicio: true, dataEncerramento: true, projetoVinculadoId: true } }),
      fetchLookups(),
    ])
    if (!evento) return NextResponse.json({ success: false, error: 'Evento não encontrado' }, { status: 404 })

    let projetoNome: string | null = null
    if (evento.projetoVinculadoId) {
      const proj = await prisma.projetoFilantropia.findUnique({ where: { id: evento.projetoVinculadoId }, select: { nome: true } })
      projetoNome = proj?.nome ?? null
    }

    const transacoes = await fetchTransacoesEvento(eventoId, L)

    const totalEntradas = transacoes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
    const totalSaidas = transacoes.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)

    return NextResponse.json({
      success: true,
      evento: { ...evento, projetoNome },
      transacoes,
      totais: { entradas: totalEntradas, saidas: totalSaidas, saldo: totalEntradas - totalSaidas },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
