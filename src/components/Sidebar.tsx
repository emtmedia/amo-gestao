'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Building2, Users, FolderOpen, Calendar,
  TrendingUp, TrendingDown, Handshake, FileText,
  ChevronDown, ChevronRight, Menu, X, Settings,
  MapPin, CreditCard, Briefcase, BookOpen, Package,
  Wrench, Utensils, PieChart, Sparkles
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
    label: 'Cadastros Base', icon: Settings,
    children: [
      { label: 'Departamentos', icon: Building2, href: '/cadastros/departamentos' },
      { label: 'Voluntários AMO', icon: Users, href: '/cadastros/voluntarios-amo' },
      { label: 'Contas Bancárias', icon: CreditCard, href: '/cadastros/contas-bancarias' },
      { label: 'UF & Cidades', icon: MapPin, href: '/cadastros/uf-cidades' },
    ]
  },
  {
    label: 'Projetos', icon: FolderOpen,
    children: [
      { label: 'Projetos de Filantropia', icon: FolderOpen, href: '/cadastros/projetos' },
      { label: 'Voluntários do Projeto', icon: Users, href: '/cadastros/voluntarios-projeto' },
    ]
  },
  {
    label: 'Eventos', icon: Calendar,
    children: [
      { label: 'Eventos', icon: Calendar, href: '/cadastros/eventos' },
      { label: 'Voluntários do Evento', icon: Users, href: '/cadastros/voluntarios-evento' },
    ]
  },
  {
    label: 'Receitas', icon: TrendingUp,
    children: [
      { label: 'Receita Pública', icon: TrendingUp, href: '/cadastros/receitas/publica' },
      { label: 'Pessoa Física', icon: TrendingUp, href: '/cadastros/receitas/pessoa-fisica' },
      { label: 'Pessoa Jurídica', icon: TrendingUp, href: '/cadastros/receitas/pessoa-juridica' },
      { label: 'Cursos/Treinamentos', icon: BookOpen, href: '/cadastros/receitas/cursos' },
      { label: 'Produtos', icon: Package, href: '/cadastros/receitas/produtos' },
      { label: 'Serviços', icon: Wrench, href: '/cadastros/receitas/servicos' },
      { label: 'Eventos com Bilheteria', icon: Calendar, href: '/cadastros/receitas/eventos' },
      { label: 'Outras Receitas', icon: TrendingUp, href: '/cadastros/receitas/outras' },
    ]
  },
  {
    label: 'Despesas', icon: TrendingDown,
    children: [
      { label: 'Contas de Consumo', icon: TrendingDown, href: '/cadastros/despesas/consumo' },
      { label: 'Serviços Digitais', icon: TrendingDown, href: '/cadastros/despesas/digital' },
      { label: 'Conservação/Zeladoria', icon: Wrench, href: '/cadastros/despesas/conservacao' },
      { label: 'Locação de Equipamentos', icon: TrendingDown, href: '/cadastros/despesas/locacao' },
      { label: 'Serviços Externos', icon: TrendingDown, href: '/cadastros/despesas/externos' },
      { label: 'Copa e Cozinha', icon: Utensils, href: '/cadastros/despesas/copa-cozinha' },
      { label: 'Aquisições', icon: Package, href: '/cadastros/aquisicoes' },
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
    label: 'Fornecedores', icon: Handshake,
    children: [
      { label: 'Categorias', icon: Handshake, href: '/cadastros/fornecedores/categorias' },
      { label: 'Subcategorias', icon: Handshake, href: '/cadastros/fornecedores/subcategorias' },
      { label: 'Lista de Fornecedores', icon: Handshake, href: '/cadastros/fornecedores' },
    ]
  },
  {
    label: 'Imóveis', icon: Building2,
    children: [
      { label: 'Contratos de Locação', icon: Building2, href: '/cadastros/imoveis' },
    ]
  },
  {
    label: 'Consolidações', icon: PieChart,
    children: [
      { label: 'Consolidação de Projetos', icon: PieChart, href: '/cadastros/consolidacoes/projetos' },
      { label: 'Consolidação de Eventos', icon: PieChart, href: '/cadastros/consolidacoes/eventos' },
    ]
  },
  { label: 'Tabelas Auxiliares', icon: Settings, href: '/cadastros/auxiliares' },
  { label: 'Biblioteca de Documentos', icon: FolderOpen, href: '/cadastros/documentos' },
  { label: 'Relatórios com IA', icon: Sparkles, href: '/relatorio-ia', newTab: true },
  {
    label: 'Configurações', icon: Settings,
    children: [
      { label: 'Preferências', icon: Settings, href: '/configuracoes' },
      { label: 'Guia do Usuário', icon: BookOpen, href: '/configuracoes/guia' },
      { label: 'Log de Auditoria', icon: FileText, href: '/admin/audit-log', adminOnly: true },
      { label: 'Usuários do Sistema', icon: Users, href: '/admin/usuarios', adminOnly: true },
    ]
  },
]

function NavItemComponent({ item, depth = 0, isAdmin = false }: { item: NavItem; depth?: number; isAdmin?: boolean }) {
  const pathname = usePathname()

  // Hide admin-only items from non-admins
  if (item.adminOnly && !isAdmin) return null

  const visibleChildren = item.children?.filter(c => !c.adminOnly || isAdmin)
  const hasChildren = visibleChildren && visibleChildren.length > 0
  const isActive = item.href === pathname
  const isParentActive = hasChildren && visibleChildren?.some(c => c.href === pathname)
  const [open, setOpen] = useState(() => isParentActive ?? false)

  if (hasChildren) {
    return (
      <div>
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

  return (
    <Link href={item.href!} target={item.newTab ? '_blank' : undefined} rel={item.newTab ? 'noopener noreferrer' : undefined}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${isActive ? 'bg-navy-700 text-cream-50' : 'text-navy-600 hover:bg-cream-200 hover:text-navy-800'}`}>
        <item.icon className="w-4 h-4" />
        {item.label}
        {item.newTab && <span className="ml-auto text-xs opacity-40">↗</span>}
      </div>
    </Link>
  )
}

export default function Sidebar() {
  const { prefs } = usePreferences()
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Sync with preference on mount
  useEffect(() => {
    setCollapsed(!prefs.sidebarExpanded)
  }, [prefs.sidebarExpanded])

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
