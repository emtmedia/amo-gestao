'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FolderOpen, Users, ClipboardList, Receipt, TrendingUp, TrendingDown,
  Handshake, Briefcase, Banknote, Sparkles, ArrowLeft, Loader2,
  Calendar, BarChart2, Clock, ChevronRight
} from 'lucide-react'
import Link from 'next/link'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FilterKey = 'ano_mes' | 'status' | 'assinatura' | 'projeto_evento' | 'categoria' | 'tipo_pessoa' | 'saldo' | 'recebedor'

interface RelatorioConfig {
  id: string
  label: string
  icon: React.ElementType
  desc: string
  filters: FilterKey[]
}

const RELATORIOS: RelatorioConfig[] = [
  { id: 'projetos',         label: 'Projetos',                icon: FolderOpen,    desc: 'Metadados dos projetos de filantropia',         filters: ['ano_mes', 'status'] },
  { id: 'projetos-eventos', label: 'Projetos com Eventos',    icon: Calendar,      desc: 'Projetos e eventos vinculados',                 filters: ['ano_mes', 'status'] },
  { id: 'voluntarios',      label: 'Voluntários',             icon: Users,         desc: 'Voluntários e suas atividades',                 filters: ['ano_mes', 'projeto_evento'] },
  { id: 'termos',           label: 'Termos de Voluntariado',  icon: ClipboardList, desc: 'Termos emitidos por período',                   filters: ['ano_mes', 'assinatura'] },
  { id: 'recibos',          label: 'Recibos Emitidos',        icon: Receipt,       desc: 'Recibos de pagamento emitidos',                 filters: ['ano_mes', 'assinatura'] },
  { id: 'receitas',         label: 'Receitas',                icon: TrendingUp,    desc: 'Entradas por tipo e categoria',                 filters: ['ano_mes', 'projeto_evento'] },
  { id: 'despesas',         label: 'Despesas',                icon: TrendingDown,  desc: 'Saídas por tipo e categoria',                   filters: ['ano_mes', 'projeto_evento'] },
  { id: 'fornecedores',     label: 'Fornecedores',            icon: Handshake,     desc: 'Cadastro completo de fornecedores',             filters: ['categoria'] },
  { id: 'colaboradores',    label: 'Colaboradores',           icon: Briefcase,     desc: 'Equipe CLT e PJ',                               filters: ['tipo_pessoa'] },
  { id: 'cheque-recibos',   label: 'Cheque-Recibos',          icon: Banknote,      desc: 'Saídas em espécie com prestação de contas',     filters: ['ano_mes', 'assinatura', 'saldo', 'recebedor'] },
  { id: 'eventos-avulsos',  label: 'Eventos Avulsos',         icon: Calendar,      desc: 'Eventos sem projeto vinculado',                  filters: ['ano_mes', 'status'] },
]

