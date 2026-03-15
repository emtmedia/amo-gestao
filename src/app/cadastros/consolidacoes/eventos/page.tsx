'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, CalendarCheck, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface Consol { [key: string]: unknown; id: string; eventoId: string; projetoVinculado: string | null; dataConclusaoReal: string; saldoOrcamento: number }
interface Projeto { id: string; nome: string; status?: string }
interface Evento { id: string; nome: string; projetoVinculadoId: string | null; dataEncerramento: string; orcamentoEstimado: number; status?: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Financeiro { receitas: number; despesas: number; saldo: number }

const AVULSO_LABEL = 'Evento avulso sem projeto vinculado'

const emptyForm = {
  projetoId: '',        // UI only – used to filter events
  eventoAvulso: false,  // UI only – checkbox
  eventoId: '',
  projetoVinculado: '', // stored in DB
  dataConclusaoReal: '',
  consideracoes: '', pendencias: '', acoesPositivas: '', licoesAprendidas: '',
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
  const [financeiro, setFinanceiro] = useState<Financeiro | null>(null)
  const [financeiroLoading, setFinanceiroLoading] = useState(false)

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

  const fetchFinanceiro = async (eventoId: string) => {
    if (!eventoId) { setFinanceiro(null); return }
    setFinanceiroLoading(true)
    try {
      const r = await fetch(`/api/relatorio/financeiro-evento?eventoId=${eventoId}`)
      const j = await r.json()
      if (j.success) setFinanceiro({ receitas: j.receitas.total, despesas: j.despesas.total, saldo: j.saldo })
      else setFinanceiro(null)
    } catch { setFinanceiro(null) }
    finally { setFinanceiroLoading(false) }
  }

  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  // Eventos filtrados pelo projeto selecionado ou somente avulsos
  const eventosFiltrados = (() => {
    let list = form.eventoAvulso
      ? eventos.filter(e => !e.projetoVinculadoId)
      : form.projetoId
      ? eventos.filter(e => e.projetoVinculadoId === form.projetoId)
      : []
    // Exclude consolidated events (unless it's the one being edited)
    list = list.filter(e => e.status !== 'encerrado_consolidado' || e.id === form.eventoId)
    return list
  })()

  const eventoSelecionado = eventos.find(e => e.id === form.eventoId) || null

  const setField = (key: keyof typeof emptyForm, value: unknown) =>
    setForm(p => ({ ...p, [key]: value }))

  const onProjetoChange = (projetoId: string) => {
    setForm(p => ({ ...p, projetoId, eventoId: '', eventoAvulso: false }))
    setFinanceiro(null)
  }

  const onAvulsoChange = (checked: boolean) => {
    setForm(p => ({
      ...p,
      eventoAvulso: checked,
      projetoId: checked ? '' : p.projetoId,
      eventoId: '',
      projetoVinculado: checked ? AVULSO_LABEL : '',
    }))
    setFinanceiro(null)
  }

  const onEventoChange = (eventoId: string) => {
    const ev = eventos.find(e => e.id === eventoId)
    const proj = ev?.projetoVinculadoId
      ? projetos.find(p => p.id === ev.projetoVinculadoId)?.nome || ''
      : AVULSO_LABEL
    setForm(p => ({ ...p, eventoId, projetoVinculado: proj }))
    fetchFinanceiro(eventoId)
  }

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setFinanceiro(null); setModalAlert(null); setModalOpen(true)
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
    fetchFinanceiro(String(row.eventoId || ''))
    setModalOpen(true)
  }

  const saldoNegativo = financeiro !== null && financeiro.saldo < 0

