import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { prompt, filtros, cabecalho } = await request.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada no servidor.' },
        { status: 500 }
      )
    }

    const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

    const whereData = (campo: string) => {
      const cond: Record<string, unknown> = {}
      if (filtros?.dataInicio) cond.gte = new Date(filtros.dataInicio)
      if (filtros?.dataFim) cond.lte = new Date(filtros.dataFim + 'T23:59:59')
      return Object.keys(cond).length > 0 ? { [campo]: cond } : {}
    }

    // Usa $transaction para executar TODAS as queries numa única conexão
    const [
      departamentos, projetos, eventos, voluntariosAMO,
      receitasPF, receitasPJ, receitasPublicas,
      receitasCursos, receitasProdutos, receitasServicos, receitasEventos, outrasReceitas,
      despesasConsumo, despesasDigitais, despesasConservacao,
      despesasLocacao, despesasExternos, despesasCopa,
      funcionariosCLT, funcionariosPJ, fornecedores,
    ] = await prisma.$transaction([
      prisma.departamento.findMany({ select: { nome: true, responsavelPrincipal: true, orcamentoAnual: true } }),
      prisma.projetoFilantropia.findMany({ select: { nome: true, dataInicio: true, dataEncerramento: true, orcamentoEstimado: true, responsavel: true } }),
      prisma.evento.findMany({ select: { nome: true, dataInicio: true, dataEncerramento: true, orcamentoEstimado: true, responsavel: true } }),
      prisma.voluntarioAMO.findMany({ select: { nome: true, genero: true, membroIgrejaOmega: true } }),
      prisma.receitaPessoaFisica.findMany({ where: whereData('dataEntrada'), select: { nomeContribuinte: true, valorContribuicao: true, dataEntrada: true } }),
      prisma.receitaPessoaJuridica.findMany({ where: whereData('dataEntrada'), select: { nomeEmpresa: true, valorContribuicao: true, dataEntrada: true } }),
      prisma.receitaPublica.findMany({ where: whereData('dataEntrada'), select: { nomeOrgao: true, valorRecurso: true, dataEntrada: true } }),
      prisma.receitaCurso.findMany({ where: whereData('dataEntrada'), select: { cursoId: true, valorReceita: true, dataEntrada: true } }),
      prisma.receitaProduto.findMany({ where: whereData('dataEntrada'), select: { produtoId: true, valorReceita: true, dataEntrada: true } }),
      prisma.receitaServico.findMany({ where: whereData('dataEntrada'), select: { servicoId: true, valorReceita: true, dataEntrada: true } }),
      prisma.receitaEvento.findMany({ where: whereData('dataEntrada'), select: { eventoId: true, valorReceita: true, dataEntrada: true } }),
      prisma.outraReceita.findMany({ where: whereData('dataEntrada'), select: { nomeContribuinte: true, descricaoReceita: true, valorContribuicao: true, dataEntrada: true } }),
      prisma.despesaConsumo.findMany({ where: whereData('dataPagamento'), select: { valorTitulo: true, dataPagamento: true } }),
      prisma.despesaDigital.findMany({ where: whereData('dataPagamento'), select: { valorTitulo: true, dataPagamento: true } }),
      prisma.despesaConservacao.findMany({ where: whereData('dataPagamento'), select: { valorTitulo: true, dataPagamento: true } }),
      prisma.despesaLocacao.findMany({ where: whereData('dataPagamento'), select: { valorLocacao: true, dataPagamento: true } }),
      prisma.despesaServicoExterno.findMany({ where: whereData('dataPagamento'), select: { valor: true, dataPagamento: true } }),
      prisma.despesaCopaCozinha.findMany({ where: whereData('dataPagamento'), select: { valorPagamento: true, dataPagamento: true } }),
      prisma.funcionarioCLT.findMany({ select: { nomeCompleto: true, cargoId: true, funcaoId: true, salarioMensal: true } }),
      prisma.funcionarioPJ.findMany({ select: { nomeCompleto: true, nomeEmpresa: true, cargoId: true, valorMedicaoMensal: true } }),
      prisma.fornecedor.findMany({ select: { nome: true, categoria: { select: { nome: true } }, email: true, telefone: true } }),
    ], { timeout: 15000 })

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const fmtDate = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

    const totalReceitas =
      receitasPF.reduce((s, r) => s + Number(r.valorContribuicao), 0) +
      receitasPJ.reduce((s, r) => s + Number(r.valorContribuicao), 0) +
      receitasPublicas.reduce((s, r) => s + Number(r.valorRecurso), 0) +
      receitasCursos.reduce((s, r) => s + Number(r.valorReceita), 0) +
      receitasProdutos.reduce((s, r) => s + Number(r.valorReceita), 0) +
      receitasServicos.reduce((s, r) => s + Number(r.valorReceita), 0) +
      receitasEventos.reduce((s, r) => s + Number(r.valorReceita), 0) +
      outrasReceitas.reduce((s, r) => s + Number(r.valorContribuicao), 0)

    const totalDespesas =
      despesasConsumo.reduce((s, r) => s + Number(r.valorTitulo), 0) +
      despesasDigitais.reduce((s, r) => s + Number(r.valorTitulo), 0) +
      despesasConservacao.reduce((s, r) => s + Number(r.valorTitulo), 0) +
      despesasLocacao.reduce((s, r) => s + Number(r.valorLocacao), 0) +
      despesasExternos.reduce((s, r) => s + Number(r.valor), 0) +
      despesasCopa.reduce((s, r) => s + Number(r.valorPagamento), 0)

    // Contexto compacto (sem null, 2) para reduzir tokens
    const contexto = {
      org: 'AMO – Associação Missionária Ômega', dataGeracao,
      periodo: filtros?.dataInicio ? `${filtros.dataInicio} a ${filtros.dataFim || 'hoje'}` : 'Todos',
      cab: { titulo: cabecalho?.titulo || 'Relatório AMO', subtitulo: cabecalho?.subtitulo || '', responsavel: cabecalho?.responsavel || '', obs: cabecalho?.observacoes || '' },
      resumo: { receitas: fmt(totalReceitas), despesas: fmt(totalDespesas), saldo: fmt(totalReceitas - totalDespesas), situacao: totalReceitas >= totalDespesas ? 'SUPERÁVIT' : 'DÉFICIT' },
      recCat: [
        { cat: 'Pessoa Física', total: fmt(receitasPF.reduce((s,r)=>s+Number(r.valorContribuicao),0)), qtd: receitasPF.length },
        { cat: 'Pessoa Jurídica', total: fmt(receitasPJ.reduce((s,r)=>s+Number(r.valorContribuicao),0)), qtd: receitasPJ.length },
        { cat: 'Receita Pública', total: fmt(receitasPublicas.reduce((s,r)=>s+Number(r.valorRecurso),0)), qtd: receitasPublicas.length },
        { cat: 'Cursos', total: fmt(receitasCursos.reduce((s,r)=>s+Number(r.valorReceita),0)), qtd: receitasCursos.length },
        { cat: 'Produtos', total: fmt(receitasProdutos.reduce((s,r)=>s+Number(r.valorReceita),0)), qtd: receitasProdutos.length },
        { cat: 'Serviços', total: fmt(receitasServicos.reduce((s,r)=>s+Number(r.valorReceita),0)), qtd: receitasServicos.length },
        { cat: 'Eventos', total: fmt(receitasEventos.reduce((s,r)=>s+Number(r.valorReceita),0)), qtd: receitasEventos.length },
        { cat: 'Outras', total: fmt(outrasReceitas.reduce((s,r)=>s+Number(r.valorContribuicao),0)), qtd: outrasReceitas.length },
      ].filter(c => c.qtd > 0),
      despCat: [
        { cat: 'Consumo', total: fmt(despesasConsumo.reduce((s,r)=>s+Number(r.valorTitulo),0)), qtd: despesasConsumo.length },
        { cat: 'Digital', total: fmt(despesasDigitais.reduce((s,r)=>s+Number(r.valorTitulo),0)), qtd: despesasDigitais.length },
        { cat: 'Conservação', total: fmt(despesasConservacao.reduce((s,r)=>s+Number(r.valorTitulo),0)), qtd: despesasConservacao.length },
        { cat: 'Locação', total: fmt(despesasLocacao.reduce((s,r)=>s+Number(r.valorLocacao),0)), qtd: despesasLocacao.length },
        { cat: 'Externos', total: fmt(despesasExternos.reduce((s,r)=>s+Number(r.valor),0)), qtd: despesasExternos.length },
        { cat: 'Copa/Cozinha', total: fmt(despesasCopa.reduce((s,r)=>s+Number(r.valorPagamento),0)), qtd: despesasCopa.length },
      ].filter(c => c.qtd > 0),
      deptos: departamentos.map(d => ({ n: d.nome, r: d.responsavelPrincipal, o: fmt(Number(d.orcamentoAnual||0)) })),
      proj: projetos.map(p => ({ n: p.nome, i: fmtDate(p.dataInicio), e: fmtDate(p.dataEncerramento), o: fmt(Number(p.orcamentoEstimado)), r: p.responsavel })),
      evt: eventos.map(e => ({ n: e.nome, i: fmtDate(e.dataInicio), e: fmtDate(e.dataEncerramento), o: fmt(Number(e.orcamentoEstimado)), r: e.responsavel })),
      vol: { total: voluntariosAMO.length, m: voluntariosAMO.filter(v=>v.genero==='Masculino').length, f: voluntariosAMO.filter(v=>v.genero==='Feminino').length, igreja: voluntariosAMO.filter(v=>v.membroIgrejaOmega).length },
      func: {
        clt: funcionariosCLT.map(f => ({ n: f.nomeCompleto, s: fmt(Number(f.salarioMensal)) })),
        pj: funcionariosPJ.map(f => ({ n: f.nomeCompleto, emp: f.nomeEmpresa, m: fmt(Number(f.valorMedicaoMensal||0)) })),
      },
      forn: fornecedores.map(f => ({ n: f.nome, cat: f.categoria?.nome, e: f.email, t: f.telefone })),
      contribPF: receitasPF.map(r => ({ n: r.nomeContribuinte, v: fmt(Number(r.valorContribuicao)), d: fmtDate(r.dataEntrada) })),
      contribPJ: receitasPJ.map(r => ({ n: r.nomeEmpresa, v: fmt(Number(r.valorContribuicao)), d: fmtDate(r.dataEntrada) })),
      outRec: outrasReceitas.map(r => ({ n: r.nomeContribuinte, desc: r.descricaoReceita, v: fmt(Number(r.valorContribuicao)), d: fmtDate(r.dataEntrada) })),
    }

    const systemPrompt = `Você é especialista em relatórios gerenciais para organizações do terceiro setor.
Gere relatórios em HTML completo e profissional usando dados reais do sistema AMO.
REGRAS:
1. Retorne APENAS HTML puro (<!DOCTYPE html> até </html>). SEM markdown, SEM backticks.
2. PALETA: fundo #f8f5f0, cards #fff, primário #1e3a5f, positivo #15803d, negativo #dc2626, texto #1a1a2e.
3. Google Fonts "Inter" via CDN.
4. CABEÇALHO: "AMO – Associação Missionária Ômega" + título/subtítulo + período + data: ${dataGeracao} + responsável.
5. BOTÕES FIXOS (position:fixed;top:20px;right:20px;z-index:9999;display:flex;gap:8px) com classe "no-print":
   "📥 PDF" → window.print() | "📄 Word" → downloadWord()
6. @media print: .no-print{display:none!important}body{background:#fff}margin 15mm
7. Script downloadWord no head: function downloadWord(){var c=document.getElementById('relatorio-content').innerHTML;var h='<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial;font-size:11pt;margin:20mm}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px}th{background:#1e3a5f;color:#fff}</style></head><body>'+c+'</body></html>';var b=new Blob([h],{type:'application/msword'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='relatorio-amo.doc';a.click();URL.revokeObjectURL(u)}
8. Conteúdo dentro de <div id="relatorio-content">.
9. Resumo Executivo no topo: 4 cards (receitas, despesas, saldo, situação).
10. Tabelas: cabeçalhos #1e3a5f branco, alternadas #f0f4f8/#fff, total negrito #1e3a5f branco.
11. Barras CSS puras para percentuais. Rodapé: "Gerado em ${dataGeracao} pelo Sistema de Gestão AMO".
Legenda campos compactos: n=nome,r=responsável,o=orçamento,i=início,e=encerramento,v=valor,d=data,s=salário,m=medição,t=telefone,cat=categoria,emp=empresa,desc=descrição,qtd=quantidade.`

    const userMessage = `"${prompt}"\nDADOS:\n${JSON.stringify(contexto)}`

    // Streaming da resposta do Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json({ error: err.error?.message || 'Erro na API do Claude' }, { status: 500 })
    }

    // Coleta o stream do Claude e repassa como SSE para o frontend
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = claudeRes.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const jsonStr = line.slice(6).trim()
              if (jsonStr === '[DONE]') continue

              try {
                const evt = JSON.parse(jsonStr)
                if (evt.type === 'content_block_delta' && evt.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: evt.delta.text })}\n\n`))
                }
                if (evt.type === 'message_stop') {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
                }
              } catch { /* ignore parse errors */ }
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Erro relatorio IA:', error)
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Erro interno ao gerar relatório: ${msg}` }, { status: 500 })
  }
}
