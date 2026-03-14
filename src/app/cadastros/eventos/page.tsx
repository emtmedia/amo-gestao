'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Calendar } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import BlockErrorModal from '@/components/ui/BlockErrorModal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'
import PhoneInput from '@/components/ui/PhoneInput'

interface Evento { id: string; nome: string; responsavel: string; dataInicio: string; dataEncerramento: string; orcamentoEstimado: number; estadoRealizacao?: string; cidadeRealizacao?: string }
interface Projeto { id: string; nome: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface UF { id: string; codigo: string; nome: string }
interface Cidade { id: string; nome: string; ufId: string }

const emptyForm = { projetoVinculadoId: '', nome: '', dataInicio: '', dataEncerramento: '', responsavel: '', emailResponsavel: '', telefoneResponsavel: '', orcamentoEstimado: '', contaBancariaVinculada1: '', contaBancariaVinculada2: '', paisRealizacao: 'Brasil', ufId: '', cidadeId: '', estadoRealizacao: '', cidadeRealizacao: '', enderecoGoogleMaps: '', numeroVoluntarios: '', comentarios: '', arquivosReferencia: '' }

export default function EventosPage() {
  const [data, setData] = useState<Evento[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [ufs, setUfs] = useState<UF[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Evento | null>(null)
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
      const [re, rp, rc, ru] = await Promise.all([fetch('/api/eventos'), fetch('/api/projetos'), fetch('/api/contas-bancarias'), fetch('/api/uf')])
      const [je, jp, jc, ju] = await Promise.all([re.json(), rp.json(), rc.json(), ru.json()])
      if (je.success) setData(je.data)
      if (jp.success) setProjetos(jp.data)
      if (jc.success) setContas(jc.data)
      if (ju.success) setUfs(ju.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fetchCidades = async (ufId: string) => {
    if (!ufId) { setCidades([]); return }
    try {
      const r = await fetch(`/api/cidades?ufId=${ufId}`)
      const j = await r.json()
      if (j.success) setCidades(j.data)
    } catch { setCidades([]) }
  }

  const onUfChange = (ufId: string) => {
    const uf = ufs.find(u => u.id === ufId)
    setForm(p => ({ ...p, ufId, cidadeId: '', estadoRealizacao: uf?.codigo || '', cidadeRealizacao: '' }))
    fetchCidades(ufId)
  }

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const fmtMoney = (v: number) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const openCreate = () => { setEditing(null); setForm(emptyForm); setCidades([]); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Evento)
    const ufId = String(row.ufId || '')
    const cidadeId = String(row.cidadeId || '')
    setForm({ projetoVinculadoId: String(row.projetoVinculadoId||''), nome: String(row.nome||''), dataInicio: row.dataInicio ? String(row.dataInicio).slice(0,10) : '', dataEncerramento: row.dataEncerramento ? String(row.dataEncerramento).slice(0,10) : '', responsavel: String(row.responsavel||''), emailResponsavel: String(row.emailResponsavel||''), telefoneResponsavel: String(row.telefoneResponsavel||''), orcamentoEstimado: String(row.orcamentoEstimado||''), contaBancariaVinculada1: String(row.contaBancariaVinculada1||''), contaBancariaVinculada2: String(row.contaBancariaVinculada2||''), paisRealizacao: String(row.paisRealizacao||'Brasil'), ufId, cidadeId, estadoRealizacao: String(row.estadoRealizacao||''), cidadeRealizacao: String(row.cidadeRealizacao||''), enderecoGoogleMaps: String(row.enderecoGoogleMaps||''), numeroVoluntarios: String(row.numeroVoluntarios||''), comentarios: String(row.comentarios||''), arquivosReferencia: String(row.arquivosReferencia||'') })
    if (ufId) fetchCidades(ufId)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nome || !form.dataInicio || !form.dataEncerramento || !form.responsavel || !form.telefoneResponsavel || !form.orcamentoEstimado || !form.enderecoGoogleMaps) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, orcamentoEstimado: parseBRL(form.orcamentoEstimado), numeroVoluntarios: form.numeroVoluntarios ? parseInt(form.numeroVoluntarios) : null, projetoVinculadoId: form.projetoVinculadoId||null, emailResponsavel: form.emailResponsavel||null, contaBancariaVinculada1: form.contaBancariaVinculada1||null, contaBancariaVinculada2: form.contaBancariaVinculada2||null, ufId: form.ufId||null, cidadeId: form.cidadeId||null, estadoRealizacao: form.estadoRealizacao||null, cidadeRealizacao: form.cidadeRealizacao||null, comentarios: form.comentarios||null, arquivosReferencia: form.arquivosReferencia||null }
      const res = await fetch(editing ? `/api/eventos/${(editing as Evento).id}` : '/api/eventos', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Evento atualizado!' : 'Evento criado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/eventos/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Evento removido!'); setDeleteConfirm(null); fetchData() } else showToast('Erro ao remover', 'error') }
    catch { showToast('Erro ao remover', 'error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type={type} placeholder={placeholder || label} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Eventos</h1><p className="text-sm text-navy-400">{data.length} evento(s) cadastrado(s)</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Evento</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'nome', label: 'Evento' }, { key: 'responsavel', label: 'Responsável' }, { key: 'telefoneResponsavel', label: 'Telefone' }, { key: 'dataInicio', label: 'Início', render: (v) => fmtDate(String(v)) }, { key: 'dataEncerramento', label: 'Encerramento', render: (v) => fmtDate(String(v)) }, { key: 'orcamentoEstimado', label: 'Orçamento', render: (v) => fmtMoney(Number(v)) }, { key: 'estadoRealizacao', label: 'UF' }, { key: 'cidadeRealizacao', label: 'Cidade' }]} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['nome', 'responsavel']} />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Evento' : 'Novo Evento'} size="xl" alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group md:col-span-2">
            <label>Projeto Vinculado ao Evento</label>
            <select value={form.projetoVinculadoId} onChange={e => setForm(p => ({ ...p, projetoVinculadoId: e.target.value }))} className="form-input">
              <option value="">Evento Avulso (sem projeto)</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">{inp('nome', 'Nome do Evento', true)}</div>

          <DateInput label="Data de Início" required value={form.dataInicio} onChange={v => setForm(p => ({ ...p, dataInicio: v }))} />
          <DateInput label="Data de Encerramento" required value={form.dataEncerramento} onChange={v => setForm(p => ({ ...p, dataEncerramento: v }))} minDate={form.dataInicio} />

          {inp('responsavel', 'Responsável pelo Evento', true)}
          <PhoneInput label="Telefone do Responsável" required value={form.telefoneResponsavel} onChange={v=>setForm(p=>({...p,telefoneResponsavel:v}))}/>
          {inp('emailResponsavel', 'E-mail do Responsável', false, 'email')}
          <CurrencyInput label="Orçamento Estimado (R$)" required value={form.orcamentoEstimado} onChange={v => setForm(p => ({ ...p, orcamentoEstimado: v }))} />

          <div className="form-group">
            <label>Conta Bancária Vinculada 1<span className="required-star">*</span></label>
            <select value={form.contaBancariaVinculada1} onChange={e => setForm(p => ({ ...p, contaBancariaVinculada1: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Conta Bancária Vinculada 2</label>
            <select value={form.contaBancariaVinculada2} onChange={e => setForm(p => ({ ...p, contaBancariaVinculada2: e.target.value }))} className="form-input">
              <option value="">Nenhuma</option>
              {contas.map(c => <option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
            </select>
          </div>

          {inp('paisRealizacao', 'País', true, 'text', 'Brasil')}

          <div className="form-group">
            <label>Estado (UF)<span className="required-star">*</span></label>
            <select value={form.ufId} onChange={e => onUfChange(e.target.value)} className="form-input">
              <option value="">Selecione o estado...</option>
              {ufs.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Cidade<span className="required-star">*</span></label>
            <select value={form.cidadeId} onChange={e => { const c = cidades.find(x => x.id === e.target.value); setForm(p => ({ ...p, cidadeId: e.target.value, cidadeRealizacao: c?.nome || '' })) }} className="form-input" disabled={!form.ufId}>
              <option value="">{form.ufId ? 'Selecione a cidade...' : 'Selecione o estado primeiro'}</option>
              {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">{inp('enderecoGoogleMaps', 'Link do Endereço (Google Maps)', true, 'url', 'https://maps.google.com/...')}</div>
          {inp('numeroVoluntarios', 'Nº Estimado de Voluntários', false, 'number', '0')}
          <div className="md:col-span-2">
            <div className="form-group">
              <label>Comentários</label>
              <textarea rows={3} placeholder="Comentários sobre o evento" value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))} className="form-input resize-none" />
            </div>
          </div>
          <div className="md:col-span-2">
            <FileUpload label="Arquivos de Referência" value={form.arquivosReferencia} onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))} folder="eventos" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Evento'}</button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Tem certeza que deseja excluir este evento?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
