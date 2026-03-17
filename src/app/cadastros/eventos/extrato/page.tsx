'use client'
import { useState, useEffect, useCallback } from 'react'
import { FileText, TrendingUp, TrendingDown, Minus, FileSpreadsheet, FileDown } from 'lucide-react'

interface Lancamento {
  id: string; data: string; tipo: 'entrada' | 'saida'; categoria: string; descricao: string; valor: number; observacoes: string | null
}
interface EventoInfo { id: string; nome: string; dataInicio: string; dataEncerramento: string; projetoNome: string | null }
interface Totais { entradas: number; saidas: number; saldo: number }
interface Evento { id: string; nome: string }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

export default function ExtratoEventoPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoId, setEventoId] = useState('')
  const [eventoInfo, setEventoInfo] = useState<EventoInfo | null>(null)
  const [transacoes, setTransacoes] = useState<Lancamento[]>([])
  const [totais, setTotais] = useState<Totais | null>(null)
  const [loading, setLoading] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  useEffect(() => {
    fetch('/api/eventos').then(r => r.json()).then(j => { if (j.success) setEventos(j.data) })
  }, [])

  const loadExtrato = useCallback(async (id: string) => {
    if (!id) { setEventoInfo(null); setTransacoes([]); setTotais(null); return }
    setLoading(true)
    try {
      const r = await fetch(`/api/extrato/evento?eventoId=${id}`)
      const j = await r.json()
      if (j.success) {
        setEventoInfo(j.evento)
        setTransacoes(j.transacoes)
        setTotais(j.totais)
      }
    } finally { setLoading(false) }
  }, [])

  const handleEventoChange = (id: string) => {
    setEventoId(id)
    setFiltroTipo('todos')
    setFiltroCategoria('')
    loadExtrato(id)
  }

  const exportCSV = () => {
    if (!eventoInfo || !totais) return
    const rows: string[][] = [
      ['Extrato Financeiro de Evento - ' + eventoInfo.nome],
      ['Projeto Vinculado: ' + (eventoInfo.projetoNome || 'Avulso')],
      ['Período: ' + fmtDate(eventoInfo.dataInicio) + ' a ' + fmtDate(eventoInfo.dataEncerramento)],
      ['Gerado em: ' + new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR')],
      [],
      ['Data', 'Tipo', 'Categoria', 'Descrição', 'Observações', 'Valor (R$)'],
      ...transacoes.map(t => [
        fmtDate(t.data),
        t.tipo === 'entrada' ? 'Entrada' : 'Saída',
        t.categoria,
        t.descricao,
        t.observacoes || '',
        (t.tipo === 'entrada' ? t.valor : -t.valor).toFixed(2).replace('.', ','),
      ]),
      [],
      ['', '', '', '', 'Total Entradas', totais.entradas.toFixed(2).replace('.', ',')],
      ['', '', '', '', 'Total Saídas', totais.saidas.toFixed(2).replace('.', ',')],
      ['', '', '', '', 'Saldo', totais.saldo.toFixed(2).replace('.', ',')],
    ]
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
      download: `extrato-evento-${eventoInfo.nome.replace(/[^\w]/g, '-')}.csv`,
    })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const exportPDF = () => window.print()

  const categorias = [...new Set(transacoes.map(t => t.categoria))].sort()
  const filtered = transacoes.filter(t => {
    if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false
    if (filtroCategoria && t.categoria !== filtroCategoria) return false
    return true
  })

  // Running balance
  let saldoAcum = 0
  const comSaldo = filtered.map(t => {
    saldoAcum += t.tipo === 'entrada' ? t.valor : -t.valor
    return { ...t, saldoAcum }
  })

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Extrato de Evento</h1>
            <p className="text-sm text-navy-400">Todas as entradas e saídas financeiras do evento</p>
          </div>
        </div>
        {eventoInfo && (
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Exportar Planilha
            </button>
            <button onClick={exportPDF} className="btn-secondary flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Gerar PDF
            </button>
          </div>
        )}
      </div>

      {/* ── SELETOR ── */}
      <div className="card print:hidden mb-4">
        <div className="form-group mb-0">
          <label className="font-semibold">Selecione o Evento</label>
          <select value={eventoId} onChange={e => handleEventoChange(e.target.value)} className="form-input">
            <option value="">Selecione um evento...</option>
            {eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="card text-center py-10 text-navy-400">Carregando extrato...</div>
      )}

      {!loading && eventoInfo && totais && (
        <div className="space-y-4">

          {/* ── CABEÇALHO DO RELATÓRIO (visível no print) ── */}
          <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-gray-800">
            <h1 className="text-xl font-bold text-gray-800">🕊️ Associação Missionária Ômega</h1>
            <h2 className="text-lg font-bold text-gray-700 mt-2 uppercase tracking-wide">Extrato Financeiro de Evento</h2>
            <p className="text-sm text-gray-500 mt-1">Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          {/* ── DADOS DO EVENTO ── */}
          <div className="card">
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3">Informações do Evento</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-navy-400 uppercase">Evento</p>
                <p className="font-semibold text-navy-800">{eventoInfo.nome}</p>
              </div>
              {eventoInfo.projetoNome && (
                <div>
                  <p className="text-xs text-navy-400 uppercase">Projeto Vinculado</p>
                  <p className="font-semibold text-navy-800">{eventoInfo.projetoNome}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-navy-400 uppercase">Início</p>
                <p className="font-semibold text-navy-800">{fmtDate(eventoInfo.dataInicio)}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400 uppercase">Encerramento</p>
                <p className="font-semibold text-navy-800">{fmtDate(eventoInfo.dataEncerramento)}</p>
              </div>
            </div>
          </div>

          {/* ── TOTAIS ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold uppercase text-green-600">Total Entradas</span>
              </div>
              <p className="text-xl font-bold text-green-800">{fmt(totais.entradas)}</p>
              <p className="text-xs text-green-600 mt-0.5">{transacoes.filter(t => t.tipo === 'entrada').length} lançamentos</p>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold uppercase text-red-600">Total Saídas</span>
              </div>
              <p className="text-xl font-bold text-red-700">{fmt(totais.saidas)}</p>
              <p className="text-xs text-red-600 mt-0.5">{transacoes.filter(t => t.tipo === 'saida').length} lançamentos</p>
            </div>
            <div className={`card ${totais.saldo >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Minus className={`w-4 h-4 ${totais.saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
                <span className={`text-xs font-semibold uppercase ${totais.saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>Saldo</span>
              </div>
              <p className={`text-xl font-bold ${totais.saldo >= 0 ? 'text-emerald-800' : 'text-orange-700'}`}>{fmt(totais.saldo)}</p>
              <p className={`text-xs mt-0.5 ${totais.saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>{transacoes.length} lançamentos no total</p>
            </div>
          </div>

          {/* ── FILTROS (apenas tela) ── */}
          <div className="card print:hidden flex flex-wrap gap-3 items-end">
            <div className="form-group mb-0 flex-1 min-w-[140px]">
              <label className="text-xs">Tipo</label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as 'todos'|'entrada'|'saida')} className="form-input">
                <option value="todos">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
            </div>
            <div className="form-group mb-0 flex-1 min-w-[180px]">
              <label className="text-xs">Categoria</label>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="form-input">
                <option value="">Todas</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {(filtroTipo !== 'todos' || filtroCategoria) && (
              <button onClick={() => { setFiltroTipo('todos'); setFiltroCategoria('') }} className="btn-secondary text-xs">Limpar filtros</button>
            )}
          </div>

          {/* ── TABELA DE LANÇAMENTOS ── */}
          <div className="card overflow-x-auto">
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3">
              Lançamentos {filtered.length !== transacoes.length ? `(${filtered.length} de ${transacoes.length})` : `(${transacoes.length})`}
            </h3>
            {filtered.length === 0 ? (
              <p className="text-navy-400 text-sm text-center py-6">Nenhum lançamento encontrado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-200">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-navy-500 uppercase">Data</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-navy-500 uppercase">Tipo</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-navy-500 uppercase">Categoria</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-navy-500 uppercase">Descrição</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-navy-500 uppercase">Valor</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-navy-500 uppercase print:hidden">Saldo Acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {comSaldo.map((t, i) => (
                    <tr key={t.id} className={`border-b border-cream-100 ${i % 2 === 0 ? '' : 'bg-cream-50/50'}`}>
                      <td className="py-2 px-2 text-navy-600 whitespace-nowrap">{fmtDate(t.data)}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-navy-500 text-xs">{t.categoria}</td>
                      <td className="py-2 px-2 text-navy-700">
                        {t.descricao}
                        {t.observacoes && <p className="text-xs text-navy-400 mt-0.5">{t.observacoes}</p>}
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold tabular-nums ${t.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
                        {t.tipo === 'entrada' ? '+' : '−'} {fmt(t.valor)}
                      </td>
                      <td className={`py-2 px-2 text-right tabular-nums text-xs print:hidden ${t.saldoAcum >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {fmt(t.saldoAcum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-navy-200 bg-navy-50">
                    <td colSpan={4} className="py-3 px-2 font-bold text-navy-700 text-sm">TOTAL</td>
                    <td className="py-3 px-2 text-right font-bold tabular-nums text-navy-800">
                      <div className="text-green-700">+{fmt(filtered.filter(t=>t.tipo==='entrada').reduce((s,t)=>s+t.valor,0))}</div>
                      <div className="text-red-700">−{fmt(filtered.filter(t=>t.tipo==='saida').reduce((s,t)=>s+t.valor,0))}</div>
                    </td>
                    <td className="py-3 px-2 text-right print:hidden" />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {!loading && !eventoInfo && eventoId && (
        <div className="card text-center py-10 text-red-500">Evento não encontrado ou sem dados.</div>
      )}
    </div>
  )
}