  const handleSave = async () => {
    if (!form.eventoId) { showToast('Selecione um evento', 'error'); return }
    if (!form.dataConclusaoReal) { showToast('Informe a data real de conclusão', 'error'); return }
    if (!form.eventoAvulso && !form.projetoId) { showToast('Selecione um projeto ou marque "Evento avulso"', 'error'); return }
    setSaving(true)
    try {
      const saldoOrcamento = financeiro?.saldo ?? 0
      const payload = {
        eventoId: form.eventoId,
        projetoVinculado: form.projetoVinculado || AVULSO_LABEL,
        dataConclusaoReal: form.dataConclusaoReal,
        consideracoes: form.consideracoes || null,
        pendencias: form.pendencias || null,
        acoesPositivas: form.acoesPositivas || null,
        licoesAprendidas: form.licoesAprendidas || null,
        saldoOrcamento,
        nomeOperador: saldoNegativo ? (form.nomeOperador || null) : null,
        cpfOperador: saldoNegativo ? (form.cpfOperador || null) : null,
        metodoAjuste: saldoNegativo ? (form.metodoAjuste || null) : null,
        valorAjuste: saldoNegativo ? (form.valorAjuste ? parseBRL(form.valorAjuste) : null) : null,
        contaReceptoraId: saldoNegativo ? (form.contaReceptoraId || null) : null,
        dataLimiteAjuste: saldoNegativo ? (form.dataLimiteAjuste || null) : null,
        arquivosReferencia: form.arquivosReferencia || null
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
    return (
      <span className={`flex items-center gap-1.5 ${n < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}`}>
        {n < 0 && <AlertTriangle className="w-3.5 h-3.5" />}
        {fmtMoney(n)}
      </span>
    )
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
                  {projetos.filter(p => p.status !== 'encerrado_consolidado' || p.id === form.projetoId).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
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

            {/* Saldo calculado */}
            {!form.eventoId ? (
              <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 text-sm text-navy-400 text-center">
                Selecione um evento para visualizar o saldo financeiro.
              </div>
            ) : financeiroLoading ? (
              <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 text-sm text-navy-400 text-center">
                Calculando saldo...
              </div>
            ) : financeiro ? (
              <div className={`rounded-xl border p-4 mb-5 ${saldoNegativo ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${saldoNegativo ? 'text-red-700' : 'text-green-700'}`}>
                  {saldoNegativo
                    ? '⚠️ Pendência Financeira — Saldo negativo'
                    : '✅ Saldo financeiro positivo'}
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <div className="flex items-center gap-1.5 text-green-700 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium uppercase">Receitas</span>
                    </div>
                    <p className="font-bold text-green-800">{fmtMoney(financeiro.receitas)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 text-red-600 mb-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium uppercase">Despesas</span>
                    </div>
                    <p className="font-bold text-red-700">{fmtMoney(financeiro.despesas)}</p>
                  </div>
                  <div className={`bg-white rounded-lg p-3 border ${saldoNegativo ? 'border-red-200' : 'border-green-200'}`}>
                    <div className={`flex items-center gap-1.5 mb-1 ${saldoNegativo ? 'text-red-600' : 'text-green-700'}`}>
                      {saldoNegativo ? <AlertTriangle className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      <span className="text-xs font-medium uppercase">Saldo</span>
                    </div>
                    <p className={`font-bold ${saldoNegativo ? 'text-red-700' : 'text-green-800'}`}>{fmtMoney(financeiro.saldo)}</p>
                  </div>
                </div>
                {saldoNegativo && (
                  <p className="text-xs text-red-600 mt-3">
                    O evento pode ser consolidado mesmo com saldo negativo. Preencha os campos de ajuste financeiro abaixo se houver um plano de regularização.
                  </p>
                )}
              </div>
            ) : null}

            {/* Campos de ajuste — só aparecem quando saldo negativo */}
            {saldoNegativo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Nome do Operador/Tesoureiro</label>
                  <input type="text" value={form.nomeOperador} onChange={e=>setField('nomeOperador',e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label>CPF do Operador</label>
                  <input type="text" placeholder="000.000.000-00" value={form.cpfOperador} onChange={e=>setField('cpfOperador',e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label>Método de Pagamento</label>
                  <select value={form.metodoAjuste} onChange={e=>setField('metodoAjuste',e.target.value)} className="form-input">
                    <option value="">Selecione...</option>
                    {metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <CurrencyInput label="Valor do Ajuste (R$)" value={form.valorAjuste} onChange={v=>setField('valorAjuste',v)}/>
                <div className="form-group">
                  <label>Conta Receptora do Ajuste</label>
                  <select value={form.contaReceptoraId} onChange={e=>setField('contaReceptoraId',e.target.value)} className="form-input">
                    <option value="">Selecione...</option>
                    {contas.map(c=><option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Data Limite para o Ajuste</label>
                  <DateInput label="Data Limite para Ajuste" value={form.dataLimiteAjuste} onChange={v=>setField('dataLimiteAjuste',v)}/>
                </div>
              </div>
            )}
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
