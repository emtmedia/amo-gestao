'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Tags } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'

interface Sub { id: string; nome: string; categoriaId: string; createdAt: string }
interface Cat { id: string; nome: string }
const emptyForm = { nome: '', categoriaId: '' }

export default function SubcategoriasPage() {
  const [data, setData] = useState<Sub[]>([])
  const [categorias, setCategorias] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Sub | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }
  const fetchData = useCallback(async () => {
    setLoading(true)
    try { const [rs, rc] = await Promise.all([fetch('/api/subcategorias-fornecedor'), fetch('/api/categorias-fornecedor')]); const [js, jc] = await Promise.all([rs.json(), rc.json()]); if (js.success) setData(js.data); if (jc.success) setCategorias(jc.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (!form.nome || !form.categoriaId) { showToast('Preencha todos os campos', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/subcategorias-fornecedor/${editing.id}` : '/api/subcategorias-fornecedor', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Atualizada!' : 'Criada!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro', 'error')
    } finally { setSaving(false) }
  }
  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/subcategorias-fornecedor/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Removida!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro', 'error') }
  }

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3"><Tags className="w-7 h-7 text-navy-700" /><div><h1 className="page-title">Subcategorias de Fornecedores</h1><p className="text-sm text-navy-400">{data.length} subcategoria(s)</p></div></div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true) }} className="btn-primary"><Plus className="w-4 h-4" /> Nova Subcategoria</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={[{ key: 'categoriaId', label: 'Categoria', render: (v) => categorias.find(c => c.id === String(v))?.nome || '-' }, { key: 'nome', label: 'Subcategoria' }]} onEdit={(row) => { setEditing(row as unknown as Sub); setForm({ nome: String(row.nome), categoriaId: String(row.categoriaId) }); setModalOpen(true) }} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['nome']} />}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Subcategoria' : 'Nova Subcategoria'} size="sm"
        alert={modalAlert}>
        <div className="flex flex-col gap-4">
          <div className="form-group"><label>Categoria<span className="required-star">*</span></label><select value={form.categoriaId} onChange={e => setForm(p => ({ ...p, categoriaId: e.target.value }))} className="form-input"><option value="">Selecione...</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div className="form-group"><label>Nome da Subcategoria<span className="required-star">*</span></label><input type="text" placeholder="Ex: Software, Hardware..." value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="form-input" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}</button></div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir esta subcategoria?</p>
        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button><button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button></div>
      </Modal>
    </div>
  )
}
