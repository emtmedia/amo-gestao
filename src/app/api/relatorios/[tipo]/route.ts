import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function dateWhere(field: string, ano?: string | null, mes?: string | null) {
  if (!ano) return {}
  const y = parseInt(ano)
  if (mes) {
    const m = parseInt(mes) - 1
    return { [field]: { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) } }
  }
  return { [field]: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } }
}

// ─── PROJETOS ────────────────────────────────────────────────────────────────
async function getProjetos(ano?: string | null, mes?: string | null, status?: string | null) {
  const items = await prisma.projetoFilantropia.findMany({
    where: { ...dateWhere('dataInicio', ano, mes) },
    orderBy: { dataInicio: 'desc' },
    include: {
      departamento: { select: { nome: true } },
      consolidacao: { select: { id: true, saldoOrcamento: true, dataConclusaoReal: true } },
    },
  })
  const data = items.map(p => ({
    id: p.id,
    nome: p.nome,
    dataInicio: p.dataInicio,
    dataEncerramento: p.dataEncerramento,
    responsavel: p.responsavel,
    emailResponsavel: p.emailResponsavel,
    telefoneResponsavel: p.telefoneResponsavel,
    orcamentoEstimado: p.orcamentoEstimado,
    departamento: p.departamento?.nome ?? null,
    numeroVoluntarios: p.numeroVoluntarios,
    cidadeRealizacao: p.cidadeRealizacao,
    estadoRealizacao: p.estadoRealizacao,
    comentarios: p.comentarios,
    status: !p.consolidacao ? 'ativo'
      : (p.consolidacao.saldoOrcamento ?? 0) >= 0 ? 'consolidado_ok' : 'consolidado_pendente',
    consolidadoEm: p.consolidacao?.dataConclusaoReal ?? null,
  }))
  if (!status || status === 'all') return data
  if (status === 'ativo') return data.filter(d => d.status === 'ativo')
  return data.filter(d => d.status !== 'ativo')
}

// ─── PROJETOS + EVENTOS ───────────────────────────────────────────────────────
async function getProjetosEventos(ano?: string | null, mes?: string | null, status?: string | null) {
  const items = await prisma.projetoFilantropia.findMany({
    where: { ...dateWhere('dataInicio', ano, mes) },
    orderBy: { dataInicio: 'desc' },
    include: {
      departamento: { select: { nome: true } },
      consolidacao: { select: { id: true, saldoOrcamento: true } },
      eventos: {
        orderBy: { dataInicio: 'asc' },
        include: { consolidacao: { select: { id: true } } },
      },
    },
  })
  const data = items.map(p => ({
    id: p.id,
    nome: p.nome,
    dataInicio: p.dataInicio,
    dataEncerramento: p.dataEncerramento,
    responsavel: p.responsavel,
    orcamentoEstimado: p.orcamentoEstimado,
    departamento: p.departamento?.nome ?? null,
    status: !p.consolidacao ? 'ativo' : 'consolidado',
    eventos: p.eventos.map(e => ({
      id: e.id,
      nome: e.nome,
      dataInicio: e.dataInicio,
      dataEncerramento: e.dataEncerramento,
      responsavel: e.responsavel,
      orcamentoEstimado: e.orcamentoEstimado,
      status: !e.consolidacao ? 'ativo' : 'consolidado',
    })),
  }))
  if (!status || status === 'all') return data
  if (status === 'ativo') return data.filter(d => d.status === 'ativo')
  return data.filter(d => d.status !== 'ativo')
}

// ─── VOLUNTÁRIOS ──────────────────────────────────────────────────────────────
async function getVoluntarios(
  ano?: string | null, mes?: string | null,
  status?: string | null, projetoNome?: string | null, eventoNome?: string | null
) {
  const vols = await prisma.voluntarioAMO.findMany({
    orderBy: { nome: 'asc' },
    include: {
      voluntariosProjeto: {
        include: { projeto: { select: { nome: true } } },
      },
      voluntariosEvento: {
        include: { evento: { select: { nome: true, projetoVinculadoId: true } } },
      },
    },
  })

  let data = vols.map(v => {
    const projetos = v.voluntariosProjeto.map(vp => ({
      projetoNome: vp.projeto.nome,
      funcao: vp.funcaoCargo,
      dataInicio: vp.dataInicio,
      dataSaida: vp.dataSaida,
    }))
    const eventos = v.voluntariosEvento.map(ve => ({
      eventoNome: ve.evento.nome,
      funcao: ve.funcaoCargo,
      dataInicio: ve.dataInicio,
      dataSaida: ve.dataSaida,
      avulso: !ve.evento.projetoVinculadoId,
    }))
    return {
      id: v.id,
      nome: v.nome,
      cpf: v.cpf,
      genero: v.genero,
      competencias: v.competencias,
      membroIgrejaOmega: v.membroIgrejaOmega,
      projetos,
      eventos,
    }
  })

  if (projetoNome) {
    const q = projetoNome.toLowerCase()
    data = data.filter(v => v.projetos.some(p => p.projetoNome.toLowerCase().includes(q)))
  }
  if (eventoNome) {
    const q = eventoNome.toLowerCase()
    data = data.filter(v => v.eventos.some(e => e.eventoNome.toLowerCase().includes(q)))
  }
  return data
}

