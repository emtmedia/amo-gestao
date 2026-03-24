'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Printer, Pencil, Trash2, Eye, Banknote, CalendarClock } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import DateInput from '@/components/ui/DateInput'

interface ChequeRecibo {
  id: string
  numero: string
  sequencia: number
  nomeOperador: string
  dataTransferencia: string
  valorConcedido: number
  metodoTransferencia: string
  nomeRecebedor: string
  cpfRecebedor: string
  dataAcertoNotas: string
  observacoes?: string | null
  createdAt: string
}

interface Metodo { id: string; nome: string }

const emptyForm = {
  nomeOperador: '',
  dataTransferencia: '',
  valorConcedido: '',
  metodoTransferencia: 'Espécie',
  nomeRecebedor: '',
  cpfRecebedor: '',
  dataAcertoNotas: '',
  observacoes: '',
}

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const fmtDate = (d: string) =>
  d ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR') : '—'

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtMoneyInput = (v: string) => {
  if (!v) return ''
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function printChequeRecibo(cr: ChequeRecibo) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Cheque-Recibo ${cr.numero}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #e5e7eb; font-family: 'Courier New', Courier, monospace; color: #1a1a2e; font-size: 13px; }

    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1a1a2e; color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px;
      font-family: system-ui, sans-serif; font-size: 14px;
    }
    .toolbar-title { font-weight: 600; }
    .toolbar-btns { display: flex; gap: 10px; }
    .btn-print {
      background: #be185d; color: white; border: none; border-radius: 6px;
      padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-print:hover { background: #9d174d; }
    .btn-close {
      background: transparent; color: #9ca3af; border: 1px solid #374151;
      border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;
    }
    .btn-close:hover { color: white; border-color: #6b7280; }

    .page-wrapper { padding: 72px 24px 24px; display: flex; justify-content: center; }
    .a4 {
      background: white; width: 210mm; min-height: 297mm;
      padding: 12mm; box-shadow: 0 4px 32px rgba(0,0,0,0.18);
    }

    /* Header */
    .header {
      background: #c8d0dc;
      padding: 18px 24px 14px;
      text-align: center;
      border-bottom: 2px solid #1a1a2e;
    }
    .titulo {
      font-size: 28px; font-weight: 900; letter-spacing: 10px;
      color: #1a1a2e; font-family: Arial, sans-serif;
    }
    .subtitulo {
      font-size: 12px; font-weight: 700; letter-spacing: 5px;
      color: #1a1a2e; margin-top: 4px; font-family: Arial, sans-serif;
    }
    .numero-linha {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; margin-top: 12px; font-family: Arial, sans-serif;
      font-size: 13px; font-weight: 600; color: #1a1a2e;
    }
    .numero-badge {
      border: 2px solid #be185d; border-radius: 4px;
      padding: 3px 12px; color: #be185d;
      font-weight: 800; font-size: 14px; font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    /* Body */
    .body { padding: 16px 24px; border-bottom: 2px solid #1a1a2e; }
    .section-title {
      text-align: center; font-size: 13px; font-weight: 700;
      letter-spacing: 2px; margin-bottom: 16px;
      font-family: Arial, sans-serif;
    }
    .field-row {
      display: flex; align-items: center; margin-bottom: 10px;
      font-family: Arial, sans-serif;
    }
    .field-label {
      min-width: 200px; font-size: 12px; font-weight: 700;
      color: #1a1a2e; text-align: right; padding-right: 12px;
    }
    .field-value {
      flex: 1; font-size: 13px; color: #1e3a8a; font-weight: 600;
    }

    /* Auth */
    .auth { padding: 14px 24px; }
    .auth-title {
      text-align: center; font-size: 12px; font-weight: 700;
      letter-spacing: 2px; margin-bottom: 8px;
      font-family: Arial, sans-serif;
    }
    .auth-box {
      border: 1.5px solid #9ca3af; border-radius: 4px;
      min-height: 60px; margin-bottom: 14px;
    }
    .auth-sign-title {
      text-align: center; font-size: 12px; font-weight: 700;
      letter-spacing: 2px; margin-bottom: 18px;
      font-family: Arial, sans-serif;
    }
    .assinatura { text-align: center; margin-top: 8px; }
    .linha-assinatura {
      width: 280px; margin: 0 auto 8px;
      border-bottom: 1px solid #333;
    }
    .nome-assinatura { font-size: 14px; font-weight: 700; font-family: Arial, sans-serif; }
    .cpf-assinatura { font-size: 12px; color: #555; margin-top: 3px; font-family: Arial, sans-serif; }

    /* Legal */
    .legal {
      padding: 14px 24px 0;
      font-size: 9px; line-height: 1.6; color: #444;
      font-family: Arial, sans-serif; text-align: justify;
    }

    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .page-wrapper { padding: 0; }
      .a4 { box-shadow: none; width: 100%; min-height: unset; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">Cheque-Recibo ${cr.numero} — ${cr.nomeRecebedor}</span>
    <div class="toolbar-btns">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="page-wrapper">
    <div class="a4">
      <!-- Header -->
      <div class="header">
        <div class="titulo">C H E Q U E - R E C I B O</div>
        <div class="subtitulo">T E S O U R A R I A &nbsp; A M O</div>
        <div class="numero-linha">
          <span>N° do Cheque-Recibo</span>
          <span class="numero-badge">${cr.numero}</span>
        </div>
      </div>

      <!-- Dados -->
      <div class="body">
        <div class="section-title">Comprovante de Recebimento de Valor (R$)</div>

        <div class="field-row">
          <div class="field-label">Nome do Operador/Tesoureiro:</div>
          <div class="field-value">${cr.nomeOperador}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Data de Transferência de crédito:</div>
          <div class="field-value">${new Date(cr.dataTransferencia + (cr.dataTransferencia.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Valor Concedido:</div>
          <div class="field-value">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cr.valorConcedido)}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Método de transferência:</div>
          <div class="field-value">${cr.metodoTransferencia}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Nome do Recebedor:</div>
          <div class="field-value">${cr.nomeRecebedor}</div>
        </div>
        <div class="field-row">
          <div class="field-label">CPF do Recebedor:</div>
          <div class="field-value">${cr.cpfRecebedor}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Data de Acerto de Notas Fiscais:</div>
          <div class="field-value">${new Date(cr.dataAcertoNotas + (cr.dataAcertoNotas.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')}</div>
        </div>
        ${cr.observacoes ? `
        <div class="field-row">
          <div class="field-label">Observações:</div>
          <div class="field-value">${cr.observacoes}</div>
        </div>` : ''}
      </div>

      <!-- Autenticação Digital -->
      <div class="auth">
        <div class="auth-title">Autenticação Digital - GOV</div>
        <div class="auth-box"></div>

        <div class="auth-sign-title">Autenticação/Assinatura Física</div>
        <div class="assinatura">
          <div class="linha-assinatura"></div>
          <div class="nome-assinatura">${cr.nomeRecebedor}</div>
          <div class="cpf-assinatura">CPF: ${cr.cpfRecebedor}</div>
        </div>
      </div>

      <!-- Texto Legal -->
      <div class="legal">
        O valor recebido pelo recebedor deverá ser gasto exclusivamente em produtos e serviços em utilidade e prestação de serviço à Associação Missão Ômega em projetos, eventos ou atividades e despesas da organização. As notas de natureza fiscal deverão ser apresentadas e correlacionadas a este documento através do seu número de série. As notas fiscais e o valor restante deverão ser devolvidos à tesouraria e a soma das notas fiscais mais o valor restante deste cheque-recibo deverá ser igual ao valor concedido declarado neste documento. O cheque-recibo é emitido somente em situações quando a concessão de dinheiro em espécie é extremamente necessária em casos que pagamentos via meios digitais se torna complexo e inviável. No caso do recebedor não apresentar as notas fiscais mais o valor restante (se houver) até a data de &lsquo;Acerto de Notas Fiscais&rsquo; estabelecida neste documento, será considerado inadimplente e deverá restituir o valor concedido o mais breve possível à tesouraria da AMO. Em última instância, o conselho fiscal deliberará sobre tal fato se ocorrer.
      </div>
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=960,height=1100')
  if (win) { win.document.write(html); win.document.close(); win.focus() }
}

export default function ChequeReciboPage() {
  const [data, setData] = useState<ChequeRecibo[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [loading, setLoading] = useState(true)
  const [proximoNumero, setProximoNumero] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChequeRecibo | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [migrated, setMigrated] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, rm] = await Promise.all([
        fetch('/api/cheque-recibo'),
        fetch('/api/auxiliares?tipo=metodos'),
      ])
      const [jd, jm] = await Promise.all([rd.json(), rm.json()])
      if (jd.success) { setData(jd.data); setProximoNumero(jd.proximo) }
      if (jm.success) setMetodos(jm.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/migrate/cheque-recibo', { method: 'POST' })
      .then(() => setMigrated(true))
      .then(() => fetchData())
      .catch(() => { setMigrated(true); fetchData() })
  }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setModalAlert(null)
    setModalOpen(true)
  }

  const openEdit = (cr: ChequeRecibo) => {
    setEditing(cr)
    setForm({
      nomeOperador: cr.nomeOperador,
      dataTransferencia: String(cr.dataTransferencia).slice(0, 10),
      valorConcedido: cr.valorConcedido.toFixed(2).replace('.', ','),
      metodoTransferencia: cr.metodoTransferencia,
      nomeRecebedor: cr.nomeRecebedor,
      cpfRecebedor: cr.cpfRecebedor,
      dataAcertoNotas: String(cr.dataAcertoNotas).slice(0, 10),
      observacoes: cr.observacoes || '',
    })
    setModalAlert(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomeOperador || !form.dataTransferencia || !form.valorConcedido || !form.nomeRecebedor || !form.cpfRecebedor || !form.dataAcertoNotas) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        valorConcedido: parseBRL(form.valorConcedido),
        observacoes: form.observacoes || null,
      }
      const url = editing ? `/api/cheque-recibo/${editing.id}` : '/api/cheque-recibo'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) {
        showToast(editing ? 'Atualizado com sucesso!' : `Cheque-Recibo ${j.numero} emitido!`)
        setModalOpen(false)
        fetchData()
      } else {
        showToast(j.error || 'Erro ao salvar', 'error')
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/cheque-recibo/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Removido com sucesso!'); setDeleteConfirm(null); fetchData() }
      else showToast(j.error || 'Erro ao remover', 'error')
    } catch { showToast('Erro ao remover', 'error') }
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Banknote className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Cheque-Recibo</h1>
            <p className="text-sm text-navy-400">{data.length} registro{data.length !== 1 ? 's' : ''} · Próximo: <span className="font-mono font-semibold text-pink-700">{proximoNumero}</span></p>
          </div>
        </div>
        <button onClick={openCreate} disabled={!migrated} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Cheque-Recibo
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-navy-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="card text-center py-12">
            <Banknote className="w-12 h-12 text-navy-200 mx-auto mb-3" />
            <p className="text-navy-400 font-medium">Nenhum Cheque-Recibo emitido ainda</p>
            <p className="text-sm text-navy-300 mt-1">Clique em "Novo Cheque-Recibo" para emitir o primeiro</p>
          </div>
        ) : (
          data.map(cr => (
            <div key={cr.id} className="card flex items-start justify-between gap-4 hover:shadow-md transition-shadow">
              {/* Left: info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-block font-mono font-bold text-sm px-3 py-1 rounded border-2 border-pink-600 text-pink-700 bg-pink-50">
                    {cr.numero}
                  </span>
                  <span className="text-xs text-navy-400">emitido em {fmtDate(cr.createdAt)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                  <div>
                    <span className="text-navy-400 text-xs font-medium block">Operador/Tesoureiro</span>
                    <span className="text-navy-800 font-medium">{cr.nomeOperador}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 text-xs font-medium block">Recebedor</span>
                    <span className="text-navy-800 font-medium">{cr.nomeRecebedor}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 text-xs font-medium block">CPF do Recebedor</span>
                    <span className="text-navy-800 font-mono">{cr.cpfRecebedor}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 text-xs font-medium block">Valor Concedido</span>
                    <span className="text-navy-800 font-bold text-base">{fmtMoney(cr.valorConcedido)}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 text-xs font-medium block">Data de Transferência</span>
                    <span className="text-navy-800">{fmtDate(String(cr.dataTransferencia).slice(0, 10))}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 text-xs font-medium block flex items-center gap-1"><CalendarClock className="w-3 h-3 inline" /> Acerto de NF</span>
                    <span className="text-navy-800 font-medium">{fmtDate(String(cr.dataAcertoNotas).slice(0, 10))}</span>
                  </div>
                  <div>
                    <span className="text-navy-400 text-xs font-medium block">Método</span>
                    <span className="text-navy-800">{cr.metodoTransferencia}</span>
                  </div>
                  {cr.observacoes && (
                    <div className="col-span-2">
                      <span className="text-navy-400 text-xs font-medium block">Observações</span>
                      <span className="text-navy-600 text-xs">{cr.observacoes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => printChequeRecibo(cr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-sm font-medium transition-colors"
                  title="Visualizar / Imprimir"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  onClick={() => openEdit(cr)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-700 text-sm font-medium transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={() => setDeleteConfirm(cr.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.numero}` : `Novo Cheque-Recibo · ${proximoNumero}`}
        size="lg"
        alert={modalAlert}
      >
        <div className="space-y-4">
          {/* Número (read-only quando criando) */}
          {!editing && (
            <div className="form-group">
              <label>Nº do Cheque-Recibo</label>
              <input
                type="text"
                value={proximoNumero}
                readOnly
                className="form-input bg-pink-50 text-pink-700 font-mono font-bold cursor-not-allowed"
              />
              <p className="text-xs text-navy-400 mt-1">Número gerado automaticamente ao emitir</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label>Nome do Operador/Tesoureiro <span className="required-star">*</span></label>
              <input
                type="text"
                placeholder="Nome completo do tesoureiro"
                value={form.nomeOperador}
                onChange={e => setForm(p => ({ ...p, nomeOperador: e.target.value }))}
                className="form-input"
              />
            </div>

            <DateInput
              label="Data de Transferência de Crédito"
              required
              value={form.dataTransferencia}
              onChange={v => setForm(p => ({ ...p, dataTransferencia: v }))}
            />

            <CurrencyInput
              label="Valor Concedido (R$)"
              required
              value={form.valorConcedido}
              onChange={v => setForm(p => ({ ...p, valorConcedido: v }))}
            />
          </div>

          <div className="form-group">
            <label>Método de Transferência <span className="required-star">*</span></label>
            {metodos.length > 0 ? (
              <select
                value={form.metodoTransferencia}
                onChange={e => setForm(p => ({ ...p, metodoTransferencia: e.target.value }))}
                className="form-input"
              >
                <option value="Espécie">Espécie</option>
                {metodos.map(m => (
                  <option key={m.id} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.metodoTransferencia}
                onChange={e => setForm(p => ({ ...p, metodoTransferencia: e.target.value }))}
                className="form-input"
              />
            )}
          </div>

          <div className="border-t border-cream-200 pt-4">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Dados do Recebedor</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2 md:col-span-1">
                <label>Nome do Recebedor <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.nomeRecebedor}
                  onChange={e => setForm(p => ({ ...p, nomeRecebedor: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group col-span-2 md:col-span-1">
                <label>CPF do Recebedor <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={form.cpfRecebedor}
                  onChange={e => setForm(p => ({ ...p, cpfRecebedor: maskCPF(e.target.value) }))}
                  className="form-input font-mono"
                  maxLength={14}
                />
              </div>
            </div>
          </div>

          <DateInput
            label="Data Limite de Acerto de Notas Fiscais"
            required
            value={form.dataAcertoNotas}
            onChange={v => setForm(p => ({ ...p, dataAcertoNotas: v }))}
          />

          <div className="form-group">
            <label>Observações</label>
            <textarea
              rows={2}
              placeholder="Observações opcionais..."
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              className="form-input resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <Printer className="w-4 h-4" />}
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Emitir Cheque-Recibo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-navy-600">Tem certeza que deseja excluir este Cheque-Recibo? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
