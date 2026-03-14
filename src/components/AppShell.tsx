'use client'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { LogOut, User } from 'lucide-react'
import { useState, useEffect } from 'react'

const AUTH_PATHS = ['/login', '/verificar-otp', '/esqueci-senha', '/reset-senha']
const REPORT_PATHS = ['/consolidacoes/projetos/relatorio', '/consolidacoes/eventos/relatorio']

interface SessionUser {
  userId: string
  nome: string
  email: string
  role: string
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p))
  const isReportPage = REPORT_PATHS.some(p => pathname.includes(p))
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!isAuthPage) {
      fetch('/api/auth/me')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.usuario) setUser(data.usuario) })
        .catch(() => {})
    }
  }, [isAuthPage, pathname])

  const handleLogout = async () => {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (isAuthPage) {
    return <>{children}</>
  }

  if (isReportPage) {
    return <div className="min-h-screen bg-white">{children}</div>
  }

  return (
    <div className="flex min-h-screen bg-cream-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-cream-200 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-navy-500 font-medium">
            {pathname === '/' ? (
              <span className="text-navy-700 font-semibold">🕊️ Painel Principal</span>
            ) : (
              <nav className="flex items-center gap-1.5 text-xs">
                <a href="/" className="text-navy-400 hover:text-navy-600 transition-colors">Início</a>
                {pathname.split('/').filter(Boolean).map((seg, i, arr) => {
                  const labels: Record<string, string> = {
                    cadastros: 'Cadastros', departamentos: 'Departamentos', voluntarios_amo: 'Voluntários AMO',
                    'voluntarios-amo': 'Voluntários AMO', projetos: 'Projetos', eventos: 'Eventos',
                    receitas: 'Receitas', despesas: 'Despesas', funcionarios: 'Colaboradores',
                    fornecedores: 'Fornecedores', imoveis: 'Imóveis', consolidacoes: 'Consolidações',
                    auxiliares: 'Tabelas Auxiliares', documentos: 'Documentos', admin: 'Admin',
                    usuarios: 'Usuários', 'contas-bancarias': 'Contas Bancárias',
                    'uf-cidades': 'UF & Cidades', publica: 'Receita Pública',
                    'pessoa-fisica': 'Pessoa Física', 'pessoa-juridica': 'Pessoa Jurídica',
                    cursos: 'Cursos', produtos: 'Produtos', servicos: 'Serviços', outras: 'Outras',
                    consumo: 'Consumo', digital: 'Digital', conservacao: 'Conservação',
                    locacao: 'Locação', externos: 'Externos', 'copa-cozinha': 'Copa e Cozinha',
                    clt: 'CLT', pj: 'PJ', categorias: 'Categorias', subcategorias: 'Subcategorias',
                    'voluntarios-projeto': 'Vol. Projeto', 'voluntarios-evento': 'Vol. Evento',
                    relatorio: 'Relatório', 'relatorio-ia': 'Relatórios com IA',
                    configuracoes: 'Configurações',
                    'audit-log': 'Log de Auditoria',
                    aquisicoes: 'Aquisições',
                  }
                  const label = labels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)
                  const isLast = i === arr.length - 1
                  return (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="text-navy-300">/</span>
                      {isLast
                        ? <span className="text-navy-700 font-semibold">{label}</span>
                        : <a href={`/${arr.slice(0, i + 1).join('/')}`} className="text-navy-400 hover:text-navy-600 transition-colors">{label}</a>
                      }
                    </span>
                  )
                })}
              </nav>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white font-bold text-xs">
                  {user.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-navy-800 leading-tight">{user.nome}</p>
                  <p className="text-xs text-navy-400">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sair"
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
