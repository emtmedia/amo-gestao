'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, FolderHeart } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import BlockErrorModal from '@/components/ui/BlockErrorModal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'
import PhoneInput from '@/components/ui/PhoneInput'
import PasswordConfirmModal from '@/components/ui/PasswordConfirmModal'

interface Projeto { id: string; nome: string; responsavel: string; dataInicio: string; dataEncerramento: string; orcamentoEstimado: number; paisRealizacao: string; estadoRealizacao?: string; createdAt: string; status?: string }
interface Departamento { id: string; nome: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface UF { id: string; codigo: string; nome: string }
interface Cidade { id: string; nome: string; ufId: string }

const emptyForm = { nome: '', dataInicio: '', dataEncerramento: '', responsavel: '', emailResponsavel: '', telefoneResponsavel: '', orcamentoEstimado: '', contaBancariaVinculada1: '', contaBancariaVinculada2: '', paisRealizacao: 'Brasil', ufId: '', cidadeId: '', estadoRealizacao: '', cidadeRealizacao: '', numeroVoluntarios: '', departamentoId: '', comentarios: '', arquivosReferencia: '' }

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

const rowClassName = (row: Projeto) => {
  if (row.status === 'encerrado_consolidado') return 'bg-green-50/50'
  if (row.status === 'encerrado_pendente') return 'bg-amber-50/50'
  return ''
}

export default function ProjetosPage() {
  const [data, setData] = useState<Projeto[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [ufs, setUfs] = useState<UF[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Projeto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [userRole, setUserRole] = useState<string>('user')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [pendingEdit, setPendingEdit] = useState<Projeto | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchCidades = async (ufId: string): Promise<Cidade[]> => {
    if (!ufId) { setCidades([]); return [] }
    setLoadingCidades(true)
    try {
      const r = await fetch(`/api/cidades?ufId=${ufId}`)
      const j = await r.json()
      if (j.success) { setCidades(j.data); return j.data as Cidade[] }
      return []
    } finally { setLoadingCidades(false) }
  }

  const onUfChange = (ufId: string) => {
    const uf = ufs.find(u => u.id === ufId)
    setForm(p => ({ ...p, ufId, cidadeId: '', estadoRealizacao: uf?.codigo || '', cidadeRealizacao: '' }))
    fetchCidades(ufId)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rp, rd, rc, ruf, rme] = await Promise.all([
        fetch('/api/projetos'),
        fetch('/api/departamentos'),
        fetch('/api/contas-bancarias'),
        fetch('/api/uf'),
        fetch('/api/auth/me'),
      ])
      const [jp, jd, jc, juf, jme] = await Promise.all([rp.json(), rd.json(), rc.json(), ruf.json(), rme.json()])
      if (jp.success) setData(jp.data)
      if (jd.success) setDepartamentos(jd.data)
      if (jc.success) setContas(jc.data)
      if (juf.success) setUfs(juf.data.sort((a: UF, b: UF) => a.codigo.localeCompare(b.codigo)))
      if (jme.usuario) setUserRole(jme.usuario.role)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const fmtMoney = (v: number) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'

  const openCreate = () => { setEditing(null); setForm(emptyForm); setCidades([]); setModalAlert(null); setModalOpen(true) }

  const doEdit = async (row: Projeto) => {
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
    setForm({ nome: String(r.nome||''), dataInicio: r.dataInicio ? String(r.dataInicio).slice(0,10) : '', dataEncerramento: r.dataEncerramento ? String(r.dataEncerramento).slice(0,10) : '', responsavel: String(r.responsavel||''), emailResponsavel: String(r.emailResponsavel||''), telefoneResponsavel: String(r.telefoneResponsavel||''), orcamentoEstimado: String(r.orcamentoEstimado||''), contaBancariaVinculada1: String(r.contaBancariaVinculada1||''), contaBancariaVinculada2: String(r.contaBancariaVinculada2||''), paisRealizacao: String(r.paisRealizacao||'Brasil'), ufId, cidadeId, estadoRealizacao, cidadeRealizacao, numeroVoluntarios: String(r.numeroVoluntarios||''), departamentoId: String(r.departamentoId||''), comentarios: String(r.comentarios||''), arquivosReferencia: String(r.arquivosReferencia||'') })
    setModalOpen(true)
  }

  const isAdminGeralNome = (nome?: string) =>
    (nome || '').trim().toUpperCase() === 'ADMINISTRAÇÃO GERAL'

  const openEdit = (row: Record<string, unknown>) => {
    const projeto = row as unknown as Projeto
    if (isAdminGeralNome(projeto.nome)) {
      if (userRole !== 'superadmin') {
        showToast('O projeto ADMINISTRAÇÃO GERAL só pode ser editado pelo SuperAdmin', 'error')
        return
      }
      setPendingEdit(projeto)
      setShowPasswordModal(true)
      return
    }
    if (projeto.status === 'encerrado_consolidado') {
      if (userRole !== 'superadmin') {
        showToast('Apenas o SUPERADMIN pode editar projetos consolidados', 'error')
        return
      }
      setPendingEdit(projeto)
      setShowPasswordModal(true)
      return
    }
    doEdit(projeto)
  }

  const handleSave = async () => {
    if (!form.nome || !form.dataInicio || !form.dataEncerramento || !form.responsavel || !form.telefoneResponsavel || !form.orcamentoEstimado) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, orcamentoEstimado: parseBRL(form.orcamentoEstimado), numeroVoluntarios: form.numeroVoluntarios ? parseInt(form.numeroVoluntarios) : null, emailResponsavel: form.emailResponsavel||null, contaBancariaVinculada1: form.contaBancariaVinculada1||null, contaBancariaVinculada2: form.contaBancariaVinculada2||null, ufId: form.ufId||null, cidadeId: form.cidadeId||null, estadoRealizacao: form.estadoRealizacao||null, cidadeRealizacao: form.cidadeRealizacao||null, departamentoId: form.departamentoId||null, comentarios: form.comentarios||null }
      const res = await fetch(editing ? `/api/projetos/${(editing as Projeto).id}` : '/api/projetos', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Projeto atualizado!' : 'Projeto criado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const isAdmin = userRole === 'admin' || userRole === 'superadmin'

  const openDelete = (id: string) => {
    const projeto = data.find(p => p.id === id)
    if (isAdminGeralNome(projeto?.nome)) {
      if (userRole !== 'superadmin') {
        showToast('O projeto ADMINISTRAÇÃO GERAL só pode ser excluído pelo SuperAdmin', 'error')
        return
      }
      setPendingDeleteId(id)
      setShowDeletePasswordModal(true)
      return
    }
    if (!isAdmin) { showToast('Apenas Admin ou SuperAdmin podem excluir projetos', 'error'); return }
    setPendingDeleteId(id)
    setShowDeletePasswordModal(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteId) return
    setShowDeletePasswordModal(false)
    setDeleting(true)
    try {
      const r = await fetch(`/api/projetos/${pendingDeleteId}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) {
        showToast('Projeto excluído! Extrato salvo na Biblioteca de Documentos com Acesso Restrito.')
        fetchData()
      } else {
        showToast(j.error || 'Erro ao excluir', 'error')
      }
    } catch {
      showToast('Erro ao excluir projeto', 'error')
    } finally {
      setDeleting(false)
      setPendingDeleteId(null)
    }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type={type} placeholder={placeholder || label} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )
  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const filterChips: { key: StatusFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'em_curso', label: 'Em Curso' },
    { key: 'encerrado_consolidado', label: 'Encerrado & Consolidado' },
    { key: 'encerrado_pendente', label: 'Encerrado & Pendente $' },
  ]

  const filteredData = statusFilter === 'todos' ? data : data.filter(p => p.status === statusFilter)

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <FolderHeart className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Projetos de Filantropia</h1><p className="text-sm text-navy-400">{data.length} projetos cadastrado(s)</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Projeto</button>
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
              { key: 'nome', label: 'Projeto' },
              { key: 'responsavel', label: 'Responsável' },
              { key: 'telefoneResponsavel', label: 'Telefone' },
              { key: 'dataInicio', label: 'Início', render: (v) => fmtDate(String(v)) },
              { key: 'dataEncerramento', label: 'Encerramento', render: (v) => fmtDate(String(v)) },
              { key: 'orcamentoEstimado', label: 'Orçamento', render: (v) => fmtMoney(Number(v)) },
              { key: 'estadoRealizacao', label: 'UF' },
              { key: 'cidadeRealizacao', label: 'Cidade' },
              { key: 'voluntariosEstimados', label: 'Voluntários', render: v => v ? String(v) : '—' },
              { key: 'status', label: 'Status', render: (v) => (
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColor(String(v))}`}>
                  {statusLabel(String(v))}
                </span>
              )},
            ]}
            onEdit={openEdit}
            onDelete={isAdmin ? (row) => openDelete(String(row.id)) : undefined}
            searchKeys={['nome', 'responsavel']}
            rowClassName={rowClassName}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Projeto' : 'Novo Projeto de Filantropia'} size="xl" alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">{inp('nome', 'Nome do Projeto', true)}</div>
          <DateInput label="Data de Início" required value={form.dataInicio} onChange={v=>setForm(p=>({...p,dataInicio:v}))}/>
          <DateInput label="Data de Encerramento" required value={form.dataEncerramento} onChange={v=>setForm(p=>({...p,dataEncerramento:v}))}/>
          {inp('responsavel', 'Responsável pelo Projeto', true)}
          <PhoneInput label="Telefone do Responsável" required value={form.telefoneResponsavel} onChange={v=>setForm(p=>({...p,telefoneResponsavel:v}))}/>
          {inp('emailResponsavel', 'E-mail do Responsável', false, 'email')}
          {<CurrencyInput label="Orçamento Estimado (R$)" required value={form.orcamentoEstimado} onChange={v=>setForm(p=>({...p,orcamentoEstimado:v}))}/>}
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
          {inp('paisRealizacao', 'País de Realização', true, 'text', 'Brasil')}
          <div className="form-group">
            <label>Estado (UF)<span className="required-star">*</span></label>
            <select value={form.ufId} onChange={e => onUfChange(e.target.value)} className="form-input">
              <option value="">Selecione o estado...</option>
              {ufs.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Cidade<span className="required-star">*</span></label>
            <select value={form.cidadeId} onChange={e => { const c = cidades.find(x => x.id === e.target.value); setForm(p => ({ ...p, cidadeId: e.target.value, cidadeRealizacao: c?.nome || '' })) }} className="form-input" disabled={!form.ufId || loadingCidades}>
              <option value="">{!form.ufId ? '← Selecione a UF primeiro' : loadingCidades ? 'Carregando...' : cidades.length === 0 ? 'Nenhuma cidade cadastrada' : 'Selecione a cidade...'}</option>
              {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {inp('numeroVoluntarios', 'Nº Estimado de Voluntários', false, 'number', '0')}
          <div className="form-group">
            <label>Departamento Relacionado</label>
            <select value={form.departamentoId} onChange={e => setForm(p => ({ ...p, departamentoId: e.target.value }))} className="form-input">
              <option value="">Sem Departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <div className="form-group">
              <label>Comentários</label>
              <textarea rows={3} placeholder="Comentários sobre o projeto" value={form.comentarios} onChange={e => setForm(p => ({ ...p, comentarios: e.target.value }))} className="form-input resize-none" />
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
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Projeto'}</button>
        </div>
      </Modal>

      <PasswordConfirmModal
        isOpen={showPasswordModal}
        title={isAdminGeralNome(pendingEdit?.nome) ? 'Editar Projeto Especial — ADMINISTRAÇÃO GERAL' : 'Editar Projeto Consolidado'}
        description={isAdminGeralNome(pendingEdit?.nome)
          ? 'O projeto ADMINISTRAÇÃO GERAL tem caráter especial e só pode ser editado pelo SuperAdmin. Confirme sua senha para continuar.'
          : 'Este projeto está consolidado. Confirme sua senha para continuar.'}
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

      <PasswordConfirmModal
        isOpen={showDeletePasswordModal}
        title={isAdminGeralNome(data.find(p => p.id === pendingDeleteId)?.nome) ? 'Excluir Projeto Especial — ADMINISTRAÇÃO GERAL' : 'Confirmar Exclusão de Projeto'}
        description={isAdminGeralNome(data.find(p => p.id === pendingDeleteId)?.nome)
          ? 'O projeto ADMINISTRAÇÃO GERAL tem caráter especial e só pode ser excluído pelo SuperAdmin. Esta ação é irreversível. Um extrato completo será salvo antes da exclusão. Confirme sua senha para prosseguir.'
          : 'Esta ação é irreversível. Um extrato completo será salvo na Biblioteca de Documentos antes da exclusão. Confirme sua senha para prosseguir.'}
        onConfirmed={handleDeleteConfirmed}
        onCancel={() => { setShowDeletePasswordModal(false); setPendingDeleteId(null) }}
      />

      {deleting && (
        <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-2xl text-center space-y-2">
            <div className="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-navy-700 font-medium text-sm">Gerando extrato e excluindo projeto...</p>
            <p className="text-navy-400 text-xs">Isso pode levar alguns segundos.</p>
          </div>
        </div>
      )}

      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
