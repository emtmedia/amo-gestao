'use client'
import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, RefreshCw, Filter } from 'lucide-react'

interface Log {
  id: string; userId: string | null; userName: string; action: string
  entity: string; entityId: string | null; details: string | null; createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  CRIAR: 'bg-green-100 text-green-800',
  EDITAR: 'bg-blue-100 text-blue-800',
  EXCLUIR: 'bg-red-100 text-red-800',
  'CONFIGURAÇÃO': 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-emerald-100 text-emerald-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState('')
  const [entities, setEntities] = useState<string[]>([])

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

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const fmtDate = (d: string) => {
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="page-container">
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
    </div>
  )
}
