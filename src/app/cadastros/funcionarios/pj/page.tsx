'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Building } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface FuncPJ { id: string; nomeCompleto: string; cnpj: string; nomeEmpresa: string; cargoId: string; funcaoId: string; dataContratacao: string }
interface Opcao { id: string; nome: string }

const emptyForm = { nomeCompleto: '', nomeEmpresa: '', nomeFantasia: '', dataConstituicao: '', cnpj: '', dataContratacao: '', cargoId: '', funcaoId: '', valorMedicaoMensal: '', observacoes: '', arquivosReferencia: '' }

export default function FuncionariosPJPage() {
  const [data, setData] = useState<FuncPJ[]>([])
  const [cargos, setCargos] = useState<Opcao[]>([])
  const [funcoes, setFuncoes] = useState<Opcao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FuncPJ | null>(null)
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
    try {
      const [rd, rc, rf] = await Promise.all([fetch('/api/funcionarios-pj'), fetch('/api/auxiliares?tipo=cargos'), fetch('/api/auxiliares?tipo=funcoes')])
      const [jd, jc, jf] = await Promise.all([rd.json(), rc.json(), rf.json()])
      if (jd.success) setData(jd.data)
      if (jc.success) setCargos(jc.data)
      if (jf.success) setFuncoes(jf.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const fmtMoney = (v: number) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as FuncPJ)
    setForm({ nomeCompleto: String(row.nomeCompleto||''), nomeEmpresa: String(row.nomeEmpresa||''), nomeFantasia: String(row.nomeFantasia||''), dataConstituicao: row.dataConstituicao ? String(row.dataConstituicao).slice(0,10) : '', cnpj: String(row.cnpj||''), dataContratacao: row.dataContratacao ? String(row.dataContratacao).slice(0,10) : '', cargoId: String(row.cargoId||''), funcaoId: String(row.funcaoId||''), valorMedicaoMensal: String(row.valorMedicaoMensal||''), observacoes: String(row.observacoes||''), arquivosReferencia: String(row.arquivosReferencia||'') })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomeCompleto || !form.nomeEmpresa || !form.cnpj || !form.dataContratacao || !form.cargoId || !form.funcaoId) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, valorMedicaoMensal: form.valorMedicaoMensal ? parseBRL(form.valorMedicaoMensal) : null, observacoes: form.observacoes||null,
        arquivosReferencia: form.arquivosReferencia||null, nomeFantasia: form.nomeFantasia||null }
      const res = await fetch(editing ? `/api/funcionarios-pj/${(editing as FuncPJ).id}` : '/api/funcionarios-pj', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Colaborador atualizado!' : 'Colaborador criado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/funcionarios-pj/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Colaborador removido!'); setDeleteConfirm(null); fetchData() } else showToast('Erro ao remover', 'error') }
    catch { showToast('Erro ao remover', 'error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type={type} placeholder={placeholder||label} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Building className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Colaboradores PJ</h1><p className="text-sm text-navy-400">{data.length} colaborador(es)</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Colaborador PJ</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'nomeCompleto', label: 'Nome' }, { key: 'nomeEmpresa', label: 'Empresa' }, { key: 'nomeFantasia', label: 'Fantasia', render: v => v ? String(v) : '—' }, { key: 'cnpj', label: 'CNPJ' }, { key: 'cargoId', label: 'Cargo', render: (v) => cargos.find(c => c.id === String(v))?.nome || '-' }, { key: 'funcaoId', label: 'Função', render: (v) => funcoes.find(f => f.id === String(v))?.nome || '-' }, { key: 'valorMedicaoMensal', label: 'Medição Mensal', render: (v) => fmtMoney(Number(v)) }, { key: 'dataContratacao', label: 'Contratação', render: (v) => fmtDate(String(v)) }]} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['nomeCompleto', 'cnpj', 'nomeEmpresa']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Colaborador PJ' : 'Novo Colaborador PJ'} size="xl"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">{inp('nomeCompleto', 'Nome Completo do Colaborador', true)}</div>
          {inp('nomeEmpresa', 'Razão Social da Empresa', true)}
          {inp('nomeFantasia', 'Nome Fantasia', true)}
          <DateInput label="Data de Constituição da Empresa" required value={form.dataConstituicao} onChange={v=>setForm(p=>({...p,dataConstituicao:v}))}/>
          {inp('cnpj', 'CNPJ', true, 'text', '00.000.000/0000-00')}
          <DateInput label="Data de Contratação/Início" required value={form.dataContratacao} onChange={v=>setForm(p=>({...p,dataContratacao:v}))}/>
          <div className="form-group">
            <label>Cargo<span className="required-star">*</span></label>
            <select value={form.cargoId} onChange={e => setForm(p => ({ ...p, cargoId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Função<span className="required-star">*</span></label>
            <select value={form.funcaoId} onChange={e => setForm(p => ({ ...p, funcaoId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {funcoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          {<CurrencyInput label="Valor da Medição Mensal (R$)" value={form.valorMedicaoMensal} onChange={v=>setForm(p=>({...p,valorMedicaoMensal:v}))}/>}
          <div className="md:col-span-2">
            <div className="form-group"><label>Observações</label><textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="form-input resize-none" /></div>
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
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Colaborador PJ'}</button>
        </div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Tem certeza que deseja excluir este colaborador?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
