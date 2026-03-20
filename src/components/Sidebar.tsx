'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Building2, Users, FolderOpen, Calendar,
  TrendingUp, TrendingDown, Handshake, FileText,
  ChevronDown, ChevronRight, Menu, X, Settings,
  MapPin, CreditCard, Briefcase, BookOpen, Package,
  Wrench, Utensils, PieChart, Sparkles, Receipt, ClipboardList, Lock, Inbox
} from 'lucide-react'
import { usePreferences } from '@/lib/preferences'

interface NavItem {
  label: string
  icon: React.ElementType
  href?: string
  children?: NavItem[]
  newTab?: boolean
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Início', icon: Home, href: '/' },
  {
    label: 'Receitas', icon: TrendingUp,
    children: [
      { label: 'Cursos/Treinamentos', icon: BookOpen, href: '/cadastros/receitas/cursos' },
      { label: 'Eventos com Bilheteria', icon: Calendar, href: '/cadastros/receitas/eventos' },
      { label: 'Outras Receitas', icon: TrendingUp, href: '/cadastros/receitas/outras' },
      { label: 'Pessoa Física', icon: TrendingUp, href: '/cadastros/receitas/pessoa-fisica' },
      { label: 'Pessoa Jurídica', icon: TrendingUp, href: '/cadastros/receitas/pessoa-juridica' },
      { label: 'Produtos', icon: Package, href: '/cadastros/receitas/produtos' },
      { label: 'Receita Pública', icon: TrendingUp, href: '/cadastros/receitas/publica' },
      { label: 'Serviços', icon: Wrench, href: '/cadastros/receitas/servicos' },
    ]
  },
  {
    label: 'Despesas', icon: TrendingDown,
    children: [
      { label: 'Aquisições', icon: Package, href: '/cadastros/aquisicoes' },
      { label: 'Conservação/Zeladoria', icon: Wrench, href: '/cadastros/despesas/conservacao' },
      { label: 'Contas de Consumo', icon: TrendingDown, href: '/cadastros/despesas/consumo' },
      { label: 'Copa e Cozinha', icon: Utensils, href: '/cadastros/despesas/copa-cozinha' },
      { label: 'Locação de Equipamentos', icon: TrendingDown, href: '/cadastros/despesas/locacao' },
      { label: 'Serviços Digitais', icon: TrendingDown, href: '/cadastros/despesas/digital' },
      { label: 'Serviços Externos', icon: TrendingDown, href: '/cadastros/despesas/externos' },
    ]
  },
  {
    label: 'Projetos', icon: FolderOpen,
    children: [
      { label: 'Consolidação de Projetos', icon: PieChart, href: '/cadastros/consolidacoes/projetos' },
      { label: 'Extrato de Projeto', icon: FileText, href: '/cadastros/projetos/extrato' },
      { label: 'Projetos de Filantropia', icon: FolderOpen, href: '/cadastros/projetos' },
    ]
  },
  {
    label: 'Eventos', icon: Calendar,
    children: [
      { label: 'Consolidação de Eventos', icon: PieChart, href: '/cadastros/consolidacoes/eventos' },
      { label: 'Eventos', icon: Calendar, href: '/cadastros/eventos' },
      { label: 'Extrato de Evento', icon: FileText, href: '/cadastros/eventos/extrato' },
    ]
  },
  {
    label: 'Voluntários', icon: Users,
    children: [
      { label: 'Cadastro de Voluntários', icon: Users, href: '/cadastros/voluntarios-amo' },
      { label: 'Termo de Voluntariado', icon: ClipboardList, href: '/termo-voluntariado' },
      { label: 'Voluntários para Evento', icon: Users, href: '/cadastros/voluntarios-evento' },
      { label: 'Voluntários para Projeto', icon: Users, href: '/cadastros/voluntarios-projeto' },
    ]
  },
  {
    label: 'Fornecedores', icon: Handshake,
    children: [
      { label: 'Cadastrar Fornecedores', icon: Handshake, href: '/cadastros/fornecedores' },
      { label: 'Categorias', icon: Handshake, href: '/cadastros/fornecedores/categorias' },
      { label: 'Subcategorias', icon: Handshake, href: '/cadastros/fornecedores/subcategorias' },
    ]
  },
  {
    label: 'Colaboradores', icon: Briefcase,
    children: [
      { label: 'Colaboradores CLT', icon: Briefcase, href: '/cadastros/funcionarios/clt' },
      { label: 'Colaboradores PJ', icon: Briefcase, href: '/cadastros/funcionarios/pj' },
    ]
  },
  {
    label: 'Cadastros Base', icon: Settings,
    children: [
      { label: 'Contas Bancárias', icon: CreditCard, href: '/cadastros/contas-bancarias' },
      { label: 'Departamentos', icon: Building2, href: '/cadastros/departamentos' },
      { label: 'UF & Cidades', icon: MapPin, href: '/cadastros/uf-cidades' },
    ]
  },
  { label: 'Biblioteca de Documentos', icon: FolderOpen, href: '/cadastros/documentos' },
  { label: 'Inbox', icon: Inbox, href: '/inbox' },
  { label: 'Relatórios com IA', icon: Sparkles, href: '/relatorio-ia' },
  {
    label: 'Imóveis', icon: Building2,
    children: [
      { label: 'Contratos de Locação', icon: Building2, href: '/cadastros/imoveis' },
    ]
  },
  {
    label: 'Configurações', icon: Settings,
    children: [
      { label: 'Emissão de Recibo', icon: Receipt, href: '/recibo' },
      { label: 'Guia do Usuário', icon: BookOpen, href: '/configuracoes/guia' },
      { label: 'Log de Auditoria', icon: FileText, href: '/admin/audit-log', adminOnly: true },
      { label: 'Preferências', icon: Settings, href: '/configuracoes' },
      { label: 'Tabelas Auxiliares', icon: Settings, href: '/cadastros/auxiliares', adminOnly: true },
      { label: 'Usuários do Sistema', icon: Users, href: '/admin/usuarios', adminOnly: true },
    ]
  },
]

