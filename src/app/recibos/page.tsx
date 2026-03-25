'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Receipt, Pencil, Trash2, Printer, RotateCcw, Plus, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import DateInput from '@/components/ui/DateInput'
import DocAssinadoBadge from '@/components/ui/DocAssinadoBadge'

interface Recibo {
  id: string
  numero: string
  sequencia: number
  data: string
  hora: string
  nomeRecebedor: string
  cpfRecebedor: string
  valor: number
  descricao: string
  createdAt: string
  docAssinadoUrl: string | null
  docAssinadoNome: string | null
}

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtDate = (d: string) =>
  d ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR') : '—'

function printRecibo(r: Recibo) {
  const valorFmt = fmtMoney(r.valor)
  const dataFmt = fmtDate(r.data)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Recibo ${r.numero}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #e5e7eb; font-family: Georgia, "Times New Roman", serif; color: #222; font-size: 15px; line-height: 1.9; }
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1a1a2e; color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px; gap: 12px;
      font-family: system-ui, sans-serif; font-size: 14px;
    }
    .toolbar-title { font-weight: 600; letter-spacing: 0.5px; }
    .toolbar-btns { display: flex; gap: 10px; }
    .btn-print { background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-print:hover { background: #4338ca; }
    .btn-close { background: transparent; color: #9ca3af; border: 1px solid #374151; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
    .btn-close:hover { color: white; border-color: #6b7280; }
    .page-wrapper { padding: 72px 24px 24px; display: flex; justify-content: center; }
    .a4 { background: white; width: 210mm; min-height: 297mm; padding: 20mm; box-shadow: 0 4px 32px rgba(0,0,0,0.18); }
    .cabecalho { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 24px; }
    .org { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #1a1a2e; }
    .sub { font-size: 13px; font-weight: 600; color: #333; margin-top: 2px; letter-spacing: 1px; }
    .titulo { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 10px; letter-spacing: 3px; text-transform: uppercase; }
    .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #555; }
    .numero { font-family: monospace; font-weight: 600; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }
    .corpo { margin-bottom: 24px; text-align: justify; }
    .destaque { border-bottom: 1px dotted #555; font-weight: bold; }
    .assinatura { margin-top: 80px; text-align: center; }
    .linha-assinatura { width: 260px; margin: 0 auto 8px; border-bottom: 1px solid #444; }
    .nome-assinatura { font-size: 14px; font-weight: 600; }
    .cpf-assinatura { font-size: 13px; color: #555; margin-top: 4px; }
    .rodape { margin-top: 60px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #aaa; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .page-wrapper { padding: 0; }
      .a4 { box-shadow: none; width: 100%; min-height: unset; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">📄 Recibo ${r.numero} — ${r.nomeRecebedor}</span>
    <div class="toolbar-btns">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>
  <div class="page-wrapper">
    <div class="a4">
      <div class="cabecalho">
        <div class="org">🕊️ AMO</div>
        <div class="sub">ASSOCIAÇÃO MISSÃO ÔMEGA</div>
        <div class="titulo">Recibo de Pagamento</div>
        <div class="meta">
          <span class="numero">${r.numero}</span>
          <span>${dataFmt}${r.hora ? ` — ${r.hora}` : ''}</span>
        </div>
      </div>
      <p class="corpo">
        Eu, <span class="destaque">${r.nomeRecebedor}</span>, recebi da
        <strong>Associação Missão Ômega</strong>, CNPJ 13.893.642/0001-09, localizada na
        Av. Macapa, n° 520, Veneza, Ipatinga/MG, o valor de
        <span class="destaque">${valorFmt}</span>
        pela seguinte prestação de serviço:
      </p>
      <p class="corpo" style="margin-top:12px;">• <span class="destaque">${r.descricao}</span></p>
      <div class="assinatura">
        <div class="linha-assinatura"></div>
        <div class="nome-assinatura">${r.nomeRecebedor}</div>
        <div class="cpf-assinatura">CPF: ${r.cpfRecebedor}</div>
      </div>
      <div class="rodape">Documento emitido pelo Sistema de Gestão AMO · ${r.numero}</div>
    </div>
  </div>
</body>
</html>`
  const win = window.open('', '_blank', 'width=960,height=1000')
  if (win) { win.document.write(html); win.document.close(); win.focus() }
}

const emptyForm = { data: '', hora: '', nomeRecebedor: '', cpfRecebedor: '', valor: '', descricao: '' }

export default function RecibosPage() {
  const [data, setData] = useState<Recibo[]>([])
  const [loading, setLoading] = useState(true)
  const [currentRole, setCurrentRole] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')
  const [filtroRecebedor, setFiltroRecebedor] = useState('')

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState<Recibo | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<Recibo | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = ['admin', 'superadmin'].includes(currentRole.toLowerCase())

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/recibo')
      const j = await r.json()
      if (j.success) setData(j.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => { if (j.usuario?.role) setCurrentRole(j.usuario.role) }).catch(() => {})
    fetch('/api/migrate/recibo', { method: 'POST' }).catch(() => {}).then(() => fetchData())
  }, [fetchData])

  // Sorted unique recebedor names for dropdown
  const recebedores = useMemo(() =>
    [...new Set(data.map(r => r.nomeRecebedor))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [data]
  )

  // Filtered data
  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filtroInicio && r.data < filtroInicio) return false
      if (filtroFim && r.data > filtroFim) return false
      if (filtroRecebedor && r.nomeRecebedor !== filtroRecebedor) return false
      return true
    })
  }, [data, filtroInicio, filtroFim, filtroRecebedor])

  const hasFilter = filtroInicio || filtroFim || filtroRecebedor
  const clearFilter = () => { setFiltroInicio(''); setFiltroFim(''); setFiltroRecebedor('') }

  const openEdit = (r: Recibo) => {
    if (!isAdmin) { showToast('Somente Admin ou SuperAdmin pode editar recibos.', 'error'); return }
    setEditing(r)
    setForm({
      data: r.data,
      hora: r.hora,
      nomeRecebedor: r.nomeRecebedor,
      cpfRecebedor: r.cpfRecebedor,
      valor: r.valor.toFixed(2).replace('.', ','),
      descricao: r.descricao,
    })
    setModalAlert(null)
    setEditModal(true)
  }

  const handleSave = async () => {
    if (!form.data || !form.nomeRecebedor || !form.cpfRecebedor || !form.valor || !form.descricao) {
      setModalAlert({ type: 'error', message: 'Preencha todos os campos obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/recibo/${editing!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, valor: parseBRL(form.valor) }),
      })
      const j = await res.json()
      if (j.success) {
        showToast('Recibo atualizado com sucesso!')
        setEditModal(false)
        fetchData()
      } else {
        setModalAlert({ type: 'error', message: j.error || 'Erro ao salvar.' })
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/recibo/${deleteConfirm.id}`, { method: 'DELETE' })
      const j = await res.json()
      if (j.success) {
        showToast(`Recibo ${deleteConfirm.numero} excluído.`)
        setDeleteConfirm(null)
        fetchData()
      } else {
        showToast(j.error || 'Erro ao excluir.', 'error')
      }
    } finally { setDeleting(false) }
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
          <Receipt className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Recibos Emitidos</h1>
            <p className="text-sm text-navy-400">
              {hasFilter ? `${filtered.length} de ${data.length}` : data.length} registro{data.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <a href="/recibo" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Emitir Novo Recibo
        </a>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <DateInput
            label="Data início"
            value={filtroInicio}
            onChange={setFiltroInicio}
          />
          <DateInput
            label="Data final"
            value={filtroFim}
            onChange={setFiltroFim}
          />
          <div className="form-group min-w-[220px] flex-1">
            <label>Recebedor</label>
            <select
              value={filtroRecebedor}
              onChange={e => setFiltroRecebedor(e.target.value)}
              className="form-input"
            >
              <option value="">— Todos —</option>
              {recebedores.map(nome => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          </div>
          {hasFilter && (
            <button
              onClick={clearFilter}
              title="Limpar filtros"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:text-red-600 hover:bg-red-50 border border-cream-300 transition-colors mb-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtro
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="text-center py-12 text-navy-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-navy-200 mx-auto mb-3" />
            <p className="text-navy-400 font-medium">
              {hasFilter ? 'Nenhum recibo encontrado para os filtros aplicados.' : 'Nenhum recibo emitido ainda.'}
            </p>
            {!hasFilter && (
              <a href="/recibo" className="inline-flex items-center gap-2 mt-4 text-sm text-navy-600 hover:text-navy-800 font-medium">
                <Plus className="w-4 h-4" /> Emitir primeiro recibo
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-700 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Recebedor</th>
                  <th className="px-4 py-3 text-left">CPF</th>
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Assinatura</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 bg-indigo-50">
                        {r.numero}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy-600 whitespace-nowrap">
                      {fmtDate(r.data)}{r.hora ? ` ${r.hora}` : ''}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy-800">{r.nomeRecebedor}</td>
                    <td className="px-4 py-3 font-mono text-navy-500 text-xs">{r.cpfRecebedor}</td>
                    <td className="px-4 py-3 text-navy-600 max-w-xs truncate" title={r.descricao}>{r.descricao}</td>
                    <td className="px-4 py-3 text-right font-bold text-navy-800 whitespace-nowrap">{fmtMoney(r.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <DocAssinadoBadge
                        recordId={r.id}
                        apiBase="/api/recibo"
                        docAssinadoUrl={r.docAssinadoUrl}
                        docAssinadoNome={r.docAssinadoNome}
                        isAdmin={isAdmin}
                        onUpdate={fetchData}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Visualizar / Imprimir */}
                        <button
                          onClick={() => printRecibo(r)}
                          title="Visualizar e Imprimir"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* Editar — somente Admin/SuperAdmin */}
                        <button
                          onClick={() => openEdit(r)}
                          title={isAdmin ? 'Editar' : 'Sem permissão para editar'}
                          className={`p-1.5 rounded-lg transition-colors ${isAdmin ? 'bg-navy-50 hover:bg-navy-100 text-navy-600' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Excluir — somente Admin/SuperAdmin */}
                        <button
                          onClick={() => isAdmin ? setDeleteConfirm(r) : showToast('Somente Admin ou SuperAdmin pode excluir recibos.', 'error')}
                          title={isAdmin ? 'Excluir' : 'Sem permissão para excluir'}
                          className={`p-1.5 rounded-lg transition-colors ${isAdmin ? 'bg-red-50 hover:bg-red-100 text-red-500' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={editing ? `Editar ${editing.numero}` : ''}
        size="lg"
        alert={modalAlert}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Data"
              required
              value={form.data}
              onChange={v => setForm(p => ({ ...p, data: v }))}
            />
            <div className="form-group">
              <label>Hora</label>
              <input
                type="time"
                value={form.hora}
                onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Nome do Recebedor <span className="required-star">*</span></label>
            <input
              type="text"
              value={form.nomeRecebedor}
              onChange={e => setForm(p => ({ ...p, nomeRecebedor: e.target.value }))}
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>CPF do Recebedor <span className="required-star">*</span></label>
              <input
                type="text"
                value={form.cpfRecebedor}
                onChange={e => setForm(p => ({ ...p, cpfRecebedor: maskCPF(e.target.value) }))}
                className="form-input font-mono"
                placeholder="000.000.000-00"
              />
            </div>
            <CurrencyInput
              label="Valor (R$)"
              required
              value={form.valor}
              onChange={v => setForm(p => ({ ...p, valor: v }))}
            />
          </div>
          <div className="form-group">
            <label>Descrição / Serviço Prestado <span className="required-star">*</span></label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={3}
              className="form-input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <RotateCcw className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-navy-600">
            Tem certeza que deseja excluir o recibo <strong className="font-mono">{deleteConfirm?.numero}</strong> de{' '}
            <strong>{deleteConfirm?.nomeRecebedor}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary" disabled={deleting}>Cancelar</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
