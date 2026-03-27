import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/migrate/adm-geral
 * Migração única: substitui 'Receita Geral' → ID do projeto ADMINISTRAÇÃO GERAL
 * nas tabelas de receitas e despesas.
 * Idempotente: seguro rodar múltiplas vezes.
 */
export async function POST() {
  try {
    // 1. Busca o projeto ADMINISTRAÇÃO GERAL
    const projeto = await prisma.projetoFilantropia.findFirst({
      where: { nome: { contains: 'ADMINISTRAÇÃO GERAL', mode: 'insensitive' } },
      select: { id: true, nome: true },
    })

    if (!projeto) {
      return NextResponse.json({
        success: false,
        error: 'Projeto ADMINISTRAÇÃO GERAL não encontrado no banco de dados.',
      }, { status: 404 })
    }

    const id = projeto.id

    // 2. Receitas: 'Receita Geral' → ID do projeto
    const receitasWhere = { projetoDirecionado: 'Receita Geral' }
    const receitasData = { projetoDirecionado: id }

    const [rpf, rpj, rpub, rcur, rprod, rsvc, rev, rout] = await Promise.all([
      prisma.receitaPessoaFisica.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.receitaPessoaJuridica.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.receitaPublica.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.receitaCurso.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.receitaProduto.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.receitaServico.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.receitaEvento.updateMany({ where: receitasWhere, data: receitasData }),
      prisma.outraReceita.updateMany({ where: receitasWhere, data: receitasData }),
    ])

    // 3. Despesas: projetoDirecionado vazio ou null → ID do projeto
    const despesasWhere = { OR: [{ projetoDirecionado: '' }, { projetoDirecionado: null }] }
    const despesasData = { projetoDirecionado: id }

    const [dcons, ddig, dloc, dext, dcopa] = await Promise.all([
      prisma.despesaConsumo.updateMany({ where: despesasWhere, data: despesasData }),
      prisma.despesaDigital.updateMany({ where: despesasWhere, data: despesasData }),
      prisma.despesaLocacao.updateMany({ where: despesasWhere, data: despesasData }),
      prisma.despesaServicoExterno.updateMany({ where: despesasWhere, data: despesasData }),
      prisma.despesaCopaCozinha.updateMany({ where: despesasWhere, data: despesasData }),
    ])

    const totalReceitas = rpf.count + rpj.count + rpub.count + rcur.count + rprod.count + rsvc.count + rev.count + rout.count
    const totalDespesas = dcons.count + ddig.count + dloc.count + dext.count + dcopa.count

    return NextResponse.json({
      success: true,
      projeto: { id: projeto.id, nome: projeto.nome },
      atualizados: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        detalhe: {
          receitaPF: rpf.count, receitaPJ: rpj.count, receitaPublica: rpub.count,
          receitaCurso: rcur.count, receitaProduto: rprod.count, receitaServico: rsvc.count,
          receitaEvento: rev.count, outraReceita: rout.count,
          despesaConsumo: dcons.count, despesaDigital: ddig.count, despesaLocacao: dloc.count,
          despesaExterno: dext.count, despesaCopa: dcopa.count,
        },
      },
    })
  } catch (error) {
    console.error('[migrate/adm-geral]', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
