'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, PartyPopper } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'
import { filterEventosByProjeto } from '@/lib/evento-filter'

interface Rec { id: string; valorReceita: number; dataEntrada: string; [key: string]: unknown }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Opcao { id: string; nome: string; projetoVinculadoId?: string | null }

const AVULSO = 'Evento avulso sem vínculo a projeto'
const emptyForm = { eventoId:'', projetoVinculadoId:'', eventoAvulso: false, valorReceita:'', dataEntrada:'', contaBancariaId:'', metodoTransferenciaId:'', projetoDirecionado:'', eventoDirecionado:'', observacoes:'', arquivosReferencia: '' }

export default function Page() {
  const [data, setData]           = useState<Rec[]>([])
  const [contas, setContas]       = useState<Conta[]>([])
  const [metodos, setMetodos]     = useState<Metodo[]>([])
  const [opcoes, setOpcoes]       = useState<Opcao[]>([])   // lista de eventos
  const [projetos, setProjetos]   = useState<Opcao[]>([])
  const [eventos, setEventos]     = useState<Opcao[]>([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Rec | null>(null)
  const [form, setForm]           = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, rc, rm, ro, rp, re] = await Promise.all([
        fetch('/api/receitas/eventos'), fetch('/api/contas-bancarias'),
        fetch('/api/auxiliares?tipo=metodos'), fetch('/api/eventos'),
        fetch('/api/projetos'), fetch('/api/eventos')
      ])
      const [jd, jc, jm, jo, jp, je] = await Promise.all([rd.json(), rc.json(), rm.json(), ro.json(), rp.json(), re.json()])
      if (jd.success) setData(jd.data)
      if (jc.success) setContas(jc.data)
      if (jm.success) setMetodos(jm.data)
      if (jo.success) setOpcoes(jo.data)
      if (jp.success) setProjetos(jp.data.filter((p: any) => p.status !== 'encerrado_consolidado'))
      if (je.success) setEventos(je.data.filter((e: any) => e.status !== 'encerrado_consolidado'))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const fmtMoney  = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const fmtDate   = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const contaLabel= (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`
  const fmtEvento = (v: unknown) => { const n = opcoes.find(o => o.id === String(v)); return n ? n.nome : String(v) }
  const fmtProjeto= (v: unknown) => { if (!v || v === AVULSO) return <span className="text-amber-600 text-xs">Avulso</span>; const n = projetos.find(p => p.id === String(v)); return n ? n.nome.substring(0,20) : String(v).substring(0,20) }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit   = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Rec)
    const avulso = row.projetoVinculadoId === AVULSO || !row.projetoVinculadoId
    const f = {
      ...emptyForm,
      eventoId:            String(row.eventoId || ''),
      projetoVinculadoId:  avulso ? '' : String(row.projetoVinculadoId || ''),
      eventoAvulso:        avulso,
      valorReceita:        String(row.valorReceita || ''),
      dataEntrada:         row.dataEntrada ? String(row.dataEntrada).slice(0,10) : '',
      contaBancariaId:     String(row.contaBancariaId || ''),
      metodoTransferenciaId: String(row.metodoTransferenciaId || ''),
      projetoDirecionado:  String(row.projetoDirecionado || ''),
      eventoDirecionado:   String(row.eventoDirecionado || ''),
      observacoes:         String(row.observacoes || ''),
      arquivosReferencia:  String(row.arquivosReferencia || ''),
    }
    setForm(f); setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.eventoId || !form.valorReceita || !form.dataEntrada || !form.contaBancariaId || !form.metodoTransferenciaId || !form.projetoDirecionado || !form.eventoDirecionado) {
      showToast('Preencha todos os campos obrigatórios','error'); return
    }
    if (!form.eventoAvulso && !form.projetoVinculadoId) {
      showToast('Selecione o projeto vinculado ou marque como Evento Avulso','error'); return
    }
    setSaving(true)
    try {
      const projetoVinculadoId = form.eventoAvulso ? AVULSO : form.projetoVinculadoId
      const payload = {
        ...form,
        projetoVinculadoId,
        valorReceita: parseBRL(form.valorReceita),
        observacoes: form.observacoes||null,
        arquivosReferencia: form.arquivosReferencia||null
      }
      // Remove eventoAvulso - not a DB field
      delete (payload as Record<string, unknown>).eventoAvulso
      const res = await fetch(editing ? `/api/receitas/eventos/${editing.id}` : '/api/receitas/eventos', {
        method: editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
      })
      const j = await res.json()
      if (j.success) { showToast(editing?'Atualizado!':'Registrado!'); setModalOpen(false); fetchData() }
      else showToast(j.error||'Erro','error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/receitas/eventos/${id}`,{method:'DELETE'}); const j = await r.json(); if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro','error') }
  }

  // Filtra eventos com base no projeto selecionado
  const filteredOpcoes = form.eventoAvulso
    ? opcoes.filter(e => !e.projetoVinculadoId)
    : form.projetoVinculadoId
      ? opcoes.filter(e => e.projetoVinculadoId === form.projetoVinculadoId || !e.projetoVinculadoId)
      : opcoes
  const filteredEventosDirec = filterEventosByProjeto(eventos as any, form.projetoDirecionado)

  // Quando seleciona um evento, auto-detecta se é avulso
  const onEventoChange = (eventoId: string) => {
    const evt = opcoes.find(o => o.id === eventoId)
    if (evt && !evt.projetoVinculadoId) {
      setForm(p => ({ ...p, eventoId, eventoAvulso: true, projetoVinculadoId: '' }))
    } else if (evt?.projetoVinculadoId) {
      setForm(p => ({ ...p, eventoId, eventoAvulso: false, projetoVinculadoId: evt.projetoVinculadoId }))
    } else {
      setForm(p => ({ ...p, eventoId }))
    }
  }

  const cols = [
    {key:'eventoId',label:'Evento',render:fmtEvento},
    {key:'projetoVinculadoId',label:'Projeto Vinculado',render:fmtProjeto},
    {key:'valorReceita',label:'Valor',render:(v: unknown)=>fmtMoney(Number(v))},
    {key:'dataEntrada',label:'Data Entrada',render:(v: unknown)=>fmtDate(String(v))},
    {key:'metodoTransferenciaId',label:'Método',render:(v: unknown)=>metodos.find(m=>m.id===String(v))?.nome||'-'},
  ]

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <PartyPopper className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Receita de Eventos</h1><p className="text-sm text-navy-400">{data.length} registros</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Receita</button>
      </div>

      <div className="card">{loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={cols} onEdit={openEdit} onDelete={(row)=>setDeleteConfirm(String(row.id))} searchKeys={[]} />}</div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing?'Editar Receita de Evento':'Nova Receita de Evento'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Evento */}
          <div className="form-group md:col-span-2">
            <label>Evento<span className="required-star">*</span></label>
            <select value={form.eventoId} onChange={e=>onEventoChange(e.target.value)} className="form-input">
              <option value="">Selecione o evento...</option>
              {filteredOpcoes.map(o=><option key={o.id} value={o.id}>{o.nome}{!o.projetoVinculadoId ? ' (avulso)' : ''}</option>)}
            </select>
          </div>

          {/* Projeto vinculado ao evento + checkbox avulso */}
          <div className="form-group md:col-span-2">
            <label>Projeto Vinculado ao Evento<span className="required-star">*</span></label>
            <select
              value={form.projetoVinculadoId}
              onChange={e=>setForm(p=>({...p,projetoVinculadoId:e.target.value}))}
              className="form-input"
              disabled={form.eventoAvulso}
            >
              <option value="">Selecione o projeto...</option>
              {projetos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.eventoAvulso}
                onChange={e => setForm(p => ({ ...p, eventoAvulso: e.target.checked, projetoVinculadoId: e.target.checked ? '' : p.projetoVinculadoId }))}
                className="w-4 h-4 rounded accent-navy-700"
              />
              <span className="text-sm text-navy-600">Evento avulso — sem vínculo a projeto</span>
            </label>
            {form.eventoAvulso && (
              <p className="text-xs text-amber-600 mt-1 bg-amber-50 rounded px-2 py-1">
                Este evento será registrado como <strong>Evento avulso sem vínculo a projeto</strong>.
              </p>
            )}
          </div>

          <CurrencyInput label="Valor da Receita (R$)" required value={form.valorReceita} onChange={v=>setForm(p=>({...p,valorReceita:v}))}/>
          <DateInput label="Data de Entrada" required value={form.dataEntrada} onChange={v=>setForm(p=>({...p,dataEntrada:v}))}/>

          <div className="form-group">
            <label>Conta Bancária<span className="required-star">*</span></label>
            <select value={form.contaBancariaId} onChange={e=>setForm(p=>({...p,contaBancariaId:e.target.value}))} className="form-input">
              <option value="">Selecione...</option>
              {contas.map(c=><option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Método de Transferência<span className="required-star">*</span></label>
            <select value={form.metodoTransferenciaId} onChange={e=>setForm(p=>({...p,metodoTransferenciaId:e.target.value}))} className="form-input">
              <option value="">Selecione...</option>
              {metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Direcionamento — Projeto<span className="required-star">*</span></label>
            <select value={form.projetoDirecionado} onChange={e=>setForm(p=>({...p,projetoDirecionado:e.target.value}))} className="form-input">
              <option value="">Selecione...</option>
              <option value="Receita Geral">Receita Geral</option>
              <option value="Receita do Evento">Receita do Evento</option>
              {projetos.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Direcionamento — Evento<span className="required-star">*</span></label>
            <select value={form.eventoDirecionado} onChange={e=>setForm(p=>({...p,eventoDirecionado:e.target.value}))} className="form-input">
              <option value="">Selecione...</option>
              <option value="Receita Geral">Receita Geral</option>
              <option value="Receita do Evento">Receita do Evento</option>
              {filteredEventosDirec.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="form-group">
              <label>Observações</label>
              <textarea rows={2} value={form.observacoes} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} className="form-input resize-none" />
            </div>
          </div>
          <div className="md:col-span-2">
            <FileUpload label="Arquivos de Referência" value={form.arquivosReferencia} onChange={v=>setForm(p=>({...p,arquivosReferencia:v}))} folder="receitas-eventos" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Salvando...':editing?'Atualizar':'Registrar Receita'}</button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir este registro de receita?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={()=>setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={()=>deleteConfirm&&handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
