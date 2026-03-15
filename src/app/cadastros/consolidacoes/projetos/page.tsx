'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, ClipboardCheck, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface Consol { [key: string]: unknown; id: string; projetoId: string; dataConclusaoReal: string; saldoOrcamento: number }
interface Projeto { id: string; nome: string; dataEncerramento: string; orcamentoEstimado: number; status?: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Financeiro { receitas: number; despesas: number; saldo: number }

const emptyForm = { projetoId:'', dataConclusaoReal:'', consideracoes:'', pendencias:'', acoesPositivas:'', licoesAprendidas:'', nomeOperador:'', cpfOperador:'', metodoAjuste:'', valorAjuste:'', contaReceptoraId:'', dataLimiteAjuste:'', arquivosReferencia: '' }

const fmtMoney = (v: number) => v !== undefined && v !== null ? `R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '-'
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

export default function ConsolidacaoProjetosPage() {
  const [data, setData] = useState<Consol[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Consol | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [financeiro, setFinanceiro] = useState<Financeiro | null>(null)
  const [financeiroLoading, setFinanceiroLoading] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      fetch('/api/migrate/consolidacoes-saldo', { method: 'POST' }).catch(() => {})
      const [rd, rp, rc, rm] = await Promise.all([fetch('/api/consolidacoes-projeto'), fetch('/api/projetos'), fetch('/api/contas-bancarias'), fetch('/api/auxiliares?tipo=metodos')])
      const [jd, jp, jc, jm] = await Promise.all([rd.json(), rp.json(), rc.json(), rm.json()])
      if (jd.success) setData(jd.data); if (jp.success) setProjetos(jp.data); if (jc.success) setContas(jc.data); if (jm.success) setMetodos(jm.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/migrate/valor-ajuste', { method: 'POST' }).catch(() => {})
    fetchData()
  }, [fetchData])

  const fetchFinanceiro = async (projetoId: string) => {
    if (!projetoId) { setFinanceiro(null); return }
    setFinanceiroLoading(true)
    try {
      const r = await fetch(`/api/relatorio/financeiro-projeto?projetoId=${projetoId}`)
      const j = await r.json()
      if (j.success) setFinanceiro({ receitas: j.receitas.total, despesas: j.despesas.total, saldo: j.saldo })
      else setFinanceiro(null)
    } catch { setFinanceiro(null) }
    finally { setFinanceiroLoading(false) }
  }

  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const onProjetoChange = (id: string) => {
    setForm(p => ({ ...p, projetoId: id }))
    setProjetoSelecionado(projetos.find(p => p.id === id) || null)
    fetchFinanceiro(id)
  }

  const openCreate = () => { setEditing(null); setForm(emptyForm); setProjetoSelecionado(null); setFinanceiro(null); setModalOpen(true) }

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Consol)
    const f: typeof emptyForm = { ...emptyForm }
    Object.keys(emptyForm).forEach(k => {
      if (row[k] !== undefined && row[k] !== null) (f as unknown as Record<string, string>)[k] = (k==='dataConclusaoReal'||k==='dataLimiteAjuste') ? String(row[k]).slice(0,10) : String(row[k])
    })
    setForm(f)
    setProjetoSelecionado(projetos.find(p => p.id === String(row.projetoId)) || null)
    fetchFinanceiro(String(row.projetoId || ''))
    setModalOpen(true)
  }

  const saldoNegativo = financeiro !== null && financeiro.saldo < 0

  const handleSave = async () => {
    if (!form.projetoId || !form.dataConclusaoReal) { showToast('Preencha os campos obrigatórios','error'); return }
    setSaving(true)
    try {
      const saldoOrcamento = financeiro?.saldo ?? 0
      const payload = {
        ...form,
        saldoOrcamento,
        consideracoes: form.consideracoes||null,
        pendencias: form.pendencias||null,
        acoesPositivas: form.acoesPositivas||null,
        licoesAprendidas: form.licoesAprendidas||null,
        nomeOperador: saldoNegativo ? (form.nomeOperador||null) : null,
        cpfOperador: saldoNegativo ? (form.cpfOperador||null) : null,
        metodoAjuste: saldoNegativo ? (form.metodoAjuste||null) : null,
        valorAjuste: saldoNegativo ? (form.valorAjuste ? parseBRL(form.valorAjuste) : null) : null,
        contaReceptoraId: saldoNegativo ? (form.contaReceptoraId||null) : null,
        dataLimiteAjuste: saldoNegativo ? (form.dataLimiteAjuste||null) : null,
        arquivosReferencia: form.arquivosReferencia||null
      }
      const res = await fetch(editing ? `/api/consolidacoes-projeto/${(editing as Consol).id}` : '/api/consolidacoes-projeto', { method: editing?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing?'Atualizado!':'Consolidação registrada!'); setModalOpen(false); fetchData() }
      else showToast(j.error||'Erro','error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { const r = await fetch(`/api/consolidacoes-projeto/${id}`,{method:'DELETE'}); const j = await r.json(); if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchData() } } catch { showToast('Erro','error') }
  }

  const nomeProjeto = (v: unknown) => projetos.find(p => p.id === String(v))?.nome || '-'
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
      {toast && <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type==='success'?'bg-green-50 text-green-800 border border-green-200':'bg-red-50 text-red-800 border border-red-200'}`}>{toast.msg}</div>}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Consolidação de Projetos</h1><p className="text-sm text-navy-400">{data.length} consolidações</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Consolidação</button>
      </div>
      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable
            data={data}
            columns={[
              {key:'projetoId',label:'Projeto',render:nomeProjeto},
              {key:'dataConclusaoReal',label:'Conclusão Real',render:(v: unknown)=>fmtDate(String(v))},
              {key:'saldoOrcamento',label:'Saldo',render:renderSaldo},
              {key:'id',label:'Relatório',render:(v: unknown)=>(
                <a
                  href={`/cadastros/consolidacoes/projetos/relatorio?id=${v}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-navy-700 text-white rounded-lg hover:bg-navy-800 transition-colors"
                  onClick={e=>e.stopPropagation()}
                >
                  📄 Gerar Relatório
                </a>
              )}
            ]}
            onEdit={openEdit}
            onDelete={(row)=>setDeleteConfirm(String(row.id))}
            searchKeys={[]}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert} title={editing?'Editar Consolidação':'Nova Consolidação de Projeto'} size="xl">
        <div className="space-y-6">
          {/* SEÇÃO I */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3 pb-2 border-b border-cream-200">Seção I — Informações do Projeto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group md:col-span-2">
                <label>Projeto<span className="required-star">*</span></label>
                <select value={form.projetoId} onChange={e=>onProjetoChange(e.target.value)} className="form-input">
                  <option value="">Selecione o projeto...</option>
                  {projetos.filter(p => p.status !== 'encerrado_consolidado' || p.id === form.projetoId).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <DateInput label="Data Real de Conclusão" required value={form.dataConclusaoReal} onChange={v=>setForm(p=>({...p,dataConclusaoReal:v}))}/>
              {projetoSelecionado && (
                <div className="bg-cream-50 rounded-xl p-3 text-sm border border-cream-200">
                  <p className="font-medium text-navy-700 mb-1">Dados do Projeto</p>
                  <p className="text-navy-500">Encerramento previsto: {fmtDate(projetoSelecionado.dataEncerramento)}</p>
                  <p className="text-navy-500">Orçamento estimado: {fmtMoney(projetoSelecionado.orcamentoEstimado)}</p>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO II */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3 pb-2 border-b border-cream-200">Seção II — Preenchida pelo Responsável</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group md:col-span-2"><label>Considerações sobre o Projeto</label><textarea rows={3} value={form.consideracoes} onChange={e=>setForm(p=>({...p,consideracoes:e.target.value}))} className="form-input resize-none" /></div>
              <div className="form-group md:col-span-2"><label>Pendências Estratégicas, Táticas e Operacionais</label><textarea rows={3} value={form.pendencias} onChange={e=>setForm(p=>({...p,pendencias:e.target.value}))} className="form-input resize-none" /></div>
              <div className="form-group md:col-span-2"><label>Ações Positivas além do Escopo</label><textarea rows={3} value={form.acoesPositivas} onChange={e=>setForm(p=>({...p,acoesPositivas:e.target.value}))} className="form-input resize-none" /></div>
              <div className="form-group md:col-span-2"><label>Lições Aprendidas com o Projeto</label><textarea rows={3} value={form.licoesAprendidas} onChange={e=>setForm(p=>({...p,licoesAprendidas:e.target.value}))} className="form-input resize-none" /></div>
            </div>
          </div>

          {/* SEÇÃO III */}
          <div>
            <h3 className="text-sm font-semibold text-navy-700 uppercase tracking-wide mb-3 pb-2 border-b border-cream-200">Seção III — Financeiro do Projeto</h3>

            {/* Saldo calculado */}
            {!form.projetoId ? (
              <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 text-sm text-navy-400 text-center">
                Selecione um projeto para visualizar o saldo financeiro.
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
                    O projeto pode ser consolidado mesmo com saldo negativo. Preencha os campos de ajuste financeiro abaixo se houver um plano de regularização.
                  </p>
                )}
              </div>
            ) : null}

            {/* Campos de ajuste — só aparecem quando saldo negativo */}
            {saldoNegativo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group"><label>Nome do Operador/Tesoureiro</label><input type="text" value={form.nomeOperador} onChange={e=>setForm(p=>({...p,nomeOperador:e.target.value}))} className="form-input" /></div>
                <div className="form-group"><label>CPF do Operador</label><input type="text" placeholder="000.000.000-00" value={form.cpfOperador} onChange={e=>setForm(p=>({...p,cpfOperador:e.target.value}))} className="form-input" /></div>
                <div className="form-group"><label>Método de Pagamento</label><select value={form.metodoAjuste} onChange={e=>setForm(p=>({...p,metodoAjuste:e.target.value}))} className="form-input"><option value="">Selecione...</option>{metodos.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}</select></div>
                <div className="form-group"><label>Conta Receptora do Ajuste</label><select value={form.contaReceptoraId} onChange={e=>setForm(p=>({...p,contaReceptoraId:e.target.value}))} className="form-input"><option value="">Selecione...</option>{contas.map(c=><option key={c.id} value={c.id}>{contaLabel(c)}</option>)}</select></div>
                <CurrencyInput label="Valor do Ajuste (R$)" value={form.valorAjuste} onChange={v=>setForm(p=>({...p,valorAjuste:v}))}/>
                <DateInput label="Data Limite para o Ajuste" value={form.dataLimiteAjuste} onChange={v=>setForm(p=>({...p,dataLimiteAjuste:v}))}/>
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
          <button onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving?'Salvando...':editing?'Atualizar':'Registrar Consolidação'}</button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir esta consolidação?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={()=>setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={()=>deleteConfirm&&handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
