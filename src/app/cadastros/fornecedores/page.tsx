'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Store } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import BlockErrorModal from '@/components/ui/BlockErrorModal'
import FileUpload from '@/components/ui/FileUpload'
import PhoneInput from '@/components/ui/PhoneInput'

interface Forn { id: string; nome: string; categoriaId?: string; subcategoriaId?: string; endereco?: string; telefone?: string; email?: string; site?: string }
interface Cat { id: string; nome: string }
interface Sub { id: string; nome: string; categoriaId: string }

const emptyForm = { nome: '', categoriaId: '', subcategoriaId: '', endereco: '', site: '', telefone: '', email: '', observacoes: '', arquivosReferencia: '' }

export default function FornecedoresPage() {
  const [data, setData] = useState<Forn[]>([])
  const [categorias, setCategorias] = useState<Cat[]>([])
  const [subcategorias, setSubcategorias] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Forn | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, rc, rs] = await Promise.all([fetch('/api/fornecedores'), fetch('/api/categorias-fornecedor'), fetch('/api/subcategorias-fornecedor')])
      const [jd, jc, js] = await Promise.all([rd.json(), rc.json(), rs.json()])
      if (jd.success) setData(jd.data)
      if (jc.success) setCategorias(jc.data)
      if (js.success) setSubcategorias(js.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const subsFiltradas = subcategorias.filter(s => !form.categoriaId || s.categoriaId === form.categoriaId)

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Forn)
    setForm({ nome: String(row.nome||''), categoriaId: String(row.categoriaId||''), subcategoriaId: String(row.subcategoriaId||''), endereco: String(row.endereco||''), site: String(row.site||''), telefone: String(row.telefone||''), email: String(row.email||''), observacoes: String(row.observacoes||''), arquivosReferencia: String(row.arquivosReferencia||'') })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome) { showToast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, categoriaId: form.categoriaId||null, subcategoriaId: form.subcategoriaId||null, endereco: form.endereco||null, site: form.site||null, telefone: form.telefone||null, email: form.email||null, observacoes: form.observacoes||null, arquivosReferencia: form.arquivosReferencia||null }
      const res = await fetch(editing ? `/api/fornecedores/${(editing as Forn).id}` : '/api/fornecedores', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Fornecedor atualizado!' : 'Fornecedor criado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/fornecedores/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Fornecedor removido!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro', 'error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group"><label>{label}{required && <span className="required-star">*</span>}</label><input type={type} placeholder={placeholder||label} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" /></div>
  )

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3"><Store className="w-7 h-7 text-navy-700" /><div><h1 className="page-title">Fornecedores</h1><p className="text-sm text-navy-400">{data.length} fornecedor(es)</p></div></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Fornecedor</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'nome', label: 'Fornecedor' }, { key: 'categoriaId', label: 'Categoria', render: (v) => categorias.find(c => c.id === String(v))?.nome || '-' }, { key: 'subcategoriaId', label: 'Subcategoria', render: (v) => subcategorias.find(s => s.id === String(v))?.nome || '—' }, { key: 'telefone', label: 'Telefone', render: v => v ? String(v) : '—' }, { key: 'email', label: 'E-mail', render: v => v ? String(v) : '—' }, { key: 'endereco', label: 'Endereço', render: v => v ? String(v).substring(0,30) : '—' }, { key: 'site', label: 'Site', render: v => v ? String(v).substring(0,25) : '—' }]} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['nome', 'email', 'telefone']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="xl"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">{inp('nome', 'Nome do Fornecedor', true)}</div>
          <div className="form-group">
            <label>Categoria</label>
            <select value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value, subcategoriaId: '' }))} className="form-input">
              <option value="">Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Subcategoria</label>
            <select value={form.subcategoriaId} onChange={e => setForm(p => ({ ...p, subcategoriaId: e.target.value }))} className="form-input" disabled={!form.categoriaId}>
              <option value="">Sem subcategoria</option>
              {subsFiltradas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">{inp('endereco', 'Endereço')}</div>
          {inp('site', 'Site', false, 'url', 'https://')}
          <PhoneInput label="Telefone" value={form.telefone} onChange={v=>setForm(p=>({...p,telefone:v}))}/>
          {inp('email', 'E-mail', false, 'email')}
          <div className="md:col-span-2"><div className="form-group"><label>Observações</label><textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="form-input resize-none" /></div></div>
          <div className="md:col-span-2">
            <FileUpload
              label="Arquivos de Referência"
              value={form.arquivosReferencia}
              onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Fornecedor'}</button>
        </div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir este fornecedor?</p>
        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button><button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button></div>
      </Modal>
      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
