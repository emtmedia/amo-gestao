import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventoId = searchParams.get('eventoId')
  if (!eventoId) return NextResponse.json({ success: false, error: 'eventoId obrigatório' }, { status: 400 })

  try {
    const [rpub, rpf, rpj, rcur, rprod, rsvc, revet, rout,
           dcons, ddig, dloc, dext, dcopa] = await prisma.$transaction([
      prisma.receitaPublica.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorRecurso: true } }),
      prisma.receitaPessoaFisica.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorContribuicao: true } }),
      prisma.receitaPessoaJuridica.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorContribuicao: true } }),
      prisma.receitaCurso.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorReceita: true } }),
      prisma.receitaProduto.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorReceita: true } }),
      prisma.receitaServico.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorReceita: true } }),
      prisma.receitaEvento.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorReceita: true } }),
      prisma.outraReceita.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorContribuicao: true } }),
      prisma.despesaConsumo.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorTitulo: true } }),
      prisma.despesaDigital.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorTitulo: true } }),
      prisma.despesaLocacao.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorLocacao: true } }),
      prisma.despesaServicoExterno.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valor: true } }),
      prisma.despesaCopaCozinha.aggregate({ where: { eventoDirecionado: eventoId }, _sum: { valorPagamento: true } }),
    ])

    const aqRaw = await prisma.$queryRawUnsafe<{ total: string }[]>(
      `SELECT COALESCE(SUM("valorAquisicao"), 0) as total FROM "Aquisicao" WHERE "eventoId" = $1`, eventoId
    )

    const receitasBreakdown: Record<string, number> = {
      'Receita Pública': rpub._sum.valorRecurso ?? 0,
      'Pessoa Física': rpf._sum.valorContribuicao ?? 0,
      'Pessoa Jurídica': rpj._sum.valorContribuicao ?? 0,
      'Cursos/Treinamentos': rcur._sum.valorReceita ?? 0,
      'Produtos': rprod._sum.valorReceita ?? 0,
      'Serviços': rsvc._sum.valorReceita ?? 0,
      'Eventos com Bilheteria': revet._sum.valorReceita ?? 0,
      'Outras Receitas': rout._sum.valorContribuicao ?? 0,
    }
    const despesasBreakdown: Record<string, number> = {
      'Contas de Consumo': dcons._sum.valorTitulo ?? 0,
      'Serviços Digitais': ddig._sum.valorTitulo ?? 0,
      'Locação de Equipamentos': dloc._sum.valorLocacao ?? 0,
      'Serviços Externos': dext._sum.valor ?? 0,
      'Copa e Cozinha': dcopa._sum.valorPagamento ?? 0,
      'Aquisições': Number(aqRaw[0]?.total ?? 0),
    }

    const totalReceitas = Object.values(receitasBreakdown).reduce((a, b) => a + b, 0)
    const totalDespesas = Object.values(despesasBreakdown).reduce((a, b) => a + b, 0)

    return NextResponse.json({
      success: true,
      receitas: { total: totalReceitas, breakdown: receitasBreakdown },
      despesas: { total: totalDespesas, breakdown: despesasBreakdown },
      saldo: totalReceitas - totalDespesas,
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
