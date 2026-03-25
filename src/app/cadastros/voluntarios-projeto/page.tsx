'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Users } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import DateInput from '@/components/ui/DateInput'

interface VolProj { id: string; funcaoCargo: string; cpf: string; igrejaOrigem: string; dataInicio: string; voluntarioId: string; projetoId: string }
interface Voluntario { id: string; nome: string; cpf: string; dataNascimento: string }
interface Projeto { id: string; nome: string; dataInicio: string; dataEncerramento: string }
interface FuncaoCargo { id: string; nome: string }

const emptyForm = { voluntarioId: '', projetoId: '', funcaoCargo: '', cpf: '', dataNascimento: '', dataInicio: '', dataSaida: '', igrejaOrigem: '' }

export default function VoluntariosProjetoPage() {
  const [data, setData] = useState<VolProj[]>([])
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [funcoesCargo, setFuncoesCargo] = useState<FuncaoCargo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VolProj | null>(null)
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
    // Trigger migration to ensure table exists
    fetch('/api/migrate/funcao-cargo-voluntario', { method: 'POST' }).catch(() => {})
    try {
      const [rv, rp, rd, rf] = await Promise.all([
        fetch('/api/voluntarios-amo'),
        fetch('/api/projetos'),
        fetch('/api/voluntarios-projeto'),
        fetch('/api/auxiliares/funcoes-cargo'),
      ])
      const [jv, jp, jd, jf] = await Promise.all([rv.json(), rp.json(), rd.json(), rf.json()])
      if (jv.success) setVoluntarios(jv.data)
      if (jp.success) setProjetos(jp.data.filter((p: any) => p.status !== 'encerrado_consolidado'))
      if (jd.success) setData(jd.data)
      if (jf.success) setFuncoesCargo(jf.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

  const onVolChange = (id: string) => {
    const v = voluntarios.find(x => x.id === id)
    if (v) setForm(p => ({ ...p, voluntarioId: id, cpf: v.cpf, dataNascimento: v.dataNascimento ? String(v.dataNascimento).slice(0,10) : '' }))
    else setForm(p => ({ ...p, voluntarioId: id }))
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as VolProj)
    setForm({ voluntarioId: String(row.voluntarioId||''), projetoId: String(row.projetoId||''), funcaoCargo: String(row.funcaoCargo||''), cpf: String(row.cpf||''), dataNascimento: row.dataNascimento ? String(row.dataNascimento).slice(0,10) : '', dataInicio: row.dataInicio ? String(row.dataInicio).slice(0,10) : '', dataSaida: row.dataSaida ? String(row.dataSaida).slice(0,10) : '', igrejaOrigem: String(row.igrejaOrigem||'') })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.voluntarioId || !form.projetoId || !form.funcaoCargo || !form.cpf || !form.dataNascimento || !form.dataInicio || !form.igrejaOrigem) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, dataSaida: form.dataSaida||null }
      const res = await fetch(editing ? `/api/voluntarios-projeto/${(editing as VolProj).id}` : '/api/voluntarios-projeto', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Registro atualizado!' : 'Voluntário adicionado ao projeto!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/voluntarios-projeto/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Registro removido!'); setDeleteConfirm(null); fetchData() } else showToast('Erro ao remover', 'error') }
    catch { showToast('Erro ao remover', 'error') }
  }

  const getNomeVoluntario = (id: string) => voluntarios.find(v => v.id === id)?.nome || id
  const getNomeProjeto = (id: string) => projetos.find(p => p.id === id)?.nome || id

  // Get the selected projeto to validate date bounds
  const selectedProjeto = projetos.find(p => p.id === form.projetoId)

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Voluntários do Projeto</h1><p className="text-sm text-navy-400">{data.length} registros</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Adicionar Voluntário</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'voluntarioId', label: 'Voluntário', render: (v) => getNomeVoluntario(String(v)) }, { key: 'projetoId', label: 'Projeto', render: (v) => getNomeProjeto(String(v)) }, { key: 'funcaoCargo', label: 'Função/Cargo' }, { key: 'igrejaOrigem', label: 'Igreja de Origem' }, { key: 'dataInicio', label: 'Início', render: (v) => fmtDate(String(v)) }, { key: 'dataSaida', label: 'Saída', render: (v) => v ? fmtDate(String(v)) : '-' }]} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['funcaoCargo', 'igrejaOrigem', 'cpf']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Voluntário do Projeto' : 'Adicionar Voluntário ao Projeto'} size="lg"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group md:col-span-2">
            <label>Voluntário AMO<span className="required-star">*</span></label>
            <select value={form.voluntarioId} onChange={e => onVolChange(e.target.value)} className="form-input">
              <option value="">Selecione o voluntário...</option>
              {voluntarios.map(v => <option key={v.id} value={v.id}>{v.nome} — CPF: {v.cpf}</option>)}
            </select>
          </div>
          <div className="form-group md:col-span-2">
            <label>Projeto<span className="required-star">*</span></label>
            <select value={form.projetoId} onChange={e => setForm(p => ({ ...p, projetoId: e.target.value }))} className="form-input">
              <option value="">Selecione o projeto...</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="form-group md:col-span-2">
            <label>Função/Cargo no Projeto<span className="required-star">*</span></label>
            <select value={form.funcaoCargo} onChange={e => setForm(p => ({ ...p, funcaoCargo: e.target.value }))} className="form-input">
              <option value="">Selecione a função/cargo...</option>
              {funcoesCargo.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
            </select>
            {funcoesCargo.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Nenhuma função cadastrada. Acesse <strong>Tabelas Auxiliares → Funções de Voluntários</strong> para cadastrar.</p>
            )}
          </div>
          <div className="form-group">
            <label>CPF do Voluntário<span className="required-star">*</span></label>
            <input type="text" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className="form-input" readOnly={!!form.voluntarioId} />
          </div>
          <DateInput label="Data de Nascimento" required value={form.dataNascimento} onChange={v=>setForm(p=>({...p,dataNascimento:v}))}/>
          <DateInput
            label="Data de Início no Projeto"
            required
            value={form.dataInicio}
            onChange={v=>setForm(p=>({...p,dataInicio:v}))}
            minDate={selectedProjeto?.dataInicio ? String(selectedProjeto.dataInicio).slice(0,10) : undefined}
            maxDate={selectedProjeto?.dataEncerramento ? String(selectedProjeto.dataEncerramento).slice(0,10) : undefined}
          />
          <DateInput
            label="Data de Saída do Projeto"
            value={form.dataSaida}
            onChange={v=>setForm(p=>({...p,dataSaida:v}))}
            minDate={form.dataInicio || undefined}
            maxDate={selectedProjeto?.dataEncerramento ? String(selectedProjeto.dataEncerramento).slice(0,10) : undefined}
          />
          <div className="form-group md:col-span-2">
            <label>Igreja de Origem<span className="required-star">*</span></label>
            <input type="text" placeholder="Nome da igreja de origem" value={form.igrejaOrigem} onChange={e => setForm(p => ({ ...p, igrejaOrigem: e.target.value }))} className="form-input" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Adicionar'}</button>
        </div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Remover este voluntário do projeto?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Remover</button>
        </div>
      </Modal>
    </div>
  )
}
