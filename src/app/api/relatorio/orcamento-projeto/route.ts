import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projetoId = searchParams.get('projetoId')
  if (!projetoId) return NextResponse.json({ success: false, error: 'projetoId obrigatório' }, { status: 400 })

  try {
    const [rpub, rpf, rpj, rcur, rprod, rsvc, revet, rout] = await prisma.$transaction([
      prisma.receitaPublica.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorRecurso: true } }),
      prisma.receitaPessoaFisica.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorContribuicao: true } }),
      prisma.receitaPessoaJuridica.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorContribuicao: true } }),
      prisma.receitaCurso.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorReceita: true } }),
      prisma.receitaProduto.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorReceita: true } }),
      prisma.receitaServico.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorReceita: true } }),
      prisma.receitaEvento.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorReceita: true } }),
      prisma.outraReceita.aggregate({ where: { projetoDirecionado: projetoId }, _sum: { valorContribuicao: true } }),
    ])

    const total =
      (rpub._sum.valorRecurso ?? 0) +
      (rpf._sum.valorContribuicao ?? 0) +
      (rpj._sum.valorContribuicao ?? 0) +
      (rcur._sum.valorReceita ?? 0) +
      (rprod._sum.valorReceita ?? 0) +
      (rsvc._sum.valorReceita ?? 0) +
      (revet._sum.valorReceita ?? 0) +
      (rout._sum.valorContribuicao ?? 0)

    return NextResponse.json({ success: true, total })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