const MESES = [
  { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' },
  { v: '4', l: 'Abril' }, { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' },
  { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Setembro' },
  { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' },
]

const ANOS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T12:00:00' : d) : d
  return dt.toLocaleDateString('pt-BR')
}

// ─── Componentes de Card por tipo ─────────────────────────────────────────────

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{text}</span>
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-white border border-gray-100 rounded hover:border-gray-200 transition-colors">
      {children}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="text-xs text-gray-500">
      <span className="text-gray-400">{label}:</span>{' '}{value}
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardProjeto({ d }: { d: any }) {
  const cor = d.status === 'ativo' ? 'bg-blue-50 text-blue-700' : d.status === 'consolidado_ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
  const label = d.status === 'ativo' ? 'Ativo' : d.status === 'consolidado_ok' ? 'Consolidado' : 'Consolidado c/ pendência'
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 truncate">{d.nome}</span>
          <Badge text={label} color={cor} />
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="Início" value={fmtDate(d.dataInicio)} />
          <Meta label="Encerramento" value={fmtDate(d.dataEncerramento)} />
          <Meta label="Responsável" value={d.responsavel} />
          <Meta label="Orçamento" value={fmtMoney(d.orcamentoEstimado)} />
          {d.departamento && <Meta label="Departamento" value={d.departamento} />}
          {d.numeroVoluntarios != null && <Meta label="Voluntários" value={d.numeroVoluntarios} />}
          {d.cidadeRealizacao && <Meta label="Local" value={`${d.cidadeRealizacao}${d.estadoRealizacao ? ` / ${d.estadoRealizacao}` : ''}`} />}
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardProjetoEvento({ d }: { d: any }) {
  return (
    <div className="border border-gray-100 rounded bg-white">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.nome}</span>
          <Badge text={d.status === 'ativo' ? 'Ativo' : 'Consolidado'} color={d.status === 'ativo' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'} />
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="Início" value={fmtDate(d.dataInicio)} />
          <Meta label="Encerramento" value={fmtDate(d.dataEncerramento)} />
          <Meta label="Responsável" value={d.responsavel} />
          <Meta label="Orçamento" value={fmtMoney(d.orcamentoEstimado)} />
          {d.departamento && <Meta label="Depto" value={d.departamento} />}
        </div>
      </div>
      {d.eventos?.length > 0 && (
        <div className="border-t border-gray-50 px-4 pb-3 pt-2 space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {d.eventos.map((e: any) => (
            <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600 pl-3 border-l-2 border-gray-100">
              <Calendar className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span className="font-medium">{e.nome}</span>
              <span className="text-gray-400">•</span>
              <span>{fmtDate(e.dataInicio)} – {fmtDate(e.dataEncerramento)}</span>
              <Badge text={e.status === 'ativo' ? 'Ativo' : 'Consolidado'} color={e.status === 'ativo' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardVoluntario({ d }: { d: any }) {
  const total = d.projetos.length + d.eventos.length
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.nome}</span>
          {d.membroIgrejaOmega && <Badge text="Igreja Ômega" color="bg-purple-50 text-purple-700" />}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="CPF" value={d.cpf} />
          <Meta label="Gênero" value={d.genero} />
          <Meta label="Competências" value={d.competencias} />
          {total > 0 && <Meta label="Atividades" value={`${d.projetos.length} proj. • ${d.eventos.length} eventos`} />}
        </div>
        {(d.projetos.length > 0 || d.eventos.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {d.projetos.map((p: any, i: number) => (
              <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                <FolderOpen className="w-3 h-3 inline mr-1" />{p.projetoNome}
              </span>
            ))}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {d.eventos.map((e: any, i: number) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded ${e.avulso ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                <Calendar className="w-3 h-3 inline mr-1" />{e.eventoNome}
              </span>
            ))}
          </div>
        )}
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardTermo({ d }: { d: any }) {
  const assinado = !!d.docAssinadoUrl
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.voluntarioNome}</span>
          <span className="text-xs text-gray-500">{d.numero}</span>
          {assinado
            ? <Badge text="Assinado" color="bg-green-50 text-green-700" />
            : <Badge text="Pendente" color="bg-amber-50 text-amber-700" />}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="CPF" value={d.voluntarioCpf} />
          <Meta label="Emitido em" value={fmtDate(d.emitidoEm)} />
          {d.projetoNome && <Meta label="Projeto" value={d.projetoNome} />}
          {d.eventoNome && <Meta label="Evento" value={d.eventoNome} />}
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardRecibo({ d }: { d: any }) {
  const assinado = !!d.docAssinadoUrl
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.nomeRecebedor}</span>
          <span className="text-xs text-gray-500">{d.numero}</span>
          <span className="text-sm font-semibold text-gray-800">{fmtMoney(d.valor)}</span>
          {assinado
            ? <Badge text="Assinado" color="bg-green-50 text-green-700" />
            : <Badge text="Pendente" color="bg-amber-50 text-amber-700" />}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="CPF" value={d.cpfRecebedor} />
          <Meta label="Data" value={fmtDate(d.data)} />
          <Meta label="Descrição" value={d.descricao} />
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardReceita({ d }: { d: any }) {
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.descricao}</span>
          <Badge text={d.categoria} color="bg-green-50 text-green-700" />
          <span className="text-sm font-semibold text-green-700">{fmtMoney(d.valor)}</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="Data" value={fmtDate(d.data)} />
          {d.projeto && <Meta label="Projeto" value={d.projeto} />}
          {d.evento && <Meta label="Evento" value={d.evento} />}
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardDespesa({ d }: { d: any }) {
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.fornecedor}</span>
          <Badge text={d.categoria} color="bg-red-50 text-red-700" />
          <span className="text-sm font-semibold text-red-700">{fmtMoney(d.valor)}</span>
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="Data" value={fmtDate(d.data)} />
          {d.projeto && <Meta label="Projeto" value={d.projeto} />}
          {d.evento && <Meta label="Evento" value={d.evento} />}
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardFornecedor({ d }: { d: any }) {
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.nome}</span>
          {d.categoria && <Badge text={d.categoria.nome} color="bg-gray-100 text-gray-700" />}
          {d.subcategoria && <Badge text={d.subcategoria.nome} color="bg-gray-50 text-gray-600" />}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          {d.telefone && <Meta label="Tel" value={d.telefone} />}
          {d.email && <Meta label="E-mail" value={d.email} />}
          {d.site && <Meta label="Site" value={d.site} />}
          {d.endereco && <Meta label="End." value={d.endereco} />}
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardColaborador({ d }: { d: any }) {
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.nome}</span>
          <Badge text={d.tipo} color={d.tipo === 'CLT' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'} />
          {d.salario != null && <span className="text-sm font-semibold text-gray-700">{fmtMoney(d.salario)}</span>}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          {d.cpf && <Meta label="CPF" value={d.cpf} />}
          {d.cnpj && <Meta label="CNPJ" value={d.cnpj} />}
          {d.empresa && <Meta label="Empresa" value={d.empresa} />}
          <Meta label="Contratação" value={fmtDate(d.dataContratacao)} />
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardChequeRecibo({ d }: { d: any }) {
  const assinado = !!d.docAssinadoUrl
  const saldo = d.saldoVal ?? (d.valorConcedido - d.totalDocumentos)
  const saldoCor = saldo > 0.009 ? 'text-amber-600' : saldo < -0.009 ? 'text-red-600' : 'text-green-600'
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{d.nomeRecebedor}</span>
          <span className="text-xs text-gray-500">{d.numero}</span>
          <span className="text-sm font-semibold text-gray-800">{fmtMoney(d.valorConcedido)}</span>
          {assinado
            ? <Badge text="Assinado" color="bg-green-50 text-green-700" />
            : <Badge text="Pendente" color="bg-amber-50 text-amber-700" />}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="CPF" value={d.cpfRecebedor} />
          <Meta label="Data" value={fmtDate(d.dataTransferencia)} />
          <Meta label="Método" value={d.metodoTransferencia} />
          <Meta label="Saldo" value={<span className={saldoCor}>{fmtMoney(saldo)}</span>} />
          <Meta label="Docs" value={fmtMoney(d.totalDocumentos)} />
          {d.projetoNome && <Meta label="Projeto" value={d.projetoNome} />}
          {d.eventoNome && <Meta label="Evento" value={d.eventoNome} />}
          <Meta label="Operador" value={d.nomeOperador} />
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CardEventoAvulso({ d }: { d: any }) {
  const cor = d.status === 'ativo' ? 'bg-blue-50 text-blue-700' : d.status === 'consolidado_ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
  const label = d.status === 'ativo' ? 'Ativo' : d.status === 'consolidado_ok' ? 'Consolidado' : 'Consolidado c/ pendência'
  return (
    <Row>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 truncate">{d.nome}</span>
          <Badge text={label} color={cor} />
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <Meta label="Início" value={fmtDate(d.dataInicio)} />
          <Meta label="Encerramento" value={fmtDate(d.dataEncerramento)} />
          <Meta label="Responsável" value={d.responsavel} />
          <Meta label="Orçamento" value={fmtMoney(d.orcamentoEstimado)} />
          {d.numeroVoluntarios != null && <Meta label="Voluntários" value={d.numeroVoluntarios} />}
          {d.cidadeRealizacao && <Meta label="Local" value={`${d.cidadeRealizacao}${d.estadoRealizacao ? ` / ${d.estadoRealizacao}` : ''}`} />}
        </div>
      </div>
    </Row>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCards(tipo: string, data: any[]) {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-8">Nenhum registro encontrado com os filtros aplicados.</p>
  switch (tipo) {
    case 'projetos':         return data.map(d => <CardProjeto key={d.id} d={d} />)
    case 'projetos-eventos': return data.map(d => <CardProjetoEvento key={d.id} d={d} />)
    case 'voluntarios':      return data.map(d => <CardVoluntario key={d.id} d={d} />)
    case 'termos':           return data.map(d => <CardTermo key={d.id} d={d} />)
    case 'recibos':          return data.map(d => <CardRecibo key={d.id} d={d} />)
    case 'receitas':         return data.map(d => <CardReceita key={d.id} d={d} />)
    case 'despesas':         return data.map(d => <CardDespesa key={d.id} d={d} />)
    case 'fornecedores':     return data.map(d => <CardFornecedor key={d.id} d={d} />)
    case 'colaboradores':    return data.map(d => <CardColaborador key={d.id} d={d} />)
    case 'cheque-recibos':   return data.map(d => <CardChequeRecibo key={d.id} d={d} />)
    case 'eventos-avulsos':  return data.map(d => <CardEventoAvulso key={d.id} d={d} />)
    default:                 return null
  }
}

// ─── Componente principal (inner) ─────────────────────────────────────────────

function RelatoriosInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const tipo = sp.get('tipo') ?? ''
  const relConfig = RELATORIOS.find(r => r.id === tipo)

  // Filtros
  const [ano, setAno] = useState(sp.get('ano') ?? '')
  const [mes, setMes] = useState(sp.get('mes') ?? '')
  const [status, setStatus] = useState(sp.get('status') ?? 'all')
  const [assinatura, setAssinatura] = useState(sp.get('assinatura') ?? 'all')
  const [projetoNome, setProjetoNome] = useState(sp.get('projetoNome') ?? '')
  const [eventoNome, setEventoNome] = useState(sp.get('eventoNome') ?? '')
  const [categoriaId, setCategoriaId] = useState(sp.get('categoriaId') ?? '')
  const [subcategoriaId, setSubcategoriaId] = useState(sp.get('subcategoriaId') ?? '')
  const [tipoPessoa, setTipoPessoa] = useState(sp.get('tipoPessoa') ?? 'all')
  const [saldo, setSaldo] = useState(sp.get('saldo') ?? 'all')
  const [recebedor, setRecebedor] = useState(sp.get('recebedor') ?? '')

  // Dados auxiliares para dropdowns
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([])
  const [subcategorias, setSubcategorias] = useState<{ id: string; categoriaId: string; nome: string }[]>([])
  const [projetos, setProjetos] = useState<{ id: string; nome: string }[]>([])
  const [eventos, setEventos] = useState<{ id: string; nome: string }[]>([])
  const [recebedores, setRecebedores] = useState<string[]>([])

  // Estado do relatório
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dados, setDados] = useState<any[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // Carrega dados auxiliares
  useEffect(() => {
    if (relConfig?.filters.includes('categoria')) {
      Promise.all([
        fetch('/api/categorias-fornecedor').then(r => r.json()),
        fetch('/api/subcategorias-fornecedor').then(r => r.json()),
      ]).then(([c, s]) => {
        if (c.success) setCategorias(c.data)
        if (s.success) setSubcategorias(s.data)
      })
    }
    if (relConfig?.filters.includes('recebedor')) {
      fetch('/api/relatorios/recebedores').then(r => r.json()).then(j => { if (j.success) setRecebedores(j.data) })
    }
    if (relConfig?.filters.includes('projeto_evento')) {
      Promise.all([
        fetch('/api/projetos').then(r => r.json()),
        fetch('/api/eventos').then(r => r.json()),
      ]).then(([p, e]) => {
        if (p.success) setProjetos(p.data.map((x: { id: string; nome: string }) => ({ id: x.id, nome: x.nome })))
        if (e.success) setEventos(e.data.map((x: { id: string; nome: string }) => ({ id: x.id, nome: x.nome })))
      })
    }
  }, [tipo, relConfig])

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams({ tipo })
    if (ano) p.set('ano', ano)
    if (mes) p.set('mes', mes)
    if (status && status !== 'all') p.set('status', status)
    if (assinatura && assinatura !== 'all') p.set('assinatura', assinatura)
    if (projetoNome) p.set('projetoNome', projetoNome)
    if (eventoNome) p.set('eventoNome', eventoNome)
    if (categoriaId) p.set('categoriaId', categoriaId)
    if (subcategoriaId) p.set('subcategoriaId', subcategoriaId)
    if (tipoPessoa && tipoPessoa !== 'all') p.set('tipoPessoa', tipoPessoa)
    if (saldo && saldo !== 'all') p.set('saldo', saldo)
    if (recebedor) p.set('recebedor', recebedor)
    return `/api/relatorios/${tipo}?${p.toString()}`
  }, [tipo, ano, mes, status, assinatura, projetoNome, eventoNome, categoriaId, subcategoriaId, tipoPessoa, saldo, recebedor])

  const buscar = useCallback(async () => {
    if (!tipo) return
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(buildUrl())
      const json = await res.json()
      if (json.success) setDados(json.data)
      else setErro(json.error ?? 'Erro ao buscar dados')
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }, [tipo, buildUrl])

  useEffect(() => {
    if (tipo) buscar()
    else setDados(null)
  }, [tipo, buscar])

  function selectRelatorio(id: string) {
    setDados(null)
    setAno(''); setMes(''); setStatus('all'); setAssinatura('all')
    setProjetoNome(''); setEventoNome(''); setCategoriaId(''); setSubcategoriaId('')
    setTipoPessoa('all'); setSaldo('all'); setRecebedor('')
    router.push(`/relatorios?tipo=${id}`)
  }

  const hasFilter = relConfig?.filters

  // ─── Vista: Índice ─────────────────────────────────────────────────────────

  if (!tipo) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <BarChart2 className="w-6 h-6 text-navy-700" />
            <div>
              <h1 className="text-xl font-bold text-navy-900">Relatórios</h1>
              <p className="text-sm text-gray-500">Selecione um relatório para visualizar os dados</p>
            </div>
          </div>

          {/* Relatórios com IA — destaque */}
          <Link href="/relatorio-ia">
            <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-white border border-navy-200 rounded-lg hover:border-navy-400 hover:shadow-sm transition-all group">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy-700 text-white flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900 text-sm">Relatórios com IA</span>
                  <Badge text="Claude AI" color="bg-purple-50 text-purple-700" />
                </div>
                <p className="text-xs text-gray-500">Gere relatórios personalizados em linguagem natural com inteligência artificial</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-navy-700 transition-colors" />
            </div>
          </Link>

          {/* Grid de relatórios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RELATORIOS.map((rel, i) => (
              <button key={rel.id} onClick={() => selectRelatorio(rel.id)}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-navy-300 hover:shadow-sm transition-all text-left group">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 group-hover:bg-navy-50 flex-shrink-0">
                  <rel.icon className="w-4 h-4 text-gray-600 group-hover:text-navy-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-0.5">{i + 1}</div>
                  <div className="font-medium text-sm text-gray-900 group-hover:text-navy-900">{rel.label}</div>
                  <div className="text-xs text-gray-500 truncate">{rel.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-navy-400 transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Vista: Relatório selecionado ──────────────────────────────────────────

  const subcatFiltradas = categoriaId
    ? subcategorias.filter(s => s.categoriaId === categoriaId)
    : subcategorias

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/relatorios')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        {relConfig && <relConfig.icon className="w-5 h-5 text-navy-700" />}
        <div>
          <h2 className="font-semibold text-navy-900 text-sm leading-none">{relConfig?.label ?? tipo}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{relConfig?.desc}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex flex-wrap gap-2 items-end">

          {hasFilter?.includes('ano_mes') && (
            <>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-400">Ano</label>
                <select value={ano} onChange={e => setAno(e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 min-w-[90px]">
                  <option value="">Todos</option>
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-400">Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 min-w-[110px]">
                  <option value="">Todos</option>
                  {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </div>
            </>
          )}

          {hasFilter?.includes('status') && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400">
                <option value="all">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="consolidado">Consolidados</option>
              </select>
            </div>
          )}

          {hasFilter?.includes('assinatura') && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400">Assinatura</label>
              <select value={assinatura} onChange={e => setAssinatura(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400">
                <option value="all">Todos</option>
                <option value="assinado">Assinado</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
          )}

          {hasFilter?.includes('projeto_evento') && (
            <>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-400">Projeto</label>
                <select value={projetoNome} onChange={e => { setProjetoNome(e.target.value); if (e.target.value) setEventoNome('') }}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 max-w-[180px]">
                  <option value="">Todos</option>
                  {projetos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-400">Evento</label>
                <select value={eventoNome} onChange={e => { setEventoNome(e.target.value); if (e.target.value) setProjetoNome('') }}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 max-w-[180px]">
                  <option value="">Todos</option>
                  {eventos.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
                </select>
              </div>
            </>
          )}

          {hasFilter?.includes('categoria') && (
            <>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-400">Categoria</label>
                <select value={categoriaId} onChange={e => { setCategoriaId(e.target.value); setSubcategoriaId('') }}
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 max-w-[160px]">
                  <option value="">Todas</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              {subcatFiltradas.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-400">Subcategoria</label>
                  <select value={subcategoriaId} onChange={e => setSubcategoriaId(e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 max-w-[160px]">
                    <option value="">Todas</option>
                    {subcatFiltradas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {hasFilter?.includes('tipo_pessoa') && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400">Tipo</label>
              <select value={tipoPessoa} onChange={e => setTipoPessoa(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400">
                <option value="all">Todos (CLT + PJ)</option>
                <option value="pf">Somente CLT</option>
                <option value="pj">Somente PJ</option>
              </select>
            </div>
          )}

          {hasFilter?.includes('saldo') && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400">Saldo</label>
              <select value={saldo} onChange={e => setSaldo(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400">
                <option value="all">Todos</option>
                <option value="zero">Saldo R$ 0,00</option>
                <option value="negativo">Saldo negativo</option>
              </select>
            </div>
          )}

          {hasFilter?.includes('recebedor') && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400">Recebedor</label>
              <select value={recebedor} onChange={e => setRecebedor(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-800 bg-white focus:outline-none focus:border-navy-400 max-w-[200px]">
                <option value="">Todos</option>
                {recebedores.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <button onClick={buscar} disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-white rounded text-sm font-medium hover:bg-navy-800 disabled:opacity-50 transition-colors mt-auto">
            {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
            Filtrar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-6 py-4 max-w-5xl">
        {erro && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-4 py-3 mb-4">{erro}</div>
        )}

        {carregando && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando dados...
          </div>
        )}

        {!carregando && dados && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">{dados.length} registro{dados.length !== 1 ? 's' : ''}</span>
              {tipo === 'receitas' && dados.length > 0 && (
                <span className="text-xs font-semibold text-green-700 ml-2">
                  Total: {fmtMoney(dados.reduce((s: number, d: { valor: number }) => s + (d.valor ?? 0), 0))}
                </span>
              )}
              {tipo === 'despesas' && dados.length > 0 && (
                <span className="text-xs font-semibold text-red-700 ml-2">
                  Total: {fmtMoney(dados.reduce((s: number, d: { valor: number }) => s + (d.valor ?? 0), 0))}
                </span>
              )}
              {tipo === 'recibos' && dados.length > 0 && (
                <span className="text-xs font-semibold text-gray-700 ml-2">
                  Total: {fmtMoney(dados.reduce((s: number, d: { valor: number }) => s + (d.valor ?? 0), 0))}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {renderCards(tipo, dados)}
            </div>
          </>
        )}

        {!carregando && dados === null && tipo && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <Clock className="w-5 h-5" /> Aguardando carregamento...
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Wrapper com Suspense ─────────────────────────────────────────────────────

export default function RelatoriosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <RelatoriosInner />
    </Suspense>
  )
}
