'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CreditCard } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import FileUpload from '@/components/ui/FileUpload'

interface ContaBancaria { id: string; tipo: string; banco: string; agencia: string; numeroConta: string; descricao: string; createdAt: string }
const emptyForm = { tipo: 'Corrente', banco: '', agencia: '', numeroConta: '', descricao: '', arquivosReferencia: '' }
const TIPOS = ['Corrente', 'Poupança', 'Investimento']

export default function ContaBancariaPage() {
  const [data, setData] = useState<ContaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ContaBancaria | null>(null)
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
    try { const r = await fetch('/api/contas-bancarias'); const j = await r.json(); if (j.success) setData(j.data) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: ContaBancaria) => { setEditing(row); setForm({ tipo: row.tipo, banco: row.banco, agencia: row.agencia, numeroConta: row.numeroConta, descricao: row.descricao ?? '', arquivosReferencia: (row as unknown as Record<string,string>).arquivosReferencia ?? '' }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.banco || !form.agencia || !form.numeroConta) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/contas-bancarias/${editing.id}` : '/api/contas-bancarias', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Conta atualizada!' : 'Conta criada!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/contas-bancarias/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Conta removida!'); setDeleteConfirm(null); fetchData() } else showToast('Erro ao remover', 'error') }
    catch { showToast('Erro ao remover', 'error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type="text" placeholder={placeholder || label} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Contas Bancárias</h1><p className="text-sm text-navy-400">{data.length} contas cadastrada(s)</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Conta</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'tipo', label: 'Tipo' }, { key: 'banco', label: 'Banco' }, { key: 'agencia', label: 'Agência' }, { key: 'numeroConta', label: 'Nº da Conta' }, { key: 'descricao', label: 'Descrição' }]} onEdit={(row) => openEdit(row as unknown as ContaBancaria)} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['banco', 'numeroConta', 'descricao']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'} size="lg"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label>Tipo de Conta<span className="required-star">*</span></label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className="form-input">
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {inp('banco', 'Banco', true, 'Ex: Banco do Brasil, Itaú...')}
          {inp('agencia', 'Agência', true, 'Ex: 1234-5')}
          {inp('numeroConta', 'Número da Conta', true, 'Ex: 12345-6')}
          <div className="md:col-span-2">{inp('descricao', 'Descrição / Identificação', false, 'Ex: Conta Principal AMO')}</div>
          <div className="md:col-span-2">
            <FileUpload label="Arquivos de Referência" value={form.arquivosReferencia} onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))} folder="contas-bancarias" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Conta'}</button>
        </div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Tem certeza que deseja excluir esta conta bancária?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
