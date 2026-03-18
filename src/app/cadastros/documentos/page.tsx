'use client'
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { Plus, Upload, Search, FileText, File, Image, FileArchive, FileSpreadsheet, Download, Eye, Pencil, Trash2, Tag, Lock, Unlock, RefreshCw, FolderOpen, X, Filter, LayoutGrid, List, ScanLine, ExternalLink } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateInput from '@/components/ui/DateInput'
import { usePreferences } from '@/lib/preferences'

const ScannerCapture = lazy(() => import('@/components/ui/ScannerCapture'))

interface Cat { id: string; nome: string; cor: string; icone: string }
interface Doc {
  id: string; titulo: string; descricao?: string; categoriaId: string; categoria: Cat
  tags?: string; nomeArquivo: string; tipoArquivo: string; tamanhoArquivo?: number
  urlArquivo: string; pathArquivo?: string; versao?: string
  dataVigencia?: string; dataRevisao?: string; responsavel?: string
  acessoRestrito: boolean; observacoes?: string; createdAt: string; updatedAt: string
}

const emptyForm = {
  titulo: '', descricao: '', categoriaId: '', tags: '', versao: '1.0',
  dataVigencia: '', dataRevisao: '', responsavel: '', acessoRestrito: false as boolean, observacoes: ''
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qwhiymkxudgckefwzcpk.supabase.co'
const BUCKET = 'arquivos-referencia'

function fileIcon(mime: string) {
  if (mime.includes('pdf')) return <File className="w-8 h-8 text-red-500" />
  if (mime.includes('image')) return <Image className="w-8 h-8 text-blue-500" />
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet className="w-8 h-8 text-green-600" />
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed')) return <FileArchive className="w-8 h-8 text-amber-500" />
  return <FileText className="w-8 h-8 text-navy-400" />
}

function fmtSize(b?: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1024/1024).toFixed(1)} MB`
}

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—' }

function isValidUrl(url: string) { return url && url.startsWith('http') }

function openDoc(id: string) {
  window.open(`/api/documentos-amo/download/${id}`, '_blank', 'noopener,noreferrer')
}

function downloadDoc(id: string) {
  const a = document.createElement('a')
  a.href = `/api/documentos-amo/download/${id}`
  a.target = '_blank'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

function isExpiringSoon(d?: string) {
  if (!d) return false
  const diff = new Date(d).getTime() - Date.now()
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
}

function isExpired(d?: string) {
  if (!d) return false
  return new Date(d).getTime() < Date.now()
}

export default function Page() {
  const { prefs, updatePrefs } = usePreferences()
  const viewMode = prefs.documentsView || 'cards'
  const toggleView = () => updatePrefs({ documentsView: viewMode === 'cards' ? 'list' : 'cards' })

  const [docs, setDocs] = useState<Doc[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Doc | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catForm, setCatForm] = useState({ nome: '', descricao: '', cor: '#2563EB' })
  const [editingCat, setEditingCat] = useState<Cat | null>(null)
  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [uploadedPath, setUploadedPath] = useState('')
  const [uploadedName, setUploadedName] = useState('')
  const [uploadedType, setUploadedType] = useState('')
  const [uploadedSize, setUploadedSize] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  // Filters
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterExpiry, setFilterExpiry] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    fetch('/api/migrate/documentos', { method: 'POST' }).catch(() => {})
    try {
      const [rd, rc, rme] = await Promise.all([
        fetch('/api/documentos-amo'),
        fetch('/api/documentos-amo/categorias'),
        fetch('/api/auth/me'),
      ])
      const [jd, jc, jme] = await Promise.all([rd.json(), rc.json(), rme.json()])
      if (jd.success) setDocs(jd.data)
      if (jc.success) setCats(jc.data)
      // Role from the authoritative session endpoint
      if (jme.usuario) setIsAdmin(['admin', 'superadmin'].includes(jme.usuario.role))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setUploadFile(null)
    setUploadedUrl(''); setUploadedPath(''); setUploadedName(''); setUploadedType(''); setUploadedSize(0)
    setTags([]); setModalAlert(null); setModalOpen(true)
  }

  const openEdit = (doc: Doc) => {
    setEditing(doc)
    setForm({
      titulo: doc.titulo, descricao: doc.descricao||'', categoriaId: doc.categoriaId,
      tags: doc.tags||'', versao: doc.versao||'1.0',
      dataVigencia: doc.dataVigencia ? String(doc.dataVigencia).slice(0,10) : '',
      dataRevisao: doc.dataRevisao ? String(doc.dataRevisao).slice(0,10) : '',
      responsavel: doc.responsavel||'', acessoRestrito: doc.acessoRestrito, observacoes: doc.observacoes||''
    })
    setTags(doc.tags ? JSON.parse(doc.tags) : [])
    setUploadFile(null); setUploadedUrl(''); setUploadedPath('')
    setUploadedName(doc.nomeArquivo); setUploadedType(doc.tipoArquivo); setUploadedSize(doc.tamanhoArquivo||0)
    setModalAlert(null); setModalOpen(true)
  }

  const handleScanCapture = async (file: File) => {
    setScannerOpen(false)
    setUploading(true)
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('folder', 'documentos-amo')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const j = await res.json()
      if (j.ok || j.success) {
        setUploadedUrl(j.url); setUploadedPath(j.path)
        setUploadedName(file.name); setUploadedType(file.type); setUploadedSize(file.size)
        showToast('Arquivo capturado e enviado com sucesso!')
      } else { showToast(j.error || 'Erro ao enviar arquivo', 'error') }
    } catch { showToast('Erro ao enviar arquivo', 'error') }
    finally { setUploading(false) }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadFile(file); setUploading(true)
    try {
      const formData = new FormData(); formData.append('file', file); formData.append('folder', 'documentos-amo')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const j = await res.json()
      if (j.ok || j.success) {
        setUploadedUrl(j.url); setUploadedPath(j.path)
        setUploadedName(file.name); setUploadedType(file.type); setUploadedSize(file.size)
        showToast('Arquivo enviado com sucesso!')
      } else { showToast(j.error || 'Erro ao enviar arquivo', 'error') }
    } catch { showToast('Erro ao enviar arquivo', 'error') }
    finally { setUploading(false) }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) { setTags(p => [...p, t]) }
    setTagInput('')
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) { showToast('Título é obrigatório', 'error'); return }
    if (!form.categoriaId) { showToast('Selecione uma categoria', 'error'); return }
    if (!editing && !uploadedUrl) { showToast('Faça o upload de um arquivo', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form, tags: tags.length ? JSON.stringify(tags) : null,
        acessoRestrito: form.acessoRestrito,
        ...(uploadedUrl ? { nomeArquivo: uploadedName, tipoArquivo: uploadedType, tamanhoArquivo: uploadedSize, urlArquivo: uploadedUrl, pathArquivo: uploadedPath } : {}),
        ...(!editing ? { nomeArquivo: uploadedName, tipoArquivo: uploadedType, tamanhoArquivo: uploadedSize, urlArquivo: uploadedUrl, pathArquivo: uploadedPath } : {})
      }
      const res = await fetch(editing ? `/api/documentos-amo/${editing.id}` : '/api/documentos-amo', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Documento atualizado!' : 'Documento adicionado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (doc: Doc) => {
    try {
      const r = await fetch(`/api/documentos-amo/${doc.id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() }
      else showToast(j.error||'Erro', 'error')
    } catch { showToast('Erro', 'error') }
  }

  const saveCat = async () => {
    if (!catForm.nome.trim()) { showToast('Nome obrigatório', 'error'); return }
    const res = await fetch(editingCat ? `/api/documentos-amo/categorias/${editingCat.id}` : '/api/documentos-amo/categorias', {
      method: editingCat ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm)
    })
    const j = await res.json()
    if (j.success) { showToast(editingCat ? 'Categoria atualizada!' : 'Categoria criada!'); setCatModalOpen(false); fetchData() }
    else showToast(j.error||'Erro', 'error')
  }

  // Filtered docs
  const filtered = docs.filter(d => {
    const matchSearch = !search || d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (d.descricao||'').toLowerCase().includes(search.toLowerCase()) ||
      (d.responsavel||'').toLowerCase().includes(search.toLowerCase()) ||
      (d.tags ? JSON.parse(d.tags).some((t: string) => t.toLowerCase().includes(search.toLowerCase())) : false)
    const matchCat = !filterCat || d.categoriaId === filterCat
    const matchExpiry = !filterExpiry ||
      (filterExpiry === 'valid' && !!d.dataVigencia && !isExpired(d.dataVigencia) && !isExpiringSoon(d.dataVigencia)) ||
      (filterExpiry === 'expiring' && isExpiringSoon(d.dataVigencia)) ||
      (filterExpiry === 'expired' && isExpired(d.dataVigencia)) ||
      (filterExpiry === 'no_expiry' && !d.dataVigencia) ||
      (filterExpiry === 'restricted' && d.acessoRestrito)
    return matchSearch && matchCat && matchExpiry
  })

  const catCounts = cats.map(c => ({ ...c, count: docs.filter(d => d.categoriaId === c.id).length }))

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Biblioteca de Documentos</h1>
            <p className="text-sm text-navy-400">{docs.length} documentos · {cats.length} categorias</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditingCat(null); setCatForm({ nome: '', descricao: '', cor: '#2563EB' }); setCatModalOpen(true) }} className="btn-secondary text-sm">
            <Tag className="w-4 h-4" /> Nova Categoria
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Upload className="w-4 h-4" /> Adicionar Documento
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: docs.length, color: 'bg-navy-50 text-navy-700' },
          { label: 'Vigentes', value: docs.filter(d => !!d.dataVigencia && !isExpired(d.dataVigencia) && !isExpiringSoon(d.dataVigencia)).length, color: 'bg-green-50 text-green-700' },
          { label: 'A vencer (30 dias)', value: docs.filter(d => isExpiringSoon(d.dataVigencia)).length, color: 'bg-amber-50 text-amber-700' },
          { label: 'Vencidos', value: docs.filter(d => isExpired(d.dataVigencia)).length, color: 'bg-red-50 text-red-700' },
          ...(isAdmin ? [{ label: 'Acesso Restrito', value: docs.filter(d => d.acessoRestrito).length, color: 'bg-purple-50 text-purple-700' }] : []),
        ].map(s => (
          <div key={s.label} className={`card py-3 px-4 ${s.color} border-0`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, responsável, tag..." className="form-input pl-9 py-2 text-sm" />
          </div>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="form-input py-2 text-sm w-auto min-w-44">
            <option value="">Todas as categorias</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filterExpiry} onChange={e=>setFilterExpiry(e.target.value)} className="form-input py-2 text-sm w-auto min-w-48">
            <option value="">Todos os status de vigência</option>
            <option value="valid">✅ Vigente</option>
            <option value="expiring">⚠️ A vencer (30 dias)</option>
            <option value="expired">🔴 Vencidos</option>
            <option value="no_expiry">📄 Sem vencimento</option>
            {isAdmin && <option value="restricted">🔒 Acesso restrito</option>}
          </select>
          {(search || filterCat || filterExpiry) && (
            <button onClick={() => { setSearch(''); setFilterCat(''); setFilterExpiry('') }} className="text-xs text-navy-400 hover:text-navy-600 flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 ml-auto">
            <button onClick={() => updatePrefs({ documentsView: 'cards' })} title="Visualização em Cards"
              className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => updatePrefs({ documentsView: 'list' })} title="Visualização em Lista"
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {catCounts.map(c => (
          <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? '' : c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterCat === c.id ? 'text-white border-transparent' : 'bg-white text-navy-600 border-cream-300 hover:border-navy-300'}`}
            style={filterCat === c.id ? { backgroundColor: c.cor, borderColor: c.cor } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
            {c.nome}
            <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${filterCat === c.id ? 'bg-white/20' : 'bg-cream-100'}`}>{c.count}</span>
          </button>
        ))}
      </div>

      {/* Document grid */}
      {loading ? <div className="text-center py-12 text-navy-400">Carregando...</div> : (
        filtered.length === 0 ? (
          <div className="card text-center py-16">
            <FolderOpen className="w-12 h-12 text-navy-200 mx-auto mb-3" />
            <p className="text-navy-400 font-medium">Nenhum documento encontrado</p>
            <p className="text-sm text-navy-300 mt-1">{search || filterCat || filterExpiry ? 'Tente ajustar os filtros' : 'Adicione o primeiro documento clicando em "Adicionar Documento"'}</p>
          </div>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-700 text-white text-xs">
                  <th className="px-4 py-3 text-left">Documento</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">Responsável</th>
                  <th className="px-4 py-3 text-left">Vigência</th>
                  <th className="px-4 py-3 text-left">Tamanho</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const expired = isExpired(doc.dataVigencia)
                  const expiring = isExpiringSoon(doc.dataVigencia)
                  return (
                    <tr key={doc.id} className="border-b border-cream-100 hover:bg-cream-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {fileIcon(doc.tipoArquivo)}
                          <div className="min-w-0">
                            <p className="font-medium text-navy-800 text-sm truncate max-w-xs">{doc.titulo}</p>
                            <p className="text-[10px] text-navy-300 truncate max-w-xs">{doc.nomeArquivo}</p>
                          </div>
                          {doc.acessoRestrito && <Lock className="w-3 h-3 text-purple-500 flex-shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: doc.categoria?.cor || '#666' }}>
                          {doc.categoria?.nome || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-500">{doc.responsavel || '-'}</td>
                      <td className="px-4 py-3">
                        {doc.dataVigencia ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? 'bg-red-100 text-red-700' : expiring ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {expired ? '🔴 ' : expiring ? '⚠️ ' : '✅ '}{fmtDate(doc.dataVigencia)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Sem vencimento</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-400">{fmtSize(doc.tamanhoArquivo)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openDoc(doc.id)} disabled={!isValidUrl(doc.urlArquivo)} className="p-1.5 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Abrir documento">
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button onClick={() => downloadDoc(doc.id)} disabled={!isValidUrl(doc.urlArquivo)} className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Baixar">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-700" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(doc)} className="p-1.5 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-600" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── CARDS VIEW ── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(doc => {
              const expired = isExpired(doc.dataVigencia)
              const expiring = isExpiringSoon(doc.dataVigencia)
              const parsedTags: string[] = doc.tags ? JSON.parse(doc.tags) : []
              return (
                <div key={doc.id} className={`card hover:shadow-md transition-shadow group relative border ${expired ? 'border-red-200' : expiring ? 'border-amber-200' : 'border-cream-200'}`}>
                  {/* Status badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {fileIcon(doc.tipoArquivo)}
                      <div className="min-w-0">
                        <p className="text-xs font-medium px-2 py-0.5 rounded-full text-white inline-block" style={{ backgroundColor: doc.categoria.cor }}>{doc.categoria.nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDoc(doc.id)} disabled={!isValidUrl(doc.urlArquivo)} className="p-1.5 rounded-lg hover:bg-blue-50 text-navy-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Abrir documento">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button onClick={() => downloadDoc(doc.id)} disabled={!isValidUrl(doc.urlArquivo)} className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Baixar">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(doc)} className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-700" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirm(doc)} className="p-1.5 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-600" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-navy-800 text-sm leading-snug mb-1 line-clamp-2">{doc.titulo}</h3>
                  {doc.descricao && <p className="text-xs text-navy-400 mb-2 line-clamp-2">{doc.descricao}</p>}

                  <div className="flex items-center gap-3 text-xs text-navy-400 mb-2">
                    <span title="Tamanho">{fmtSize(doc.tamanhoArquivo)}</span>
                    {doc.versao && <span>v{doc.versao}</span>}
                    {doc.acessoRestrito && <span className="flex items-center gap-0.5 text-purple-600"><Lock className="w-3 h-3" />Restrito</span>}
                  </div>

                  {doc.responsavel && <p className="text-xs text-navy-500 mb-2">👤 {doc.responsavel}</p>}

                  {/* Vigência */}
                  {doc.dataVigencia ? (
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg mb-2 ${expired ? 'bg-red-50 text-red-700' : expiring ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                      {expired ? '🔴' : expiring ? '⚠️' : '✅'}
                      Vigência: {fmtDate(doc.dataVigencia)}
                      {expired && ' (VENCIDO)'}
                      {expiring && ' (vence em breve)'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg mb-2 bg-slate-50 text-slate-500">
                      📄 Sem vencimento
                    </div>
                  )}
                  {doc.dataRevisao && (
                    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg mb-2 bg-blue-50 text-blue-700">
                      <RefreshCw className="w-3 h-3" />Revisão: {fmtDate(doc.dataRevisao)}
                    </div>
                  )}

                  {/* Tags */}
                  {parsedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {parsedTags.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-cream-100 text-navy-500 text-[10px] rounded-full">{t}</span>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-navy-300 mt-2 truncate" title={doc.nomeArquivo}>{doc.nomeArquivo}</p>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Upload/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing ? 'Editar Documento' : 'Adicionar Documento'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File upload zone */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Arquivo{!editing && <span className="required-star">*</span>}
            </label>
            <div className="flex gap-2">
              <div
                onClick={() => fileRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${uploadedUrl || (editing && !uploadFile) ? 'border-green-300 bg-green-50' : 'border-cream-300 hover:border-navy-300 bg-cream-50'}`}
              >
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt,.csv" />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 text-navy-400">
                    <div className="w-8 h-8 border-2 border-navy-300 border-t-navy-600 rounded-full animate-spin" />
                    <span className="text-sm">Enviando arquivo...</span>
                  </div>
                ) : uploadedUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    {fileIcon(uploadedType)}
                    <p className="text-sm font-medium text-green-700">{uploadedName}</p>
                    <p className="text-xs text-navy-400">{fmtSize(uploadedSize)} · Clique para substituir</p>
                  </div>
                ) : editing ? (
                  <div className="flex flex-col items-center gap-2 text-navy-400">
                    {fileIcon(editing.tipoArquivo)}
                    <p className="text-sm font-medium text-navy-600">{editing.nomeArquivo}</p>
                    <p className="text-xs">Arquivo atual · Clique para substituir</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-navy-400">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm font-medium">Clique para selecionar o arquivo</p>
                    <p className="text-xs">PDF, Word, Excel, imagens, ZIP — máx. 10 MB</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                disabled={uploading}
                className="flex flex-col items-center justify-center gap-1.5 px-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed min-w-[100px]"
                title="Capturar documento via câmera ou scanner"
              >
                <ScanLine className="w-5 h-5" />
                <span className="text-xs font-medium leading-tight text-center">Obter do<br/>Scanner</span>
              </button>
            </div>
            {scannerOpen && (
              <Suspense fallback={null}>
                <ScannerCapture open={scannerOpen} onClose={() => setScannerOpen(false)} onCapture={handleScanCapture} />
              </Suspense>
            )}
          </div>

          <div className="md:col-span-2 form-group">
            <label>Título do Documento<span className="required-star">*</span></label>
            <input type="text" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} className="form-input" placeholder="Ex: Contrato de Locação — Sede Principal" />
          </div>

          <div className="md:col-span-2 form-group">
            <label>Descrição</label>
            <textarea rows={2} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="form-input resize-none" placeholder="Descreva brevemente o conteúdo do documento..." />
          </div>

          <div className="form-group">
            <label>Categoria<span className="required-star">*</span></label>
            <select value={form.categoriaId} onChange={e=>setForm(p=>({...p,categoriaId:e.target.value}))} className="form-input">
              <option value="">Selecione...</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Responsável pelo Documento</label>
            <input type="text" value={form.responsavel} onChange={e=>setForm(p=>({...p,responsavel:e.target.value}))} className="form-input" placeholder="Nome do responsável" />
          </div>

          <DateInput label="Data de Vigência" value={form.dataVigencia} onChange={v=>setForm(p=>({...p,dataVigencia:v}))} />
          <DateInput label="Próxima Revisão" value={form.dataRevisao} onChange={v=>setForm(p=>({...p,dataRevisao:v}))} />

          <div className="form-group">
            <label>Versão</label>
            <input type="text" value={form.versao} onChange={e=>setForm(p=>({...p,versao:e.target.value}))} className="form-input" placeholder="1.0" />
          </div>

          {isAdmin ? (
            <div className="form-group flex flex-col gap-1.5 pt-5">
              <label className="flex items-center gap-1.5">
                Controle de Acesso
                <span className="relative group cursor-help">
                  <svg className="w-3.5 h-3.5 text-navy-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-navy-800 text-white text-xs rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed">
                    <strong>📄 Acesso Livre:</strong> documento visível a todos os usuários do sistema.<br/><br/>
                    <strong>🔒 Acesso Restrito:</strong> visível apenas para administradores. Usuários comuns não verão este documento.
                  </div>
                </span>
              </label>
              <div
                onClick={() => setForm(p => ({ ...p, acessoRestrito: !p.acessoRestrito }))}
                className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${form.acessoRestrito ? 'bg-purple-50 border-purple-300' : 'bg-cream-50 border-cream-300 hover:border-navy-300'}`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${form.acessoRestrito ? 'bg-purple-600 border-purple-600' : 'bg-white border-navy-300'}`}>
                  {form.acessoRestrito && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                </div>
                {form.acessoRestrito ? <Lock className="w-4 h-4 text-purple-600" /> : <Unlock className="w-4 h-4 text-navy-400" />}
                <div>
                  <span className={`text-sm font-medium block ${form.acessoRestrito ? 'text-purple-700' : 'text-navy-600'}`}>
                    {form.acessoRestrito ? 'Acesso Restrito (somente Admins)' : 'Acesso Livre'}
                  </span>
                  <span className="text-xs text-navy-400">
                    {form.acessoRestrito ? 'Invisível para usuários comuns' : 'Visível a todos os usuários do sistema'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-group flex flex-col gap-1.5 pt-5">
              <label>Controle de Acesso</label>
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-cream-50 border-cream-200 opacity-70 cursor-not-allowed">
                <Unlock className="w-4 h-4 text-navy-400" />
                <div>
                  <span className="text-sm font-medium block text-navy-600">Acesso Livre</span>
                  <span className="text-xs text-navy-400">Apenas administradores podem definir documentos restritos</span>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="md:col-span-2 form-group">
            <label>Tags</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag()}}} placeholder="Digite uma tag e pressione Enter" className="form-input flex-1" />
              <button type="button" onClick={addTag} className="btn-secondary text-sm px-3">Adicionar</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-navy-100 text-navy-700 text-xs rounded-full">
                    {t}
                    <button onClick={() => setTags(p => p.filter(x => x !== t))} className="hover:text-red-500 ml-0.5"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2 form-group">
            <label>Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="form-input resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving || uploading} className="btn-primary">
            {saving ? 'Salvando...' : uploading ? 'Aguarde upload...' : editing ? 'Atualizar Documento' : 'Adicionar Documento'}
          </button>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title={editingCat ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
        <div className="space-y-4">
          <div className="form-group">
            <label>Nome da Categoria<span className="required-star">*</span></label>
            <input type="text" value={catForm.nome} onChange={e=>setCatForm(p=>({...p,nome:e.target.value}))} className="form-input" />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <input type="text" value={catForm.descricao} onChange={e=>setCatForm(p=>({...p,descricao:e.target.value}))} className="form-input" />
          </div>
          <div className="form-group">
            <label>Cor</label>
            <div className="flex items-center gap-3">
              <input type="color" value={catForm.cor} onChange={e=>setCatForm(p=>({...p,cor:e.target.value}))} className="w-10 h-10 rounded-lg border border-cream-300 cursor-pointer" />
              <span className="text-sm text-navy-500">{catForm.cor}</span>
              <div className="flex gap-1.5 ml-auto flex-wrap">
                {['#2563EB','#16A34A','#DC2626','#7C3AED','#B45309','#0891B2','#EA580C','#65A30D','#6B7280','#0D9488'].map(c => (
                  <button key={c} onClick={() => setCatForm(p=>({...p,cor:c}))} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${catForm.cor===c?'border-navy-700 scale-110':'border-transparent'}`} style={{backgroundColor:c}} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setCatModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={saveCat} className="btn-primary">Salvar Categoria</button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir o documento <strong>"{deleteConfirm?.titulo}"</strong>?</p>
        <p className="text-sm text-navy-400 mt-1">O arquivo permanecerá no storage mas o registro será removido.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
