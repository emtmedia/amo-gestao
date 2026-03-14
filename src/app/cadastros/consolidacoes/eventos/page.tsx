'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CalendarCheck } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface Consol { [key: string]: unknown; id: string; eventoId: string; projetoVinculado: string | null; dataConclusaoReal: string; saldoOrcamento: number }
interface Projeto { id: string; nome: string }
interface Evento { id: string; nome: string; projetoVinculadoId: string | null; dataEncerramento: string; orcamentoEstimado: number }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }

const AVULSO_LABEL = 'Evento avulso sem projeto vinculado'

const emptyForm = {
  projetoId: '',        // UI only – used to filter events
  eventoAvulso: false,  // UI only – checkbox
  eventoId: '',
  projetoVinculado: '', // stored in DB
  dataConclusaoReal: '',
  consideracoes: '', pendencias: '', acoesPositivas: '', licoesAprendidas: '',
  saldoPositivo: false as boolean,
  nomeOperador: '', cpfOperador: '', metodoAjuste: '', valorAjuste: '', contaReceptoraId: '', dataLimiteAjuste: '', arquivosReferencia: ''
}

const fmtMoney = (v: number) => v !== undefined && v !== null ? `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '-'
const fmtDate  = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

export default function ConsolidacaoEventosPage() {
  const [data,     setData]     = useState<Consol[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [eventos,  setEventos]  = useState<Evento[]>([])
  const [contas,   setContas]   = useState<Conta[]>([])
  const [metodos,  setMetodos]  = useState<Metodo[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing,   setEditing]  = useState<Consol | null>(null)
  const [form,      setForm]     = useState(emptyForm)
  const [saving,    setSaving]   = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast,      setToast]      = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [migrated,   setMigrated]   = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  // Run migration once to add projetoVinculado column
  const runMigration = useCallback(async () => {
    if (migrated) return
    try {
      await fetch('/api/migrate/consolidacao-evento-projeto', { method: 'POST' })
      setMigrated(true)
    } catch { /* ignore */ }
  }, [migrated])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      fetch('/api/migrate/consolidacoes-saldo', { method: 'POST' }).catch(() => {})
      const [rd, rp, re, rc, rm] = await Promise.all([
        fetch('/api/consolidacoes-evento'),
        fetch('/api/projetos'),
        fetch('/api/eventos'),
        fetch('/api/contas-bancarias'),
        fetch('/api/auxiliares?tipo=metodos'),
      ])
      const [jd, jp, je, jc, jm] = await Promise.all([rd.json(), rp.json(), re.json(), rc.json(), rm.json()])
      if (jd.success) setData(jd.data)
      if (jp.success) setProjetos(jp.data)
      if (je.success) setEventos(je.data)
      if (jc.success) setContas(jc.data)
      if (jm.success) setMetodos(jm.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { runMigration(); fetchData() }, [runMigration, fetchData])

  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  // Eventos filtrados pelo projeto selecionado ou somente avulsos
  const eventosFiltrados = form.eventoAvulso
    ? eventos.filter(e => !e.projetoVinculadoId)
    : form.projetoId
      ? eventos.filter(e => e.projetoVinculadoId === form.projetoId)
      : []

  const eventoSelecionado = eventos.find(e => e.id === form.eventoId) || null

  const setField = (key: keyof typeof emptyForm, value: unknown) =>
    setForm(p => ({ ...p, [key]: value }))

  const onProjetoChange = (projetoId: string) => {
    setForm(p => ({ ...p, projetoId, eventoId: '', eventoAvulso: false }))
  }

  const onAvulsoChange = (checked: boolean) => {
    setForm(p => ({
      ...p,
      eventoAvulso: checked,
      projetoId: checked ? '' : p.projetoId,
      eventoId: '',
      projetoVinculado: checked ? AVULSO_LABEL : '',
    }))
  }

  const onEventoChange = (eventoId: string) => {
    const ev = eventos.find(e => e.id === eventoId)
    const proj = ev?.projetoVinculadoId
      ? projetos.find(p => p.id === ev.projetoVinculadoId)?.nome || ''
      : AVULSO_LABEL
    setForm(p => ({ ...p, eventoId, projetoVinculado: proj }))
  }

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Consol)
    const ev = eventos.find(e => e.id === String(row.eventoId))
    const isAvulso = !ev?.projetoVinculadoId
    setForm({
      ...emptyForm,
      eventoAvulso: isAvulso,
      projetoId: ev?.projetoVinculadoId || '',
      eventoId: String(row.eventoId || ''),
      projetoVinculado: String(row.projetoVinculado || ''),
      dataConclusaoReal: row.dataConclusaoReal ? String(row.dataConclusaoReal).slice(0, 10) : '',
      consideracoes: String(row.consideracoes || ''),
      pendencias: String(row.pendencias || ''),
      acoesPositivas: String(row.acoesPositivas || ''),
      licoesAprendidas: String(row.licoesAprendidas || ''),
      nomeOperador: String(row.nomeOperador || ''),
      cpfOperador: String(row.cpfOperador || ''),
      metodoAjuste: String(row.metodoAjuste || ''),
      valorAjuste: row.valorAjuste ? String(row.valorAjuste) : '',
      contaReceptoraId: String(row.contaReceptoraId || ''),
      dataLimiteAjuste: row.dataLimiteAjuste ? String(row.dataLimiteAjuste).slice(0, 10) : '',
      arquivosReferencia: String(row.arquivosReferencia || ''),
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.eventoId) { showToast('Selecione um evento', 'error'); return }
    if (!form.dataConclusaoReal) { showToast('Informe a data real de conclusão', 'error'); return }
    if (!form.eventoAvulso && !form.projetoId) { showToast('Selecione um projeto ou marque "Evento avulso"', 'error'); return }
    const secIIIRequired = !form.saldoPositivo && (!form.nomeOperador || !form.metodoAjuste || !form.contaReceptoraId)
    if (secIIIRequired) { showToast('Marque "Saldo ≥ R$0,00" ou preencha os campos de ajuste financeiro', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        eventoId: form.eventoId,
        projetoVinculado: form.projetoVinculado || AVULSO_LABEL,
        dataConclusaoReal: form.dataConclusaoReal,
        consideracoes: form.consideracoes || null,
        pendencias: form.pendencias || null,
        acoesPositivas: form.acoesPositivas || null,
        licoesAprendidas: form.licoesAprendidas || null,
        saldoPositivo: form.saldoPositivo,
        nomeOperador: form.saldoPositivo ? null : (form.nomeOperador || null),
        cpfOperador: form.saldoPositivo ? null : (form.cpfOperador || null),
        metodoAjuste: form.saldoPositivo ? null : (form.metodoAjuste || null),
        valorAjuste: form.saldoPositivo ? null : (form.valorAjuste ? parseBRL(form.valorAjuste) : null),
        contaReceptoraId: form.saldoPositivo ? null : (form.contaReceptoraId || null),
        dataLimiteAjuste: form.saldoPositivo ? null : (form.dataLimiteAjuste || null),
        arquivosReferencia: form.arquivosReferencia||null
      }
      const url = editing ? `/api/consolidacoes-evento/${editing.id}` : '/api/consolidacoes-evento'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Atualizado!' : 'Consolidação registrada!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/consolidacoes-evento/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() }
    } catch { showToast('Erro', 'error') }
  }

  const nomeEvento = (v: unknown) => eventos.find(e => e.id === String(v))?.nome || '-'
  const renderSaldo = (v: unknown) => {
    const n = Number(v)
    const cls = n < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'
    return <span className={cls}>{fmtMoney(n)}</span>
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Consolidação de Eventos</h1>
            <p className="text-sm text-navy-400">{data.length} consolidações</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Consolidação</button>
      </div>

      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable
            data={data}
            columns={[
              { key: 'eventoId',         label: 'Evento',         render: nomeEvento },
              { key: 'projetoVinculado', label: 'Projeto',        render: (v) => v ? String(v) : '—' },
              { key: 'dataConclusaoReal',label: 'Conclusão Real', render: (v) => fmtDate(String(v)) },
              { key: 'saldoOrcamento',   label: 'Saldo',          render: renderSaldo },
              { key: 'id', label: 'Relatório', render: (v: unknown) => (
                <a
                  href={`/cadastros/consolidacoes/eventos/relatorio?id=${v}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  📄 Gerar Relatório
                </a>
              )},
            ]}
            onEdit={openEdit}
            onDelete={(row) => setDeleteConfirm(String(row.id))}
            searchKeys={['projetoVinculado']}
          />
        )}
      </div>

      {/* ─── MODAL PRINCIPAL ─────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert}
        title={editing ? 'Editar Consolidação' : 'Nova Consolidação de Evento'} size="xl">
        <div className="space-y-6">

          {/* SEÇÃO I */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3 pb-2 border-b border-cream-200">
              Seção I — Informações do Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* ── PROJETO ─────────────────────────────────── */}
              <div className="form-group md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="!mb-0">Projeto vinculado ao Evento<span className="required-star">*</span></label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.eventoAvulso}
                      onChange={e => onAvulsoChange(e.target.checked)}
                      className="w-4 h-4 rounded border-cream-300 accent-navy-700"
                    />
                    <span className="text-sm text-navy-600 font-medium">Evento avulso (sem projeto)</span>
                  </label>
                </div>
                <select
                  value={form.projetoId}
                  onChange={e => onProjetoChange(e.target.value)}
                  disabled={form.eventoAvulso}
                  className={`form-input ${form.eventoAvulso ? 'opacity-50 cursor-not-allowed bg-cream-100' : ''}`}
                >
                  <option value="">Selecione o projeto...</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
                {form.eventoAvulso && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    📋 Será registrado como <strong>"{AVULSO_LABEL}"</strong>
                  </p>
                )}
              </div>

              {/* ── EVENTO ─────────────────────────────────── */}
              <div className="form-group md:col-span-2">
                <label>Evento<span className="required-star">*</span></label>
                <select
                  value={form.eventoId}
                  onChange={e => onEventoChange(e.target.value)}
                  disabled={!form.projetoId && !form.eventoAvulso}
                  className={`form-input ${(!form.projetoId && !form.eventoAvulso) ? 'opacity-50 cursor-not-allowed bg-cream-100' : ''}`}
                >
                  <option value="">
                    {(!form.projetoId && !form.eventoAvulso)
                      ? 'Selecione um projeto ou marque "Evento avulso" primeiro...'
                      : 'Selecione o evento...'}
                  </option>
                  {eventosFiltrados.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
                {(form.projetoId || form.eventoAvulso) && eventosFiltrados.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Nenhum evento encontrado para esta seleção.</p>
                )}
              </div>

              {/* ── DATA CONCLUSÃO ──────────────────────────── */}
              <div className="form-group">
                <label>Data Real de Conclusão<span className="required-star">*</span></label>
                <DateInput label="Data de Conclusão Real" required value={form.dataConclusaoReal} onChange={v=>setField('dataConclusaoReal',v)}/>
              </div>

              {/* ── CARD INFO EVENTO ────────────────────────── */}
              {eventoSelecionado && (
                <div className="bg-cream-50 rounded-xl p-3 text-sm border border-cream-200 self-end">
                  <p className="font-medium text-navy-700 mb-1">Dados do Evento</p>
                  <p className="text-navy-500">Encerramento previsto: {fmtDate(eventoSelecionado.dataEncerramento)}</p>
                  <p className="text-navy-500">Orçamento estimado: {fmtMoney(eventoSelecionado.orcamentoEstimado)}</p>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO II */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3 pb-2 border-b border-cream-200">
              Seção II — Preenchida pelo Responsável
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group"><label>Considerações sobre o Evento</label>
                <textarea rows={3} value={form.consideracoes} onChange={e=>setField('consideracoes',e.target.value)} className="form-input resize-none" /></div>
              <div className="form-group"><label>Pendências Estratégicas, Táticas e Operacionais</label>
                <textarea rows={3} value={form.pendencias} onChange={e=>setField('pendencias',e.target.value)} className="form-input resize-none" /></div>
              <div className="form-group"><label>Ações Positivas além do Escopo</label>
                <textarea rows={3} value={form.acoesPositivas} onChange={e=>setField('acoesPositivas',e.target.value)} className="form-input resize-none" /></div>
              <div className="form-group"><label>Lições Aprendidas com o Evento</label>
                <textarea rows={3} value={form.licoesAprendidas} onChange={e=>setField('licoesAprendidas',e.target.value)} className="form-input resize-none" /></div>
            </div>
          </div>

          {/* SEÇÃO III */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3 pb-2 border-b border-cream-200">
              Seção III — Financeiro do Evento
            </h3>
            {/* Checkbox obrigatório */}
            <div className={`flex items-start gap-3 p-3 rounded-xl border mb-4 cursor-pointer select-none ${form.saldoPositivo ? 'bg-green-50 border-green-300' : 'bg-cream-50 border-cream-300'}`}
              onClick={() => { const next = !form.saldoPositivo; setField('saldoPositivo', next); if (next) { setField('nomeOperador',''); setField('cpfOperador',''); setField('metodoAjuste',''); setField('valorAjuste',''); setField('contaReceptoraId',''); setField('dataLimiteAjuste','') } }}>
              <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${form.saldoPositivo ? 'bg-green-500 border-green-500' : 'bg-white border-navy-300'}`}>
                {form.saldoPositivo && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy-700">Saldo do Evento ≥ R$ 0,00 <span className="required-star">*</span></p>
                <p className="text-xs text-navy-400 mt-0.5">Marque esta opção caso o saldo do evento seja positivo ou zerado — os campos de ajuste financeiro não serão necessários.</p>
              </div>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${form.saldoPositivo ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="form-group"><label>Nome do Operador/Tesoureiro{!form.saldoPositivo && <span className="required-star">*</span>}</label>
                <input type="text" value={form.nomeOperador} onChange={e=>setField('nomeOperador',e.target.value)} className="form-input" disabled={form.saldoPositivo} /></div>
              <div className="form-group"><label>CPF do Operador</label>
                <input type="text" placeholder="000.000.000-00" value={form.cpfOperador} onChange={e=>setField('cpfOperador',e.target.value)} className="form-input" disabled={form.saldoPositivo} /></div>
              <div className="form-group"><label>Método de Pagamento{!form.saldoPositivo && <span className="required-star">*</span>}</label>
                <select value={form.metodoAjuste} onChange={e=>setField('metodoAjuste',e.target.value)} className="form-input" disabled={form.saldoPositivo}>
                  <option value="">Selecione...</option>
                  {metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                </select></div>
              <CurrencyInput label="Valor do Ajuste (R$)" value={form.valorAjuste} onChange={v=>setField('valorAjuste',v)}/>
              <div className="form-group"><label>Conta Receptora do Ajuste{!form.saldoPositivo && <span className="required-star">*</span>}</label>
                <select value={form.contaReceptoraId} onChange={e=>setField('contaReceptoraId',e.target.value)} className="form-input" disabled={form.saldoPositivo}>
                  <option value="">Selecione...</option>
                  {contas.map(c=><option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
                </select></div>
              <div className="form-group"><label>Data Limite para o Ajuste</label>
                <DateInput label="Data Limite para Ajuste" value={form.dataLimiteAjuste} onChange={v=>setField('dataLimiteAjuste',v)}/></div>
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
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Registrar Consolidação'}
          </button>
        </div>
      </Modal>

      {/* ─── MODAL EXCLUSÃO ──────────────────────────────── */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir esta consolidação de evento?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
