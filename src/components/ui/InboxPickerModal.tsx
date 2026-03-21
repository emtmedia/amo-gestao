'use client'

import { useState, useEffect } from 'react'
import {
  Inbox, Search, FileText, Image, FileSpreadsheet, File,
  X, Loader2, AlertCircle
} from 'lucide-react'

interface InboxDoc {
  id: string
  descricao: string
  dataVencimento: string
  nomeArquivo: string
  tipoArquivo: string
  tamanhoArquivo: number
  urlArquivo: string
  pathArquivo?: string
  origemCaptura: string
  status: string
  enviadoPorNome: string
  createdAt: string
}

export interface InboxSelectedFile {
  name: string
  type: string
  size: number
  url: string
  path?: string
}

interface InboxPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (file: InboxSelectedFile) => void
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image size={18} className="text-blue-500" />
  if (type.includes('pdf')) return <FileText size={18} className="text-red-500" />
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('.sheet'))
    return <FileSpreadsheet size={18} className="text-green-600" />
  return <File size={18} className="text-gray-500" />
}

export default function InboxPickerModal({ open, onClose, onSelect }: InboxPickerModalProps) {
  const [documentos, setDocumentos] = useState<InboxDoc[]>([])
  const [loading, setLoading]       = useState(false)
  const [busca, setBusca]           = useState('')
  const [selecionando, setSelecionando] = useState<string | null>(null)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    setBusca('')
    fetch('/api/inbox?status=pendente')
      .then(r => r.json())
      .then(data => {
        if (data.ok) setDocumentos(data.documentos)
        else setError('Erro ao carregar documentos do Inbox.')
      })
      .catch(() => setError('Erro de conexão.'))
      .finally(() => setLoading(false))
  }, [open])

  async function handleSelect(doc: InboxDoc) {
    setSelecionando(doc.id)
    setError('')
    try {
      await fetch(`/api/inbox/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'processado' }),
      })
      onSelect({
        name: doc.nomeArquivo,
        type: doc.tipoArquivo,
        size: doc.tamanhoArquivo,
        url: doc.urlArquivo,
        path: doc.pathArquivo,
      })
      onClose()
    } catch {
      setError('Erro ao selecionar documento. Tente novamente.')
    } finally {
      setSelecionando(null)
    }
  }

  const filtered = documentos.filter(d =>
    !busca ||
    d.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    d.nomeArquivo.toLowerCase().includes(busca.toLowerCase())
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Inbox size={20} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Obter do Inbox</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descrição ou nome do arquivo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Info banner */}
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            Ao selecionar, o documento será marcado como <strong>Processado</strong> no Inbox.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3 mb-4">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500">Carregando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Inbox size={40} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {documentos.length === 0
                  ? 'Nenhum documento pendente no Inbox'
                  : 'Nenhum resultado encontrado'}
              </p>
              <p className="text-xs mt-1">
                {documentos.length === 0
                  ? 'Envie documentos pelo AMO Scan.'
                  : 'Tente uma busca diferente.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="shrink-0 w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                    {doc.tipoArquivo.startsWith('image/') ? (
                      <img src={doc.urlArquivo} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <FileIcon type={doc.tipoArquivo} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.descricao}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doc.nomeArquivo} · {fmtSize(doc.tamanhoArquivo)} · Venc. {fmtDate(doc.dataVencimento)}
                    </p>
                    <p className="text-xs text-gray-400">Por {doc.enviadoPorNome}</p>
                  </div>
                  <button
                    onClick={() => handleSelect(doc)}
                    disabled={!!selecionando}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {selecionando === doc.id && <Loader2 size={13} className="animate-spin" />}
                    Selecionar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
