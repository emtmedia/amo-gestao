'use client'
import { useState, useEffect, useRef } from 'react'
import {
  BookOpen, ChevronRight, Home, TrendingUp, TrendingDown,
  FolderOpen, Calendar, Handshake, PieChart, Briefcase,
  Building2, FileText, Sparkles, Settings, Users, CreditCard,
  MapPin, Package, AlertCircle, CheckCircle2, Lock, Crown,
  Shield, User, ArrowRight, Info, AlertTriangle, Star
} from 'lucide-react'

// ─── COMPONENTS ────────────────────────────────────────────
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">{children}</section>
}

function SectionTitle({ icon: Icon, color, title, subtitle }: { icon: React.ElementType; color: string; title: string; subtitle?: string }) {
  return (
    <div className={`flex items-center gap-3 mb-4 pb-3 border-b-2 ${color}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('border-', 'bg-').replace('-400', '-100').replace('-500', '-100')}`}>
        <Icon className={`w-5 h-5 ${color.replace('border-', 'text-').replace('-400', '-600').replace('-500', '-600')}`} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-navy-800">{title}</h2>
        {subtitle && <p className="text-sm text-navy-500">{subtitle}</p>}
      </div>
    </div>
  )
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'tip' | 'important'; children: React.ReactNode }) {
  const styles = {
    info:      { bg: 'bg-blue-50 border-blue-300',   icon: Info,           iconColor: 'text-blue-500',   label: 'Informação' },
    warning:   { bg: 'bg-amber-50 border-amber-300', icon: AlertTriangle,  iconColor: 'text-amber-500',  label: 'Atenção' },
    tip:       { bg: 'bg-green-50 border-green-300', icon: Star,           iconColor: 'text-green-500',  label: 'Dica' },
    important: { bg: 'bg-red-50 border-red-300',     icon: AlertCircle,    iconColor: 'text-red-500',    label: 'Importante' },
  }
  const s = styles[type]
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${s.bg} my-3`}>
      <s.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.iconColor}`} />
      <div className="text-sm text-navy-700">{children}</div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-navy-700 text-white flex items-center justify-center text-xs font-bold">{n}</div>
      <div>
        <p className="font-semibold text-navy-800 text-sm mb-1">{title}</p>
        <div className="text-sm text-navy-600">{children}</div>
      </div>
    </div>
  )
}