function NavItemComponent({ item, depth = 0, isAdmin = false }: { item: NavItem; depth?: number; isAdmin?: boolean }) {
  const pathname = usePathname()
  const { prefs } = usePreferences()

  const isDisabled = item.adminOnly && !isAdmin

  // Show all children (admin-only ones will render as disabled)
  const visibleChildren = item.children
  const hasChildren = visibleChildren && visibleChildren.length > 0
  const isActive = item.href === pathname
  const isParentActive = hasChildren && visibleChildren?.some(c => c.href === pathname && (!c.adminOnly || isAdmin))
  const [open, setOpen] = useState(() => isParentActive ?? false)
  const itemRef = useRef<HTMLDivElement>(null)

  // Dynamic newTab: use preference for relatorio-ia, otherwise use item.newTab
  const effectiveNewTab = item.href === '/relatorio-ia' ? prefs.relatorioIaNovaAba : (item.newTab ?? false)

  useEffect(() => {
    if (open && itemRef.current) {
      setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
    }
  }, [open])

  if (hasChildren) {
    return (
      <div ref={itemRef}>
        <button
          onClick={() => setOpen(prev => !prev)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${isParentActive ? 'bg-navy-100 text-navy-800' : 'text-navy-600 hover:bg-cream-200 hover:text-navy-800'}`}
        >
          <span className="flex items-center gap-2">
            <item.icon className="w-4 h-4" />
            {item.label}
          </span>
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {open && (
          <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-cream-300 pl-3">
            {visibleChildren!.map(child => (
              <NavItemComponent key={child.href || child.label} item={child} depth={depth + 1} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isDisabled) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none text-navy-400"
        title="Acesso restrito a administradores"
      >
        <item.icon className="w-4 h-4" />
        {item.label}
        <Lock className="w-3 h-3 ml-auto" />
      </div>
    )
  }

  return (
    <Link href={item.href!} target={effectiveNewTab ? '_blank' : undefined} rel={effectiveNewTab ? 'noopener noreferrer' : undefined}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${isActive ? 'bg-navy-700 text-cream-50' : 'text-navy-600 hover:bg-cream-200 hover:text-navy-800'}`}>
        <item.icon className="w-4 h-4" />
        {item.label}
        {effectiveNewTab && <span className="ml-auto text-xs opacity-40">↗</span>}
      </div>
    </Link>
  )
}

export default function Sidebar() {
  const { prefs } = usePreferences()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Sync with preference on mount
  useEffect(() => {
    setCollapsed(!prefs.sidebarExpanded)
  }, [prefs.sidebarExpanded])

  // Collapse sidebar when navigating to Relatórios com IA (if preference is enabled)
  useEffect(() => {
    if (pathname === '/relatorio-ia' && prefs.relatorioIaColapsarMenu) {
      setCollapsed(true)
    }
  }, [pathname, prefs.relatorioIaColapsarMenu])

  // Fetch user role
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (['admin', 'superadmin'].includes(data?.usuario?.role)) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-72'} bg-white border-r border-cream-200 
      flex flex-col transition-all duration-300 overflow-hidden sticky top-0 h-screen`}>
      {/* Header */}
      <div className="p-4 border-b border-cream-200 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-navy-800">🕊️ AMO</h1>
            <p className="text-xs text-navy-400">Sistema de Gestão</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-cream-100 text-navy-500"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav */}
      {!collapsed && (
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavItemComponent key={item.href || item.label} item={item} isAdmin={isAdmin} />
          ))}
        </nav>
      )}
    </aside>
  )
}
