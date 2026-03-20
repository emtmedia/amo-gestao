// src/app/inbox/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Inbox, Search, Trash2, Eye, RefreshCw, FileText, Image,
  FileSpreadsheet, File, Clock, AlertTriangle, CheckCircle2,
  Filter, Camera, Upload, Loader2, X, ExternalLink
} from 'lucide-react'

interface InboxDoc {
  id: string
  descricao: string
  dataVencimento: string
  nomeArquivo: string
  tipoArquivo: string
  tamanhoArquivo: number
  urlArquivo: string
  origemCaptura: string
  status: string
  enviadoPorNome: string
  enviadoPorEmail: string
  createdAt: string
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function getVencimentoStatus(dataVenc: string): { label: string; cor: string; icon: typeof Clock } {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(dataVenc)
  venc.setHours(0, 0, 0, 0)
  const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < 0) return { label: 'Vencido', cor: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle }
  if (diff <= 3) return { label: `Vence em ${diff}d`, cor: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock }
  return { label: 'No prazo', cor: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 }
}

function FileIcon({ type, size = 18 }: { type: string; size?: number }) {
  if (type.startsWith('image/')) return <Image size={size} className="text-blue-500" />
  if (type.includes('pdf')) return <FileText size={size} className="text-red-500" />
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('.sheet'))
    return <FileSpreadsheet size={size} className="text-green-600" />
  if (type.includes('word') || type.includes('.document'))
    return <FileText size={size} className="text-blue-600" />
  return <File size={size} className="text-gray-500" />
}

export default function InboxPage() {
  const [documentos, setDocumentos] = useState<InboxDoc[]>([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<InboxDoc | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<InboxDoc | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus !== 'todos') params.set('status', filtroStatus)
      if (busca.trim()) params.set('busca', busca.trim())
      const res = await fetch(`/api/inbox?${params}`)
      const data = await res.json()
      if (data.ok) setDocumentos(data.documentos)
    } catch {
      showToast('Erro ao carregar documentos', 'err')
    }
    setLoading(false)
  }, [filtroStatus, busca])

  // Ensure table exists on first load
  useEffect(() => {
    fetch('/api/migrate/inbox', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  async function handleDelete(doc: InboxDoc) {
    setDeletingId(doc.id)
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/inbox/${doc.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) {
        setDocumentos(prev => prev.filter(d => d.id !== doc.id))
        showToast('Documento excluído com sucesso')
        if (previewDoc?.id === doc.id) setPreviewDoc(null)
      } else {
        showToast(data.error || 'Erro ao excluir', 'err')
      }
    } catch {
      showToast('Erro ao excluir documento', 'err')
    }
    setDeletingId(null)
  }

  async function handleStatusChange(doc: InboxDoc, novoStatus: string) {
    try {
      const res = await fetch(`/api/inbox/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      const data = await res.json()
      if (data.ok) {
        setDocumentos(prev => prev.map(d => d.id === doc.id ? { ...d, status: novoStatus } : d))
        showToast(`Status alterado para "${novoStatus}"`)
      }
    } catch {
      showToast('Erro ao atualizar status', 'err')
    }
  }

  const isImage = (type: string) => type.startsWith('image/')
  const isPdf   = (type: string) => type.includes('pdf')

  const countByStatus = {
    todos:      documentos.length,
    pendente:   documentos.filter(d => d.status === 'pendente').length,
    processado: documentos.filter(d => d.status === 'processado').length,
    arquivado:  documentos.filter(d => d.status === 'arquivado').length,
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Inbox className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-800">Inbox de Documentos</h1>
            <p className="text-sm text-gray-500">
              Documentos recebidos via AMO Scan · {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
            </p>
          </div>
        </div>
        <button onClick={fetchDocs} disabled={loading}
          className="btn-secondary text-sm flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="form-input pl-9 w-full text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(['todos', 'pendente', 'processado', 'arquivado'] as const).map(st => (
            <button key={st} onClick={() => setFiltroStatus(st)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors capitalize
                ${filtroStatus === st
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {st} ({countByStatus[st]})
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Documentos */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Carregando...</span>
        </div>
      ) : documentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Inbox className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Nenhum documento no inbox</p>
          <p className="text-xs mt-1">Documentos enviados pelo AMO Scan aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map(doc => {
            const venc = getVencimentoStatus(doc.dataVencimento)
            const VencIcon = venc.icon
            return (
              <div key={doc.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Thumbnail / ícone */}
                  <div className="shrink-0 w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {isImage(doc.tipoArquivo) ? (
                      <img src={doc.urlArquivo} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <FileIcon type={doc.tipoArquivo} size={24} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-navy-800 text-sm truncate">{doc.descricao}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {doc.nomeArquivo} · {fmtSize(doc.tamanhoArquivo)}
                          {doc.origemCaptura === 'camera' && (
                            <span className="inline-flex items-center gap-0.5 ml-2 text-blue-500">
                              <Camera size={10} /> Câmera
                            </span>
                          )}
                          {doc.origemCaptura === 'upload' && (
                            <span className="inline-flex items-center gap-0.5 ml-2 text-gray-400">
                              <Upload size={10} /> Arquivo
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border ${venc.cor}`}>
                        <VencIcon size={11} />
                        {venc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Vencimento: <strong className="text-gray-700">{fmtDate(doc.dataVencimento)}</strong></span>
                      <span>Enviado: {fmtDateTime(doc.createdAt)}</span>
                      <span>Por: {doc.enviadoPorNome}</span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <Eye size={13} /> Visualizar
                      </button>
                      <a href={doc.urlArquivo} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <ExternalLink size={13} /> Abrir
                      </a>

                      {/* Status dropdown */}
                      <select value={doc.status}
                        onChange={e => handleStatusChange(doc, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 cursor-pointer">
                        <option value="pendente">Pendente</option>
                        <option value="processado">Processado</option>
                        <option value="arquivado">Arquivado</option>
                      </select>

                      <button onClick={() => setConfirmDelete(doc)}
                        disabled={deletingId === doc.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto disabled:opacity-50">
                        {deletingId === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setPreviewDoc(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-navy-800">{previewDoc.descricao}</h3>
                <p className="text-xs text-gray-500">{previewDoc.nomeArquivo} · {fmtSize(previewDoc.tamanhoArquivo)}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {isImage(previewDoc.tipoArquivo) ? (
                <img src={previewDoc.urlArquivo} alt={previewDoc.descricao}
                  className="max-w-full h-auto mx-auto rounded-lg shadow-sm" />
              ) : isPdf(previewDoc.tipoArquivo) ? (
                <iframe src={previewDoc.urlArquivo} className="w-full h-[70vh] rounded-lg border border-gray-200" />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <FileIcon type={previewDoc.tipoArquivo} size={48} />
                  <p className="mt-3 text-sm">Preview não disponível para este tipo de arquivo.</p>
                  <a href={previewDoc.urlArquivo} target="_blank" rel="noopener noreferrer"
                    className="btn-primary text-sm mt-4">
                    <ExternalLink size={14} /> Baixar arquivo
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
              <span>Vencimento: {fmtDate(previewDoc.dataVencimento)} · Enviado por {previewDoc.enviadoPorNome}</span>
              <div className="flex gap-2">
                <button onClick={() => { setConfirmDelete(previewDoc); }}
                  className="btn-secondary text-xs text-red-600 hover:bg-red-50">
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-navy-800">Excluir documento?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{confirmDelete.descricao}</strong>
            </p>
            <p className="text-xs text-gray-400 mb-5">
              {confirmDelete.nomeArquivo} · Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-sm">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[10001] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in
          ${toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
