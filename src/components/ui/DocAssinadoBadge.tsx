'use client'
import { useState, useRef } from 'react'
import { CheckCircle2, Clock, Upload, X, FileText, Trash2 } from 'lucide-react'

interface Props {
  recordId: string
  apiBase: string           // ex: '/api/recibo', '/api/termo-voluntariado', '/api/cheque-recibo'
  docAssinadoUrl: string | null
  docAssinadoNome: string | null
  isAdmin: boolean
  onUpdate: () => void      // callback para recarregar dados após upload/remoção
}

export default function DocAssinadoBadge({ recordId, apiBase, docAssinadoUrl, docAssinadoNome, isAdmin, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const endpoint = `${apiBase}/${recordId}/doc-assinado`

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const j = await res.json()
      if (j.success) {
        setShowModal(false)
        setSelectedFile(null)
        onUpdate()
      } else {
        setError(j.error || 'Erro ao enviar arquivo.')
      }
    } finally { setUploading(false) }
  }

  async function handleRemove() {
    if (!confirm('Remover o documento assinado deste registro?')) return
    setRemoving(true)
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      const j = await res.json()
      if (j.success) onUpdate()
      else alert(j.error || 'Erro ao remover.')
    } finally { setRemoving(false) }
  }

  if (docAssinadoUrl) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={docAssinadoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={docAssinadoNome ?? 'Ver documento assinado'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-colors"
        >
          <CheckCircle2 className="w-3 h-3" />
          Assinado
        </a>
        {isAdmin && (
          <button
            onClick={handleRemove}
            disabled={removing}
            title="Remover documento assinado"
            className="p-0.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => { setError(''); setSelectedFile(null); setShowModal(true) }}
        title="Anexar documento assinado (PDF)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors"
      >
        <Clock className="w-3 h-3" />
        Pendente
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy-800 text-base">Anexar Documento Assinado</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-cream-100 text-navy-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-navy-500">
              Selecione o PDF assinado digitalmente ou o documento físico reescaneado.
            </p>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-cream-300 rounded-xl p-6 text-center cursor-pointer hover:border-navy-300 hover:bg-cream-50 transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-navy-800 truncate max-w-[200px]">{selectedFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                  <p className="text-sm text-navy-500">Clique para selecionar um PDF</p>
                  <p className="text-xs text-navy-400 mt-1">Somente arquivos .pdf</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setSelectedFile(f); setError('') }
                e.target.value = ''
              }}
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-cream-300 text-sm font-medium text-navy-600 hover:bg-cream-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 py-2 rounded-xl bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading
                  ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  : <Upload className="w-4 h-4" />}
                {uploading ? 'Enviando...' : 'Anexar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
