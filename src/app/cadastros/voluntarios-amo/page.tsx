'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import BlockErrorModal from '@/components/ui/BlockErrorModal'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface VoluntarioAMO {
  id: string; nome: string; cpf: string; dataNascimento: string
  enderecoCompleto: string; genero: string; competencias: string
  membroIgrejaOmega: boolean; createdAt: string
}

const emptyForm = { nome: '', cpf: '', dataNascimento: '', enderecoCompleto: '', genero: 'Masculino', competencias: '', membroIgrejaOmega: false, arquivosReferencia: '' }

export default function VoluntariosAMOPage() {
  const [data, setData] = useState<VoluntarioAMO[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VoluntarioAMO | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/voluntarios-amo'); const json = await res.json(); if (json.success) setData(json.data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (!form.nome || !form.cpf || !form.dataNascimento || !form.enderecoCompleto || !form.competencias) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    setSaving(true)
    try {
      const payload = { ...form, dataNascimento: new Date(form.dataNascimento).toISOString(), arquivosReferencia: form.arquivosReferencia||null }
      const res = await fetch(editing ? `/api/voluntarios-amo/${editing.id}` : '/api/voluntarios-amo', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) { showToast(editing ? 'Voluntário atualizado!' : 'Voluntário criado!'); setModalOpen(false); fetchData() }
      else { showToast(json.error || 'Erro ao salvar', 'error') }
    } finally { setSaving(false) }
  }

  const columns = [
    { key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' },
    { key: 'dataNascimento', label: 'Nascimento', render: (v: unknown) => v ? new Date(String(v)).toLocaleDateString('pt-BR') : '—' },
    { key: 'genero', label: 'Gênero' },
    { key: 'endereco', label: 'Endereço', render: (v: unknown) => v ? String(v).substring(0, 30) + (String(v).length > 30 ? '…' : '') : '—' },
    { key: 'competencias', label: 'Competências', render: (v: unknown) => v ? String(v).substring(0, 30) + (String(v).length > 30 ? '…' : '') : '—' },
    { key: 'membroIgrejaOmega', label: 'Igreja Ômega', render: (v: unknown) => v ? '✅ Sim' : '❌ Não' },
  ]

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Voluntários AMO</h1><p className="text-sm text-navy-400">{data.length} voluntário(s)</p></div>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Voluntário
        </button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data as unknown as Record<string, unknown>[]} columns={columns}
            onEdit={(row) => { const r = row as unknown as VoluntarioAMO; setEditing(r); setForm({ nome: r.nome, cpf: r.cpf, dataNascimento: r.dataNascimento ? String(r.dataNascimento).split('T')[0] : '', enderecoCompleto: r.enderecoCompleto, genero: r.genero, competencias: r.competencias, membroIgrejaOmega: r.membroIgrejaOmega, arquivosReferencia: (r as unknown as Record<string,unknown>).arquivosReferencia as string || '' }); setModalOpen(true) }}
            onDelete={async (row) => { const r = row as unknown as VoluntarioAMO; if (confirm('Excluir voluntário?')) { await fetch(`/api/voluntarios-amo/${r.id}`, { method: 'DELETE' }); fetchData() } }}
            searchKeys={['nome', 'cpf']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Voluntário' : 'Novo Voluntário AMO'} size="lg"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="form-group"><label>Nome Completo<span className="required-star">*</span></label>
              <input type="text" placeholder="Nome do voluntário" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="form-input" /></div>
          </div>
          <div className="form-group"><label>CPF<span className="required-star">*</span></label>
            <input type="text" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className="form-input" /></div>
          <div className="form-group"><label>Data de Nascimento<span className="required-star">*</span></label>
            <DateInput label="Data de Nascimento" required value={form.dataNascimento} onChange={v=>setForm(p=>({...p,dataNascimento:v}))}/></div>
          <div className="md:col-span-2">
            <div className="form-group"><label>Endereço Completo<span className="required-star">*</span></label>
              <input type="text" placeholder="Rua, número, bairro, cidade - UF" value={form.enderecoCompleto} onChange={e => setForm(p => ({ ...p, enderecoCompleto: e.target.value }))} className="form-input" /></div>
          </div>
          <div className="form-group"><label>Gênero<span className="required-star">*</span></label>
            <select value={form.genero} onChange={e => setForm(p => ({ ...p, genero: e.target.value }))} className="form-select">
              <option>Masculino</option><option>Feminino</option>
            </select></div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.membroIgrejaOmega} onChange={e => setForm(p => ({ ...p, membroIgrejaOmega: e.target.checked }))} className="w-4 h-4" />
            <label className="cursor-pointer">É membro da Igreja Ômega?</label>
          </div>
          <div className="md:col-span-2">
            <div className="form-group"><label>Principais Competências<span className="required-star">*</span></label>
              <textarea rows={3} placeholder="Liste as competências do voluntário" value={form.competencias} onChange={e => setForm(p => ({ ...p, competencias: e.target.value }))} className="form-input resize-none" /></div>
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
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar Voluntário')}</button>
        </div>
      </Modal>
      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
