'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Wrench } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import ContaBancariaSelect, { getDefaultContaId } from '@/components/ui/ContaDefaultBadge'
import DateInput from '@/components/ui/DateInput'

interface Desp { id: string; nomeFornecedor: string; valorTitulo: number; dataPagamento: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface TipoServ { id: string; nome: string }

const emptyForm = { nomeFornecedor:'', tipoServicoId:'', dataVencimento:'', valorTitulo:'', dataPagamento:'', contaBancariaId:'', metodoTransferenciaId:'', observacoes:'', arquivosReferencia: '' }

export default function ConservacaoPage() {
  const [data, setData] = useState<Desp[]>([])
  const [tiposServico, setTiposServico] = useState<TipoServ[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Desp | null>(null)
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
      // Run migration once to ensure contaBancariaId column exists
      fetch('/api/migrate/despesas-conta', { method: 'POST' }).catch(() => {})
      const [rd, rt, rcb, rm] = await Promise.all([fetch('/api/despesas/conservacao'), fetch('/api/auxiliares?tipo=tiposManutencao'), fetch('/api/contas-bancarias'), fetch('/api/auxiliares?tipo=metodos')])
      const [jd, jt, jcb, jm] = await Promise.all([rd.json(), rt.json(), rcb.json(), rm.json()])
      if (jd.success) setData(jd.data); if (jt.success) setTiposServico(jt.data); if (jcb.success) setContas(jcb.data); if (jm.success) setMetodos(jm.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

  const openCreate = () => { setEditing(null); const defConta = getDefaultContaId(); setForm({...emptyForm, contaBancariaId: defConta}); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Desp)
    const f: typeof emptyForm = { ...emptyForm }
    Object.keys(emptyForm).forEach(k => { if (row[k] !== undefined && row[k] !== null) (f as Record<string, string>)[k] = (k==='dataVencimento'||k==='dataPagamento') ? String(row[k]).slice(0,10) : String(row[k]) })
    setForm(f); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomeFornecedor || !form.tipoServicoId || !form.valorTitulo || !form.dataPagamento || !form.metodoTransferenciaId) { showToast('Preencha todos os campos obrigatórios','error'); return }
    setSaving(true)
    try {
      const payload = { ...form, valorTitulo: parseBRL(form.valorTitulo), contaBancariaId: form.contaBancariaId||null, observacoes: form.observacoes||null, arquivosReferencia: form.arquivosReferencia||null, dataVencimento: form.dataVencimento||null }
      const res = await fetch(editing ? `/api/despesas/conservacao/${(editing as Desp).id}` : '/api/despesas/conservacao', { method: editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing?'Atualizado!':'Registrado!'); setModalOpen(false); fetchData() }
      else showToast(j.error||'Erro','error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/despesas/conservacao/${id}`,{method:'DELETE'}); const j = await r.json(); if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro','error') }
  }

  const columns = [
    {key:'nomeFornecedor',label:'Fornecedor'},
    {key:'tipoServicoId',label:'Tipo de Serviço',render:(v: unknown)=>{const found=tiposServico.find(t=>t.id===String(v));return found?found.nome:'-'}},
    {key:'valorTitulo',label:'Valor',render:(v: unknown)=>fmtMoney(Number(v))},
    {key:'dataVencimento',label:'Vencimento',render:(v: unknown)=>fmtDate(String(v))},
    {key:'dataPagamento',label:'Pagamento',render:(v: unknown)=>fmtDate(String(v))},
    {key:'metodoTransferenciaId',label:'Método Pgto',render:(v: unknown)=>metodos.find((m: {id:string;nome:string})=>m.id===String(v))?.nome||'-'}
  ]

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3"><Wrench className="w-7 h-7 text-navy-700" /><div><h1 className="page-title">Conservação e Zeladoria</h1><p className="text-sm text-navy-400">{data.length} registros</p></div></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Despesa</button>
      </div>
      <div className="card">{loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={columns} onEdit={openEdit} onDelete={(row)=>setDeleteConfirm(String(row.id))} searchKeys={['nomeFornecedor']} />}</div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing?'Editar':'Nova Despesa - Conservação'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group md:col-span-2"><label>Nome do Fornecedor<span className="required-star">*</span></label><input type="text" placeholder="Nome do fornecedor" value={form.nomeFornecedor} onChange={e=>setForm(p=>({...p,nomeFornecedor:e.target.value}))} className="form-input" /></div>
          <div className="form-group md:col-span-2"><label>Tipo de Serviço<span className="required-star">*</span></label><select value={form.tipoServicoId} onChange={e=>setForm(p=>({...p,tipoServicoId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{tiposServico.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <DateInput label="Data de Vencimento" value={form.dataVencimento} onChange={v=>setForm(p=>({...p,dataVencimento:v}))}/>
          <CurrencyInput label="Valor (R$)" required value={form.valorTitulo} onChange={v=>setForm(p=>({...p,valorTitulo:v}))}/>
          <DateInput label="Data de Pagamento" required value={form.dataPagamento} onChange={v=>setForm(p=>({...p,dataPagamento:v}))}/>
          <ContaBancariaSelect contas={contas} selectedId={form.contaBancariaId} onChange={v=>setForm(p=>({...p,contaBancariaId:v}))} />
          <div className="form-group"><label>Método de Transferência<span className="required-star">*</span></label><select value={form.metodoTransferenciaId} onChange={e=>setForm(p=>({...p,metodoTransferenciaId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
          <div className="md:col-span-2"><div className="form-group"><label>Observações</label><textarea rows={2} value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="form-input resize-none" /></div></div>
          <div className="md:col-span-2">
            <FileUpload
              label="Arquivos de Referência"
              value={form.arquivosReferencia}
              onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200"><button onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Salvando...':editing?'Atualizar':'Registrar'}</button></div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm"><p className="text-navy-600">Excluir este registro?</p><div className="flex justify-end gap-3 mt-6"><button onClick={()=>setDeleteConfirm(null)} className="btn-secondary">Cancelar</button><button onClick={()=>deleteConfirm&&handleDelete(deleteConfirm)} className="btn-danger">Excluir</button></div></Modal>
    </div>
  )
}
