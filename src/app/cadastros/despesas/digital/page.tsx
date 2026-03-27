'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Monitor } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import ContaBancariaSelect, { getDefaultContaId } from '@/components/ui/ContaDefaultBadge'
import DateInput from '@/components/ui/DateInput'
import { filterEventosByProjeto } from '@/lib/evento-filter'

interface Desp { id: string; valorTitulo: number; dataPagamento: string; [key: string]: unknown }
interface Forn { id: string; nome: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface TipoServico { id: string; nome: string }
interface Opcao { id: string; nome: string; projetoVinculadoId?: string | null }

const emptyForm = { fornecedorId:'', tipoServicoId:'', dataVencimento:'', valorTitulo:'', dataPagamento:'', contaBancariaId:'', metodoTransferenciaId:'', projetoDirecionado:'', eventoDirecionado:'', observacoes:'', arquivosReferencia: '' }

export default function Page() {
  const [data, setData] = useState<Desp[]>([])
  const [fornecedores, setFornecedores] = useState<Forn[]>([])
  const [tiposServico, setTiposServico] = useState<TipoServico[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [projetos, setProjetos] = useState<Opcao[]>([])
  const [eventos, setEventos] = useState<Opcao[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Desp | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
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
      const [rd, rf, rt, rcb, rm, rp, re] = await Promise.all([fetch('/api/despesas/digital'), fetch('/api/fornecedores'), fetch('/api/auxiliares?tipo=tiposDigital'), fetch('/api/contas-bancarias'), fetch('/api/auxiliares?tipo=metodos'), fetch('/api/projetos'), fetch('/api/eventos')])
      const [jd, jf, jt, jcb, jm, jp, je] = await Promise.all([rd.json(), rf.json(), rt.json(), rcb.json(), rm.json(), rp.json(), re.json()])
      if (jd.success) setData(jd.data); if (jf.success) setFornecedores(jf.data); if (jt.success) setTiposServico(jt.data); if (jcb.success) setContas(jcb.data); if (jm.success) setMetodos(jm.data); if (jp.success) setProjetos(jp.data.filter((p: any) => p.status !== 'encerrado_consolidado')); if (je.success) setEventos(je.data.filter((e: any) => e.status !== 'encerrado_consolidado'))
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
    if (!form.fornecedorId || !form.tipoServicoId || !form.valorTitulo || !form.dataPagamento || !form.metodoTransferenciaId) { showToast('Preencha todos os campos obrigatórios','error'); return }
    setSaving(true)
    try {
      const payload = { ...form, valorTitulo: parseBRL(form.valorTitulo), contaBancariaId: form.contaBancariaId||null, observacoes: form.observacoes||null, arquivosReferencia: form.arquivosReferencia||null, projetoDirecionado: form.projetoDirecionado||null, eventoDirecionado: form.eventoDirecionado||null }
      const res = await fetch(editing ? `/api/despesas/digital/${editing.id}` : '/api/despesas/digital', { method: editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing?'Atualizado!':'Registrado!'); setModalOpen(false); fetchData() }
      else showToast(j.error||'Erro','error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/despesas/digital/${id}`,{method:'DELETE'}); const j = await r.json(); if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro','error') }
  }

  const fmtNomeForn = (v: unknown) => { const n = fornecedores.find(f => f.id === String(v)); return n ? n.nome : String(v) }
  const fmtTipoDigital = (v: unknown) => { const n = tiposServico.find(t => t.id === String(v)); return n ? n.nome : String(v) }

  const handleEventoChange = (eventoId: string) => {
    const evento = eventos.find(e => e.id === eventoId)
    const projetoDirecionado = eventoId && evento?.projetoVinculadoId ? evento.projetoVinculadoId : form.projetoDirecionado
    setForm(p => ({ ...p, eventoDirecionado: eventoId, projetoDirecionado }))
  }

  const filteredEventos = filterEventosByProjeto(eventos as any, form.projetoDirecionado)
  const cols = [{key:'fornecedorId',label:'Fornecedor',render:fmtNomeForn},{key:'tipoServicoId',label:'Tipo Digital',render:fmtTipoDigital},{key:'valorTitulo',label:'Valor',render:(v: unknown)=>fmtMoney(Number(v))},{key:'dataVencimento',label:'Vencimento',render:(v: unknown)=>fmtDate(String(v))},{key:'dataPagamento',label:'Pagamento',render:(v: unknown)=>fmtDate(String(v))},{key:'metodoTransferenciaId',label:'Método Pgto',render:(v: unknown)=>metodos.find(m=>m.id===String(v))?.nome||'-'},{key:'projetoDirecionado',label:'Projeto',render:(v: unknown)=>{ const p=projetos.find(x=>x.id===String(v)); return p?<span>{p.nome}</span>:<span className="text-navy-300">—</span>}}]
  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3"><Monitor className="w-7 h-7 text-navy-700" /><div><h1 className="page-title">Serviços Digitais e Plataformas</h1><p className="text-sm text-navy-400">{data.length} registros</p></div></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Despesa</button>
      </div>
      <div className="card">{loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={cols} onEdit={openEdit} onDelete={(row)=>setDeleteConfirm(String(row.id))} searchKeys={[]} />}</div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing?'Editar':'Nova Serviços Digitais e Plataformas'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group md:col-span-2"><label>Fornecedor<span className="required-star">*</span></label><select value={form.fornecedorId} onChange={e=>setForm(p=>({...p,fornecedorId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
          <div className="form-group md:col-span-2"><label>Tipo de Serviço Digital<span className="required-star">*</span></label><select value={form.tipoServicoId} onChange={e=>setForm(p=>({...p,tipoServicoId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{tiposServico.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <DateInput label="Data de Vencimento" value={form.dataVencimento} onChange={v=>setForm(p=>({...p,dataVencimento:v}))}/>
          <CurrencyInput label="Valor do Título (R$)" required value={form.valorTitulo} onChange={v=>setForm(p=>({...p,valorTitulo:v}))}/>
          <DateInput label="Data de Pagamento" required value={form.dataPagamento} onChange={v=>setForm(p=>({...p,dataPagamento:v}))}/>
          <ContaBancariaSelect contas={contas} selectedId={form.contaBancariaId} onChange={v=>setForm(p=>({...p,contaBancariaId:v}))} />
          <div className="form-group"><label>Método de Transferência<span className="required-star">*</span></label><select value={form.metodoTransferenciaId} onChange={e=>setForm(p=>({...p,metodoTransferenciaId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
          <div className="form-group"><label>Projeto Relacionado</label><select value={form.projetoDirecionado} onChange={e=>setForm(p=>({...p,projetoDirecionado:e.target.value}))} className="form-input"><option value="">Selecione...</option>{projetos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
          <div className="form-group"><label>Evento Relacionado</label><select value={form.eventoDirecionado} onChange={e=>handleEventoChange(e.target.value)} className="form-input"><option value="">Sem Evento</option>{filteredEventos.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
          <div className="md:col-span-2"><div className="form-group"><label>Observações</label><textarea rows={2} value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="form-input resize-none" /></div></div>
          <div className="md:col-span-2">
            <FileUpload
              label="Arquivos de Referência"
              value={form.arquivosReferencia}
              onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200"><button onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Salvando...':editing?'Atualizar':'Registrar Despesa'}</button></div>
      </Modal>
      <Modal isOpen={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm"><p className="text-navy-600">Excluir este registro?</p><div className="flex justify-end gap-3 mt-6"><button onClick={()=>setDeleteConfirm(null)} className="btn-secondary">Cancelar</button><button onClick={()=>deleteConfirm&&handleDelete(deleteConfirm)} className="btn-danger">Excluir</button></div></Modal>
    </div>
  )
}
