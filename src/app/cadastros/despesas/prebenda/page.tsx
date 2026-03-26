'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Banknote, Lock, ShieldOff } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import BlockErrorModal from '@/components/ui/BlockErrorModal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import DateInput from '@/components/ui/DateInput'

interface Prebenda {
  id: string
  nomePrebendado: string
  cpfPrebendado: string
  dataPagamento: string
  valorPagamento: number
  contaBancariaId: string
  metodoTransferenciaId: string
  mesReferencia: number
  anoReferencia: number
  reciboId: string | null
  reciboNumero: string | null
  reciboAssinado: string | null
  bancaNome: string | null
  metodoNome: string | null
  observacoes: string | null
}

interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Recibo { id: string; numero: string; nomeRecebedor: string }

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ANO_ATUAL = new Date().getFullYear()
const ANOS = Array.from({ length: 10 }, (_, i) => ANO_ATUAL - 7 + i)

function formatCPF(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`
}

const emptyForm = {
  nomePrebendado: '',
  cpfPrebendado: '',
  dataPagamento: '',
  valorPagamento: '',
  contaBancariaId: '',
  metodoTransferenciaId: '',
  mesReferencia: String(new Date().getMonth() + 1),
  anoReferencia: String(ANO_ATUAL),
  reciboId: '',
  observacoes: '',
  arquivosReferencia: '',
}

export default function PrebendaPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)
  const [data, setData] = useState<Prebenda[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Prebenda | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  // Verificar permissão SuperAdmin
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setIsSuperAdmin(data?.usuario?.role === 'superadmin'))
      .catch(() => setIsSuperAdmin(false))
  }, [])

  // Executar migration ao carregar
  useEffect(() => {
    fetch('/api/migrate/prebenda', { method: 'POST' }).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, rc, rm, rr] = await Promise.all([
        fetch('/api/despesas/prebenda'),
        fetch('/api/contas-bancarias'),
        fetch('/api/auxiliares?tipo=metodos'),
        fetch('/api/recibo'),
      ])
      const [jd, jc, jm, jr] = await Promise.all([rd.json(), rc.json(), rm.json(), rr.json()])
      if (jd.success) setData(jd.data)
      if (jc.success) setContas(jc.data)
      if (jm.success) setMetodos(jm.data)
      if (jr.success) setRecibos(jr.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    const r = row as unknown as Prebenda
    setEditing(r)
    setForm({
      nomePrebendado: r.nomePrebendado,
      cpfPrebendado: r.cpfPrebendado,
      dataPagamento: r.dataPagamento ? String(r.dataPagamento).slice(0, 10) : '',
      valorPagamento: String(r.valorPagamento),
      contaBancariaId: r.contaBancariaId,
      metodoTransferenciaId: r.metodoTransferenciaId,
      mesReferencia: String(r.mesReferencia),
      anoReferencia: String(r.anoReferencia),
      reciboId: r.reciboId || '',
      observacoes: r.observacoes || '',
      arquivosReferencia: '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomePrebendado || !form.cpfPrebendado || !form.dataPagamento || !form.valorPagamento ||
        !form.contaBancariaId || !form.metodoTransferenciaId || !form.mesReferencia ||
        !form.anoReferencia || !form.reciboId) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        valorPagamento: parseBRL(form.valorPagamento),
        mesReferencia: parseInt(form.mesReferencia),
        anoReferencia: parseInt(form.anoReferencia),
        reciboId: form.reciboId || null,
        observacoes: form.observacoes || null,
        arquivosReferencia: form.arquivosReferencia || null,
      }
      const res = await fetch(editing ? `/api/despesas/prebenda/${editing.id}` : '/api/despesas/prebenda', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (j.success) {
        showToast(editing ? 'Prebenda atualizada!' : 'Prebenda registrada!')
        setModalOpen(false)
        fetchData()
      } else {
        showToast(j.error || 'Erro ao salvar', 'error')
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/despesas/prebenda/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Registro removido!'); fetchData() }
      else setBlockError(j.error || 'Erro ao remover')
    } catch { showToast('Erro ao remover', 'error') }
  }

  const cols = [
    { key: 'nomePrebendado', label: 'Prebendado' },
    { key: 'cpfPrebendado', label: 'CPF' },
    {
      key: 'mesReferencia', label: 'Mês/Ano Ref.',
      render: (_v: unknown, row: Record<string, unknown>) =>
        `${MESES[(row.mesReferencia as number) - 1]?.substring(0, 3)}/${row.anoReferencia}`
    },
    { key: 'dataPagamento', label: 'Data Pagto.', render: (v: unknown) => fmtDate(String(v)) },
    { key: 'valorPagamento', label: 'Valor', render: (v: unknown) => fmtMoney(Number(v)) },
    {
      key: 'reciboNumero', label: 'Recibo',
      render: (v: unknown, row: Record<string, unknown>) => (
        <span className={`inline-flex items-center gap-1 text-xs ${row.reciboAssinado ? 'text-green-700 font-medium' : 'text-navy-600'}`}>
          {!!row.reciboAssinado && <Lock className="w-3 h-3" />}
          {v ? String(v) : '—'}
        </span>
      )
    },
    { key: 'bancaNome', label: 'Banco', render: (v: unknown) => v ? String(v) : '—' },
    { key: 'metodoNome', label: 'Método', render: (v: unknown) => v ? String(v) : '—' },
  ]

  if (isSuperAdmin === null) {
    return <div className="flex items-center justify-center h-64 text-navy-400">Verificando permissões...</div>
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <ShieldOff className="w-12 h-12 text-navy-300" />
        <h2 className="text-lg font-semibold text-navy-700">Acesso Restrito</h2>
        <p className="text-sm text-navy-400 max-w-xs">Esta página é de acesso exclusivo ao perfil SuperAdmin.</p>
      </div>
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
          <Banknote className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Prebenda</h1>
            <p className="text-sm text-navy-400">{data.length} registro(s)</p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Prebenda</button>
      </div>

      <div className="card">
        {loading
          ? <div className="text-center py-8 text-navy-400">Carregando...</div>
          : <DataTable
              data={data as unknown as Record<string, unknown>[]}
              columns={cols}
              onEdit={openEdit}
              onDelete={(row) => handleDelete(String(row.id))}
              searchKeys={['nomePrebendado', 'cpfPrebendado', 'reciboNumero']}
            />
        }
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} alert={modalAlert}
        title={editing ? 'Editar Prebenda' : 'Nova Prebenda'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Nome do Prebendado */}
          <div className="form-group md:col-span-2">
            <label>Nome do Prebendado<span className="required-star">*</span></label>
            <input
              type="text"
              value={form.nomePrebendado}
              onChange={e => setForm(p => ({ ...p, nomePrebendado: e.target.value }))}
              className="form-input"
              placeholder="Nome completo"
            />
          </div>

          {/* CPF */}
          <div className="form-group">
            <label>CPF do Prebendado<span className="required-star">*</span></label>
            <input
              type="text"
              value={form.cpfPrebendado}
              onChange={e => setForm(p => ({ ...p, cpfPrebendado: formatCPF(e.target.value) }))}
              className="form-input"
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>

          {/* Data de Pagamento */}
          <DateInput
            label="Data de Pagamento"
            required
            value={form.dataPagamento}
            onChange={v => setForm(p => ({ ...p, dataPagamento: v }))}
          />

          {/* Valor */}
          <CurrencyInput
            label="Valor de Pagamento (R$)"
            required
            value={form.valorPagamento}
            onChange={v => setForm(p => ({ ...p, valorPagamento: v }))}
          />

          {/* Banco de Origem (ContaBancaria) */}
          <div className="form-group">
            <label>Banco de Origem<span className="required-star">*</span></label>
            <select
              value={form.contaBancariaId}
              onChange={e => setForm(p => ({ ...p, contaBancariaId: e.target.value }))}
              className="form-input"
            >
              <option value="">Selecione a conta...</option>
              {contas.map(c => (
                <option key={c.id} value={c.id}>{contaLabel(c)}</option>
              ))}
            </select>
          </div>

          {/* Método de Transferência */}
          <div className="form-group">
            <label>Método de Transferência<span className="required-star">*</span></label>
            <select
              value={form.metodoTransferenciaId}
              onChange={e => setForm(p => ({ ...p, metodoTransferenciaId: e.target.value }))}
              className="form-input"
            >
              <option value="">Selecione...</option>
              {metodos.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          {/* Mês de Referência */}
          <div className="form-group">
            <label>Mês de Referência<span className="required-star">*</span></label>
            <select
              value={form.mesReferencia}
              onChange={e => setForm(p => ({ ...p, mesReferencia: e.target.value }))}
              className="form-input"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>

          {/* Ano de Referência */}
          <div className="form-group">
            <label>Ano de Referência<span className="required-star">*</span></label>
            <select
              value={form.anoReferencia}
              onChange={e => setForm(p => ({ ...p, anoReferencia: e.target.value }))}
              className="form-input"
            >
              {ANOS.map(a => (
                <option key={a} value={String(a)}>{a}</option>
              ))}
            </select>
          </div>

          {/* N° do Recibo de Pagamento */}
          <div className="form-group md:col-span-2">
            <label>
              N° do Recibo de Pagamento<span className="required-star">*</span>
              {editing?.reciboAssinado && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-700 font-normal">
                  <Lock className="w-3 h-3" /> Recibo com doc. assinado — este campo não pode ser alterado
                </span>
              )}
            </label>
            <select
              value={form.reciboId}
              onChange={e => setForm(p => ({ ...p, reciboId: e.target.value }))}
              className="form-input"
              disabled={!!(editing?.reciboAssinado)}
            >
              <option value="">Selecione o recibo...</option>
              {recibos.map(r => (
                <option key={r.id} value={r.id}>{r.numero} — {r.nomeRecebedor}</option>
              ))}
            </select>
            {editing?.reciboAssinado && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ O recibo vinculado já possui documento assinado. Por este motivo, o vínculo e a exclusão deste registro estão bloqueados.
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="form-group md:col-span-2">
            <label>Observações</label>
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              className="form-input"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Registrar Prebenda'}
          </button>
        </div>
      </Modal>

      <BlockErrorModal error={blockError} onClose={() => setBlockError(null)} />
    </div>
  )
}
