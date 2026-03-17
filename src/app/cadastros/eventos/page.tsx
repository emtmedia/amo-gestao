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
import PasswordConfirmModal from '@/components/ui/PasswordConfirmModal'

interface Evento { id: string; nome: string; responsavel: string; dataInicio: string; dataEncerramento: string; orcamentoEstimado: number; estadoRealizacao?: string; cidadeRealizacao?: string; status?: string; projetoVinculadoId?: string | null }
interface Projeto { id: string; nome: string; status?: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface UF { id: string; codigo: string; nome: string }
interface Cidade { id: string; nome: string; ufId: string }

const emptyForm = { projetoVinculadoId: '', nome: '', dataInicio: '', dataEncerramento: '', responsavel: '', emailResponsavel: '', telefoneResponsavel: '', orcamentoEstimado: '', contaBancariaVinculada1: '', contaBancariaVinculada2: '', paisRealizacao: 'Brasil', ufId: '', cidadeId: '', estadoRealizacao: '', cidadeRealizacao: '', enderecoGoogleMaps: '', numeroVoluntarios: '', comentarios: '', arquivosReferencia: '' }

type StatusFilter = 'todos' | 'em_curso' | 'encerrado_consolidado' | 'encerrado_pendente'

const statusLabel = (status?: string) => {
  if (status === 'encerrado_consolidado') return 'Encerrado & Consolidado'
  if (status === 'encerrado_pendente') return 'Encerrado & Pendente $'
  return 'Em Curso'
}

const statusColor = (status?: string) => {
  if (status === 'encerrado_consolidado') return 'bg-green-100 text-green-800 border border-green-200'
  if (status === 'encerrado_pendente') return 'bg-amber-100 text-amber-800 border border-amber-200'
  return 'bg-blue-100 text-blue-800 border border-blue-200'
}

const rowClassName = (row: Evento) => {
  if (row.status === 'encerrado_consolidado') return 'bg-green-50/50'
  if (row.status === 'encerrado_pendente') return 'bg-amber-50/50'
  return ''
}

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
  const [userRole, setUserRole] = useState<string>('user')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [pendingEdit, setPendingEdit] = useState<Evento | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [re, rp, rc, ru, rme] = await Promise.all([
        fetch('/api/eventos'),
        fetch('/api/projetos'),
        fetch('/api/contas-bancarias'),
        fetch('/api/uf'),
        fetch('/api/auth/me'),
      ])
      const [je, jp, jc, ju, jme] = await Promise.all([re.json(), rp.json(), rc.json(), ru.json(), rme.json()])
      if (je.success) setData(je.data)
      if (jp.success) setProjetos(jp.data)
      if (jc.success) setContas(jc.data)
      if (ju.success) setUfs(ju.data)
      if (jme.usuario) setUserRole(jme.usuario.role)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fetchCidades = async (ufId: string): Promise<Cidade[]> => {
    if (!ufId) { setCidades([]); return [] }
    try {
      const r = await fetch(`/api/cidades?ufId=${ufId}`)
      const j = await r.json()
      if (j.success) { setCidades(j.data); return j.data as Cidade[] }
    } catch { setCidades([]) }
    return []
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

  const doEdit = async (row: Evento) => {
    setEditing(row)
    const r = row as unknown as Record<string, unknown>
    const estadoRealizacao = String(r.estadoRealizacao || '')
    const cidadeRealizacao = String(r.cidadeRealizacao || '')
    const uf = ufs.find(u => u.codigo === estadoRealizacao)
    const ufId = uf?.id || ''
    let cidadeId = ''
    if (ufId) {
      const cidadesList = await fetchCidades(ufId)
      cidadeId = cidadesList.find(c => c.nome === cidadeRealizacao)?.id || ''
    }
    setForm({ projetoVinculadoId: String(r.projetoVinculadoId||''), nome: String(r.nome||''), dataInicio: r.dataInicio ? String(r.dataInicio).slice(0,10) : '', dataEncerramento: r.dataEncerramento ? String(r.dataEncerramento).slice(0,10) : '', responsavel: String(r.responsavel||''), emailResponsavel: String(r.emailResponsavel||''), telefoneResponsavel: String(r.telefoneResponsavel||''), orcamentoEstimado: String(r.orcamentoEstimado||''), contaBancariaVinculada1: String(r.contaBancariaVinculada1||''), contaBancariaVinculada2: String(r.contaBancariaVinculada2||''), paisRealizacao: String(r.paisRealizacao||'Brasil'), ufId, cidadeId, estadoRealizacao, cidadeRealizacao, enderecoGoogleMaps: String(r.enderecoGoogleMaps||''), numeroVoluntarios: String(r.numeroVoluntarios||''), comentarios: String(r.comentarios||''), arquivosReferencia: String(r.arquivosReferencia||'') })
    setModalOpen(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    const evento = row as unknown as Evento
    if (evento.status === 'encerrado_consolidado') {
      if (!['admin', 'superadmin'].includes(userRole)) {
        showToast('Apenas Admins podem editar eventos consolidados', 'error')
        return
      }
      setPendingEdit(evento)
      setShowPasswordModal(true)
      return
    }
    doEdit(evento)
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

  const filterChips: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'em_curso', label: 'Em Curso' },
    { key: 'encerrado_consolidado', label: 'Encerrado & Consolidado' },
    { key: 'encerrado_pendente', label: 'Encerrado & Pendente $' },
  ]

  const filteredData = statusFilter === 'todos' ? data : data.filter(e => e.status === statusFilter)

  // Projects available in dropdown: exclude encerrado_consolidado
  const projetosDropdown = projetos.filter(p => p.status !== 'encerrado_consolidado')

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

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {filterChips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setStatusFilter(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === chip.key ? 'bg-navy-700 text-white border-navy-700' : 'bg-white text-navy-600 border-cream-300 hover:bg-cream-50'}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable
            data={filteredData}
            columns={[
              { key: 'nome', label: 'Evento' },
              { key: 'projetoVinculadoId', label: 'Projeto', render: (v) => {
                const p = projetos.find(x => x.id === String(v))
                return p
                  ? <span className="text-xs font-medium text-navy-700">{p.nome}</span>
                  : <span className="text-xs text-navy-400 italic">Avulso</span>
              }},
              { key: 'responsavel', label: 'Responsável' },
              { key: 'telefoneResponsavel', label: 'Telefone' },
              { key: 'dataInicio', label: 'Início', render: (v) => fmtDate(String(v)) },
              { key: 'dataEncerramento', label: 'Encerramento', render: (v) => fmtDate(String(v)) },
              { key: 'orcamentoEstimado', label: 'Orçamento', render: (v) => fmtMoney(Number(v)) },
              { key: 'estadoRealizacao', label: 'UF' },
              { key: 'cidadeRealizacao', label: 'Cidade' },
              { key: 'status', label: 'Status', render: (v) => (
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColor(String(v))}`}>
                  {statusLabel(String(v))}
                </span>
              )},
            ]}
            onEdit={openEdit}
            onDelete={(row) => setDeleteConfirm(String(row.id))}
            searchKeys={['nome', 'responsavel']}
            rowClassName={rowClassName}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Evento' : 'Novo Evento'} size="xl" alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group md:col-span-2">
            <label>Projeto Vinculado ao Evento</label>
            <select value={form.projetoVinculadoId} onChange={e => setForm(p => ({ ...p, projetoVinculadoId: e.target.value }))} className="form-input">
              <option value="">Evento Avulso (sem projeto)</option>
              {projetosDropdown.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
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

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        title="Editar Evento Consolidado"
        description="Este evento está consolidado. Confirme sua senha para continuar."
        onConfirmed={() => {
          setShowPasswordModal(false)
          if (pendingEdit) doEdit(pendingEdit)
          setPendingEdit(null)
        }}
        onCancel={() => {
          setShowPasswordModal(false)
          setPendingEdit(null)
        }}
      />

      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
