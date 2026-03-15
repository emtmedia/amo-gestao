'use client'
import { useState, useEffect, useCallback } from 'react'
import { FileText, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Printer } from 'lucide-react'

interface Lancamento {
  id: string; data: string; tipo: 'entrada' | 'saida'; categoria: string; descricao: string; valor: number; observacoes: string | null
}
interface Totais { entradas: number; saidas: number; saldo: number }
interface EventoExtrato {
  evento: { id: string; nome: string; dataInicio: string; dataEncerramento: string }
  transacoes: Lancamento[]
  totais: Totais
}
interface ProjetoInfo { id: string; nome: string; dataInicio: string; dataEncerramento: string }
interface Projeto { id: string; nome: string }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function TotaisBar({ totais, label }: { totais: Totais; label: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 mt-2">
      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
        <p className="text-xs text-green-600 font-medium">{label} Entradas</p>
        <p className="font-bold text-green-800 text-sm">{fmt(totais.entradas)}</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
        <p className="text-xs text-red-600 font-medium">{label} Saídas</p>
        <p className="font-bold text-red-700 text-sm">{fmt(totais.saidas)}</p>
      </div>
      <div className={`border rounded-lg p-2 text-center ${totais.saldo >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
        <p className={`text-xs font-medium ${totais.saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>{label} Saldo</p>
        <p className={`font-bold text-sm ${totais.saldo >= 0 ? 'text-emerald-800' : 'text-orange-700'}`}>{fmt(totais.saldo)}</p>
      </div>
    </div>
  )
}

function TabelaLancamentos({ transacoes, showSaldoAcum = true }: { transacoes: Lancamento[]; showSaldoAcum?: boolean }) {
  if (transacoes.length === 0) {
    return <p className="text-navy-400 text-sm text-center py-4 italic">Nenhum lançamento direto neste escopo.</p>
  }
  let saldoAcum = 0
  const comSaldo = transacoes.map(t => {
    saldoAcum += t.tipo === 'entrada' ? t.valor : -t.valor
    return { ...t, saldoAcum }
  })
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-cream-200">
          <th className="text-left py-1.5 px-2 text-xs font-semibold text-navy-500 uppercase">Data</th>
          <th className="text-left py-1.5 px-2 text-xs font-semibold text-navy-500 uppercase">Tipo</th>
          <th className="text-left py-1.5 px-2 text-xs font-semibold text-navy-500 uppercase">Categoria</th>
          <th className="text-left py-1.5 px-2 text-xs font-semibold text-navy-500 uppercase">Descrição</th>
          <th className="text-right py-1.5 px-2 text-xs font-semibold text-navy-500 uppercase">Valor</th>
          {showSaldoAcum && <th className="text-right py-1.5 px-2 text-xs font-semibold text-navy-500 uppercase print:hidden">Saldo Acum.</th>}
        </tr>
      </thead>
      <tbody>
        {comSaldo.map((t, i) => (
          <tr key={t.id} className={`border-b border-cream-100 ${i % 2 === 0 ? '' : 'bg-cream-50/50'}`}>
            <td className="py-1.5 px-2 text-navy-600 whitespace-nowrap">{fmtDate(t.data)}</td>
            <td className="py-1.5 px-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {t.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
              </span>
            </td>
            <td className="py-1.5 px-2 text-navy-500 text-xs">{t.categoria}</td>
            <td className="py-1.5 px-2 text-navy-700">
              {t.descricao}
              {t.observacoes && <p className="text-xs text-navy-400 mt-0.5">{t.observacoes}</p>}
            </td>
            <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${t.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
              {t.tipo === 'entrada' ? '+' : '−'} {fmt(t.valor)}
            </td>
            {showSaldoAcum && (
              <td className={`py-1.5 px-2 text-right tabular-nums text-xs print:hidden ${t.saldoAcum >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {fmt(t.saldoAcum)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EventoSection({ extrato }: { extrato: EventoExtrato }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-cream-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-navy-50 hover:bg-navy-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-navy-500" /> : <ChevronRight className="w-4 h-4 text-navy-500" />}
          <span className="font-semibold text-navy-700 text-sm">{extrato.evento.nome}</span>
          <span className="text-xs text-navy-400">{fmtDate(extrato.evento.dataInicio)} — {fmtDate(extrato.evento.dataEncerramento)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green-700 font-medium">+{fmt(extrato.totais.entradas)}</span>
          <span className="text-red-600 font-medium">−{fmt(extrato.totais.saidas)}</span>
          <span className={`font-bold ${extrato.totais.saldo >= 0 ? 'text-emerald-700' : 'text-orange-600'}`}>{fmt(extrato.totais.saldo)}</span>
        </div>
      </button>
      {open && (
        <div className="p-4 overflow-x-auto">
          <TabelaLancamentos transacoes={extrato.transacoes} />
        </div>
      )}
    </div>
  )
}

export default function ExtratoProjetoPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [projetoId, setProjetoId] = useState('')
  const [projetoInfo, setProjetoInfo] = useState<ProjetoInfo | null>(null)
  const [direto, setDireto] = useState<{ transacoes: Lancamento[]; totais: Totais } | null>(null)
  const [eventos, setEventos] = useState<EventoExtrato[]>([])
  const [totaisGeral, setTotaisGeral] = useState<Totais | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/projetos').then(r => r.json()).then(j => { if (j.success) setProjetos(j.data) })
  }, [])

  const loadExtrato = useCallback(async (id: string) => {
    if (!id) { setProjetoInfo(null); setDireto(null); setEventos([]); setTotaisGeral(null); return }
    setLoading(true)
    try {
      const r = await fetch(`/api/extrato/projeto?projetoId=${id}`)
      const j = await r.json()
      if (j.success) {
        setProjetoInfo(j.projeto)
        setDireto(j.direto)
        setEventos(j.eventos)
        setTotaisGeral(j.totaisGeral)
      }
    } finally { setLoading(false) }
  }, [])

  const handleProjetoChange = (id: string) => {
    setProjetoId(id)
    loadExtrato(id)
  }

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Extrato de Projeto</h1>
            <p className="text-sm text-navy-400">Todas as entradas e saídas financeiras do projeto, diretas e por evento</p>
          </div>
        </div>
        {projetoInfo && (
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        )}
      </div>

      {/* ── SELETOR ── */}
      <div className="card print:hidden mb-4">
        <div className="form-group mb-0">
          <label className="font-semibold">Selecione o Projeto</label>
          <select value={projetoId} onChange={e => handleProjetoChange(e.target.value)} className="form-input">
            <option value="">Selecione um projeto...</option>
            {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="card text-center py-10 text-navy-400">Carregando extrato...</div>
      )}

      {!loading && projetoInfo && direto && totaisGeral && (
        <div className="space-y-5">

          {/* ── CABEÇALHO PRINT ── */}
          <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-gray-800">
            <h1 className="text-xl font-bold text-gray-800">🕊️ Associação Missionária Ômega</h1>
            <h2 className="text-lg font-bold text-gray-700 mt-2 uppercase tracking-wide">Extrato Financeiro de Projeto</h2>
            <p className="text-sm text-gray-500 mt-1">Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>

          {/* ── DADOS DO PROJETO ── */}
          <div className="card">
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3">Informações do Projeto</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="md:col-span-1">
                <p className="text-xs text-navy-400 uppercase">Projeto</p>
                <p className="font-semibold text-navy-800">{projetoInfo.nome}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400 uppercase">Início</p>
                <p className="font-semibold text-navy-800">{fmtDate(projetoInfo.dataInicio)}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400 uppercase">Encerramento Previsto</p>
                <p className="font-semibold text-navy-800">{fmtDate(projetoInfo.dataEncerramento)}</p>
              </div>
            </div>
          </div>

          {/* ── TOTAIS GERAIS ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold uppercase text-green-600">Total Entradas</span>
              </div>
              <p className="text-xl font-bold text-green-800">{fmt(totaisGeral.entradas)}</p>
              <p className="text-xs text-green-500 mt-0.5">Direto + todos os eventos</p>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold uppercase text-red-600">Total Saídas</span>
              </div>
              <p className="text-xl font-bold text-red-700">{fmt(totaisGeral.saidas)}</p>
              <p className="text-xs text-red-500 mt-0.5">Direto + todos os eventos</p>
            </div>
            <div className={`card ${totaisGeral.saldo >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Minus className={`w-4 h-4 ${totaisGeral.saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} />
                <span className={`text-xs font-semibold uppercase ${totaisGeral.saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>Saldo Geral</span>
              </div>
              <p className={`text-xl font-bold ${totaisGeral.saldo >= 0 ? 'text-emerald-800' : 'text-orange-700'}`}>{fmt(totaisGeral.saldo)}</p>
              <p className={`text-xs mt-0.5 ${totaisGeral.saldo >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                {eventos.length} evento{eventos.length !== 1 ? 's' : ''} vinculado{eventos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* ── LANÇAMENTOS DIRETOS ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide">
                Lançamentos Diretos no Projeto
              </h3>
              <span className="text-xs text-navy-400">{direto.transacoes.length} lançamentos</span>
            </div>
            {direto.transacoes.length > 0 && (
              <div className="mb-3">
                <TotaisBar totais={direto.totais} label="Direto —" />
              </div>
            )}
            <div className="overflow-x-auto">
              <TabelaLancamentos transacoes={direto.transacoes} />
            </div>
          </div>

          {/* ── POR EVENTO ── */}
          {eventos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide px-1">
                Lançamentos por Evento ({eventos.length} evento{eventos.length !== 1 ? 's' : ''})
              </h3>
              {eventos.map(ev => (
                <EventoSection key={ev.evento.id} extrato={ev} />
              ))}
            </div>
          )}

          {eventos.length === 0 && (
            <div className="card text-center py-6 text-navy-400 text-sm">
              Nenhum evento vinculado a este projeto.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
