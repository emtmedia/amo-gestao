import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchLookups, fetchTransacoesProjeto, fetchTransacoesEvento } from '@/lib/extrato'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projetoId = searchParams.get('projetoId')
  if (!projetoId) return NextResponse.json({ success: false, error: 'projetoId obrigatório' }, { status: 400 })

  try {
    const [projeto, eventos, L] = await Promise.all([
      prisma.projetoFilantropia.findUnique({ where: { id: projetoId }, select: { id: true, nome: true, dataInicio: true, dataEncerramento: true } }),
      prisma.evento.findMany({ where: { projetoVinculadoId: projetoId }, select: { id: true, nome: true, dataInicio: true, dataEncerramento: true }, orderBy: { dataInicio: 'asc' } }),
      fetchLookups(),
    ])
    if (!projeto) return NextResponse.json({ success: false, error: 'Projeto não encontrado' }, { status: 404 })

    // Direct project transactions
    const direto = await fetchTransacoesProjeto(projetoId, L)

    // Per-event transactions
    const eventoExtratos = await Promise.all(
      eventos.map(async ev => {
        const transacoes = await fetchTransacoesEvento(ev.id, L)
        const totalEntradas = transacoes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
        const totalSaidas = transacoes.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
        return {
          evento: ev,
          transacoes,
          totais: { entradas: totalEntradas, saidas: totalSaidas, saldo: totalEntradas - totalSaidas },
        }
      })
    )

    const allTransacoes = [
      ...direto,
      ...eventoExtratos.flatMap(e => e.transacoes),
    ]
    const totalEntradas = allTransacoes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
    const totalSaidas = allTransacoes.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
    const diretEntradas = direto.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
    const diretSaidas = direto.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)

    return NextResponse.json({
      success: true,
      projeto,
      direto: {
        transacoes: direto,
        totais: { entradas: diretEntradas, saidas: diretSaidas, saldo: diretEntradas - diretSaidas },
      },
      eventos: eventoExtratos,
      totaisGeral: { entradas: totalEntradas, saidas: totalSaidas, saldo: totalEntradas - totalSaidas },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
