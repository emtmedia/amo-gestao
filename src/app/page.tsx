'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Users, FolderOpen, Calendar, TrendingUp, TrendingDown,
  Handshake, FileText, RefreshCw, AlertCircle, ArrowUpRight,
  Wallet, BarChart3, Clock, CreditCard, Home, BookOpen,
  FolderCheck, CalendarCheck, CheckCircle2
} from 'lucide-react'

interface DashData {
  totalVoluntarios: number; totalProjetos: number; projetosAtivos: number
  totalEventos: number; eventosProximos: number; totalFuncionarios: number
  totalFuncionariosCLT: number; totalFuncionariosPJ: number; totalFornecedores: number
  totalDepartamentos: number; totalContratos: number; totalDocumentos: number
  totalReceitas: number; totalDespesas: number; saldoGeral: number
  totalReceitasMes: number; totalDespesasMes: number; saldoMes: number; mesAtual: string
  atividadeRecente: { tipo: string; titulo: string; data: string; id: string; valor?: number }[]
  receitasPorTipo: { label: string; valor: number }[]
  despesasPorTipo: { label: string; valor: number }[]
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const timeSince = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}
const actCfg: Record<string, { icon: any; color: string; label: string; href: string }> = {
  projeto: { icon: FolderOpen, color: 'bg-purple-100 text-purple-700', label: 'Projeto criado', href: '/cadastros/projetos' },
  evento:  { icon: Calendar,   color: 'bg-orange-100 text-orange-700', label: 'Evento criado',  href: '/cadastros/eventos' },
  receita: { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700', label: 'Receita',       href: '/cadastros/receitas/pessoa-fisica' },
  despesa: { icon: TrendingDown, color: 'bg-red-100 text-red-700',      label: 'Despesa',        href: '/cadastros/despesas/consumo' },
}

export default function HomePage() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const j = await fetch('/api/dashboard').then(r => r.json())
      if (j.success) { setData(j.data); setLastUpdate(new Date()) }
      else setError(j.error)
    } catch { setError('Falha ao carregar dados') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-navy-500 text-sm">Carregando painel...</p>
      </div>
    </div>
  )
  if (error && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-navy-600 font-medium mb-1">Erro ao carregar dados</p>
        <p className="text-navy-400 text-sm mb-4">{error}</p>
        <button onClick={fetchData} className="btn-primary text-sm">Tentar novamente</button>
      </div>
    </div>
  )

  const d = data!
  const saldoCor = (v: number) => v >= 0 ? 'text-emerald-600' : 'text-red-600'
  const saldoBg  = (v: number) => v >= 0 ? 'from-emerald-50 to-emerald-100/50 border-emerald-200' : 'from-red-50 to-red-100/50 border-red-200'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">🕊️ AMO Gestão</h1>
          <p className="text-navy-500 mt-0.5 text-sm">Associação Missionária Ômega — Painel Executivo</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-navy-500 hover:bg-cream-100 transition-colors border border-cream-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {lastUpdate ? `${timeSince(lastUpdate.toISOString())}` : 'Atualizar'}
        </button>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <Link href="/cadastros/receitas/pessoa-fisica" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Ver receitas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Total Receitas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(d.totalReceitas)}</p>
          <div className="mt-3 pt-3 border-t border-emerald-200">
            <p className="text-xs text-emerald-600"><span className="font-semibold">{fmt(d.totalReceitasMes)}</span> no mês atual</p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100/40 border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <Link href="/cadastros/despesas/consumo" className="text-xs text-red-600 hover:underline flex items-center gap-1">
              Ver despesas <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-red-700 font-medium uppercase tracking-wide">Total Despesas</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{fmt(d.totalDespesas)}</p>
          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-xs text-red-600"><span className="font-semibold">{fmt(d.totalDespesasMes)}</span> no mês atual</p>
          </div>
        </div>

        <div className={`card bg-gradient-to-br ${saldoBg(d.saldoGeral)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.saldoGeral >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <Wallet className={`w-5 h-5 ${saldoCor(d.saldoGeral)}`} />
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.saldoGeral >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {d.saldoGeral >= 0 ? '✓ Positivo' : '⚠ Negativo'}
            </span>
          </div>
          <p className={`text-xs font-medium uppercase tracking-wide ${saldoCor(d.saldoGeral)}`}>Saldo Geral</p>
          <p className={`text-2xl font-bold mt-1 ${saldoCor(d.saldoGeral)}`}>{fmt(d.saldoGeral)}</p>
          <div className={`mt-3 pt-3 border-t ${d.saldoGeral >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
            <p className={`text-xs ${saldoCor(d.saldoMes)}`}>Saldo do mês: <span className="font-semibold">{fmt(d.saldoMes)}</span></p>
          </div>
        </div>
      </div>

      {/* Breakdown de Receitas e Despesas */}
      {(d.receitasPorTipo.length > 0 || d.despesasPorTipo.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receitas por tipo */}
          {d.receitasPorTipo.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-navy-800 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Receitas por Categoria
              </h2>
              <div className="space-y-2.5">
                {d.receitasPorTipo.map(item => {
                  const pct = d.totalReceitas > 0 ? (item.valor / d.totalReceitas) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-navy-600 font-medium">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-navy-500">{pct.toFixed(1)}%</span>
                          <span className="text-xs font-semibold text-emerald-700">{fmt(item.valor)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-cream-100 rounded-full h-2">
                        <div className="bg-emerald-400 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Despesas por tipo */}
          {d.despesasPorTipo.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-navy-800 flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-red-500" /> Despesas por Categoria
              </h2>
              <div className="space-y-2.5">
                {d.despesasPorTipo.map(item => {
                  const pct = d.totalDespesas > 0 ? (item.valor / d.totalDespesas) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-navy-600 font-medium">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-navy-500">{pct.toFixed(1)}%</span>
                          <span className="text-xs font-semibold text-red-700">{fmt(item.valor)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-cream-100 rounded-full h-2">
                        <div className="bg-red-400 h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contadores Operacionais */}
      <div>
        <h2 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Registros Operacionais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Voluntários', value: d.totalVoluntarios, icon: Users, href: '/cadastros/voluntarios-amo', c: 'text-blue-600 bg-blue-50' },
            { label: 'Projetos', value: d.totalProjetos, sub: `${d.projetosAtivos} ativo(s)`, icon: FolderOpen, href: '/cadastros/projetos', c: 'text-purple-600 bg-purple-50' },
            { label: 'Eventos', value: d.totalEventos, sub: `${d.eventosProximos} próx.`, icon: Calendar, href: '/cadastros/eventos', c: 'text-orange-600 bg-orange-50' },
            { label: 'Funcionários', value: d.totalFuncionarios, sub: `${d.totalFuncionariosCLT}CLT·${d.totalFuncionariosPJ}PJ`, icon: Users, href: '/cadastros/funcionarios/clt', c: 'text-indigo-600 bg-indigo-50' },
            { label: 'Fornecedores', value: d.totalFornecedores, icon: Handshake, href: '/cadastros/fornecedores', c: 'text-yellow-600 bg-yellow-50' },
            { label: 'Departamentos', value: d.totalDepartamentos, icon: Building2, href: '/cadastros/departamentos', c: 'text-sky-600 bg-sky-50' },
            { label: 'Contratos', value: d.totalContratos, icon: Home, href: '/cadastros/imoveis', c: 'text-teal-600 bg-teal-50' },
            { label: 'Documentos', value: d.totalDocumentos, icon: BookOpen, href: '/cadastros/documentos', c: 'text-rose-600 bg-rose-50' },
          ].map(item => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <div className="card hover:shadow-md transition-all cursor-pointer group p-4">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${item.c}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xl font-bold text-navy-800">{item.value}</p>
                  <p className="text-xs text-navy-600 font-medium mt-0.5 leading-tight">{item.label}</p>
                  {item.sub && <p className="text-xs text-navy-400 mt-0.5 leading-tight">{item.sub}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Atividade + Alertas + Atalhos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Atividade recente */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-navy-800 flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-navy-400" /> Atividade Recente
          </h2>
          {d.atividadeRecente.length === 0 ? (
            <div className="text-center py-8 text-navy-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma atividade ainda.</p>
              <p className="text-xs mt-1">Comece cadastrando projetos e receitas.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {d.atividadeRecente.map((item, i) => {
                const cfg = actCfg[item.tipo] || actCfg.receita
                const Icon = cfg.icon
                return (
                  <Link key={`${item.tipo}-${item.id}-${i}`} href={cfg.href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-50 transition-colors cursor-pointer group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-800 truncate">{item.titulo}</p>
                        <p className="text-xs text-navy-400">{cfg.label}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.valor !== undefined && (
                          <p className={`text-sm font-semibold ${item.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(item.valor)}
                          </p>
                        )}
                        <p className="text-xs text-navy-400">{timeSince(item.data)}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="space-y-4">
          {/* Alertas */}
          <div className="card">
            <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-navy-400" /> Alertas
            </h2>
            <div className="space-y-2">
              {d.eventosProximos > 0 && (
                <Link href="/cadastros/eventos">
                  <div className="flex items-start gap-2.5 p-2.5 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer">
                    <CalendarCheck className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-orange-800">Eventos próximos</p>
                      <p className="text-xs text-orange-700">{d.eventosProximos} evento(s) nos próximos 30 dias</p>
                    </div>
                  </div>
                </Link>
              )}
              {d.projetosAtivos > 0 && (
                <Link href="/cadastros/projetos">
                  <div className="flex items-start gap-2.5 p-2.5 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer">
                    <FolderCheck className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-purple-800">Projetos em andamento</p>
                      <p className="text-xs text-purple-700">{d.projetosAtivos} projeto(s) ativo(s)</p>
                    </div>
                  </div>
                </Link>
              )}
              {d.saldoMes < 0 && (
                <div className="flex items-start gap-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <TrendingDown className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-800">Saldo negativo no mês</p>
                    <p className="text-xs text-red-700">Despesas superam receitas em {fmt(Math.abs(d.saldoMes))}</p>
                  </div>
                </div>
              )}
              {d.eventosProximos === 0 && d.projetosAtivos === 0 && d.saldoMes >= 0 && (
                <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">Tudo em ordem</p>
                    <p className="text-xs text-emerald-700">Nenhum alerta no momento.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Atalhos rápidos */}
          <div className="card">
            <h2 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-navy-400" /> Acesso Rápido
            </h2>
            <div className="space-y-1">
              {[
                { label: 'Nova Receita P. Física', href: '/cadastros/receitas/pessoa-fisica', c: 'hover:bg-emerald-50 hover:text-emerald-700' },
                { label: 'Nova Despesa Consumo', href: '/cadastros/despesas/consumo', c: 'hover:bg-red-50 hover:text-red-700' },
                { label: 'Novo Projeto', href: '/cadastros/projetos', c: 'hover:bg-purple-50 hover:text-purple-700' },
                { label: 'Novo Evento', href: '/cadastros/eventos', c: 'hover:bg-orange-50 hover:text-orange-700' },
                { label: 'Consolidar Projeto', href: '/cadastros/consolidacoes/projetos', c: 'hover:bg-slate-50 hover:text-slate-700' },
                { label: 'Consolidar Evento', href: '/cadastros/consolidacoes/eventos', c: 'hover:bg-slate-50 hover:text-slate-700' },
              ].map(link => (
                <Link key={link.href} href={link.href}>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm text-navy-600 transition-colors ${link.c}`}>
                    <span>{link.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-navy-400 text-center pb-2">
        Dados em tempo real · {d.mesAtual} · Última atualização: {lastUpdate?.toLocaleTimeString('pt-BR') ?? '—'}
      </p>
    </div>
  )
}
