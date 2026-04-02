import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const next30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const result = await prisma.$transaction(async (tx) => {
      const counts = await tx.$queryRaw<[{
        voluntarios: bigint, projetos: bigint, projetos_ativos: bigint,
        eventos: bigint, eventos_proximos: bigint, eventos_passados: bigint,
        func_clt: bigint, func_pj: bigint, fornecedores: bigint,
        departamentos: bigint, contratos: bigint, documentos: bigint,
        vol_projetos: bigint, vol_eventos: bigint,
      }]>`
        SELECT
          (SELECT COUNT(*) FROM "VoluntarioAMO")                                                             AS voluntarios,
          (SELECT COUNT(*) FROM "ProjetoFilantropia")                                                        AS projetos,
          (SELECT COUNT(*) FROM "ProjetoFilantropia" WHERE "dataEncerramento" >= ${now})                     AS projetos_ativos,
          (SELECT COUNT(*) FROM "Evento")                                                                     AS eventos,
          (SELECT COUNT(*) FROM "Evento" WHERE "dataInicio" >= ${now} AND "dataInicio" <= ${next30days})     AS eventos_proximos,
          (SELECT COUNT(*) FROM "Evento" WHERE "dataInicio" < ${now})                                        AS eventos_passados,
          (SELECT COUNT(*) FROM "FuncionarioCLT")                                                            AS func_clt,
          (SELECT COUNT(*) FROM "FuncionarioPJ")                                                             AS func_pj,
          (SELECT COUNT(*) FROM "Fornecedor")                                                                AS fornecedores,
          (SELECT COUNT(*) FROM "Departamento")                                                              AS departamentos,
          (SELECT COUNT(*) FROM "ContratoLocacao")                                                           AS contratos,
          (SELECT COUNT(*) FROM "DocumentoAMO")                                                              AS documentos,
          (SELECT COUNT(*) FROM "VoluntarioProjeto")                                                         AS vol_projetos,
          (SELECT COUNT(*) FROM "VoluntarioEvento")                                                          AS vol_eventos
      `

      const projetosRecentes = await tx.projetoFilantropia.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, nome: true, createdAt: true, dataEncerramento: true } })
      const eventosRecentes = await tx.evento.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, nome: true, createdAt: true, dataInicio: true } })

      return { counts: counts[0], projetosRecentes, eventosRecentes }
    }, { timeout: 20000 })

    const c = result.counts

    const atividadeRecente = [
      ...result.projetosRecentes.map(p => ({ tipo: 'projeto', titulo: p.nome, data: p.createdAt, id: p.id })),
      ...result.eventosRecentes.map(e => ({ tipo: 'evento', titulo: e.nome, data: e.createdAt, id: e.id })),
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 8)

    return NextResponse.json({
      success: true, data: {
        totalVoluntarios:      Number(c.voluntarios),
        totalProjetos:         Number(c.projetos),
        projetosAtivos:        Number(c.projetos_ativos),
        projetosEncerrados:    Number(c.projetos) - Number(c.projetos_ativos),
        totalEventos:          Number(c.eventos),
        eventosProximos:       Number(c.eventos_proximos),
        eventosPassados:       Number(c.eventos_passados),
        totalFuncionarios:     Number(c.func_clt) + Number(c.func_pj),
        totalFuncionariosCLT:  Number(c.func_clt),
        totalFuncionariosPJ:   Number(c.func_pj),
        totalFornecedores:     Number(c.fornecedores),
        totalDepartamentos:    Number(c.departamentos),
        totalContratos:        Number(c.contratos),
        totalDocumentos:       Number(c.documentos),
        voluntariosEmProjetos: Number(c.vol_projetos),
        voluntariosEmEventos:  Number(c.vol_eventos),
        atividadeRecente,
        mesAtual: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
      }
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
