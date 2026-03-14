'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Building2 } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import BlockErrorModal from '@/components/ui/BlockErrorModal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import PhoneInput from '@/components/ui/PhoneInput'

interface Departamento {
  id: string
  nome: string
  telefoneFixo: string
  responsavelPrincipal: string
  telefoneCelular: string
  emailResponsavel: string | null
  descricao: string
  linkDepartamento: string | null
  orcamentoAnual: number | null
  observacoes: string | null
  arquivosReferencia: string | null
  createdAt: string
}

const emptyForm = {
  nome: '', telefoneFixo: '', responsavelPrincipal: '',
  telefoneCelular: '', emailResponsavel: '', descricao: '',
  linkDepartamento: '', orcamentoAnual: '', observacoes: '', arquivosReferencia: ''
}

export default function DepartamentosPage() {
  const [data, setData] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Departamento | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/departamentos')
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalAlert(null)
    setModalOpen(true)
  }

  const openEdit = (row: Departamento) => {
    setEditing(row)
    setForm({
      nome: row.nome, telefoneFixo: row.telefoneFixo,
      responsavelPrincipal: row.responsavelPrincipal,
      telefoneCelular: row.telefoneCelular,
      emailResponsavel: row.emailResponsavel ?? '',
      descricao: row.descricao,
      linkDepartamento: row.linkDepartamento ?? '',
      orcamentoAnual: String(row.orcamentoAnual ?? ''),
      observacoes: row.observacoes ?? '', arquivosReferencia: row.arquivosReferencia ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome || !form.telefoneFixo || !form.responsavelPrincipal || !form.telefoneCelular || !form.descricao) {
      showToast('Preencha todos os campos obrigatórios', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        orcamentoAnual: form.orcamentoAnual ? parseBRL(form.orcamentoAnual) : null,
        emailResponsavel: form.emailResponsavel || null,
        linkDepartamento: form.linkDepartamento || null,
        observacoes: form.observacoes || null,
        arquivosReferencia: form.arquivosReferencia || null,
      }
      const res = await fetch(editing ? `/api/departamentos/${editing.id}` : '/api/departamentos', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        showToast(editing ? 'Departamento atualizado!' : 'Departamento criado!')
        setModalOpen(false)
        fetchData()
      } else {
        showToast(json.error || 'Erro ao salvar', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/departamentos/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        showToast('Departamento removido!')
        setDeleteConfirm(null)
        fetchData()
      } else {
        showToast('Erro ao remover', 'error')
      }
    } catch {
      showToast('Erro ao remover', 'error')
    }
  }

  const columns = [
    { key: 'nome', label: 'Departamento' },
    { key: 'responsavelPrincipal', label: 'Responsável' },
    { key: 'telefoneFixo', label: 'Tel. Fixo' },
    { key: 'telefoneCelular', label: 'Celular' },
    { key: 'email', label: 'E-mail', render: (v: unknown) => v ? String(v) : '—' },
    { key: 'orcamentoAnual', label: 'Orçamento Anual', render: (v: unknown) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—' },
    { key: 'descricao', label: 'Descrição', render: (v: unknown) => v ? String(v).substring(0, 40) + (String(v).length > 40 ? '…' : '') : '—' },
  ]

  const f = (key: keyof typeof form, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input
        type={type}
        placeholder={placeholder || label}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="form-input"
      />
    </div>
  )

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Departamentos</h1>
            <p className="text-sm text-navy-400">{data.length} departamento(s) cadastrado(s)</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Departamento
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center py-8 text-navy-400">Carregando...</div>
        ) : (
          <DataTable
            data={data}
            columns={columns}
            onEdit={(row) => openEdit(row as unknown as Departamento)}
            onDelete={(row) => setDeleteConfirm(String(row.id))}
            searchKeys={['nome', 'responsavelPrincipal']}
          />
        )}
      </div>

      {/* Modal Form */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Departamento' : 'Novo Departamento'} size="lg"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">{f('nome', 'Nome do Departamento', true)}</div>
          <PhoneInput label="Telefone Fixo do Setor" required value={form.telefoneFixo} onChange={v=>setForm(p=>({...p,telefoneFixo:v}))}/>
          {f('responsavelPrincipal', 'Responsável Principal', true)}
          <PhoneInput label="Telefone Celular do Responsável" required value={form.telefoneCelular} onChange={v=>setForm(p=>({...p,telefoneCelular:v}))}/>
          {f('emailResponsavel', 'E-mail do Responsável', false, 'email')}
          <div className="md:col-span-2">
            <div className="form-group">
              <label>Descrição do Departamento<span className="required-star">*</span></label>
              <textarea
                rows={3}
                placeholder="Descreva as atividades e responsabilidades do departamento"
                value={form.descricao}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                className="form-input resize-none"
              />
            </div>
          </div>
          {f('linkDepartamento', 'Link do Departamento no Site/APP', false, 'url', 'https://')}
          {<CurrencyInput label="Orçamento Anual (R$)" value={form.orcamentoAnual} onChange={v=>setForm(p=>({...p,orcamentoAnual:v}))}/>}
          <div className="md:col-span-2">
            <div className="form-group">
              <label>Observações</label>
              <textarea
                rows={2}
                placeholder="Observações adicionais"
                value={form.observacoes}
                onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                className="form-input resize-none"
              />
            </div>
          </div>
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
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar Departamento')}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Tem certeza que deseja excluir este departamento? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