// ─── TERMOS DE VOLUNTARIADO ───────────────────────────────────────────────────
async function getTermos(ano?: string | null, mes?: string | null, assinatura?: string | null) {
  type TermoRow = {
    id: string; numero: string; sequencia: number
    voluntarioNome: string; voluntarioCpf: string
    projetoNome: string | null; eventoNome: string | null
    emitidoEm: Date; docAssinadoUrl: string | null
  }
  let items = await prisma.$queryRaw<TermoRow[]>`SELECT * FROM "TermoVoluntariado" ORDER BY sequencia DESC`

  if (ano) {
    const y = parseInt(ano)
    items = items.filter(t => t.emitidoEm.getFullYear() === y)
    if (mes) {
      const m = parseInt(mes) - 1
      items = items.filter(t => t.emitidoEm.getMonth() === m)
    }
  }
  if (assinatura === 'assinado') items = items.filter(t => !!t.docAssinadoUrl)
  if (assinatura === 'pendente') items = items.filter(t => !t.docAssinadoUrl)
  return items
}

// ─── RECIBOS ──────────────────────────────────────────────────────────────────
async function getRecibos(ano?: string | null, mes?: string | null, assinatura?: string | null) {
  type ReciboRow = {
    id: string; numero: string; sequencia: number
    data: string; hora: string
    nomeRecebedor: string; cpfRecebedor: string
    valor: number; descricao: string
    createdAt: Date; docAssinadoUrl: string | null
  }
  let items = await prisma.$queryRaw<ReciboRow[]>`SELECT * FROM "Recibo" ORDER BY sequencia DESC`

  if (ano) {
    const y = parseInt(ano)
    items = items.filter(r => new Date(r.data + 'T12:00:00').getFullYear() === y)
    if (mes) {
      const m = parseInt(mes) - 1
      items = items.filter(r => new Date(r.data + 'T12:00:00').getMonth() === m)
    }
  }
  if (assinatura === 'assinado') items = items.filter(r => !!r.docAssinadoUrl)
  if (assinatura === 'pendente') items = items.filter(r => !r.docAssinadoUrl)
  return items
}

