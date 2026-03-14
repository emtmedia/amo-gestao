'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Tag } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'

interface Cat { id: string; nome: string; createdAt: string }
const emptyForm = { nome: '' }

export default function CategoriasPage() {
  const [data, setData] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cat | null>(null)
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
    try { const r = await fetch('/api/categorias-fornecedor'); const j = await r.json(); if (j.success) setData(j.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (!form.nome) { showToast('Nome é obrigatório', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/categorias-fornecedor/${editing.id}` : '/api/categorias-fornecedor', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Categoria atualizada!' : 'Categoria criada!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro', 'error')
    } finally { setSaving(false) }
  }
  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/categorias-fornecedor/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Removida!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro', 'error') }
  }

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3"><Tag className="w-7 h-7 text-navy-700" /><div><h1 className="page-title">Categorias de Fornecedores</h1><p className="text-sm text-navy-400">{data.length} categoria(s)</p></div></div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true) }} className="btn-primary"><Plus className="w-4 h-4" /> Nova Categoria</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={[{ key: 'nome', label: 'Nome da Categoria' }]} onEdit={(row) => { setEditing(row as unknown as Cat); setForm({ nome: String(row.nome) }); setModalOpen(true) }} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['nome']} />}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'} size="sm"
        alert={modalAlert}>
        <div className="form-group"><label>Nome da Categoria<span className="required-star">*</span></label><input type="text" placeholder="Ex: Tecnologia, Alimentos..." value={form.nome} onChange={e => setForm({ nome: e.target.value })} className="form-input" /></div>
        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}</button></div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir esta categoria?</p>
        <div className="flex justify-end gap-3 mt-6"><button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button><button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button></div>
      </Modal>
    </div>
  )
}
