'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Briefcase } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface FuncCLT { id: string; nomeCompleto: string; cpf: string; cargoId: string; funcaoId: string; salarioMensal: number; dataContratacao: string }
interface Opcao { id: string; nome: string }

const emptyForm = { nomeCompleto: '', dataNascimento: '', cpf: '', carteiraTrabalhista: '', dataContratacao: '', auxilioTransporte: 'false', auxilioAlimentacao: 'false', planoSaude: 'false', tipoPlanoSaude: '', cargoId: '', funcaoId: '', salarioMensal: '', outrosBeneficios: '', observacoes: '', arquivosReferencia: '' }

export default function FuncionariosCLTPage() {
  const [data, setData] = useState<FuncCLT[]>([])
  const [cargos, setCargos] = useState<Opcao[]>([])
  const [funcoes, setFuncoes] = useState<Opcao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FuncCLT | null>(null)
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
      const [rd, rc, rf] = await Promise.all([fetch('/api/funcionarios-clt'), fetch('/api/auxiliares?tipo=cargos'), fetch('/api/auxiliares?tipo=funcoes')])
      const [jd, jc, jf] = await Promise.all([rd.json(), rc.json(), rf.json()])
      if (jd.success) setData(jd.data)
      if (jc.success) setCargos(jc.data)
      if (jf.success) setFuncoes(jf.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as FuncCLT)
    setForm({ nomeCompleto: String(row.nomeCompleto||''), dataNascimento: row.dataNascimento ? String(row.dataNascimento).slice(0,10) : '', cpf: String(row.cpf||''), carteiraTrabalhista: String(row.carteiraTrabalhista||''), dataContratacao: row.dataContratacao ? String(row.dataContratacao).slice(0,10) : '', auxilioTransporte: String(row.auxilioTransporte||'false'), auxilioAlimentacao: String(row.auxilioAlimentacao||'false'), planoSaude: String(row.planoSaude||'false'), tipoPlanoSaude: String(row.tipoPlanoSaude||''), cargoId: String(row.cargoId||''), funcaoId: String(row.funcaoId||''), salarioMensal: String(row.salarioMensal||''), outrosBeneficios: String(row.outrosBeneficios||''), observacoes: String(row.observacoes||''), arquivosReferencia: String(row.arquivosReferencia||'') })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomeCompleto || !form.cpf || !form.dataNascimento || !form.dataContratacao || !form.cargoId || !form.funcaoId || !form.salarioMensal) { showToast('Preencha todos os campos obrigatórios', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, salarioMensal: parseBRL(form.salarioMensal), auxilioTransporte: form.auxilioTransporte === 'true', auxilioAlimentacao: form.auxilioAlimentacao === 'true', planoSaude: form.planoSaude === 'true', tipoPlanoSaude: form.planoSaude === 'true' ? (form.tipoPlanoSaude||null) : null, outrosBeneficios: form.outrosBeneficios||null, observacoes: form.observacoes||null, arquivosReferencia: form.arquivosReferencia||null }
      const res = await fetch(editing ? `/api/funcionarios-clt/${(editing as FuncCLT).id}` : '/api/funcionarios-clt', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Colaborador atualizado!' : 'Colaborador criado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/funcionarios-clt/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Colaborador removido!'); setDeleteConfirm(null); fetchData() } else showToast('Erro ao remover', 'error') }
    catch { showToast('Erro ao remover', 'error') }
  }

  const sel = (key: keyof typeof emptyForm, label: string, options: Opcao[], required = false) => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </div>
  )
  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type={type} placeholder={placeholder||label} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )
  const tog = (key: keyof typeof emptyForm, label: string) => (
    <div className="form-group">
      <label>{label}<span className="required-star">*</span></label>
      <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input">
        <option value="false">Não</option>
        <option value="true">Sim</option>
      </select>
    </div>
  )

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Briefcase className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Colaboradores CLT</h1><p className="text-sm text-navy-400">{data.length} colaborador(es)</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Colaborador</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable data={data} columns={[{ key: 'nomeCompleto', label: 'Nome' }, { key: 'cpf', label: 'CPF' }, { key: 'cargoId', label: 'Cargo', render: (v) => cargos.find(c => c.id === String(v))?.nome || '-' }, { key: 'funcaoId', label: 'Função', render: (v) => funcoes.find(f => f.id === String(v))?.nome || '-' }, { key: 'salarioMensal', label: 'Salário', render: (v) => fmtMoney(Number(v)) }, { key: 'dataContratacao', label: 'Contratação', render: (v) => fmtDate(String(v)) }, { key: 'planoSaude', label: 'Plano Saúde', render: (v) => v ? '✅' : '❌' }, { key: 'auxilioTransporte', label: 'Aux. Transp.', render: (v) => v ? '✅' : '❌' }, { key: 'auxilioAlimentacao', label: 'Aux. Alim.', render: (v) => v ? '✅' : '❌' }]} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['nomeCompleto', 'cpf']} />
        )}
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Colaborador CLT' : 'Novo Colaborador CLT'} size="xl"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">{inp('nomeCompleto', 'Nome Completo', true)}</div>
          <DateInput label="Data de Nascimento" required value={form.dataNascimento} onChange={v=>setForm(p=>({...p,dataNascimento:v}))}/>
          {inp('cpf', 'CPF', true, 'text', '000.000.000-00')}
          {inp('carteiraTrabalhista', 'Nº da Carteira de Trabalho', true)}
          <DateInput label="Data de Contratação/Início" required value={form.dataContratacao} onChange={v=>setForm(p=>({...p,dataContratacao:v}))}/>
          {sel('cargoId', 'Cargo', cargos, true)}
          {sel('funcaoId', 'Função', funcoes, true)}
          {<CurrencyInput label="Salário Mensal (R$)" required value={form.salarioMensal} onChange={v=>setForm(p=>({...p,salarioMensal:v}))}/>}
          {tog('auxilioTransporte', 'Auxílio Transporte')}
          {tog('auxilioAlimentacao', 'Auxílio Alimentação')}
          {tog('planoSaude', 'Plano de Saúde')}
          <div className="form-group">
            <label>Tipo de Plano de Saúde</label>
            <input type="text" placeholder="Ex: Unimed, Bradesco..." value={form.tipoPlanoSaude} onChange={e => setForm(p => ({ ...p, tipoPlanoSaude: e.target.value }))} className="form-input" disabled={form.planoSaude !== 'true'} />
          </div>
          <div className="md:col-span-2">{inp('outrosBeneficios', 'Outros Benefícios')}</div>
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
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Colaborador'}</button>
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
