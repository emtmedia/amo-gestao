'use client'

import { useState } from 'react'
import DateInput from '@/components/ui/DateInput'
import { Sparkles, FileText, Calendar, AlignLeft, ChevronDown, ChevronUp, Loader2, Info, CheckCircle2 } from 'lucide-react'

const EXEMPLOS = [
  { label: '💰 Financeiro Completo', texto: 'Relatório financeiro completo com todas as receitas e despesas do período, totais por categoria e saldo final' },
  { label: '📊 Resumo Executivo', texto: 'Resumo executivo gerencial com os principais indicadores: projetos, voluntários, financeiro e eventos' },
  { label: '👥 Voluntários', texto: 'Relatório detalhado de voluntários AMO com distribuição por gênero, membros da igreja Ômega e quantidade por projeto' },
  { label: '🎯 Projetos', texto: 'Relatório de projetos de filantropia com status, orçamento estimado, responsáveis e datas de início e encerramento' },
  { label: '🎪 Eventos', texto: 'Relatório de eventos realizados com orçamento previsto, responsáveis e período de realização' },
  { label: '📉 Análise de Despesas', texto: 'Análise detalhada de despesas por categoria com totais, percentuais e composição do gasto total' },
  { label: '🏪 Fornecedores', texto: 'Listagem completa de fornecedores com categorias, contatos e informações de acesso' },
  { label: '👔 Funcionários', texto: 'Relatório de funcionários CLT e PJ com nomes, empresas e remuneração mensal' },
  { label: '🏦 Contribuintes PF/PJ', texto: 'Relatório de contribuintes pessoa física e jurídica com valores e datas de entrada de recursos' },
  { label: '🏛️ Receita Pública', texto: 'Relatório de receitas públicas: convênios, verbas e órgãos parceiros com valores recebidos no período' },
]

