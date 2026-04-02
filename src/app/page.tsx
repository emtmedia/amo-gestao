'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Users, FolderOpen, Calendar,
  Handshake, FileText, RefreshCw, AlertCircle, ArrowUpRight,
  BarChart3, Clock, Home, BookOpen, FolderCheck, CalendarCheck,
  CheckCircle2, UserCheck, Briefcase
} from 'lucide-react'

interface DashData {
  totalVoluntarios: number
  totalProjetos: number; projetosAtivos: number; projetosEncerrados: number
  totalEventos: number; eventosProximos: number; eventosPassados: number
  totalFuncionarios: number; totalFuncionariosCLT: number; totalFuncionariosPJ: number
  totalFornecedores: number; totalDepartamentos: number; totalContratos: number; totalDocumentos: number
  voluntariosEmProjetos: number; voluntariosEmEventos: number
  atividadeRecente: { tipo: string; titulo: string; data: string; id: string }[]
  mesAtual: string
}

const timeSince = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

const actCfg: Record<string, { icon: React.ElementType; color: string; label: string; href: string }> = {
  projeto: { icon: FolderOpen, color: 'bg-purple-100 text-purple-700', label: 'Projeto cadastrado', href: '/cadastros/projetos' },
  evento:  { icon: Calendar,   color: 'bg-orange-100 text-orange-700', label: 'Evento cadastrado',  href: '/cadastros/eventos' },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">🕊️ AMO Gestão</h1>
          <p className="text-navy-500 mt-0.5 text-sm">Associação Missionária Ômega — Painel Operacional</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-navy-500 hover:bg-cream-100 transition-colors border border-cream-200">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {lastUpdate ? timeSince(lastUpdate.toISOString()) : 'Atualizar'}
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100/40 border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-purple-600" />
            </div>
            <Link href="/cadastros/projetos" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
              Ver <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-purple-700 font-medium uppercase tracking-wide">Projetos</p>
          <p className="text-3xl font-bold text-purple-700 mt-1">{d.totalProjetos}</p>
          <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between text-xs text-purple-600">
            <span><span className="font-semibold">{d.projetosAtivos}</span> ativos</span>
            <span><span className="font-semibold">{d.projetosEncerrados}</span> encerrados</span>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100/40 border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <Link href="/cadastros/eventos" className="text-xs text-orange-600 hover:underline flex items-center gap-1">
              Ver <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-orange-700 font-medium uppercase tracking-wide">Eventos</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{d.totalEventos}</p>
          <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between text-xs text-orange-600">
            <span><span className="font-semibold">{d.eventosProximos}</span> próximos</span>
            <span><span className="font-semibold">{d.eventosPassados}</span> passados</span>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100/40 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <Link href="/cadastros/voluntarios-amo" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Voluntários</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{d.totalVoluntarios}</p>
          <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between text-xs text-blue-600">
            <span><span className="font-semibold">{d.voluntariosEmProjetos}</span> em projetos</span>
            <span><span className="font-semibold">{d.voluntariosEmEventos}</span> em eventos</span>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-sky-50 to-sky-100/40 border-sky-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-sky-600" />
            </div>
            <Link href="/cadastros/departamentos" className="text-xs text-sky-600 hover:underline flex items-center gap-1">
              Ver <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-sky-700 font-medium uppercase tracking-wide">Departamentos</p>
          <p className="text-3xl font-bold text-sky-700 mt-1">{d.totalDepartamentos}</p>
          <div className="mt-3 pt-3 border-t border-sky-200">
            <p className="text-xs text-sky-600">unidades ativas</p>
          </div>
        </div>
      </div>

      {/* Registros Operacionais */}
      <div>
        <h2 className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Registros Operacionais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Funcionários', value: d.totalFuncionarios, sub: `${d.totalFuncionariosCLT} CLT · ${d.totalFuncionariosPJ} PJ`, icon: Briefcase, href: '/cadastros/funcionarios/clt', c: 'text-indigo-600 bg-indigo-50' },
            { label: 'Fornecedores', value: d.totalFornecedores, icon: Handshake, href: '/cadastros/fornecedores', c: 'text-yellow-600 bg-yellow-50' },
            { label: 'Contratos', value: d.totalContratos, icon: Home, href: '/cadastros/imoveis', c: 'text-teal-600 bg-teal-50' },
            { label: 'Documentos', value: d.totalDocumentos, icon: BookOpen, href: '/cadastros/documentos', c: 'text-rose-600 bg-rose-50' },
            { label: 'Vol. em Projetos', value: d.voluntariosEmProjetos, icon: UserCheck, href: '/cadastros/voluntarios-projeto', c: 'text-purple-600 bg-purple-50' },
            { label: 'Vol. em Eventos', value: d.voluntariosEmEventos, icon: UserCheck, href: '/cadastros/voluntarios-evento', c: 'text-orange-600 bg-orange-50' },
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
                  {'sub' in item && item.sub && <p className="text-xs text-navy-400 mt-0.5 leading-tight">{item.sub}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Atividade recente + Alertas */}
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
              <p className="text-xs mt-1">Comece cadastrando projetos e eventos.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {d.atividadeRecente.map((item, i) => {
                const cfg = actCfg[item.tipo] || actCfg.projeto
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
                      <p className="text-xs text-navy-400 flex-shrink-0">{timeSince(item.data)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Alertas + Atalhos */}
        <div className="space-y-4">
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
              {d.eventosProximos === 0 && d.projetosAtivos === 0 && (
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
              <FileText className="w-4 h-4 text-navy-400" /> Acesso Rápido
            </h2>
            <div className="space-y-1">
              {[
                { label: 'Novo Projeto', href: '/cadastros/projetos', c: 'hover:bg-purple-50 hover:text-purple-700' },
                { label: 'Novo Evento', href: '/cadastros/eventos', c: 'hover:bg-orange-50 hover:text-orange-700' },
                { label: 'Novo Voluntário', href: '/cadastros/voluntarios-amo', c: 'hover:bg-blue-50 hover:text-blue-700' },
                { label: 'Consolidar Projeto', href: '/cadastros/consolidacoes/projetos', c: 'hover:bg-slate-50 hover:text-slate-700' },
                { label: 'Consolidar Evento', href: '/cadastros/consolidacoes/eventos', c: 'hover:bg-slate-50 hover:text-slate-700' },
                { label: 'Relatórios', href: '/relatorios', c: 'hover:bg-slate-50 hover:text-slate-700' },
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
