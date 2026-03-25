'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CirclePlus } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'
import PhoneInput from '@/components/ui/PhoneInput'
import { filterEventosByProjeto } from '@/lib/evento-filter'

interface Rec { id: string; nomeContribuinte: string; valorContribuicao: number; dataEntrada: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Opcao { id: string; nome: string }

const emptyForm = { nomeContribuinte:'', telefone:'', telefoneFixo:'', email:'', dataEntrada:'', contaBancariaId:'', valorContribuicao:'', metodoTransferenciaId:'', projetoDirecionado:'', eventoDirecionado:'', descricaoReceita:'', observacoes:'', arquivosReferencia: '' }

export default function OutrasReceitasPage() {
  const [data, setData] = useState<Rec[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [projetos, setProjetos] = useState<Opcao[]>([])
  const [eventos, setEventos] = useState<Opcao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Rec | null>(null)
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
      const [rd, rc, rm, rp, re] = await Promise.all([fetch('/api/receitas/outras'), fetch('/api/contas-bancarias'), fetch('/api/auxiliares?tipo=metodos'), fetch('/api/projetos'), fetch('/api/eventos')])
      const [jd, jc, jm, jp, je] = await Promise.all([rd.json(), rc.json(), rm.json(), rp.json(), re.json()])
      if (jd.success) setData(jd.data); if (jc.success) setContas(jc.data); if (jm.success) setMetodos(jm.data); if (jp.success) setProjetos(jp.data.filter((p: any) => p.status !== 'encerrado_consolidado')); if (je.success) setEventos(je.data.filter((e: any) => e.status !== 'encerrado_consolidado'))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Rec)
    const f: typeof emptyForm = { ...emptyForm }
    Object.keys(emptyForm).forEach(k => { if (row[k] !== undefined && row[k] !== null) (f as Record<string, string>)[k] = k === 'dataEntrada' ? String(row[k]).slice(0,10) : String(row[k]) })
    setForm(f); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomeContribuinte || !form.telefone || !form.valorContribuicao || !form.dataEntrada || !form.contaBancariaId || !form.metodoTransferenciaId || !form.projetoDirecionado || !form.eventoDirecionado || !form.descricaoReceita) { showToast('Preencha todos os campos obrigatórios','error'); return }
    setSaving(true)
    try {
      const payload = { ...form, valorContribuicao: parseBRL(form.valorContribuicao), email: form.email||null, observacoes: form.observacoes||null, arquivosReferencia: form.arquivosReferencia||null }
      const res = await fetch(editing ? `/api/receitas/outras/${(editing as Rec).id}` : '/api/receitas/outras', { method: editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing?'Atualizado!':'Registrado!'); setModalOpen(false); fetchData() }
      else showToast(j.error||'Erro','error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/receitas/outras/${id}`,{method:'DELETE'}); const j = await r.json(); if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro','error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required=false, type='text', placeholder='') => (
    <div className="form-group"><label>{label}{required && <span className="required-star">*</span>}</label><input type={type} placeholder={placeholder||label} value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} className="form-input" /></div>
  )


  const filteredEventos = filterEventosByProjeto(eventos as any, form.projetoDirecionado)
  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3"><CirclePlus className="w-7 h-7 text-navy-700" /><div><h1 className="page-title">Outras Receitas</h1><p className="text-sm text-navy-400">{data.length} registros</p></div></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Receita</button>
      </div>
      <div className="card">{loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={[{key:'nomeContribuinte',label:'Contribuinte'},{key:'telefone',label:'Telefone'},{key:'email',label:'E-mail',render:v=>v?String(v):<span className="text-navy-300">—</span>},{key:'descricaoReceita',label:'Descrição'},{key:'valorContribuicao',label:'Valor',render:(v)=>fmtMoney(Number(v))},{key:'dataEntrada',label:'Data Entrada',render:(v)=>fmtDate(String(v))},{key:'projetoDirecionado',label:'Projeto',render:v=>v?String(v).substring(0,20):<span className="text-navy-300">—</span>}]} onEdit={openEdit} onDelete={(row)=>setDeleteConfirm(String(row.id))} searchKeys={['nomeContribuinte','descricaoReceita']} />}</div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing?'Editar':'Nova Receita'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inp('nomeContribuinte','Nome do Contribuinte',true)}
          <PhoneInput label="Telefone Celular" required value={form.telefone} onChange={v=>setForm(p=>({...p,telefone:v}))}/>
          <PhoneInput label="Telefone Fixo" value={form.telefoneFixo} onChange={v=>setForm(p=>({...p,telefoneFixo:v}))}/>
          {inp('email','E-mail',false,'email')}
          <DateInput label="Data de Entrada" required value={form.dataEntrada} onChange={v=>setForm(p=>({...p,dataEntrada:v}))}/>
          <div className="form-group"><label>Conta Bancária<span className="required-star">*</span></label><select value={form.contaBancariaId} onChange={e=>setForm(p=>({...p,contaBancariaId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{contas.map(c=><option key={c.id} value={c.id}>{contaLabel(c)}</option>)}</select></div>
          {<CurrencyInput label="Valor da Contribuição (R$)" required value={form.valorContribuicao} onChange={v=>setForm(p=>({...p,valorContribuicao:v}))}/>}
          <div className="form-group"><label>Método de Transferência<span className="required-star">*</span></label><select value={form.metodoTransferenciaId} onChange={e=>setForm(p=>({...p,metodoTransferenciaId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
          <div className="form-group"><label>Projeto Relacionado<span className="required-star">*</span></label><select value={form.projetoDirecionado} onChange={e=>setForm(p=>({...p,projetoDirecionado:e.target.value}))} className="form-input"><option value="">Selecione...</option><option value="Receita Geral">Receita Geral</option>{projetos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div className="form-group"><label>Evento Relacionado<span className="required-star">*</span></label><select value={form.eventoDirecionado} onChange={e=>setForm(p=>({...p,eventoDirecionado:e.target.value}))} className="form-input"><option value="">Selecione...</option><option value="Receita Geral">Receita Geral</option>{filteredEventos.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
          <div className="md:col-span-2">{inp('descricaoReceita','Descrição da Receita',true,'text','Descreva a origem desta receita')}</div>
          <div className="md:col-span-2"><div className="form-group"><label>Observações</label><textarea rows={2} value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="form-input resize-none" /></div></div>
          <div className="md:col-span-2">
            <FileUpload
              label="Arquivos de Referência"
              value={form.arquivosReferencia}
              onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200"><button onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Salvando...':editing?'Atualizar':'Registrar Receita'}</button></div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm"><p className="text-navy-600">Excluir este registro?</p><div className="flex justify-end gap-3 mt-6"><button onClick={()=>setDeleteConfirm(null)} className="btn-secondary">Cancelar</button><button onClick={()=>deleteConfirm&&handleDelete(deleteConfirm)} className="btn-danger">Excluir</button></div></Modal>
    </div>
  )
}