export default function RelatorioIAPage() {
  const [prompt, setPrompt] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [mesAno, setMesAno] = useState('')
  const [titulo, setTitulo] = useState('')
  const [subtitulo, setSubtitulo] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [cabecalhoAberto, setCabecalhoAberto] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  async function gerarRelatorio() {
    if (!prompt.trim()) { showToast('Descreva o relatório que deseja gerar.', 'error'); return }

    // Abrir janela ANTES do fetch (no contexto do clique do usuário) para evitar bloqueio de popup
    const nova = window.open('', '_blank')
    if (!nova) {
      showToast('Permita pop-ups neste site para visualizar relatórios.', 'error')
      return
    }
    nova.document.open()
    nova.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Gerando Relatório...</title>
      <style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f5f0;font-family:Inter,sans-serif;color:#1e3a5f}
      .loader{text-align:center}.spinner{width:48px;height:48px;border:4px solid #e2d9ce;border-top-color:#1e3a5f;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}
      @keyframes spin{to{transform:rotate(360deg)}}h2{font-size:1.2rem;margin:0 0 8px}p{font-size:.9rem;opacity:.7;margin:0}</style></head>
      <body><div class="loader"><div class="spinner"></div><h2>Gerando relatório com IA...</h2><p>Consultando dados e construindo o documento. Aguarde.</p></div></body></html>`)
    nova.document.close()

    setCarregando(true)
    try {
      const res = await fetch('/api/relatorios/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          filtros: { dataInicio, dataFim, mesAno },
          cabecalho: { titulo, subtitulo, responsavel, observacoes },
        }),
      })

      // Se retornou JSON (erro), tratar
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        nova.document.open()
        nova.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Erro</title>
          <style>body{margin:40px;font-family:Inter,sans-serif;color:#dc2626;background:#f8f5f0}</style></head>
          <body><h2>Erro ao gerar relatório</h2><p>${data.error || 'Erro desconhecido'}</p></body></html>`)
        nova.document.close()
        showToast(data.error || 'Erro ao gerar relatório.', 'error')
        return
      }

      // Consumir o stream SSE e montar o HTML
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let htmlParts: string[] = []
      let buffer = ''

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
            if (evt.error) { showToast(evt.error, 'error'); nova.close(); return }
            if (evt.text) htmlParts.push(evt.text)
          } catch { /* ignore */ }
        }
      }

      let html = htmlParts.join('')
      html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

      if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
        nova.close()
        showToast('A IA não retornou HTML válido. Tente reformular.', 'error')
        return
      }

      nova.document.open()
      nova.document.write(html)
      nova.document.close()
      showToast('Relatório gerado! Verifique a nova aba.')
    } catch (err) {
      nova.close()
      const msg = err instanceof DOMException && err.name === 'AbortError'
        ? 'O relatório demorou demais para gerar. Tente um relatório mais simples ou com filtro de período.'
        : 'Erro de conexão ao gerar relatório. Verifique sua internet e tente novamente.'
      showToast(msg, 'error')
    }
    finally { setCarregando(false) }
  }

  return (
    <div className="page-container">
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Relatórios com Inteligência Artificial
          </h1>
          <p className="page-subtitle">
            Descreva em linguagem natural o relatório desejado. A IA consulta os dados reais do sistema e gera um relatório HTML profissional em nova aba, com botões para baixar em PDF e Word.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">

          {/* Prompt */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2"><AlignLeft className="w-4 h-4" />Descreva o Relatório</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="form-group">
                <label>O que você quer ver no relatório?<span className="required-star">*</span></label>
                <textarea className="form-input" rows={5}
                  placeholder="Ex: Quero um relatório financeiro completo com todas as receitas e despesas do período, separados por categoria, com totais e saldo final destacados..."
                  value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Quanto mais detalhada a descrição, mais preciso será o relatório gerado.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-navy uppercase tracking-wide mb-2">💡 Sugestões — clique para usar:</p>
                <div className="flex flex-wrap gap-2">
                  {EXEMPLOS.map((ex) => (
                    <button key={ex.label} type="button" onClick={() => setPrompt(ex.texto)}
                      className="text-xs px-3 py-1.5 rounded-full border border-navy/30 text-navy hover:bg-navy hover:text-white transition-colors whitespace-nowrap">
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2"><Calendar className="w-4 h-4" />Filtros de Período</h2>
              <span className="text-xs text-gray-400">Opcional — sem filtro inclui todos os dados</span>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DateInput label="Data Início" value={dataInicio} onChange={setDataInicio} />
                <DateInput label="Data Fim" value={dataFim} onChange={setDataFim} minDate={dataInicio || undefined} />
                <div className="form-group">
                  <label>Mês/Ano de Referência</label>
                  <input type="month" className="form-input" value={mesAno} onChange={(e) => setMesAno(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Cabeçalho colapsável */}
          <div className="card">
            <button type="button" onClick={() => setCabecalhoAberto(!cabecalhoAberto)}
              className="card-header w-full text-left flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2"><FileText className="w-4 h-4" />Personalizar Cabeçalho</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Opcional</span>
                {cabecalhoAberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>
            {cabecalhoAberto && (
              <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Título do Relatório</label>
                  <input type="text" className="form-input" placeholder="Ex: Relatório Financeiro Mensal"
                    value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Subtítulo</label>
                  <input type="text" className="form-input" placeholder="Ex: 1º Trimestre 2025"
                    value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Responsável / Assinatura</label>
                  <input type="text" className="form-input" placeholder="Nome do responsável pelo relatório"
                    value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Observações</label>
                  <textarea className="form-input" rows={2} placeholder="Observações que devem constar no relatório..."
                    value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Botão */}
          <button onClick={gerarRelatorio} disabled={carregando || !prompt.trim()}
            className="btn-primary w-full py-4 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
            {carregando
              ? <><Loader2 className="w-5 h-5 animate-spin" />Gerando relatório com IA... (pode levar até 45s)</>
              : <><Sparkles className="w-5 h-5" />Gerar Relatório com IA</>}
          </button>

          {carregando && (
            <div className="card border-blue-200 bg-blue-50">
              <div className="card-body flex items-start gap-3">
                <span className="text-3xl animate-pulse">🤖</span>
                <div>
                  <p className="font-semibold text-blue-800">A IA está trabalhando...</p>
                  <ol className="text-sm text-blue-600 mt-2 space-y-1 list-decimal list-inside">
                    <li>Consultando os dados do sistema</li>
                    <li>Analisando informações relevantes ao relatório</li>
                    <li>Montando o HTML estilizado e profissional</li>
                    <li>Abrindo em nova aba automaticamente</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card border-amber-200 bg-amber-50">
            <div className="card-body">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2"><Info className="w-4 h-4" />Como funciona</h3>
              <ol className="text-sm text-amber-800 space-y-2">
                {[
                  'Descreva o relatório em português',
                  'Configure filtros de período (opcional)',
                  'Personalize o cabeçalho (opcional)',
                  'Clique em Gerar Relatório',
                  'O relatório abre em nova aba',
                  'Baixe em PDF (imprimir) ou Word (.doc)',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-700 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card border-emerald-200 bg-emerald-50">
            <div className="card-body">
              <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Dados disponíveis para a IA</h3>
              <ul className="text-sm text-emerald-800 space-y-1.5">
                {[
                  '💼 Departamentos e orçamentos',
                  '🎯 Projetos de filantropia',
                  '🎪 Eventos e consolidações',
                  '👥 Voluntários AMO',
                  '👔 Funcionários CLT e PJ',
                  '💰 Receitas (8 categorias)',
                  '📉 Despesas (6 categorias)',
                  '🏪 Fornecedores cadastrados',
                  '🏠 Contratos de locação',
                ].map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="card border-gray-200 bg-gray-50">
            <div className="card-body">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">⚠️ Pop-up bloqueado?</h3>
              <p className="text-xs text-gray-600">
                Se nada abrir, procure o ícone de pop-up bloqueado na barra de endereço do navegador e clique em <strong>Permitir</strong>. Depois clique em Gerar novamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
