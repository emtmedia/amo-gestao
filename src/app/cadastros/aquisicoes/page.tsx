'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, ShoppingCart } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'
import { filterEventosByProjeto } from '@/lib/evento-filter'

interface Rec { id: string; descricao: string; valorAquisicao: number; dataAquisicao: string; modalidadePgto: string; parcelas?: number; [key: string]: unknown }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Tipo { id: string; nome: string }
interface Projeto { id: string; nome: string; status?: string }
interface Evento { id: string; nome: string; projetoVinculadoId?: string | null; status?: string }
interface Fornecedor { id: string; nome: string }

const emptyForm = {
  descricao: '', projetoId: '', eventoId: '', tipoItemId: '', dataAquisicao: '',
  contaBancariaId: '', valorAquisicao: '', metodoTransferenciaId: '',
  modalidadePgto: 'À vista', parcelas: '', observacoes: '', arquivosReferencia: ''
}

export default function AquisicoesPage() {
  const [data, setData] = useState<Rec[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
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
      const [rd, rc, rm, rt, rp, re] = await Promise.all([
        fetch('/api/aquisicoes'), fetch('/api/contas-bancarias'),
        fetch('/api/auxiliares?tipo=metodos'), fetch('/api/auxiliares/tipos-item-aquisicao'),
        fetch('/api/projetos'), fetch('/api/eventos')
      ])
      const [jd, jc, jm, jt, jp, je] = await Promise.all([rd.json(), rc.json(), rm.json(), rt.json(), rp.json(), re.json()])
      if (jd.success) setData(jd.data)
      if (jc.success) setContas(jc.data)
      if (jm.success) setMetodos(jm.data)
      if (jt.success) setTipos(jt.data)
      if (jp.success) setProjetos(jp.data)
      if (je.success) setEventos(je.data)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchData() }, [fetchData])

  const filteredEventos = filterEventosByProjeto(eventos as any, form.projetoId)
  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Rec)
    setForm({
      descricao: String(row.descricao || ''),
      projetoId: String(row.projetoId || ''),
      eventoId: String(row.eventoId || ''),
      tipoItemId: String(row.tipoItemId || ''),
      dataAquisicao: row.dataAquisicao ? String(row.dataAquisicao).slice(0, 10) : '',
      contaBancariaId: String(row.contaBancariaId || ''),
      valorAquisicao: String(row.valorAquisicao || ''),
      metodoTransferenciaId: String(row.metodoTransferenciaId || ''),
      modalidadePgto: String(row.modalidadePgto || 'À vista'),
      parcelas: String(row.parcelas || ''),
      observacoes: String(row.observacoes || ''),
      arquivosReferencia: String(row.arquivosReferencia || ''),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.descricao || !form.tipoItemId || !form.dataAquisicao || !form.contaBancariaId || !form.valorAquisicao || !form.metodoTransferenciaId) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    if (form.modalidadePgto === 'À prazo' && (!form.parcelas || parseInt(form.parcelas) < 2)) {
      showToast('Informe o número de parcelas (mín. 2)', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        valorAquisicao: parseBRL(form.valorAquisicao),
        parcelas: form.modalidadePgto === 'À prazo' ? parseInt(form.parcelas) : null,
        projetoId: form.projetoId || null,
        eventoId: form.eventoId || null,
        observacoes: form.observacoes || null,
        arquivosReferencia: form.arquivosReferencia || null,
      }
      const res = await fetch(editing ? `/api/aquisicoes/${editing.id}` : '/api/aquisicoes', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Aquisição atualizada!' : 'Aquisição registrada!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/aquisicoes/${id}`, { method: 'DELETE' }); const j = await r.json(); if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() } else showToast(j.error || 'Erro', 'error') }
    catch { showToast('Erro', 'error') }
  }

  const cols = [
    { key: 'descricao', label: 'Descrição' },
    { key: 'tipoItemId', label: 'Tipo', render: (v: unknown) => tipos.find(t => t.id === String(v))?.nome || '-' },
    { key: 'valorAquisicao', label: 'Valor', render: (v: unknown) => fmtMoney(Number(v)) },
    { key: 'dataAquisicao', label: 'Data', render: (v: unknown) => fmtDate(String(v)) },
    { key: 'modalidadePgto', label: 'Modalidade', render: (v: unknown) => {
      const rec = data.find(d => d.modalidadePgto === String(v))
      return String(v) === 'À prazo' && rec?.parcelas ? `À prazo (${rec.parcelas}x)` : String(v)
    }},
  ]

  return (
    <div>
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Aquisições</h1><p className="text-sm text-navy-400">{data.length} registros</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Aquisição</button>
      </div>

      <div className="card">{loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : <DataTable data={data} columns={cols} onEdit={openEdit} onDelete={(row) => setDeleteConfirm(String(row.id))} searchKeys={['descricao']} />}</div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing ? 'Editar Aquisição' : 'Nova Aquisição'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group md:col-span-2">
            <label>Descrição<span className="required-star">*</span></label>
            <input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className="form-input" placeholder="Descrição da aquisição" />
          </div>

          <div className="form-group">
            <label>Tipo de Item<span className="required-star">*</span></label>
            <select value={form.tipoItemId} onChange={e => setForm(p => ({ ...p, tipoItemId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          <CurrencyInput label="Valor da Aquisição (R$)" required value={form.valorAquisicao} onChange={v => setForm(p => ({ ...p, valorAquisicao: v }))} />

          <DateInput label="Data da Aquisição" required value={form.dataAquisicao} onChange={v => setForm(p => ({ ...p, dataAquisicao: v }))} />

          <div className="form-group">
            <label>Conta Bancária de Débito<span className="required-star">*</span></label>
            <select value={form.contaBancariaId} onChange={e => setForm(p => ({ ...p, contaBancariaId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Método de Transferência<span className="required-star">*</span></label>
            <select value={form.metodoTransferenciaId} onChange={e => setForm(p => ({ ...p, metodoTransferenciaId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {metodos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Modalidade de Pagamento<span className="required-star">*</span></label>
            <select value={form.modalidadePgto} onChange={e => setForm(p => ({ ...p, modalidadePgto: e.target.value, parcelas: e.target.value === 'À vista' ? '' : p.parcelas }))} className="form-input">
              <option value="À vista">À vista</option>
              <option value="À prazo">À prazo</option>
            </select>
          </div>

          {form.modalidadePgto === 'À prazo' && (
            <div className="form-group">
              <label>Número de Parcelas<span className="required-star">*</span></label>
              <input type="number" min="2" max="120" value={form.parcelas} onChange={e => setForm(p => ({ ...p, parcelas: e.target.value }))} className="form-input" placeholder="Ex: 12" />
            </div>
          )}

          <div className="form-group">
            <label>Projeto Relacionado</label>
            <select value={form.projetoId} onChange={e => setForm(p => ({ ...p, projetoId: e.target.value, eventoId: '' }))} className="form-input">
              <option value="">Nenhum</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Evento Relacionado</label>
            <select value={form.eventoId} onChange={e => setForm(p => ({ ...p, eventoId: e.target.value }))} className="form-input">
              <option value="">Nenhum</option>
              {filteredEventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 form-group">
            <label>Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="form-input" />
          </div>

          <div className="md:col-span-2">
            <FileUpload value={form.arquivosReferencia} onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))} folder="aquisicoes" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Registrar Aquisição'}</button>
        </div>
      </Modal>

      {deleteConfirm && (
        <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
          <p className="text-navy-600">Tem certeza que deseja excluir esta aquisição?</p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
            <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