function MockModal({ title, fields, note }: { title: string; fields: { label: string; placeholder?: string; required?: boolean; type?: 'select' | 'textarea' | 'input' | 'currency' | 'date' }[]; note?: string }) {
  return (
    <div className="border border-cream-300 rounded-2xl shadow-lg bg-white overflow-hidden my-4 max-w-lg">
      <div className="bg-navy-800 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-cream-300 text-lg leading-none cursor-default">×</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {fields.map((f, i) => (
          <div key={i} className={`${f.type === 'textarea' ? 'col-span-2' : ''}`}>
            <label className="block text-xs font-medium text-navy-600 mb-1">
              {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <div className="h-12 rounded-lg border border-cream-300 bg-cream-50 px-2 py-1 text-xs text-navy-300">{f.placeholder || ''}</div>
            ) : f.type === 'select' ? (
              <div className="h-8 rounded-lg border border-cream-300 bg-cream-50 px-2 flex items-center justify-between text-xs text-navy-300">
                <span>{f.placeholder || 'Selecione...'}</span>
                <ChevronRight className="w-3 h-3 rotate-90" />
              </div>
            ) : f.type === 'currency' ? (
              <div className="h-8 rounded-lg border border-cream-300 bg-cream-50 px-2 flex items-center text-xs text-navy-300">
                <span className="text-navy-400 mr-1">R$</span> {f.placeholder || '0,00'}
              </div>
            ) : f.type === 'date' ? (
              <div className="h-8 rounded-lg border border-cream-300 bg-cream-50 px-2 flex items-center text-xs text-navy-300">
                <span>{f.placeholder || 'DD/MM/AAAA'}</span>
              </div>
            ) : (
              <div className="h-8 rounded-lg border border-cream-300 bg-cream-50 px-2 flex items-center text-xs text-navy-300">{f.placeholder || ''}</div>
            )}
          </div>
        ))}
      </div>
      {note && <div className="px-4 pb-3 text-xs text-navy-400 italic">{note}</div>}
      <div className="px-4 py-3 border-t border-cream-200 flex justify-end gap-2">
        <div className="h-7 px-3 rounded-lg border border-cream-300 flex items-center text-xs text-navy-500">Cancelar</div>
        <div className="h-7 px-3 rounded-lg bg-navy-700 flex items-center text-xs text-white">Salvar</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'em_curso' | 'consolidado' | 'pendente' }) {
  const map = {
    em_curso:   { label: 'Em Curso',                 cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    consolidado:{ label: 'Encerrado & Consolidado',  cls: 'bg-green-100 text-green-800 border-green-200' },
    pendente:   { label: 'Encerrado & Pendente $',   cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  }
  const s = map[status]
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
}

function RoleBadge({ role }: { role: 'superadmin' | 'admin' | 'user' }) {
  const map = {
    superadmin: { label: 'SuperAdmin', cls: 'bg-amber-100 text-amber-800', icon: Crown },
    admin:      { label: 'Admin',      cls: 'bg-purple-100 text-purple-700', icon: Shield },
    user:       { label: 'Usuário',    cls: 'bg-blue-100 text-blue-700', icon: User },
  }
  const s = map[role]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      <s.icon className="w-3 h-3" /> {s.label}
    </span>
  )
}

// ─── INDEX DATA ─────────────────────────────────────────────
const INDEX = [
  { id: 'intro',        label: 'Bem-vindo',               icon: Home },
  { id: 'filosofia',    label: 'Filosofia do Sistema',     icon: BookOpen },
  { id: 'perfis',       label: 'Perfis de Acesso',         icon: Users },
  { id: 'configuracao', label: 'Configuração Inicial',     icon: Settings },
  { id: 'projetos',     label: 'Projetos de Filantropia',  icon: FolderOpen },
  { id: 'eventos',      label: 'Eventos',                  icon: Calendar },
  { id: 'receitas',     label: 'Receitas',                 icon: TrendingUp },
  { id: 'despesas',     label: 'Despesas',                 icon: TrendingDown },
  { id: 'fornecedores', label: 'Fornecedores',             icon: Handshake },
  { id: 'colaboradores',label: 'Colaboradores',            icon: Briefcase },
  { id: 'imoveis',      label: 'Imóveis',                  icon: Building2 },
  { id: 'consolidacoes',label: 'Consolidações',            icon: PieChart },
  { id: 'status',       label: 'Status & Ciclo de Vida',   icon: CheckCircle2 },
  { id: 'documentos',   label: 'Biblioteca de Documentos', icon: FileText },
  { id: 'ia',           label: 'Relatórios com IA',        icon: Sparkles },
  { id: 'indice',       label: 'Índice Remissivo',         icon: BookOpen },
]

// ─── PAGE ────────────────────────────────────────────────────
export default function GuiaPage() {
  const [active, setActive] = useState('intro')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handler = () => {
      const sections = el.querySelectorAll('section[id]')
      let current = 'intro'
      sections.forEach(s => {
        if ((s as HTMLElement).offsetTop - 100 <= el.scrollTop) current = s.id
      })
      setActive(current)
    }
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── SIDEBAR DE ÍNDICE ── */}
      <aside className="w-60 flex-shrink-0 border-r border-cream-200 bg-cream-50 overflow-y-auto py-4">
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-navy-500" />
            <span className="text-xs font-bold text-navy-600 uppercase tracking-wider">Índice</span>
          </div>
        </div>
        <nav className="space-y-0.5 px-2">
          {INDEX.map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-all
                ${active === item.id
                  ? 'bg-navy-700 text-white'
                  : 'text-navy-600 hover:bg-cream-200'}`}
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── CONTEÚDO ── */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-12">

          {/* ── 1. BEM-VINDO ── */}
          <Section id="intro">
            <div className="text-center py-8 px-4 bg-gradient-to-br from-navy-800 to-navy-600 rounded-2xl text-white mb-6">
              <div className="text-5xl mb-3">🕊️</div>
              <h1 className="text-3xl font-bold mb-2">AMO Gestão</h1>
              <p className="text-cream-200 text-base max-w-md mx-auto">
                Sistema de Gestão da Associação Missionária Ômega
              </p>
              <p className="text-cream-300 text-sm mt-3">
                Guia completo do usuário · Versão 1.0
              </p>
            </div>
            <p className="text-navy-600 leading-relaxed">
              Bem-vindo ao <strong>AMO Gestão</strong>. Este guia apresenta toda a filosofia, lógica de funcionamento e instruções passo a passo para o uso correto do sistema. Leia as seções na ordem apresentada para ter a melhor experiência, especialmente se você é um novo usuário.
            </p>
          </Section>

          {/* ── 2. FILOSOFIA ── */}
          <Section id="filosofia">
            <SectionTitle icon={BookOpen} color="border-navy-400" title="Filosofia do Sistema" subtitle="Como o AMO Gestão pensa e organiza os dados" />

            <p className="text-sm text-navy-600 leading-relaxed mb-4">
              O AMO Gestão foi construído sobre um <strong>fluxo hierárquico de dados</strong>: tudo começa com cadastros base que sustentam os cadastros operacionais, que por sua vez alimentam os registros financeiros, que culminam nas consolidações.
            </p>

            <div className="bg-cream-50 rounded-2xl p-5 border border-cream-200 mb-4">
              <p className="text-xs font-bold text-navy-500 uppercase tracking-wider mb-3">Hierarquia de dados</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: '1. Cadastros Base', desc: 'Departamentos, Contas Bancárias, UF/Cidades', color: 'bg-navy-100 border-navy-300 text-navy-800' },
                  { label: '2. Tabelas Auxiliares', desc: 'Tipos, métodos, categorias de apoio', color: 'bg-blue-100 border-blue-300 text-blue-800' },
                  { label: '3. Fornecedores', desc: 'Quem fornece serviços e produtos', color: 'bg-purple-100 border-purple-300 text-purple-800' },
                  { label: '4. Projetos & Eventos', desc: 'Unidades operacionais da AMO', color: 'bg-green-100 border-green-300 text-green-800' },
                  { label: '5. Receitas & Despesas', desc: 'Movimentações financeiras vinculadas', color: 'bg-amber-100 border-amber-300 text-amber-800' },
                  { label: '6. Consolidações', desc: 'Encerramento formal e balanço final', color: 'bg-red-100 border-red-300 text-red-800' },
                ].map((item, i, arr) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${item.color}`}>
                      <span>{item.label}</span>
                      <span className="opacity-60">— {item.desc}</span>
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-navy-300 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>

            <Callout type="important">
              <strong>Regra fundamental:</strong> Sempre cadastre os dados na ordem acima. Tentar registrar uma despesa sem ter fornecedores cadastrados ou uma receita sem conta bancária resultará em listas vazias nos campos obrigatórios.
            </Callout>
          </Section>

          {/* ── 3. PERFIS ── */}
          <Section id="perfis">
            <SectionTitle icon={Users} color="border-amber-400" title="Perfis de Acesso" subtitle="Quem pode fazer o quê no sistema" />

            <div className="space-y-4 mb-4">
              {[
                {
                  role: 'superadmin' as const,
                  limit: '1 perfil',
                  desc: 'Controle total do sistema. Pode criar Admins e Usuários, reabrir projetos consolidados com senha, gerenciar todos os usuários e acessar documentos restritos.',
                  perms: ['Criar perfis Admin e Usuário', 'Reabrir eventos E projetos consolidados', 'Excluir qualquer usuário abaixo', 'Ver documentos restritos'],
                },
                {
                  role: 'admin' as const,
                  limit: 'até 3 perfis',
                  desc: 'Gestão operacional. Pode criar Usuários, reabrir apenas eventos consolidados com senha e acessar documentos restritos.',
                  perms: ['Criar apenas perfis Usuário', 'Reabrir eventos consolidados (não projetos)', 'Ativar/desativar usuários', 'Ver documentos restritos'],
                },
                {
                  role: 'user' as const,
                  limit: 'até 12 perfis',
                  desc: 'Acesso operacional completo. Pode cadastrar e editar todos os módulos, mas não gerencia usuários nem reabre itens consolidados.',
                  perms: ['Todos os cadastros operacionais', 'Receitas, despesas e aquisições', 'Documentos de acesso livre', 'Não cria nem gerencia usuários'],
                },
              ].map(p => (
                <div key={p.role} className="border border-cream-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <RoleBadge role={p.role} />
                    <span className="text-xs text-navy-400 bg-cream-100 px-2 py-0.5 rounded-full">{p.limit}</span>
                  </div>
                  <p className="text-sm text-navy-600 mb-2">{p.desc}</p>
                  <ul className="space-y-1">
                    {p.perms.map((perm, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-navy-500">
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /> {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Callout type="tip">
              O primeiro usuário cadastrado no sistema é automaticamente promovido a <strong>SuperAdmin</strong>. Todos os usuários subsequentes são criados pelo SuperAdmin ou Admin conforme a hierarquia.
            </Callout>
          </Section>

          {/* ── 4. CONFIGURAÇÃO INICIAL ── */}
          <Section id="configuracao">
            <SectionTitle icon={Settings} color="border-blue-400" title="Configuração Inicial" subtitle="O que cadastrar antes de começar a operar" />

            <Callout type="warning">
              Esta etapa é obrigatória. Sem os dados abaixo, os campos suspensos dos demais módulos aparecerão vazios.
            </Callout>

            <div className="space-y-6 mt-4">

              <div>
                <h3 className="font-bold text-navy-700 text-sm mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-navy-700 text-white rounded-full flex items-center justify-center text-xs">1</span>
                  Cadastros Base
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {[
                    { icon: Building2, label: 'Departamentos', desc: 'Unidades organizacionais da AMO que supervisionam projetos.' },
                    { icon: CreditCard, label: 'Contas Bancárias', desc: 'Todas as contas que recebem receitas ou pagam despesas.' },
                    { icon: MapPin, label: 'UF & Cidades', desc: 'Estados e municípios usados em projetos, eventos e contratos.' },
                    { icon: Users, label: 'Voluntários AMO', desc: 'Base de voluntários que poderão ser vinculados a projetos e eventos.' },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2 p-3 bg-cream-50 rounded-xl border border-cream-200">
                      <item.icon className="w-4 h-4 text-navy-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-navy-700">{item.label}</p>
                        <p className="text-xs text-navy-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <MockModal
                  title="Nova Conta Bancária"
                  fields={[
                    { label: 'Tipo', type: 'select', placeholder: 'Corrente / Poupança / Investimento', required: true },
                    { label: 'Banco', placeholder: 'Ex: Banco do Brasil', required: true },
                    { label: 'Agência', placeholder: '0001', required: true },
                    { label: 'Número da Conta', placeholder: '12345-6', required: true },
                    { label: 'Descrição', placeholder: 'Ex: Conta principal AMO' },
                  ]}
                  note="Cadastre todas as contas antes de criar receitas ou despesas."
                />
              </div>

              <div>
                <h3 className="font-bold text-navy-700 text-sm mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-navy-700 text-white rounded-full flex items-center justify-center text-xs">2</span>
                  Tabelas Auxiliares
                </h3>
                <p className="text-sm text-navy-600 mb-3">
                  Acesse <strong>Tabelas Auxiliares</strong> no menu e cadastre os itens de apoio necessários para os outros módulos:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'Métodos de Transferência (PIX, TED, Boleto…)',
                    'Tipos de Item de Aquisição',
                    'Condições de Receita',
                    'Cargos e Funções (para colaboradores)',
                    'Tipos de serviços (consumo, digital, manutenção)',
                    'Itens de copa e equipamentos alugados',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
                      <ChevronRight className="w-3 h-3 flex-shrink-0" /> {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-navy-700 text-sm mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-navy-700 text-white rounded-full flex items-center justify-center text-xs">3</span>
                  Fornecedores
                </h3>
                <p className="text-sm text-navy-600 mb-3">
                  Cadastre <strong>Categorias → Subcategorias → Fornecedores</strong> nesta ordem. Os fornecedores aparecem nos modais de despesas e aquisições.
                </p>
                <MockModal
                  title="Novo Fornecedor"
                  fields={[
                    { label: 'Nome do Fornecedor', required: true, placeholder: 'Ex: Gráfica Central Ltda' },
                    { label: 'Categoria', type: 'select', placeholder: 'Serviços Gráficos', required: true },
                    { label: 'Subcategoria', type: 'select', placeholder: 'Impressão Digital' },
                    { label: 'Telefone', placeholder: '(11) 99999-9999' },
                    { label: 'E-mail', placeholder: 'contato@fornecedor.com' },
                    { label: 'Site', placeholder: 'https://...' },
                  ]}
                />
              </div>
            </div>
          </Section>

          {/* ── 5. PROJETOS ── */}
          <Section id="projetos">
            <SectionTitle icon={FolderOpen} color="border-green-400" title="Projetos de Filantropia" subtitle="Unidades de trabalho de médio/longo prazo da AMO" />

            <p className="text-sm text-navy-600 mb-4">
              Um <strong>Projeto de Filantropia</strong> é uma iniciativa com início, fim e orçamento definidos, supervisionada por um departamento. Projetos podem conter múltiplos eventos e voluntários.
            </p>

            <MockModal
              title="Novo Projeto de Filantropia"
              fields={[
                { label: 'Nome do Projeto', required: true, placeholder: 'Ex: Missão Norte 2025' },
                { label: 'Data de Início', type: 'date', required: true },
                { label: 'Data de Encerramento', type: 'date', required: true },
                { label: 'Responsável', required: true, placeholder: 'Nome do responsável' },
                { label: 'Telefone', required: true, placeholder: '(11) 99999-9999' },
                { label: 'Orçamento Estimado', type: 'currency', required: true },
                { label: 'Conta Bancária 1', type: 'select', required: true, placeholder: 'Selecione a conta...' },
                { label: 'Conta Bancária 2', type: 'select', placeholder: 'Opcional' },
                { label: 'Estado (UF)', type: 'select', required: true, placeholder: 'Selecione o estado...' },
                { label: 'Cidade', type: 'select', required: true, placeholder: 'Selecione a cidade...' },
                { label: 'Departamento', type: 'select', placeholder: 'Sem departamento' },
                { label: 'Comentários', type: 'textarea', placeholder: 'Observações gerais' },
              ]}
              note="Selecione o estado antes da cidade — a lista de cidades é carregada dinamicamente."
            />

            <Callout type="tip">
              Após criar o projeto, vincule <strong>voluntários</strong> em <em>Projetos &gt; Voluntários do Projeto</em> e crie os <strong>eventos</strong> vinculados a ele em <em>Eventos</em>.
            </Callout>
          </Section>

          {/* ── 6. EVENTOS ── */}
          <Section id="eventos">
            <SectionTitle icon={Calendar} color="border-purple-400" title="Eventos" subtitle="Ações pontuais, vinculadas a projetos ou avulsas" />

            <p className="text-sm text-navy-600 mb-4">
              Eventos podem ser <strong>vinculados a um projeto</strong> (fazem parte de uma iniciativa maior) ou <strong>avulsos</strong> (independentes). Todo evento tem orçamento, responsável, localização e datas.
            </p>

            <MockModal
              title="Novo Evento"
              fields={[
                { label: 'Projeto Vinculado', type: 'select', placeholder: 'Evento Avulso (sem projeto)' },
                { label: 'Nome do Evento', required: true, placeholder: 'Ex: Culto de Missões 2025' },
                { label: 'Data de Início', type: 'date', required: true },
                { label: 'Data de Encerramento', type: 'date', required: true },
                { label: 'Responsável', required: true, placeholder: 'Nome do responsável' },
                { label: 'Telefone', required: true, placeholder: '(11) 99999-9999' },
                { label: 'Orçamento Estimado', type: 'currency', required: true },
                { label: 'Conta Bancária 1', type: 'select', required: true },
                { label: 'Estado (UF)', type: 'select', required: true },
                { label: 'Cidade', type: 'select', required: true },
                { label: 'Link Google Maps', required: true, placeholder: 'https://maps.google.com/...' },
                { label: 'Nº de Voluntários', placeholder: '0' },
              ]}
            />

            <Callout type="info">
              Eventos com status <strong>"Encerrado & Consolidado"</strong> não aparecem nos menus suspensos de outros módulos. Projetos consolidados também ficam ocultos na lista de projetos vinculáveis.
            </Callout>
          </Section>

          {/* ── 7. RECEITAS ── */}
          <Section id="receitas">
            <SectionTitle icon={TrendingUp} color="border-emerald-400" title="Receitas" subtitle="Entradas financeiras da AMO — 8 categorias" />

            <p className="text-sm text-navy-600 mb-4">
              Toda entrada financeira deve ser categorizada. Cada tipo tem campos específicos, mas todos compartilham: <strong>data de entrada, conta bancária, método de transferência e valor</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Receita Pública', desc: 'Municipal, Estadual ou Federal', icon: '🏛️' },
                { label: 'Pessoa Física', desc: 'Contribuintes individuais', icon: '👤' },
                { label: 'Pessoa Jurídica', desc: 'Empresas doadoras', icon: '🏢' },
                { label: 'Cursos/Treinamentos', desc: 'Inscrições em cursos da AMO', icon: '📚' },
                { label: 'Produtos', desc: 'Venda de produtos', icon: '📦' },
                { label: 'Serviços', desc: 'Serviços prestados pela AMO', icon: '🔧' },
                { label: 'Eventos com Bilheteria', desc: 'Arrecadação em eventos', icon: '🎟️' },
                { label: 'Outras Receitas', desc: 'Demais entradas financeiras', icon: '💰' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-green-800">{item.label}</p>
                    <p className="text-xs text-green-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <MockModal
              title="Nova Receita — Pessoa Física"
              fields={[
                { label: 'Nome do Contribuinte', required: true, placeholder: 'Nome completo' },
                { label: 'Telefone', required: true, placeholder: '(11) 99999-9999' },
                { label: 'E-mail', placeholder: 'email@email.com' },
                { label: 'Data de Entrada', type: 'date', required: true },
                { label: 'Conta Bancária', type: 'select', required: true },
                { label: 'Valor da Contribuição', type: 'currency', required: true },
                { label: 'Método de Transferência', type: 'select', required: true, placeholder: 'PIX, TED, Boleto...' },
                { label: 'Projeto Direcionado', type: 'select', placeholder: 'Opcional' },
              ]}
            />

            <Callout type="tip">
              Os campos <strong>Projeto Direcionado</strong> e <strong>Evento Direcionado</strong> são opcionais e permitem rastrear para onde cada receita foi destinada.
            </Callout>
          </Section>

          {/* ── 8. DESPESAS ── */}
          <Section id="despesas">
            <SectionTitle icon={TrendingDown} color="border-red-400" title="Despesas" subtitle="Saídas financeiras — 7 categorias + Aquisições" />

            <p className="text-sm text-navy-600 mb-4">
              Cada despesa precisa ter um <strong>fornecedor cadastrado</strong>, data de pagamento, conta bancária de débito e método de transferência.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Contas de Consumo', desc: 'Energia, água, telefone, internet', icon: '⚡' },
                { label: 'Serviços Digitais', desc: 'Plataformas, softwares, assinaturas', icon: '💻' },
                { label: 'Conservação/Zeladoria', desc: 'Manutenção e limpeza', icon: '🔨' },
                { label: 'Locação de Equipamentos', desc: 'Aluguel de itens e equipamentos', icon: '🎤' },
                { label: 'Serviços Externos', desc: 'Terceirizados e prestadores', icon: '🤝' },
                { label: 'Copa e Cozinha', desc: 'Alimentação e itens de copa', icon: '☕' },
                { label: 'Aquisições', desc: 'Compra de bens patrimoniais', icon: '🛒' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="text-base">{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-red-800">{item.label}</p>
                    <p className="text-xs text-red-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <MockModal
              title="Nova Aquisição"
              fields={[
                { label: 'Descrição', required: true, placeholder: 'Ex: Notebook Dell Inspiron', type: 'textarea' },
                { label: 'Tipo de Item', type: 'select', required: true, placeholder: 'Equipamento de TI, Mobiliário...' },
                { label: 'Fornecedor', type: 'select', placeholder: 'Selecione o fornecedor' },
                { label: 'Valor da Aquisição', type: 'currency', required: true },
                { label: 'Data da Aquisição', type: 'date', required: true },
                { label: 'Conta de Débito', type: 'select', required: true },
                { label: 'Método de Transferência', type: 'select', required: true },
                { label: 'Modalidade de Pagamento', type: 'select', required: true, placeholder: 'À vista / À prazo' },
              ]}
              note="Se 'À prazo', um campo adicional para número de parcelas será exibido."
            />
          </Section>

          {/* ── 9. FORNECEDORES ── */}
          <Section id="fornecedores">
            <SectionTitle icon={Handshake} color="border-violet-400" title="Fornecedores" subtitle="Gestão de prestadores de serviços e produtos" />

            <p className="text-sm text-navy-600 mb-3">
              O módulo de fornecedores tem <strong>três níveis hierárquicos</strong> que devem ser preenchidos nesta ordem:
            </p>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {['1. Categorias', '→', '2. Subcategorias', '→', '3. Fornecedores'].map((item, i) => (
                <span key={i} className={item === '→' ? 'text-navy-300 font-bold' : 'px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium border border-violet-200'}>
                  {item}
                </span>
              ))}
            </div>

            <Callout type="info">
              Exemplo de hierarquia: <strong>Categoria:</strong> Serviços de TI → <strong>Subcategoria:</strong> Desenvolvimento → <strong>Fornecedor:</strong> Agência X Ltda
            </Callout>
          </Section>

          {/* ── 10. COLABORADORES ── */}
          <Section id="colaboradores">
            <SectionTitle icon={Briefcase} color="border-orange-400" title="Colaboradores" subtitle="Funcionários CLT e prestadores PJ" />

            <p className="text-sm text-navy-600 mb-4">
              Registre todos os colaboradores da AMO com seus contratos. Há dois tipos de vínculo:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="font-bold text-orange-800 text-sm mb-1">👷 Colaborador CLT</p>
                <p className="text-xs text-orange-700">Carteira assinada, salário fixo, benefícios (vale-transporte, alimentação, plano de saúde).</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <p className="font-bold text-orange-800 text-sm mb-1">🏢 Colaborador PJ</p>
                <p className="text-xs text-orange-700">Pessoa jurídica (CNPJ), contrato por medição mensal, sem benefícios CLT.</p>
              </div>
            </div>

            <Callout type="tip">
              Antes de cadastrar colaboradores, certifique-se de ter cadastrado <strong>Cargos</strong> e <strong>Funções</strong> nas <em>Tabelas Auxiliares</em>.
            </Callout>
          </Section>

          {/* ── 11. IMÓVEIS ── */}
          <Section id="imoveis">
            <SectionTitle icon={Building2} color="border-teal-400" title="Imóveis" subtitle="Contratos de locação imobiliária" />

            <p className="text-sm text-navy-600 mb-4">
              Registre todos os contratos de aluguel de imóveis utilizados pela AMO. Cada contrato inclui endereço, locador, duração, valor e finalidade.
            </p>

            <MockModal
              title="Novo Contrato de Locação"
              fields={[
                { label: 'Tipo de Imóvel', type: 'select', required: true, placeholder: 'Sala comercial, Casa, Galpão...' },
                { label: 'Locado Para', type: 'select', required: true, placeholder: 'Departamento ou finalidade' },
                { label: 'Endereço (Rua)', required: true, placeholder: 'Rua das Flores' },
                { label: 'Número', required: true, placeholder: '123' },
                { label: 'Bairro', required: true, placeholder: 'Centro' },
                { label: 'Estado (UF)', type: 'select', required: true },
                { label: 'Cidade', type: 'select', required: true },
                { label: 'Nome do Locador', required: true, placeholder: 'Nome do proprietário' },
                { label: 'Data de Início', type: 'date', required: true },
                { label: 'Valor da Locação', type: 'currency', required: true },
                { label: 'Duração (meses)', required: true, placeholder: '12' },
                { label: 'Propósito de Locação', type: 'select', required: true },
              ]}
            />
          </Section>

          {/* ── 12. CONSOLIDAÇÕES ── */}
          <Section id="consolidacoes">
            <SectionTitle icon={PieChart} color="border-indigo-400" title="Consolidações" subtitle="Encerramento formal de projetos e eventos" />

            <p className="text-sm text-navy-600 mb-4">
              A consolidação é o processo de <strong>encerramento oficial</strong> de um projeto ou evento. Ela registra o balanço final, lições aprendidas e, se necessário, o ajuste financeiro para cobrir déficits.
            </p>

            <div className="space-y-4 mb-4">
              <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50">
                <p className="font-bold text-indigo-800 text-sm mb-2">Seção I — Identificação</p>
                <p className="text-xs text-indigo-700">Selecione o projeto/evento e informe a <strong>data real de conclusão</strong> (pode diferir da data planejada).</p>
              </div>
              <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50">
                <p className="font-bold text-indigo-800 text-sm mb-2">Seção II — Avaliação Qualitativa</p>
                <p className="text-xs text-indigo-700">Preencha: considerações gerais, pendências, ações positivas além do escopo e lições aprendidas.</p>
              </div>
              <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50">
                <p className="font-bold text-indigo-800 text-sm mb-2">Seção III — Financeiro</p>
                <p className="text-xs text-indigo-700">
                  Marque <strong>"Saldo ≥ R$0,00"</strong> se o saldo for positivo. Caso contrário, preencha o método de ajuste, operador responsável, conta receptora e data limite para quitação do déficit.
                </p>
              </div>
            </div>

            <Callout type="important">
              Após a consolidação, o projeto ou evento muda de status e <strong>não pode mais ser editado diretamente</strong>. Para reabrir, um Admin (eventos) ou SuperAdmin (projetos) deve confirmar com senha.
            </Callout>

            <div className="p-4 bg-cream-50 rounded-xl border border-cream-200 mt-3">
              <p className="text-xs font-bold text-navy-600 mb-2 uppercase tracking-wide">Como reabrir um item consolidado</p>
              <div className="space-y-2">
                <Step n={1} title="Clique no ícone de edição">O sistema detecta que o item está consolidado.</Step>
                <Step n={2} title="Modal de confirmação de senha">Digite sua senha para autorizar a reabertura.</Step>
                <Step n={3} title="Edite e recadastre a consolidação">O item volta ao status "Em Curso" e deve ser reconsolidado após os ajustes.</Step>
              </div>
            </div>
          </Section>

          {/* ── 13. STATUS ── */}
          <Section id="status">
            <SectionTitle icon={CheckCircle2} color="border-green-400" title="Status & Ciclo de Vida" subtitle="Como projetos e eventos transitam entre estados" />

            <p className="text-sm text-navy-600 mb-4">
              Todo projeto e evento possui um <strong>status automático</strong> calculado com base na existência de consolidação e no saldo final:
            </p>

            <div className="space-y-3 mb-4">
              {[
                { status: 'em_curso' as const,    desc: 'Sem consolidação registrada. O projeto/evento está ativo e operacional.', action: 'Edição livre por qualquer usuário.' },
                { status: 'consolidado' as const, desc: 'Consolidado com saldo ≥ R$0,00. Encerrado sem pendências financeiras.', action: 'Linha verde na tabela. Edição requer senha (Admin para eventos, SuperAdmin para projetos).' },
                { status: 'pendente' as const,    desc: 'Consolidado com saldo negativo. Há ajuste financeiro pendente.', action: 'Linha âmbar na tabela. Mesmo controle de edição.' },
              ].map(item => (
                <div key={item.status} className="flex items-start gap-3 p-3 border border-cream-200 rounded-xl">
                  <StatusBadge status={item.status} />
                  <div className="flex-1">
                    <p className="text-xs text-navy-600 mb-1">{item.desc}</p>
                    <p className="text-xs text-navy-400 italic">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-cream-200 rounded-2xl overflow-hidden">
              <div className="bg-cream-100 px-3 py-2 text-xs font-bold text-navy-600 uppercase tracking-wide">Exemplo visual da tabela de Eventos</div>
              <div className="divide-y divide-cream-100">
                {[
                  { nome: 'Culto de Missões 2024', status: 'consolidado' as const },
                  { nome: 'Retiro Jovens 2025',    status: 'em_curso' as const },
                  { nome: 'Bazaar Solidário 2024', status: 'pendente' as const },
                ].map(row => (
                  <div key={row.nome} className={`flex items-center justify-between px-3 py-2 text-xs
                    ${row.status === 'consolidado' ? 'bg-green-50/50' : row.status === 'pendente' ? 'bg-amber-50/50' : 'bg-white'}`}>
                    <span className="font-medium text-navy-700">{row.nome}</span>
                    <StatusBadge status={row.status} />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── 14. DOCUMENTOS ── */}
          <Section id="documentos">
            <SectionTitle icon={FileText} color="border-sky-400" title="Biblioteca de Documentos" subtitle="Repositório central de documentos da AMO" />

            <p className="text-sm text-navy-600 mb-4">
              Armazene e organize todos os documentos institucionais da AMO com categorias, tags, versão, status e vigência.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Acesso Livre', desc: 'Visível para todos os usuários', icon: '🔓' },
                { label: 'Acesso Restrito', desc: 'Apenas Admin e SuperAdmin', icon: '🔒' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-3 bg-sky-50 rounded-xl border border-sky-100">
                  <span>{item.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-sky-800">{item.label}</p>
                    <p className="text-xs text-sky-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Callout type="tip">
              Use <strong>tags</strong> para facilitar a busca. Configure a <strong>data de revisão</strong> para documentos que precisam de atualização periódica.
            </Callout>
          </Section>

          {/* ── 15. IA ── */}
          <Section id="ia">
            <SectionTitle icon={Sparkles} color="border-pink-400" title="Relatórios com IA" subtitle="Análise inteligente dos dados do sistema" />

            <p className="text-sm text-navy-600 mb-4">
              O módulo de IA permite fazer perguntas em linguagem natural sobre os dados do sistema e obter análises, resumos e insights automáticos.
            </p>

            <div className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-100 mb-4">
              <p className="text-xs font-bold text-pink-700 mb-2">Exemplos de perguntas que você pode fazer:</p>
              <ul className="space-y-1.5">
                {[
                  '"Qual foi o total de receitas em 2025?"',
                  '"Liste os eventos com saldo negativo."',
                  '"Quais fornecedores receberam mais pagamentos?"',
                  '"Resuma as lições aprendidas dos projetos consolidados."',
                ].map((q, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-purple-700">
                    <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0 text-pink-400" /> {q}
                  </li>
                ))}
              </ul>
            </div>

            <Callout type="info">
              O módulo abre em uma <strong>nova aba</strong> do navegador. Requer que a chave <code>ANTHROPIC_API_KEY</code> esteja configurada no arquivo <code>.env</code>.
            </Callout>
          </Section>

          {/* ── 16. ÍNDICE REMISSIVO ── */}
          <Section id="indice">
            <SectionTitle icon={BookOpen} color="border-navy-400" title="Índice Remissivo" subtitle="Encontre rapidamente qualquer funcionalidade" />

            <div className="columns-2 gap-6 text-sm">
              {[
                { letra: 'A', itens: [
                  { t: 'Aquisições', d: 'Despesas → Aquisições' },
                  { t: 'Acesso restrito (documentos)', d: 'Biblioteca de Documentos' },
                  { t: 'Ajuste financeiro', d: 'Consolidações → Seção III' },
                ]},
                { letra: 'C', itens: [
                  { t: 'Cargos e funções', d: 'Tabelas Auxiliares' },
                  { t: 'Cidades', d: 'Cadastros Base → UF & Cidades' },
                  { t: 'CLT (colaboradores)', d: 'Colaboradores → CLT' },
                  { t: 'Contas bancárias', d: 'Cadastros Base' },
                  { t: 'Consolidação de eventos', d: 'Consolidações → Eventos' },
                  { t: 'Consolidação de projetos', d: 'Consolidações → Projetos' },
                ]},
                { letra: 'D', itens: [
                  { t: 'Departamentos', d: 'Cadastros Base' },
                  { t: 'Despesas de consumo', d: 'Despesas → Contas de Consumo' },
                  { t: 'Documentos restritos', d: 'Biblioteca de Documentos' },
                ]},
                { letra: 'E', itens: [
                  { t: 'Encerrado & Consolidado', d: 'Status & Ciclo de Vida' },
                  { t: 'Encerrado & Pendente $', d: 'Status & Ciclo de Vida' },
                  { t: 'Eventos avulsos', d: 'Eventos; Consolidações → Eventos' },
                  { t: 'Eventos com bilheteria', d: 'Receitas → Eventos' },
                ]},
                { letra: 'F', itens: [
                  { t: 'Fornecedores', d: 'Fornecedores' },
                  { t: 'Funcionários CLT', d: 'Colaboradores → CLT' },
                  { t: 'Funcionários PJ', d: 'Colaboradores → PJ' },
                ]},
                { letra: 'I', itens: [
                  { t: 'IA / Relatórios', d: 'Relatórios com IA' },
                  { t: 'Imóveis / Locação', d: 'Imóveis' },
                ]},
                { letra: 'L', itens: [
                  { t: 'Lições aprendidas', d: 'Consolidações → Seção II' },
                  { t: 'Log de auditoria', d: 'Configurações → Logs de Auditoria' },
                  { t: 'Locação de equipamentos', d: 'Despesas → Locação' },
                ]},
                { letra: 'M', itens: [
                  { t: 'Métodos de transferência', d: 'Tabelas Auxiliares' },
                ]},
                { letra: 'P', itens: [
                  { t: 'Perfis de acesso', d: 'Perfis de Acesso' },
                  { t: 'PJ (colaboradores)', d: 'Colaboradores → PJ' },
                  { t: 'Projetos de filantropia', d: 'Projetos' },
                ]},
                { letra: 'R', itens: [
                  { t: 'Reabrir consolidado', d: 'Consolidações; Status & Ciclo de Vida' },
                  { t: 'Receitas públicas', d: 'Receitas → Pública' },
                ]},
                { letra: 'S', itens: [
                  { t: 'Saldo do evento/projeto', d: 'Consolidações → Seção III' },
                  { t: 'Status automático', d: 'Status & Ciclo de Vida' },
                  { t: 'SuperAdmin', d: 'Perfis de Acesso' },
                ]},
                { letra: 'T', itens: [
                  { t: 'Tabelas Auxiliares', d: 'Configuração Inicial' },
                  { t: 'Tags (documentos)', d: 'Biblioteca de Documentos' },
                ]},
                { letra: 'U', itens: [
                  { t: 'UF & Cidades', d: 'Cadastros Base' },
                  { t: 'Usuários do sistema', d: 'Configurações → Usuários' },
                ]},
                { letra: 'V', itens: [
                  { t: 'Voluntários AMO', d: 'Cadastros Base' },
                  { t: 'Voluntários do evento', d: 'Eventos → Voluntários do Evento' },
                  { t: 'Voluntários do projeto', d: 'Projetos → Voluntários do Projeto' },
                ]},
              ].map(group => (
                <div key={group.letra} className="break-inside-avoid mb-4">
                  <div className="font-bold text-navy-800 text-base border-b border-cream-200 mb-1">{group.letra}</div>
                  {group.itens.map(item => (
                    <div key={item.t} className="flex items-baseline gap-1 py-0.5">
                      <span className="text-xs text-navy-700 font-medium">{item.t}</span>
                      <span className="flex-1 border-b border-dotted border-cream-300 mx-1" />
                      <span className="text-xs text-navy-400">{item.d}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>

          <div className="text-center py-8 text-navy-400 text-xs">
            AMO Gestão · Guia do Usuário v1.0 · Associação Missionária Ômega
          </div>

        </div>
      </div>
    </div>
  )
}
