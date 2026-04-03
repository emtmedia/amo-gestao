import prisma from './prisma'

export interface Lancamento {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: number
  observacoes: string | null
}

interface LookupTables {
  fornecedores: Map<string, string>
  tiposConsumo: Map<string, string>
  tiposDigital: Map<string, string>
  itensAlugado: Map<string, string>
  servicosPrestados: Map<string, string>
  itensCopa: Map<string, string>
  cursos: Map<string, string>
  produtos: Map<string, string>
  servicos: Map<string, string>
  eventos: Map<string, string>
}

export async function fetchLookups(): Promise<LookupTables> {
  const [forn, tCons, tDig, iAlug, sPrest, iCopa, curs, prod, serv, evts] = await Promise.all([
    prisma.fornecedor.findMany({ select: { id: true, nome: true } }),
    prisma.tipoServicoConsumo.findMany({ select: { id: true, nome: true } }),
    prisma.tipoServicoDigital.findMany({ select: { id: true, nome: true } }),
    prisma.itemAlugado.findMany({ select: { id: true, nome: true } }),
    prisma.servicoPrestado.findMany({ select: { id: true, nome: true } }),
    prisma.itemCopaCozinha.findMany({ select: { id: true, nome: true } }),
    prisma.cursoTreinamento.findMany({ select: { id: true, nome: true } }),
    prisma.produto.findMany({ select: { id: true, nome: true } }),
    prisma.servico.findMany({ select: { id: true, nome: true } }),
    prisma.evento.findMany({ select: { id: true, nome: true } }),
  ])
  return {
    fornecedores: new Map(forn.map(x => [x.id, x.nome])),
    tiposConsumo: new Map(tCons.map(x => [x.id, x.nome])),
    tiposDigital: new Map(tDig.map(x => [x.id, x.nome])),
    itensAlugado: new Map(iAlug.map(x => [x.id, x.nome])),
    servicosPrestados: new Map(sPrest.map(x => [x.id, x.nome])),
    itensCopa: new Map(iCopa.map(x => [x.id, x.nome])),
    cursos: new Map(curs.map(x => [x.id, x.nome])),
    produtos: new Map(prod.map(x => [x.id, x.nome])),
    servicos: new Map(serv.map(x => [x.id, x.nome])),
    eventos: new Map(evts.map(x => [x.id, x.nome])),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTransacoesEvento(eventoId: string, L: LookupTables): Promise<Lancamento[]> {
  const where = { eventoDirecionado: eventoId }
  const [rpub, rpf, rpj, rcur, rprod, rsvc, revet, rout, dcons, ddig, dloc, dext, dcopa] =
    await prisma.$transaction([
      prisma.receitaPublica.findMany({ where }),
      prisma.receitaPessoaFisica.findMany({ where }),
      prisma.receitaPessoaJuridica.findMany({ where }),
      prisma.receitaCurso.findMany({ where }),
      prisma.receitaProduto.findMany({ where }),
      prisma.receitaServico.findMany({ where }),
      prisma.receitaEvento.findMany({ where }),
      prisma.outraReceita.findMany({ where }),
      prisma.despesaConsumo.findMany({ where }),
      prisma.despesaDigital.findMany({ where }),
      prisma.despesaLocacao.findMany({ where }),
      prisma.despesaServicoExterno.findMany({ where }),
      prisma.despesaCopaCozinha.findMany({ where }),
    ])

  // Aquisicoes (raw)
  const aq = await prisma.$queryRawUnsafe<{ id: string; descricao: string; dataAquisicao: Date; valorAquisicao: unknown; observacoes: string | null }[]>(
    `SELECT "id","descricao","dataAquisicao","valorAquisicao","observacoes" FROM "Aquisicao" WHERE "eventoId" = $1`, eventoId
  )

  return normalizeTransacoes(rpub, rpf, rpj, rcur, rprod, rsvc, revet, rout, dcons, ddig, dloc, dext, dcopa, aq, L)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchTransacoesProjeto(projetoId: string, L: LookupTables): Promise<Lancamento[]> {
  const where = { projetoDirecionado: projetoId }
  const [rpub, rpf, rpj, rcur, rprod, rsvc, revet, rout, dcons, ddig, dloc, dext, dcopa] =
    await prisma.$transaction([
      prisma.receitaPublica.findMany({ where }),
      prisma.receitaPessoaFisica.findMany({ where }),
      prisma.receitaPessoaJuridica.findMany({ where }),
      prisma.receitaCurso.findMany({ where }),
      prisma.receitaProduto.findMany({ where }),
      prisma.receitaServico.findMany({ where }),
      prisma.receitaEvento.findMany({ where }),
      prisma.outraReceita.findMany({ where }),
      prisma.despesaConsumo.findMany({ where }),
      prisma.despesaDigital.findMany({ where }),
      prisma.despesaLocacao.findMany({ where }),
      prisma.despesaServicoExterno.findMany({ where }),
      prisma.despesaCopaCozinha.findMany({ where }),
    ])

  const [aq, dbank] = await Promise.all([
    prisma.$queryRawUnsafe<{ id: string; descricao: string; dataAquisicao: Date; valorAquisicao: unknown; observacoes: string | null }[]>(
      `SELECT "id","descricao","dataAquisicao","valorAquisicao","observacoes" FROM "Aquisicao" WHERE "projetoId" = $1`, projetoId
    ),
    prisma.despesaBancaria.findMany({ where: { projetoDirecionado: projetoId } }),
  ])

  return normalizeTransacoes(rpub, rpf, rpj, rcur, rprod, rsvc, revet, rout, dcons, ddig, dloc, dext, dcopa, aq, L, dbank)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTransacoes(rpub: any[], rpf: any[], rpj: any[], rcur: any[], rprod: any[], rsvc: any[], revet: any[], rout: any[], dcons: any[], ddig: any[], dloc: any[], dext: any[], dcopa: any[], aq: any[], L: LookupTables, dbank: any[] = []): Lancamento[] {
  const items: Lancamento[] = []

  rpub.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Receita Pública', descricao: `${r.nomeOrgao} — ${r.tipoReceita}`, valor: r.valorRecurso, observacoes: r.observacoes ?? null }))
  rpf.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Pessoa Física', descricao: r.nomeContribuinte, valor: r.valorContribuicao, observacoes: r.observacoes ?? null }))
  rpj.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Pessoa Jurídica', descricao: r.nomeEmpresa, valor: r.valorContribuicao, observacoes: r.observacoes ?? null }))
  rcur.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Cursos/Treinamentos', descricao: L.cursos.get(r.cursoId) ?? 'Curso', valor: r.valorReceita, observacoes: r.observacoes ?? null }))
  rprod.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Produtos', descricao: L.produtos.get(r.produtoId) ?? 'Produto', valor: r.valorReceita, observacoes: r.observacoes ?? null }))
  rsvc.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Serviços', descricao: L.servicos.get(r.servicoId) ?? 'Serviço', valor: r.valorReceita, observacoes: r.observacoes ?? null }))
  revet.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Eventos c/ Bilheteria', descricao: L.eventos.get(r.eventoId) ?? 'Evento', valor: r.valorReceita, observacoes: r.observacoes ?? null }))
  rout.forEach(r => items.push({ id: r.id, data: r.dataEntrada, tipo: 'entrada', categoria: 'Outras Receitas', descricao: `${r.nomeContribuinte}${r.descricaoReceita ? ` — ${r.descricaoReceita}` : ''}`, valor: r.valorContribuicao, observacoes: r.observacoes ?? null }))

  dcons.forEach(d => items.push({ id: d.id, data: d.dataPagamento, tipo: 'saida', categoria: 'Contas de Consumo', descricao: [L.fornecedores.get(d.fornecedorId), L.tiposConsumo.get(d.tipoServicoId)].filter(Boolean).join(' — '), valor: d.valorTitulo, observacoes: d.observacoes ?? null }))
  ddig.forEach(d => items.push({ id: d.id, data: d.dataPagamento, tipo: 'saida', categoria: 'Serviços Digitais', descricao: [L.fornecedores.get(d.fornecedorId), L.tiposDigital.get(d.tipoServicoId)].filter(Boolean).join(' — '), valor: d.valorTitulo, observacoes: d.observacoes ?? null }))
  dloc.forEach(d => items.push({ id: d.id, data: d.dataPagamento, tipo: 'saida', categoria: 'Locação de Equipamentos', descricao: [L.fornecedores.get(d.fornecedorId), L.itensAlugado.get(d.itemAlugadoId)].filter(Boolean).join(' — '), valor: d.valorLocacao, observacoes: d.observacoes ?? null }))
  dext.forEach(d => items.push({ id: d.id, data: d.dataPagamento, tipo: 'saida', categoria: 'Serviços Externos', descricao: [L.fornecedores.get(d.fornecedorId), L.servicosPrestados.get(d.servicoPrestadoId)].filter(Boolean).join(' — '), valor: d.valor, observacoes: d.observacoes ?? null }))
  dcopa.forEach(d => items.push({ id: d.id, data: d.dataPagamento, tipo: 'saida', categoria: 'Copa e Cozinha', descricao: [L.fornecedores.get(d.fornecedorId), L.itensCopa.get(d.itemCopaCozinhaId)].filter(Boolean).join(' — '), valor: d.valorPagamento, observacoes: d.observacoes ?? null }))
  aq.forEach(a => items.push({ id: a.id, data: String(a.dataAquisicao), tipo: 'saida', categoria: 'Aquisições', descricao: a.descricao, valor: Number(a.valorAquisicao), observacoes: a.observacoes ?? null }))

  // Despesas Bancárias — cada item do JSON vira um lançamento individual
  dbank.forEach(d => {
    const itens: { descricao: string; valor: number; label: string | null; data: string }[] = JSON.parse(d.itens)
    const baseData: string = d.dataPagamento instanceof Date ? d.dataPagamento.toISOString() : String(d.dataPagamento)
    itens.forEach((item, idx) => {
      items.push({
        id: `${d.id}-${idx}`,
        data: baseData,
        tipo: 'saida',
        categoria: 'Despesas Bancárias',
        descricao: item.label ? `[${item.label}] ${item.descricao}` : item.descricao,
        valor: item.valor,
        observacoes: d.observacoes ?? null,
      })
    })
  })

  return items.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
}
