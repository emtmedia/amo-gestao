'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, UserCheck } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface VolEv { id: string; funcaoCargo: string; cpf: string; igrejaOrigem?: string; dataInicio: string; voluntarioId: string; eventoId: string }
interface Voluntario { id: string; nome: string; cpf: string; dataNascimento: string }
interface Evento { id: string; nome: string; dataInicio: string; dataEncerramento: string }
interface FuncaoCargo { id: string; nome: string }

const emptyForm = { voluntarioId: '', eventoId: '', funcaoCargo: '', cpf: '', dataNascimento: '', dataInicio: '', dataSaida: '', igrejaOrigem: '', arquivosReferencia: '' }

export default function VoluntariosEventoPage() {
  const [data, setData] = useState<VolEv[]>([])
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [funcoesCargo, setFuncoesCargo] = useState<FuncaoCargo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<VolEv | null>(null)
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
    fetch('/api/migrate/funcao-cargo-voluntario', { method: 'POST' }).catch(() => {})
    try {
      const [rv, re, rd, rf] = await Promise.all([
        fetch('/api/voluntarios-amo'),
        fetch('/api/eventos'),
        fetch('/api/voluntarios-evento'),
        fetch('/api/auxiliares/funcoes-cargo'),
      ])
      const [jv, je, jd, jf] = await Promise.all([rv.json(), re.json(), rd.json(), rf.json()])
      if (jv.success) setVoluntarios(jv.data)
      if (je.success) setEventos(je.data.filter((e: any) => e.status !== 'encerrado_consolidado'))
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
    setEditing(row as unknown as VolEv)
    setForm({ voluntarioId: String(row.voluntarioId||''), eventoId: String(row.eventoId||''), funcaoCargo: String(row.funcaoCargo||''), cpf: String(row.cpf||''), dataNascimento: row.dataNascimento ? String(row.dataNascimento).slice(0,10) : '', dataInicio: row.dataInicio ? String(row.dataInicio).slice(0,10) : '', dataSaida: row.dataSaida ? String(row.dataSaida).slice(0,10) : '', igrejaOrigem: String(row.igrejaOrigem||''), arquivosReferencia: String(row.arquivosReferencia||'') })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.voluntarioId || !form.eventoId || !form.funcaoCargo || !form.cpf || !form.dataNascimento || !form.dataInicio) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, dataSaida: form.dataSaida||null, igrejaOrigem: form.igrejaOrigem||null, arquivosReferencia: form.arquivosReferencia||null }
      const res = await fetch(editing ? `/api/voluntarios-evento/${(editing as VolEv).id}` : '/api/voluntarios-evento', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Registro atualizado!' : 'Voluntário adicionado ao evento!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/voluntarios-evento/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Registro removido!'); setDeleteConfirm(null); fetchData() } else showToast('Erro ao remover', 'error') }
    catch { showToast('Erro ao remover', 'error') }
  }

  const selectedEvento = eventos.find(e => e.id === form.eventoId)

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Voluntários do Evento</h1><p className="text-sm text-navy-400">{data.length} registros</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Adicionar Voluntário</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'voluntarioId', label: 'Voluntário', render: (v) => voluntarios.find(x => x.id === String(v))?.nome || String(v) }, { key: 'eventoId', label: 'Evento', render: (v) => eventos.find(x => x.id === String(v))?.nome || String(v) }, { key: 'funcaoCargo', label: 'Função/Cargo' }, { key: 'igrejaOrigem', label: 'Igreja' }, { key: 'dataInicio', label: 'Início', render: (v) => fmtDate(String(v)) }]} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['funcaoCargo', 'cpf']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Voluntário do Evento' : 'Adicionar Voluntário ao Evento'} size="lg"
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
            <label>Evento<span className="required-star">*</span></label>
            <select value={form.eventoId} onChange={e => setForm(p => ({ ...p, eventoId: e.target.value }))} className="form-input">
              <option value="">Selecione o evento...</option>
              {eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>
          <div className="form-group md:col-span-2">
            <label>Função/Cargo no Evento<span className="required-star">*</span></label>
            <select value={form.funcaoCargo} onChange={e => setForm(p => ({ ...p, funcaoCargo: e.target.value }))} className="form-input">
              <option value="">Selecione a função/cargo...</option>
              {funcoesCargo.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
            </select>
            {funcoesCargo.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Nenhuma função cadastrada. Acesse <strong>Tabelas Auxiliares → Funções de Voluntários</strong> para cadastrar.</p>
            )}
          </div>
          <div className="form-group">
            <label>CPF<span className="required-star">*</span></label>
            <input type="text" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className="form-input" />
          </div>
          <DateInput label="Data de Nascimento" required value={form.dataNascimento} onChange={v=>setForm(p=>({...p,dataNascimento:v}))}/>
          <DateInput
            label="Data de Início no Evento"
            required
            value={form.dataInicio}
            onChange={v=>setForm(p=>({...p,dataInicio:v}))}
            minDate={selectedEvento?.dataInicio ? String(selectedEvento.dataInicio).slice(0,10) : undefined}
            maxDate={selectedEvento?.dataEncerramento ? String(selectedEvento.dataEncerramento).slice(0,10) : undefined}
          />
          <DateInput
            label="Data de Saída do Evento"
            value={form.dataSaida}
            onChange={v=>setForm(p=>({...p,dataSaida:v}))}
            minDate={form.dataInicio || undefined}
            maxDate={selectedEvento?.dataEncerramento ? String(selectedEvento.dataEncerramento).slice(0,10) : undefined}
          />
          <div className="form-group md:col-span-2">
            <label>Igreja de Origem</label>
            <input type="text" placeholder="Nome da igreja" value={form.igrejaOrigem} onChange={e => setForm(p => ({ ...p, igrejaOrigem: e.target.value }))} className="form-input" />
          </div>
          <div className="md:col-span-2">
            <FileUpload label="Arquivos de Referência" value={form.arquivosReferencia} onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Adicionar'}</button>
        </div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Remover este voluntário do evento?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Remover</button>
        </div>
      </Modal>
    </div>
  )
}
