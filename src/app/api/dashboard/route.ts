import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const next30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Tudo numa ÚNICA transação interativa — usa 1 só conexão do pool
    const result = await prisma.$transaction(async (tx) => {
      const counts = await tx.$queryRaw<[{
        voluntarios: bigint, projetos: bigint, projetos_ativos: bigint,
        eventos: bigint, eventos_proximos: bigint,
        func_clt: bigint, func_pj: bigint, fornecedores: bigint,
        departamentos: bigint, contratos: bigint, documentos: bigint,
      }]>`
        SELECT
          (SELECT COUNT(*) FROM "VoluntarioAMO")                                                       AS voluntarios,
          (SELECT COUNT(*) FROM "ProjetoFilantropia")                                                  AS projetos,
          (SELECT COUNT(*) FROM "ProjetoFilantropia" WHERE "dataEncerramento" >= ${now})               AS projetos_ativos,
          (SELECT COUNT(*) FROM "Evento")                                                              AS eventos,
          (SELECT COUNT(*) FROM "Evento" WHERE "dataInicio" >= ${now} AND "dataInicio" <= ${next30days}) AS eventos_proximos,
          (SELECT COUNT(*) FROM "FuncionarioCLT")                                                      AS func_clt,
          (SELECT COUNT(*) FROM "FuncionarioPJ")                                                       AS func_pj,
          (SELECT COUNT(*) FROM "Fornecedor")                                                          AS fornecedores,
          (SELECT COUNT(*) FROM "Departamento")                                                        AS departamentos,
          (SELECT COUNT(*) FROM "ContratoLocacao")                                                     AS contratos,
          (SELECT COUNT(*) FROM "DocumentoAMO")                                                        AS documentos
      `

      const fin = await tx.$queryRaw<[{
        rpub: number, rpf: number, rpj: number, rcur: number, rprod: number, rsvc: number, revet: number, rout: number,
        dconsm: number, ddig: number, dcons: number, dloc: number, dext: number, dcopa: number,
        rpub_m: number, rpf_m: number, rpj_m: number, rcur_m: number, rprod_m: number, rsvc_m: number, revet_m: number, rout_m: number,
        dconsm_m: number, ddig_m: number, dcons_m: number, dloc_m: number, dext_m: number, dcopa_m: number,
      }]>`
        SELECT
          COALESCE((SELECT SUM("valorRecurso")      FROM "ReceitaPublica"),      0)::float AS rpub,
          COALESCE((SELECT SUM("valorContribuicao") FROM "ReceitaPessoaFisica"), 0)::float AS rpf,
          COALESCE((SELECT SUM("valorContribuicao") FROM "ReceitaPessoaJuridica"),0)::float AS rpj,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaCurso"),        0)::float AS rcur,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaProduto"),      0)::float AS rprod,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaServico"),      0)::float AS rsvc,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaEvento"),       0)::float AS revet,
          COALESCE((SELECT SUM("valorContribuicao") FROM "OutraReceita"),        0)::float AS rout,
          COALESCE((SELECT SUM("valorTitulo")       FROM "DespesaConsumo"),      0)::float AS dconsm,
          COALESCE((SELECT SUM("valorTitulo")       FROM "DespesaDigital"),      0)::float AS ddig,
          COALESCE((SELECT SUM("valorTitulo")       FROM "DespesaConservacao"),  0)::float AS dcons,
          COALESCE((SELECT SUM("valorLocacao")      FROM "DespesaLocacao"),      0)::float AS dloc,
          COALESCE((SELECT SUM("valor")             FROM "DespesaServicoExterno"),0)::float AS dext,
          COALESCE((SELECT SUM("valorPagamento")    FROM "DespesaCopaCozinha"),  0)::float AS dcopa,
          COALESCE((SELECT SUM("valorRecurso")      FROM "ReceitaPublica"       WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rpub_m,
          COALESCE((SELECT SUM("valorContribuicao") FROM "ReceitaPessoaFisica"  WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rpf_m,
          COALESCE((SELECT SUM("valorContribuicao") FROM "ReceitaPessoaJuridica"WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rpj_m,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaCurso"         WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rcur_m,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaProduto"       WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rprod_m,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaServico"       WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rsvc_m,
          COALESCE((SELECT SUM("valorReceita")      FROM "ReceitaEvento"        WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS revet_m,
          COALESCE((SELECT SUM("valorContribuicao") FROM "OutraReceita"         WHERE "dataEntrada"  >= ${startOfMonth}), 0)::float AS rout_m,
          COALESCE((SELECT SUM("valorTitulo")       FROM "DespesaConsumo"       WHERE "dataPagamento">= ${startOfMonth}), 0)::float AS dconsm_m,
          COALESCE((SELECT SUM("valorTitulo")       FROM "DespesaDigital"       WHERE "dataPagamento">= ${startOfMonth}), 0)::float AS ddig_m,
          COALESCE((SELECT SUM("valorTitulo")       FROM "DespesaConservacao"   WHERE "dataPagamento">= ${startOfMonth}), 0)::float AS dcons_m,
          COALESCE((SELECT SUM("valorLocacao")      FROM "DespesaLocacao"       WHERE "dataPagamento">= ${startOfMonth}), 0)::float AS dloc_m,
          COALESCE((SELECT SUM("valor")             FROM "DespesaServicoExterno"WHERE "dataPagamento">= ${startOfMonth}), 0)::float AS dext_m,
          COALESCE((SELECT SUM("valorPagamento")    FROM "DespesaCopaCozinha"   WHERE "dataPagamento">= ${startOfMonth}), 0)::float AS dcopa_m
      `

      const projetosRecentes = await tx.projetoFilantropia.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { id: true, nome: true, createdAt: true, dataEncerramento: true } })
      const eventosRecentes = await tx.evento.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { id: true, nome: true, createdAt: true, dataInicio: true } })
      const receitasRecentes = await tx.receitaPessoaFisica.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { id: true, nomeContribuinte: true, valorContribuicao: true, createdAt: true } })
      const despesasRecentes = await tx.despesaConsumo.findMany({ orderBy: { createdAt: 'desc' }, take: 4, select: { id: true, valorTitulo: true, createdAt: true } })

      return { counts: counts[0], fin: fin[0], projetosRecentes, eventosRecentes, receitasRecentes, despesasRecentes }
    }, { timeout: 20000 })

    const c = result.counts
    const f = result.fin

    const totalReceitas    = f.rpub + f.rpf + f.rpj + f.rcur + f.rprod + f.rsvc + f.revet + f.rout
    const totalDespesas    = f.dconsm + f.ddig + f.dcons + f.dloc + f.dext + f.dcopa
    const totalReceitasMes = f.rpub_m + f.rpf_m + f.rpj_m + f.rcur_m + f.rprod_m + f.rsvc_m + f.revet_m + f.rout_m
    const totalDespesasMes = f.dconsm_m + f.ddig_m + f.dcons_m + f.dloc_m + f.dext_m + f.dcopa_m

    const atividadeRecente = [
      ...result.projetosRecentes.map(p => ({ tipo: 'projeto', titulo: p.nome, data: p.createdAt, id: p.id, extra: p.dataEncerramento })),
      ...result.eventosRecentes.map(e => ({ tipo: 'evento', titulo: e.nome, data: e.createdAt, id: e.id, extra: e.dataInicio })),
      ...result.receitasRecentes.map(r => ({ tipo: 'receita', titulo: r.nomeContribuinte, valor: r.valorContribuicao, data: r.createdAt, id: r.id })),
      ...result.despesasRecentes.map(d => ({ tipo: 'despesa', titulo: 'Despesa de Consumo', valor: d.valorTitulo, data: d.createdAt, id: d.id })),
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 8)

    return NextResponse.json({
      success: true, data: {
        totalVoluntarios:    Number(c.voluntarios),
        totalProjetos:       Number(c.projetos),
        projetosAtivos:      Number(c.projetos_ativos),
        totalEventos:        Number(c.eventos),
        eventosProximos:     Number(c.eventos_proximos),
        totalFuncionarios:   Number(c.func_clt) + Number(c.func_pj),
        totalFuncionariosCLT:Number(c.func_clt),
        totalFuncionariosPJ: Number(c.func_pj),
        totalFornecedores:   Number(c.fornecedores),
        totalDepartamentos:  Number(c.departamentos),
        totalContratos:      Number(c.contratos),
        totalDocumentos:     Number(c.documentos),
        totalReceitas, totalDespesas, saldoGeral: totalReceitas - totalDespesas,
        totalReceitasMes, totalDespesasMes, saldoMes: totalReceitasMes - totalDespesasMes,
        atividadeRecente,
        mesAtual: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        receitasPorTipo: [
          { label: 'Pública',     valor: f.rpub },
          { label: 'P. Física',   valor: f.rpf },
          { label: 'P. Jurídica', valor: f.rpj },
          { label: 'Cursos',      valor: f.rcur },
          { label: 'Produtos',    valor: f.rprod },
          { label: 'Serviços',    valor: f.rsvc },
          { label: 'Eventos',     valor: f.revet },
          { label: 'Outras',      valor: f.rout },
        ].filter(x => x.valor > 0),
        despesasPorTipo: [
          { label: 'Consumo',     valor: f.dconsm },
          { label: 'Digital',     valor: f.ddig },
          { label: 'Conservação', valor: f.dcons },
          { label: 'Locação',     valor: f.dloc },
          { label: 'Externos',    valor: f.dext },
          { label: 'Copa/Coz.',   valor: f.dcopa },
        ].filter(x => x.valor > 0),
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
