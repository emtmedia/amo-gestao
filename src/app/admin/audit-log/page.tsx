'use client'
import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, RefreshCw, Filter, Trash2, Download } from 'lucide-react'

interface Log {
  id: string; userId: string | null; userName: string; action: string
  entity: string; entityId: string | null; details: string | null; createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  CRIAR: 'bg-green-100 text-green-800',
  EDITAR: 'bg-blue-100 text-blue-800',
  EXCLUIR: 'bg-red-100 text-red-800',
  ARQUIVAR: 'bg-emerald-100 text-emerald-800',
  'CONFIGURAÇÃO': 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-emerald-100 text-emerald-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [entities, setEntities] = useState<string[]>([])
  const [currentRole, setCurrentRole] = useState('')
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 5000)
  }

  const isSuperAdmin = currentRole.toLowerCase() === 'superadmin'

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = entityFilter ? `?entity=${entityFilter}` : ''
      const r = await fetch(`/api/audit-log${params}`)
      const j = await r.json()
      if (j.success) {
        setLogs(j.data)
        if (!entityFilter) {
          const unique = [...new Set(j.data.map((l: Log) => l.entity))].sort() as string[]
          setEntities(unique)
        }
      }
    } finally { setLoading(false) }
  }, [entityFilter])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => { if (j.usuario?.role) setCurrentRole(j.usuario.role) }).catch(() => {})
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleClearLog = async () => {
    setClearing(true)
    setConfirmClear(false)
    try {
      const r = await fetch('/api/audit-log/clear', { method: 'POST' })
      const j = await r.json()
      if (j.success) {
        showToast(`✓ ${j.totalExportados} registros exportados para "${j.fileName}" e salvos na Biblioteca de Documentos.`)
        fetchLogs()
      } else {
        showToast(j.error || 'Erro ao limpar log.', 'error')
      }
    } catch {
      showToast('Erro de conexão.', 'error')
    } finally {
      setClearing(false)
    }
  }

  const fmtDate = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="page-container">
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Log de Auditoria</h1>
            <p className="text-sm text-navy-400">{logs.length} registros</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-navy-400" />
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="form-select text-sm py-1.5">
              <option value="">Todos os módulos</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button onClick={fetchLogs} className="btn-secondary text-sm py-1.5"><RefreshCw className="w-4 h-4" /></button>
          <button
            onClick={() => isSuperAdmin && setConfirmClear(true)}
            disabled={!isSuperAdmin || clearing}
            title={isSuperAdmin ? 'Exportar logs para CSV e limpar registros' : 'Disponível apenas para SuperAdmin'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isSuperAdmin
                ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
              }`}
          >
            <Trash2 className="w-4 h-4" />
            {clearing ? 'Processando...' : 'Limpar Log'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="text-center py-12 text-navy-400">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-navy-400">Nenhum registro de auditoria encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-700 text-white text-xs">
                  <th className="px-4 py-3 text-left">Data/Hora</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                  <th className="px-4 py-3 text-left">Módulo</th>
                  <th className="px-4 py-3 text-left">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-navy-500 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium">{log.userName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{log.entity}</td>
                    <td className="px-4 py-2.5 text-xs text-navy-500 max-w-xs truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Confirm clear modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-navy-800 text-lg">Limpar Log de Auditoria</h3>
                <p className="text-sm text-navy-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 space-y-1">
              <p>• Todos os <strong>{logs.length} registros</strong> serão exportados para um arquivo <strong>CSV</strong>.</p>
              <p>• O arquivo será salvo na <strong>Biblioteca de Documentos</strong> com acesso restrito.</p>
              <p>• Os logs serão <strong>excluídos permanentemente</strong> do banco de dados.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearLog}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Exportar e Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
