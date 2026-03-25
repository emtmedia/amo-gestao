/**
 * extrato-pdf.ts
 *
 * Gera o PDF de extrato completo de um Projeto ou Evento antes da exclusão,
 * faz upload no Supabase Storage e registra na Biblioteca de Documentos
 * com acessoRestrito = true.
 */

import PDFDocument from 'pdfkit'
import { randomUUID } from 'crypto'
import prisma from './prisma'
import { uploadFile, ensureBucketExists } from './supabase-storage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type Rec = Record<string, unknown>

const fmtDate = (d: unknown): string =>
  d ? new Date(d as string).toLocaleDateString('pt-BR') : '—'

const fmtMoney = (v: unknown): string =>
  v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

const fmtStr = (v: unknown): string => (v ? String(v) : '—')

const sumField = (rows: Rec[], field: string): number =>
  rows.reduce((acc, r) => acc + (r[field] != null ? Number(r[field]) : 0), 0)

// ---------------------------------------------------------------------------
// PDF Builder
// ---------------------------------------------------------------------------
class Builder {
  doc: PDFKit.PDFDocument
  private readonly L = 50
  private readonly R = 545
  readonly W = 495

  constructor() {
    this.doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
  }

  private guard() {
    if (this.doc.y > 710) this.doc.addPage()
  }