// ─── RECEITAS ─────────────────────────────────────────────────────────────────
async function getReceitas(
  ano?: string | null, mes?: string | null,
  projetoNome?: string | null, eventoNome?: string | null
) {
  const dw = dateWhere('dataEntrada', ano, mes)
  const projetoFilter = projetoNome ? { projetoDirecionado: { contains: projetoNome, mode: 'insensitive' as const } } : {}
  const eventoFilter = eventoNome ? { eventoDirecionado: { contains: eventoNome, mode: 'insensitive' as const } } : {}
  const vinculoFilter = projetoNome ? projetoFilter : eventoNome ? eventoFilter : {}

  const [pf, pj, publica, cursos, produtos, servicos, eventoRec, outras,
    todosCursos, todosProdutos, todosServicos, todosEventos] = await Promise.all([
    prisma.receitaPessoaFisica.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.receitaPessoaJuridica.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.receitaPublica.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.receitaCurso.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.receitaProduto.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.receitaServico.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.receitaEvento.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.outraReceita.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataEntrada: 'desc' } }),
    prisma.cursoTreinamento.findMany({ select: { id: true, nome: true } }),
    prisma.produto.findMany({ select: { id: true, nome: true } }),
    prisma.servico.findMany({ select: { id: true, nome: true } }),
    prisma.evento.findMany({ select: { id: true, nome: true } }),
  ])

  const cursoMap = Object.fromEntries(todosCursos.map(c => [c.id, c.nome]))
  const prodMap = Object.fromEntries(todosProdutos.map(p => [p.id, p.nome]))
  const svcMap = Object.fromEntries(todosServicos.map(s => [s.id, s.nome]))
  const evMap2 = Object.fromEntries(todosEventos.map(e => [e.id, e.nome]))

  return [
    ...pf.map(r => ({ id: r.id, categoria: 'Pessoa Física', descricao: r.nomeContribuinte, valor: r.valorContribuicao, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...pj.map(r => ({ id: r.id, categoria: 'Pessoa Jurídica', descricao: r.nomeEmpresa, valor: r.valorContribuicao, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...publica.map(r => ({ id: r.id, categoria: 'Receita Pública', descricao: r.nomeOrgao, valor: r.valorRecurso, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...cursos.map(r => ({ id: r.id, categoria: 'Cursos/Treinamentos', descricao: cursoMap[r.cursoId] ?? r.cursoId, valor: r.valorReceita, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...produtos.map(r => ({ id: r.id, categoria: 'Produtos', descricao: prodMap[r.produtoId] ?? r.produtoId, valor: r.valorReceita, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...servicos.map(r => ({ id: r.id, categoria: 'Serviços', descricao: svcMap[r.servicoId] ?? r.servicoId, valor: r.valorReceita, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...eventoRec.map(r => ({ id: r.id, categoria: 'Eventos c/ Bilheteria', descricao: evMap2[r.eventoId] ?? r.eventoId, valor: r.valorReceita, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
    ...outras.map(r => ({ id: r.id, categoria: 'Outras Receitas', descricao: r.nomeContribuinte, valor: r.valorContribuicao, data: r.dataEntrada, projeto: r.projetoDirecionado, evento: r.eventoDirecionado })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
}

// ─── DESPESAS ────────────────────────────────────────────────────────────────
async function getDespesas(
  ano?: string | null, mes?: string | null,
  projetoNome?: string | null, eventoNome?: string | null
) {
  const dw = dateWhere('dataPagamento', ano, mes)
  const projetoFilter = projetoNome ? { projetoDirecionado: { contains: projetoNome, mode: 'insensitive' as const } } : {}
  const eventoFilter = eventoNome ? { eventoDirecionado: { contains: eventoNome, mode: 'insensitive' as const } } : {}
  const vinculoFilter = projetoNome ? projetoFilter : eventoNome ? eventoFilter : {}

  const [consumo, digital, locacao, externo, copa, conservacao, todosForns] = await Promise.all([
    prisma.despesaConsumo.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataPagamento: 'desc' } }),
    prisma.despesaDigital.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataPagamento: 'desc' } }),
    prisma.despesaLocacao.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataPagamento: 'desc' } }),
    prisma.despesaServicoExterno.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataPagamento: 'desc' } }),
    prisma.despesaCopaCozinha.findMany({ where: { ...dw, ...vinculoFilter }, orderBy: { dataPagamento: 'desc' } }),
    prisma.despesaConservacao.findMany({ where: dw, orderBy: { dataPagamento: 'desc' } }),
    prisma.fornecedor.findMany({ select: { id: true, nome: true } }),
  ])

  const fornMap = Object.fromEntries(todosForns.map(f => [f.id, f.nome]))

  return [
    ...consumo.map(d => ({ id: d.id, categoria: 'Contas de Consumo', fornecedor: fornMap[d.fornecedorId] ?? '—', valor: d.valorTitulo, data: d.dataPagamento, projeto: d.projetoDirecionado, evento: d.eventoDirecionado })),
    ...digital.map(d => ({ id: d.id, categoria: 'Serviços Digitais', fornecedor: fornMap[d.fornecedorId] ?? '—', valor: d.valorTitulo, data: d.dataPagamento, projeto: d.projetoDirecionado, evento: d.eventoDirecionado })),
    ...locacao.map(d => ({ id: d.id, categoria: 'Locação de Equip.', fornecedor: fornMap[d.fornecedorId] ?? '—', valor: d.valorLocacao, data: d.dataPagamento, projeto: d.projetoDirecionado, evento: d.eventoDirecionado })),
    ...externo.map(d => ({ id: d.id, categoria: 'Serviços Externos', fornecedor: fornMap[d.fornecedorId] ?? '—', valor: d.valor, data: d.dataPagamento, projeto: d.projetoDirecionado, evento: d.eventoDirecionado })),
    ...copa.map(d => ({ id: d.id, categoria: 'Copa e Cozinha', fornecedor: fornMap[d.fornecedorId] ?? '—', valor: d.valorPagamento, data: d.dataPagamento, projeto: d.projetoDirecionado, evento: d.eventoDirecionado })),
    ...conservacao.map(d => ({ id: d.id, categoria: 'Conservação/Zeladoria', fornecedor: d.nomeFornecedor, valor: d.valorTitulo, data: d.dataPagamento, projeto: null, evento: null })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
}

// ─── FORNECEDORES ─────────────────────────────────────────────────────────────
async function getFornecedores(categoriaId?: string | null, subcategoriaId?: string | null) {
  return prisma.fornecedor.findMany({
    where: {
      ...(categoriaId ? { categoriaId } : {}),
      ...(subcategoriaId ? { subcategoriaId } : {}),
    },
    orderBy: { nome: 'asc' },
    include: {
      categoria: { select: { nome: true } },
      subcategoria: { select: { nome: true } },
    },
  })
}

// ─── COLABORADORES ────────────────────────────────────────────────────────────
async function getColaboradores(tipoPessoa?: string | null) {
  const [clt, pj] = await Promise.all([
    tipoPessoa === 'pj' ? [] : prisma.funcionarioCLT.findMany({ orderBy: { nomeCompleto: 'asc' } }),
    tipoPessoa === 'pf' ? [] : prisma.funcionarioPJ.findMany({ orderBy: { nomeCompleto: 'asc' } }),
  ])
  return [
    ...clt.map(c => ({
      id: c.id, tipo: 'CLT', nome: c.nomeCompleto, cpf: c.cpf, cnpj: null,
      empresa: null, dataContratacao: c.dataContratacao,
      salario: c.salarioMensal, observacoes: c.observacoes,
    })),
    ...pj.map(c => ({
      id: c.id, tipo: 'PJ', nome: c.nomeCompleto, cpf: null, cnpj: c.cnpj,
      empresa: c.nomeEmpresa, dataContratacao: c.dataContratacao,
      salario: c.valorMedicaoMensal, observacoes: c.observacoes,
    })),
  ]
}

// ─── CHEQUE-RECIBOS ───────────────────────────────────────────────────────────
async function getChequeRecibos(
  ano?: string | null, mes?: string | null,
  assinatura?: string | null, saldo?: string | null,
  recebedor?: string | null
) {
  type CRRow = {
    id: string; numero: string; sequencia: number
    nomeOperador: string; dataTransferencia: Date; valorConcedido: number
    metodoTransferencia: string; nomeRecebedor: string; cpfRecebedor: string
    dataAcertoNotas: Date; observacoes: string | null
    projetoId: string | null; eventoId: string | null
    arquivado: boolean; docAssinadoUrl: string | null; createdAt: Date
  }
  type AnexoRow = { chequeReciboId: string; valorDocumento: number }

  let items = await prisma.$queryRaw<CRRow[]>`
    SELECT id, numero, sequencia, "nomeOperador", "dataTransferencia", "valorConcedido",
           "metodoTransferencia", "nomeRecebedor", "cpfRecebedor", "dataAcertoNotas",
           observacoes, "projetoId", "eventoId",
           COALESCE("arquivado", false) AS "arquivado",
           "docAssinadoUrl", "createdAt"
    FROM "ChequeRecibo" ORDER BY sequencia DESC
  `
  let anexos: AnexoRow[] = []
  try {
    anexos = await prisma.$queryRaw<AnexoRow[]>`
      SELECT "chequeReciboId", "valorDocumento" FROM "ChequeReciboAnexo"
    `
  } catch { /* tabela ainda não migrada */ }

  const totalPorCR: Record<string, number> = {}
  for (const a of anexos) {
    totalPorCR[a.chequeReciboId] = (totalPorCR[a.chequeReciboId] ?? 0) + a.valorDocumento
  }

  // Buscar nomes de projetos e eventos
  const projetoIds = [...new Set(items.map(i => i.projetoId).filter(Boolean))] as string[]
  const eventoIds = [...new Set(items.map(i => i.eventoId).filter(Boolean))] as string[]
  const [projetos, eventos] = await Promise.all([
    projetoIds.length ? prisma.projetoFilantropia.findMany({ where: { id: { in: projetoIds } }, select: { id: true, nome: true } }) : [],
    eventoIds.length ? prisma.evento.findMany({ where: { id: { in: eventoIds } }, select: { id: true, nome: true } }) : [],
  ])
  const projMap = Object.fromEntries(projetos.map(p => [p.id, p.nome]))
  const evMap = Object.fromEntries(eventos.map(e => [e.id, e.nome]))

  let data = items.map(cr => {
    const totalDocs = totalPorCR[cr.id] ?? 0
    const saldoVal = cr.valorConcedido - totalDocs
    return {
      ...cr,
      totalDocumentos: totalDocs,
      saldoVal,
      projetoNome: cr.projetoId ? projMap[cr.projetoId] ?? null : null,
      eventoNome: cr.eventoId ? evMap[cr.eventoId] ?? null : null,
    }
  })

  if (ano) {
    const y = parseInt(ano)
    data = data.filter(d => d.dataTransferencia.getFullYear() === y)
    if (mes) {
      const m = parseInt(mes) - 1
      data = data.filter(d => d.dataTransferencia.getMonth() === m)
    }
  }
  if (assinatura === 'assinado') data = data.filter(d => !!d.docAssinadoUrl)
  if (assinatura === 'pendente') data = data.filter(d => !d.docAssinadoUrl)
  if (saldo === 'zero') data = data.filter(d => Math.abs(d.saldoVal) < 0.01)
  if (saldo === 'negativo') data = data.filter(d => d.saldoVal < -0.01)
  if (recebedor) data = data.filter(d => d.nomeRecebedor.toLowerCase().includes(recebedor.toLowerCase()))

  return data
}

// ─── EVENTOS AVULSOS ──────────────────────────────────────────────────────────
async function getEventosAvulsos(ano?: string | null, mes?: string | null, status?: string | null) {
  const items = await prisma.evento.findMany({
    where: {
      projetoVinculadoId: null,
      ...dateWhere('dataInicio', ano, mes),
    },
    orderBy: { dataInicio: 'desc' },
    include: {
      consolidacao: { select: { id: true, saldoOrcamento: true, dataConclusaoReal: true } },
    },
  })
  const data = items.map(e => ({
    id: e.id,
    nome: e.nome,
    dataInicio: e.dataInicio,
    dataEncerramento: e.dataEncerramento,
    responsavel: e.responsavel,
    emailResponsavel: e.emailResponsavel,
    telefoneResponsavel: e.telefoneResponsavel,
    orcamentoEstimado: e.orcamentoEstimado,
    numeroVoluntarios: e.numeroVoluntarios,
    cidadeRealizacao: e.cidadeRealizacao,
    estadoRealizacao: e.estadoRealizacao,
    comentarios: e.comentarios,
    status: !e.consolidacao ? 'ativo'
      : (e.consolidacao.saldoOrcamento ?? 0) >= 0 ? 'consolidado_ok' : 'consolidado_pendente',
    consolidadoEm: e.consolidacao?.dataConclusaoReal ?? null,
  }))
  if (!status || status === 'all') return data
  if (status === 'ativo') return data.filter(d => d.status === 'ativo')
  return data.filter(d => d.status !== 'ativo')
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { tipo: string } }) {
  const sp = new URL(req.url).searchParams
  const ano = sp.get('ano')
  const mes = sp.get('mes')
  const status = sp.get('status')
  const assinatura = sp.get('assinatura')
  const projetoNome = sp.get('projetoNome')
  const eventoNome = sp.get('eventoNome')
  const categoriaId = sp.get('categoriaId')
  const subcategoriaId = sp.get('subcategoriaId')
  const tipoPessoa = sp.get('tipoPessoa')
  const saldo = sp.get('saldo')
  const recebedor = sp.get('recebedor')

  try {
    let data: unknown
    switch (params.tipo) {
      case 'projetos':         data = await getProjetos(ano, mes, status); break
      case 'projetos-eventos': data = await getProjetosEventos(ano, mes, status); break
      case 'voluntarios':      data = await getVoluntarios(ano, mes, status, projetoNome, eventoNome); break
      case 'termos':           data = await getTermos(ano, mes, assinatura); break
      case 'recibos':          data = await getRecibos(ano, mes, assinatura); break
      case 'receitas':         data = await getReceitas(ano, mes, projetoNome, eventoNome); break
      case 'despesas':         data = await getDespesas(ano, mes, projetoNome, eventoNome); break
      case 'fornecedores':     data = await getFornecedores(categoriaId, subcategoriaId); break
      case 'colaboradores':    data = await getColaboradores(tipoPessoa); break
      case 'cheque-recibos':    data = await getChequeRecibos(ano, mes, assinatura, saldo, recebedor); break
      case 'eventos-avulsos':   data = await getEventosAvulsos(ano, mes, status); break
      default:
        return NextResponse.json({ success: false, error: 'Tipo de relatório inválido' }, { status: 400 })
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(`[relatorios/${params.tipo}]`, error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