  header(title: string, subtitle: string, user: string) {
    const { doc, L, W } = this
    doc.rect(L, 50, W, 36).fill('#1e3a5f')
    doc.fontSize(14).fillColor('white').font('Helvetica-Bold')
      .text('AMO — Extrato de Exclusão', L + 8, 60, { width: W - 16, lineBreak: false })
    doc.moveDown(2.5)
    doc.fontSize(13).fillColor('#1e3a5f').font('Helvetica-Bold').text(title, { align: 'center' })
    doc.moveDown(0.25)
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica').text(subtitle, { align: 'center' })
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} por ${user}`,
      { align: 'center' }
    )
    doc.moveDown(0.5)
    doc.moveTo(L, doc.y).lineTo(this.R, doc.y).strokeColor('#1e3a5f').lineWidth(1).stroke()
    doc.moveDown(0.5)
  }

  section(title: string) {
    this.guard()
    const { doc, L, W } = this
    doc.moveDown(0.4)
    doc.rect(L, doc.y, W, 16).fill('#1e3a5f')
    doc.fontSize(9).fillColor('white').font('Helvetica-Bold')
      .text(title, L + 6, doc.y - 13, { width: W - 12, lineBreak: false })
    doc.moveDown(0.5)
    doc.fontSize(9).fillColor('#111827').font('Helvetica')
  }

  kv(label: string, value: string) {
    this.guard()
    const { doc, L, W } = this
    const lw = 130
    const y = doc.y
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica-Bold')
      .text(label + ':', L, y, { width: lw, lineBreak: false })
    doc.fillColor('#111827').font('Helvetica')
      .text(value, L + lw, y, { width: W - lw })
    doc.moveDown(0.25)
  }

  kv2(pairs: [string, string][]) {
    const { doc, L, W } = this
    const half = (W - 10) / 2
    for (let i = 0; i < pairs.length; i += 2) {
      this.guard()
      const [l1, v1] = pairs[i]
      const pair2 = pairs[i + 1]
      const y = doc.y
      doc.fontSize(8)
      doc.fillColor('#6b7280').font('Helvetica-Bold').text(l1 + ':', L, y, { width: 110, lineBreak: false })
      doc.fillColor('#111827').font('Helvetica').text(v1, L + 110, y, { width: half - 110, lineBreak: false })
      if (pair2) {
        const [l2, v2] = pair2
        doc.fillColor('#6b7280').font('Helvetica-Bold').text(l2 + ':', L + half + 10, y, { width: 110, lineBreak: false })
        doc.fillColor('#111827').font('Helvetica').text(v2, L + half + 120, y, { width: half - 110 })
      }
      doc.moveDown(0.3)
    }
  }

  tableHeader(c1: string, c2: string, c3: string) {
    this.guard()
    const { doc, L, W } = this
    doc.rect(L, doc.y, W, 14).fill('#e5e7eb')
    const y = doc.y + 2
    doc.fontSize(8).fillColor('#374151').font('Helvetica-Bold')
    doc.text(c1, L + 3, y, { width: W * 0.55, lineBreak: false })
    doc.text(c2, L + W * 0.55, y, { width: W * 0.22, lineBreak: false, align: 'center' })
    doc.text(c3, L + W * 0.77, y, { width: W * 0.23, lineBreak: false, align: 'right' })
    doc.moveDown(0.5)
  }

  tableRow(c1: string, c2: string, c3: string) {
    this.guard()
    const { doc, L, W } = this
    const y = doc.y
    doc.fontSize(8).fillColor('#374151').font('Helvetica')
    doc.text(c1, L + 3, y, { width: W * 0.55 - 3, lineBreak: false })
    doc.text(c2, L + W * 0.55, y, { width: W * 0.22, lineBreak: false, align: 'center' })
    doc.text(c3, L + W * 0.77, y, { width: W * 0.23, lineBreak: false, align: 'right' })
    doc.moveDown(0.3)
  }

  subtotal(label: string, value: string) {
    this.guard()
    const { doc, L, W } = this
    doc.rect(L, doc.y, W, 14).fill('#f3f4f6')
    const y = doc.y + 2
    doc.fontSize(8).fillColor('#1e3a5f').font('Helvetica-Bold')
    doc.text(label, L + 3, y, { width: W * 0.77 - 3, lineBreak: false })
    doc.text(value, L + W * 0.77, y, { width: W * 0.23, lineBreak: false, align: 'right' })
    doc.moveDown(0.4)
  }

  empty(msg = 'Nenhum registro encontrado') {
    const { doc, L, W } = this
    doc.fontSize(8).fillColor('#9ca3af').font('Helvetica-Oblique').text(msg, L, doc.y, { width: W })
    doc.moveDown(0.3)
  }

  grandTotal(label: string, value: string) {
    this.guard()
    const { doc, L, W } = this
    doc.moveDown(0.3)
    doc.rect(L, doc.y, W, 20).fill('#1e3a5f')
    const y = doc.y + 4
    doc.fontSize(11).fillColor('white').font('Helvetica-Bold')
    doc.text(label, L + 5, y, { width: W * 0.7, lineBreak: false })
    doc.text(value, L + W * 0.7, y, { width: W * 0.3, lineBreak: false, align: 'right' })
    doc.moveDown(0.7)
  }
}

function buildBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

// ---------------------------------------------------------------------------
// Category upsert
// ---------------------------------------------------------------------------
async function getCategoria(): Promise<string> {
  const cat = await prisma.categoriaDocumento.upsert({
    where: { nome: 'Histórico de Exclusões' },
    update: {},
    create: {
      id: randomUUID(),
      nome: 'Histórico de Exclusões',
      descricao: 'Extratos gerados automaticamente antes da exclusão de projetos e eventos',
      cor: '#DC2626',
      icone: 'Archive',
    },
  })
  return cat.id
}

// ---------------------------------------------------------------------------
// Financial section helper
// ---------------------------------------------------------------------------
function financialSection(
  b: Builder,
  title: string,
  rows: Rec[],
  dateField: string,
  valueField: string,
  descField = 'observacoes'
) {
  b.section(title)
  if (!rows.length) { b.empty(); return 0 }
  b.tableHeader('Descrição / Observação', 'Data', 'Valor')
  for (const r of rows) {
    const desc = fmtStr(r[descField] || r['descricao'] || r['nome'] || '—')
    b.tableRow(desc.substring(0, 60), fmtDate(r[dateField]), fmtMoney(r[valueField]))
  }
  const total = sumField(rows, valueField)
  b.subtotal(`Subtotal ${title}`, fmtMoney(total))
  return total
}

// ---------------------------------------------------------------------------
// PROJETO EXTRATO
// ---------------------------------------------------------------------------
export async function generateProjetoExtrato(
  projetoId: string,
  userName: string
): Promise<{ documentoId: string; titulo: string }> {
  // 1. Fetch all related data in parallel
  const [
    projeto,
    consolidacao,
    eventos,
    voluntarios,
    despConsumo,
    despDigital,
    despLocacao,
    despExternos,
    despCopa,
    recPublica,
    recPF,
    recPJ,
    recCursos,
    recProdutos,
    recServicos,
    recOutras,
    aquisicoes,
    chequeRecibos,
  ] = await Promise.all([
    prisma.projetoFilantropia.findUnique({ where: { id: projetoId } }),
    prisma.consolidacaoProjeto.findFirst({ where: { projetoId } }),
    prisma.evento.findMany({ where: { projetoVinculadoId: projetoId } }),
    prisma.voluntarioProjeto.findMany({ where: { projetoId } }),
    prisma.despesaConsumo.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.despesaDigital.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.despesaLocacao.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.despesaServicoExterno.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.despesaCopaCozinha.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.receitaPublica.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.receitaPessoaFisica.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.receitaPessoaJuridica.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.receitaCurso.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.receitaProduto.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.receitaServico.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.outraReceita.findMany({ where: { projetoDirecionado: projetoId } }) as Promise<Rec[]>,
    prisma.$queryRaw<Rec[]>`SELECT descricao, "dataAquisicao", "valorAquisicao", "modalidadePgto", parcelas, observacoes FROM "Aquisicao" WHERE "projetoId" = ${projetoId}`,
    prisma.$queryRaw<Rec[]>`SELECT numero, "nomeRecebedor", "dataTransferencia", "valorConcedido", "cpfRecebedor" FROM "ChequeRecibo" WHERE "projetoId" = ${projetoId}`,
  ])

  if (!projeto) throw new Error('Projeto não encontrado')

  // 2. Build PDF
  const b = new Builder()
  b.header(
    `Projeto: ${projeto.nome}`,
    `ID: ${projetoId}`,
    userName
  )

  // — Dados do Projeto
  b.section('DADOS DO PROJETO')
  b.kv2([
    ['Nome', fmtStr(projeto.nome)],
    ['Responsável', fmtStr(projeto.responsavel)],
    ['Data de Início', fmtDate(projeto.dataInicio)],
    ['Data de Encerramento', fmtDate(projeto.dataEncerramento)],
    ['Telefone', fmtStr(projeto.telefoneResponsavel)],
    ['E-mail', fmtStr(projeto.emailResponsavel)],
    ['Orçamento Estimado', fmtMoney(projeto.orcamentoEstimado)],
    ['País de Realização', fmtStr(projeto.paisRealizacao)],
    ['Estado', fmtStr(projeto.estadoRealizacao)],
    ['Cidade', fmtStr(projeto.cidadeRealizacao)],
    ['Nº Voluntários Estimados', fmtStr(projeto.numeroVoluntarios)],
    ['Criado em', fmtDate(projeto.createdAt)],
  ])
  if (projeto.comentarios) b.kv('Comentários', fmtStr(projeto.comentarios))

  // — Consolidação
  if (consolidacao) {
    b.section('CONSOLIDAÇÃO DO PROJETO')
    b.kv2([
      ['Data de Conclusão', fmtDate((consolidacao as Rec).dataConclusaoReal)],
      ['Operador', fmtStr((consolidacao as Rec).nomeOperador)],
      ['Orçamento Estimado', fmtMoney((consolidacao as Rec).orcamentoEstimado)],
      ['Orçamento Realizado', fmtMoney((consolidacao as Rec).orcamentoRealizado)],
      ['Saldo', fmtMoney((consolidacao as Rec).saldoOrcamento)],
      ['Método de Ajuste', fmtStr((consolidacao as Rec).metodoAjuste)],
    ])
    if ((consolidacao as Rec).consideracoes) b.kv('Considerações', fmtStr((consolidacao as Rec).consideracoes))
    if ((consolidacao as Rec).licoesAprendidas) b.kv('Lições Aprendidas', fmtStr((consolidacao as Rec).licoesAprendidas))
    if ((consolidacao as Rec).pendencias) b.kv('Pendências', fmtStr((consolidacao as Rec).pendencias))
  }

  // — Eventos vinculados
  b.section(`EVENTOS VINCULADOS (${eventos.length})`)
  if (!eventos.length) {
    b.empty()
  } else {
    b.tableHeader('Nome do Evento', 'Período', 'Responsável')
    for (const e of eventos) {
      const periodo = `${fmtDate(e.dataInicio)} – ${fmtDate(e.dataEncerramento)}`
      b.tableRow(fmtStr(e.nome), periodo, fmtStr(e.responsavel))
    }
  }

  // — Voluntários do Projeto
  b.section(`VOLUNTÁRIOS DO PROJETO (${voluntarios.length})`)
  if (!voluntarios.length) {
    b.empty()
  } else {
    b.tableHeader('Voluntário (CPF)', 'Função / Cargo', 'Período')
    for (const v of voluntarios as Rec[]) {
      const periodo = `${fmtDate(v.dataInicio)} – ${fmtDate(v.dataSaida) || 'em atividade'}`
      b.tableRow(`${fmtStr(v.cpf)}`, fmtStr(v.funcaoCargo), periodo)
    }
  }

  // — Despesas
  b.section('DESPESAS')
  let totalDespesas = 0
  totalDespesas += financialSection(b, 'Consumo', despConsumo, 'dataPagamento', 'valorTitulo')
  totalDespesas += financialSection(b, 'Digital', despDigital, 'dataPagamento', 'valorTitulo')
  totalDespesas += financialSection(b, 'Locação', despLocacao, 'dataPagamento', 'valorLocacao')
  totalDespesas += financialSection(b, 'Serviços Externos', despExternos, 'dataPagamento', 'valor')
  totalDespesas += financialSection(b, 'Copa/Cozinha', despCopa, 'dataPagamento', 'valorPagamento')
  b.subtotal('TOTAL DESPESAS', fmtMoney(totalDespesas))

  // — Receitas
  b.section('RECEITAS')
  let totalReceitas = 0
  totalReceitas += financialSection(b, 'Receita Pública', recPublica, 'dataEntrada', 'valorRecurso', 'observacoes')
  totalReceitas += financialSection(b, 'Pessoa Física', recPF, 'dataEntrada', 'valorContribuicao', 'observacoes')
  totalReceitas += financialSection(b, 'Pessoa Jurídica', recPJ, 'dataEntrada', 'valorContribuicao', 'observacoes')
  totalReceitas += financialSection(b, 'Cursos', recCursos, 'dataEntrada', 'valorReceita')
  totalReceitas += financialSection(b, 'Produtos', recProdutos, 'dataEntrada', 'valorReceita')
  totalReceitas += financialSection(b, 'Serviços', recServicos, 'dataEntrada', 'valorReceita')
  totalReceitas += financialSection(b, 'Outras Receitas', recOutras, 'dataEntrada', 'valorContribuicao', 'descricaoReceita')
  b.subtotal('TOTAL RECEITAS', fmtMoney(totalReceitas))

  // — Aquisições
  b.section(`AQUISIÇÕES (${aquisicoes.length})`)
  if (!aquisicoes.length) {
    b.empty()
  } else {
    b.tableHeader('Descrição', 'Data', 'Valor')
    for (const a of aquisicoes) {
      b.tableRow(fmtStr(a.descricao).substring(0, 60), fmtDate(a.dataAquisicao), fmtMoney(a.valorAquisicao))
    }
    const totalAq = sumField(aquisicoes, 'valorAquisicao')
    b.subtotal('Subtotal Aquisições', fmtMoney(totalAq))
  }
  const totalAquisicoes = sumField(aquisicoes, 'valorAquisicao')

  // — Cheque-Recibos
  b.section(`CHEQUE-RECIBOS (${chequeRecibos.length})`)
  if (!chequeRecibos.length) {
    b.empty()
  } else {
    b.tableHeader('Número / Recebedor', 'Data', 'Valor')
    for (const cr of chequeRecibos) {
      b.tableRow(
        `${fmtStr(cr.numero)} — ${fmtStr(cr.nomeRecebedor)}`,
        fmtDate(cr.dataTransferencia),
        fmtMoney(cr.valorConcedido)
      )
    }
    const totalCR = sumField(chequeRecibos, 'valorConcedido')
    b.subtotal('Subtotal Cheque-Recibos', fmtMoney(totalCR))
  }
  const totalCRs = sumField(chequeRecibos, 'valorConcedido')

  // — Resumo Financeiro
  b.section('RESUMO FINANCEIRO')
  const saldo = totalReceitas - totalDespesas - totalAquisicoes - totalCRs
  b.kv2([
    ['Total Receitas', fmtMoney(totalReceitas)],
    ['Total Despesas', fmtMoney(totalDespesas)],
    ['Total Aquisições', fmtMoney(totalAquisicoes)],
    ['Total Cheque-Recibos', fmtMoney(totalCRs)],
  ])
  b.grandTotal('SALDO FINAL', fmtMoney(saldo))

  // 3. Upload
  const titulo = `Extrato de Exclusão — Projeto: ${projeto.nome}`
  const pdfBuffer = await buildBuffer(b.doc)
  await ensureBucketExists()
  const fileName = `extrato-projeto-${projetoId}-${Date.now()}.pdf`
  const { url, path } = await uploadFile(pdfBuffer, fileName, 'application/pdf', 'extratos-exclusao')

  // 4. Create DocumentoAMO
  const categoriaId = await getCategoria()
  const docAmo = await prisma.documentoAMO.create({
    data: {
      id: randomUUID(),
      titulo,
      descricao: `Extrato completo gerado automaticamente antes da exclusão do projeto "${projeto.nome}". Contém todos os registros financeiros, voluntários e eventos vinculados.`,
      categoriaId,
      tags: JSON.stringify(['extrato', 'exclusão', 'projeto', projeto.nome]),
      nomeArquivo: fileName,
      tipoArquivo: 'application/pdf',
      tamanhoArquivo: pdfBuffer.length,
      urlArquivo: url,
      pathArquivo: path,
      versao: '1.0',
      statusDocumento: 'ativo',
      responsavel: userName,
      acessoRestrito: true,
      observacoes: `Projeto ID: ${projetoId} | Excluído em: ${new Date().toISOString()} por: ${userName}`,
      updatedAt: new Date(),
    },
  })

  return { documentoId: docAmo.id, titulo }
}

// ---------------------------------------------------------------------------
// EVENTO EXTRATO
// ---------------------------------------------------------------------------
export async function generateEventoExtrato(
  eventoId: string,
  userName: string
): Promise<{ documentoId: string; titulo: string }> {
  const [
    evento,
    consolidacao,
    voluntarios,
    receitasEvento,
    despConsumo,
    despDigital,
    despLocacao,
    despExternos,
    despCopa,
    recPublica,
    recPF,
    recPJ,
    recCursos,
    recProdutos,
    recServicos,
    recOutras,
    aquisicoes,
    chequeRecibos,
  ] = await Promise.all([
    prisma.evento.findUnique({ where: { id: eventoId } }),
    prisma.consolidacaoEvento.findFirst({ where: { eventoId } }),
    prisma.voluntarioEvento.findMany({ where: { eventoId } }),
    prisma.receitaEvento.findMany({ where: { eventoId } }) as Promise<Rec[]>,
    prisma.despesaConsumo.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.despesaDigital.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.despesaLocacao.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.despesaServicoExterno.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.despesaCopaCozinha.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.receitaPublica.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.receitaPessoaFisica.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.receitaPessoaJuridica.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.receitaCurso.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.receitaProduto.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.receitaServico.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.outraReceita.findMany({ where: { eventoDirecionado: eventoId } }) as Promise<Rec[]>,
    prisma.$queryRaw<Rec[]>`SELECT descricao, "dataAquisicao", "valorAquisicao", observacoes FROM "Aquisicao" WHERE "eventoId" = ${eventoId}`,
    prisma.$queryRaw<Rec[]>`SELECT numero, "nomeRecebedor", "dataTransferencia", "valorConcedido" FROM "ChequeRecibo" WHERE "eventoId" = ${eventoId}`,
  ])

  if (!evento) throw new Error('Evento não encontrado')

  // Fetch project name if linked
  let projetoNome = '—'
  if (evento.projetoVinculadoId) {
    const proj = await prisma.projetoFilantropia.findUnique({
      where: { id: evento.projetoVinculadoId },
      select: { nome: true },
    })
    projetoNome = proj?.nome ?? '—'
  }

  // Build PDF
  const b = new Builder()
  b.header(`Evento: ${evento.nome}`, `ID: ${eventoId}`, userName)

  b.section('DADOS DO EVENTO')
  b.kv2([
    ['Nome', fmtStr(evento.nome)],
    ['Projeto Vinculado', projetoNome],
    ['Data de Início', fmtDate(evento.dataInicio)],
    ['Data de Encerramento', fmtDate(evento.dataEncerramento)],
    ['Responsável', fmtStr(evento.responsavel)],
    ['Telefone', fmtStr(evento.telefoneResponsavel)],
    ['E-mail', fmtStr(evento.emailResponsavel)],
    ['Orçamento Estimado', fmtMoney(evento.orcamentoEstimado)],
    ['País', fmtStr(evento.paisRealizacao)],
    ['Estado', fmtStr(evento.estadoRealizacao)],
    ['Cidade', fmtStr(evento.cidadeRealizacao)],
    ['Nº Voluntários', fmtStr(evento.numeroVoluntarios)],
  ])
  if (evento.enderecoGoogleMaps) b.kv('Endereço / Maps', fmtStr(evento.enderecoGoogleMaps))
  if (evento.comentarios) b.kv('Comentários', fmtStr(evento.comentarios))

  if (consolidacao) {
    b.section('CONSOLIDAÇÃO DO EVENTO')
    b.kv2([
      ['Data de Conclusão', fmtDate((consolidacao as Rec).dataConclusaoReal)],
      ['Operador', fmtStr((consolidacao as Rec).nomeOperador)],
      ['Orçamento Estimado', fmtMoney((consolidacao as Rec).orcamentoEstimado)],
      ['Orçamento Realizado', fmtMoney((consolidacao as Rec).orcamentoRealizado)],
      ['Saldo', fmtMoney((consolidacao as Rec).saldoOrcamento)],
      ['Método de Ajuste', fmtStr((consolidacao as Rec).metodoAjuste)],
    ])
    if ((consolidacao as Rec).consideracoes) b.kv('Considerações', fmtStr((consolidacao as Rec).consideracoes))
  }

  b.section(`VOLUNTÁRIOS DO EVENTO (${voluntarios.length})`)
  if (!voluntarios.length) {
    b.empty()
  } else {
    b.tableHeader('CPF', 'Função / Cargo', 'Período')
    for (const v of voluntarios as Rec[]) {
      b.tableRow(fmtStr(v.cpf), fmtStr(v.funcaoCargo), `${fmtDate(v.dataInicio)} – ${fmtDate(v.dataSaida)}`)
    }
  }

  // Receita de Evento (própria)
  b.section(`RECEITAS DO EVENTO (${receitasEvento.length})`)
  if (!receitasEvento.length) {
    b.empty()
  } else {
    b.tableHeader('Observação', 'Data', 'Valor')
    for (const r of receitasEvento) {
      b.tableRow(fmtStr(r.observacoes || r.eventoId), fmtDate(r.dataEntrada), fmtMoney(r.valorReceita))
    }
    b.subtotal('Subtotal Receitas do Evento', fmtMoney(sumField(receitasEvento, 'valorReceita')))
  }

  // Despesas
  b.section('DESPESAS DIRECIONADAS A ESTE EVENTO')
  let totalDespesas = 0
  totalDespesas += financialSection(b, 'Consumo', despConsumo, 'dataPagamento', 'valorTitulo')
  totalDespesas += financialSection(b, 'Digital', despDigital, 'dataPagamento', 'valorTitulo')
  totalDespesas += financialSection(b, 'Locação', despLocacao, 'dataPagamento', 'valorLocacao')
  totalDespesas += financialSection(b, 'Serviços Externos', despExternos, 'dataPagamento', 'valor')
  totalDespesas += financialSection(b, 'Copa/Cozinha', despCopa, 'dataPagamento', 'valorPagamento')
  b.subtotal('TOTAL DESPESAS', fmtMoney(totalDespesas))

  // Outras Receitas direcionadas ao evento
  b.section('OUTRAS RECEITAS DIRECIONADAS A ESTE EVENTO')
  let totalOutrasRec = 0
  totalOutrasRec += financialSection(b, 'Receita Pública', recPublica, 'dataEntrada', 'valorRecurso')
  totalOutrasRec += financialSection(b, 'Pessoa Física', recPF, 'dataEntrada', 'valorContribuicao')
  totalOutrasRec += financialSection(b, 'Pessoa Jurídica', recPJ, 'dataEntrada', 'valorContribuicao')
  totalOutrasRec += financialSection(b, 'Cursos', recCursos, 'dataEntrada', 'valorReceita')
  totalOutrasRec += financialSection(b, 'Produtos', recProdutos, 'dataEntrada', 'valorReceita')
  totalOutrasRec += financialSection(b, 'Serviços', recServicos, 'dataEntrada', 'valorReceita')
  totalOutrasRec += financialSection(b, 'Outras', recOutras, 'dataEntrada', 'valorContribuicao', 'descricaoReceita')
  b.subtotal('TOTAL OUTRAS RECEITAS', fmtMoney(totalOutrasRec))

  // Aquisições
  b.section(`AQUISIÇÕES (${aquisicoes.length})`)
  if (!aquisicoes.length) {
    b.empty()
  } else {
    b.tableHeader('Descrição', 'Data', 'Valor')
    for (const a of aquisicoes) {
      b.tableRow(fmtStr(a.descricao).substring(0, 60), fmtDate(a.dataAquisicao), fmtMoney(a.valorAquisicao))
    }
    b.subtotal('Subtotal Aquisições', fmtMoney(sumField(aquisicoes, 'valorAquisicao')))
  }
  const totalAquisicoes = sumField(aquisicoes, 'valorAquisicao')

  // Cheque-Recibos
  b.section(`CHEQUE-RECIBOS (${chequeRecibos.length})`)
  if (!chequeRecibos.length) {
    b.empty()
  } else {
    b.tableHeader('Número / Recebedor', 'Data', 'Valor')
    for (const cr of chequeRecibos) {
      b.tableRow(`${fmtStr(cr.numero)} — ${fmtStr(cr.nomeRecebedor)}`, fmtDate(cr.dataTransferencia), fmtMoney(cr.valorConcedido))
    }
    b.subtotal('Subtotal CRs', fmtMoney(sumField(chequeRecibos, 'valorConcedido')))
  }
  const totalCRs = sumField(chequeRecibos, 'valorConcedido')

  const totalReceitas = sumField(receitasEvento, 'valorReceita') + totalOutrasRec
  const saldo = totalReceitas - totalDespesas - totalAquisicoes - totalCRs

  b.section('RESUMO FINANCEIRO')
  b.kv2([
    ['Total Receitas', fmtMoney(totalReceitas)],
    ['Total Despesas', fmtMoney(totalDespesas)],
    ['Total Aquisições', fmtMoney(totalAquisicoes)],
    ['Total Cheque-Recibos', fmtMoney(totalCRs)],
  ])
  b.grandTotal('SALDO FINAL', fmtMoney(saldo))

  // Upload e DocumentoAMO
  const titulo = `Extrato de Exclusão — Evento: ${evento.nome}`
  const pdfBuffer = await buildBuffer(b.doc)
  await ensureBucketExists()
  const fileName = `extrato-evento-${eventoId}-${Date.now()}.pdf`
  const { url, path } = await uploadFile(pdfBuffer, fileName, 'application/pdf', 'extratos-exclusao')

  const categoriaId = await getCategoria()
  const docAmo = await prisma.documentoAMO.create({
    data: {
      id: randomUUID(),
      titulo,
      descricao: `Extrato completo gerado automaticamente antes da exclusão do evento "${evento.nome}"${projetoNome !== '—' ? ` (Projeto: ${projetoNome})` : ''}.`,
      categoriaId,
      tags: JSON.stringify(['extrato', 'exclusão', 'evento', evento.nome]),
      nomeArquivo: fileName,
      tipoArquivo: 'application/pdf',
      tamanhoArquivo: pdfBuffer.length,
      urlArquivo: url,
      pathArquivo: path,
      versao: '1.0',
      statusDocumento: 'ativo',
      responsavel: userName,
      acessoRestrito: true,
      observacoes: `Evento ID: ${eventoId} | Excluído em: ${new Date().toISOString()} por: ${userName}`,
      updatedAt: new Date(),
    },
  })

  return { documentoId: docAmo.id, titulo }
}
