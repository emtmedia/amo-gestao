'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Landmark, Upload, FileText, AlertCircle, Loader2,
  TrendingDown, TrendingUp, Info, X, ChevronDown, ChevronUp,
  BarChart3, FileSpreadsheet, File, Eye, Trash2, Calendar, User
} from 'lucide-react'

interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
  type: 'debit' | 'credit' | 'neutral'
  key: string | null
  label: string | null
  reason: string
}

interface Summary {
  totalDebits: number
  totalCredits: number
  debitCount: number
  creditCount: number
}

interface AnalysisResult {
  id?: string
  fileName: string
  fileSize: number
  bank: string
  period: string
  transactions: Transaction[]
  summary: Summary
  notes: string | null
  criadoPorNome?: string
  createdAt?: string
}

interface ListRecord {
  id: string
  fileName: string
  fileSize: number
  bank: string
  period: string
  summary: Summary
  criadoPorNome: string
  createdAt: string
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <File className="w-4 h-4 text-red-500" />
  if (['xlsx', 'xls'].includes(ext ?? '')) return <FileSpreadsheet className="w-4 h-4 text-green-600" />
  return <FileText className="w-4 h-4 text-blue-500" />
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ isOpen, onClose, onAnalyze }: {
  isOpen: boolean; onClose: () => void; onAnalyze: (file: File) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]; if (f) setSelectedFile(f)
  }, [])

  const handleClose = () => { setSelectedFile(null); onClose() }
  const ext = selectedFile?.name.split('.').pop()?.toLowerCase() ?? ''
  const validExt = ['pdf', 'ofx', 'xlsx', 'xls'].includes(ext)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-100 rounded-lg"><Landmark className="w-5 h-5 text-navy-700" /></div>
            <div>
              <h2 className="text-lg font-bold text-navy-800">Analisar Extrato Bancário</h2>
              <p className="text-xs text-navy-400">Suporta PDF, OFX, XLS e XLSX</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver ? 'border-navy-500 bg-navy-50'
              : selectedFile ? 'border-green-400 bg-green-50'
              : 'border-cream-300 hover:border-navy-400 hover:bg-cream-50'
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.ofx,.xlsx,.xls"
              onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f) }}
              className="hidden" />
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {getFileIcon(selectedFile.name)}
                  <span className="font-medium text-navy-800 text-sm">{selectedFile.name}</span>
                </div>
                <p className="text-xs text-navy-400">{fmtSize(selectedFile.size)}</p>
                {!validExt && <p className="text-xs text-red-600 font-medium">Formato não suportado.</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-navy-300 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-navy-700">Arraste o arquivo aqui</p>
                  <p className="text-xs text-navy-400 mt-1">ou clique para selecionar</p>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {['PDF', 'OFX', 'XLSX', 'XLS'].map(f => (
                    <span key={f} className="text-xs bg-cream-100 text-navy-600 px-2 py-0.5 rounded-full font-mono">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>A análise usa IA para classificar automaticamente débitos reais, créditos reais e excluir transferências entre contas próprias.</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-cream-200">
          <button onClick={handleClose} className="px-4 py-2 text-sm font-medium text-navy-600 hover:bg-cream-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={() => { if (selectedFile) { onAnalyze(selectedFile); setSelectedFile(null); onClose() } }}
            disabled={!selectedFile || !validExt}
            className="px-5 py-2 text-sm font-medium bg-navy-700 text-white rounded-lg hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Analisar Extrato
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ record, onConfirm, onCancel }: {
  record: ListRecord; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></div>
          <h2 className="text-base font-bold text-navy-800">Excluir Consolidação</h2>
        </div>
        <p className="text-sm text-navy-600 mb-1">Deseja excluir permanentemente esta consolidação?</p>
        <div className="bg-cream-50 border border-cream-200 rounded-lg p-3 mb-5">
          <p className="text-xs font-semibold text-navy-700">{record.bank} — {record.period}</p>
          <p className="text-xs text-navy-400 mt-0.5">{record.fileName} • {fmtDate(record.createdAt)}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 text-sm font-medium text-navy-600 border border-cream-200 hover:bg-cream-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx, index }: { tx: Transaction; index: number }) {
  const [showReason, setShowReason] = useState(false)
  const bgClass = tx.type === 'debit' ? 'bg-yellow-100/40' : tx.type === 'credit' ? 'bg-green-50/60' : ''
  const labelClass = tx.type === 'debit' ? 'bg-yellow-200 text-yellow-800 border border-yellow-300'
    : tx.type === 'credit' ? 'bg-green-200 text-green-800 border border-green-300'
    : 'bg-gray-100 text-gray-500'

  return (
    <>
      <tr className={`text-sm border-b border-cream-100 ${bgClass} ${index % 2 === 0 && tx.type === 'neutral' ? 'bg-cream-50/40' : ''}`}>
        <td className="px-3 py-2 text-navy-500 text-xs whitespace-nowrap">{tx.date}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {tx.label ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${labelClass}`}>{tx.label}</span>
            ) : <span className="w-[28px]" />}
            <span className="text-navy-700 text-xs leading-tight">{tx.description}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium">
          {tx.debit ? <span className="text-red-600">{fmt(tx.debit)}</span> : '—'}
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium">
          {tx.credit ? <span className="text-green-700">{fmt(tx.credit)}</span> : '—'}
        </td>
        <td className="px-3 py-2 text-right text-xs text-navy-500">{fmt(tx.balance)}</td>
        <td className="px-3 py-2 text-center">
          <button onClick={() => setShowReason(p => !p)} className="text-navy-300 hover:text-navy-600 transition-colors" title={tx.reason}>
            {showReason ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
      </tr>
      {showReason && (
        <tr className={bgClass}>
          <td colSpan={6} className="px-3 pb-2 pt-0">
            <div className="text-[11px] text-navy-500 italic pl-12 border-l-2 border-cream-200 ml-3">{tx.reason}</div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Debit Groups Section ─────────────────────────────────────────────────────

interface DebitGroup { key: string; items: (Transaction & { label: string })[]; subtotal: number }

function buildDebitGroups(transactions: Transaction[]): DebitGroup[] {
  const map = new Map<string, DebitGroup>()
  for (const tx of transactions) {
    if (tx.type !== 'debit' || !tx.label) continue
    const key = tx.key ?? 'OUTROS'
    if (!map.has(key)) map.set(key, { key, items: [], subtotal: 0 })
    const g = map.get(key)!
    g.items.push(tx as Transaction & { label: string })
    g.subtotal += tx.debit ?? 0
  }
  return Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal)
}

function CreditGroupsSection({ transactions, totalCredits }: { transactions: Transaction[]; totalCredits: number }) {
  const [open, setOpen] = useState(true)

  const map = new Map<string, { key: string; items: (Transaction & { label: string })[]; subtotal: number }>()
  for (const tx of transactions) {
    if (tx.type !== 'credit' || !tx.label) continue
    const key = tx.key ?? 'OUTROS'
    if (!map.has(key)) map.set(key, { key, items: [], subtotal: 0 })
    const g = map.get(key)!
    g.items.push(tx as Transaction & { label: string })
    g.subtotal += tx.credit ?? 0
  }
  const groups = Array.from(map.values()).sort((a, b) => b.subtotal - a.subtotal)
  if (groups.length === 0) return null

  return (
    <div className="border-t border-cream-200 bg-white shrink-0">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-cream-50 transition-colors">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-bold text-navy-800 uppercase tracking-wide">Agrupamento por Tipo de Crédito</span>
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{groups.length} grupos</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-navy-400" /> : <ChevronDown className="w-3.5 h-3.5 text-navy-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {groups.map(g => (
            <div key={g.key} className="border border-green-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-green-50 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-green-800 bg-green-100 border border-green-300 px-1.5 py-0.5 rounded">{g.items.length}x</span>
                  <span className="text-xs font-semibold text-navy-700">{g.key}</span>
                </div>
                <span className="text-xs font-bold text-green-700">{fmt(g.subtotal)}</span>
              </div>
              <div className="divide-y divide-green-100">
                {g.items.map(tx => (
                  <div key={tx.label} className="flex items-center justify-between px-3 py-1 bg-green-50/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold font-mono text-green-700 bg-green-200 border border-green-300 px-1 py-0.5 rounded shrink-0">{tx.label}</span>
                      <span className="text-[11px] text-navy-600 truncate">{tx.description}</span>
                      <span className="text-[10px] text-navy-400 shrink-0 whitespace-nowrap">{tx.date}</span>
                    </div>
                    <span className="text-xs font-medium text-green-700 shrink-0 ml-2">{fmt(tx.credit)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-green-800 text-white rounded-lg px-3 py-2 mt-1">
            <span className="text-xs font-bold uppercase tracking-wide">Total Créditos</span>
            <span className="text-sm font-bold">{fmt(totalCredits)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function DebitGroupsSection({ transactions, totalDebits }: { transactions: Transaction[]; totalDebits: number }) {
  const [open, setOpen] = useState(true)
  const groups = buildDebitGroups(transactions)
  if (groups.length === 0) return null

  return (
    <div className="border-t border-cream-200 bg-white shrink-0">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-cream-50 transition-colors">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-bold text-navy-800 uppercase tracking-wide">Agrupamento por Tipo de Débito</span>
          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{groups.length} grupos</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-navy-400" /> : <ChevronDown className="w-3.5 h-3.5 text-navy-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {groups.map(g => (
            <div key={g.key} className="border border-yellow-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-yellow-50 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-yellow-800 bg-yellow-100 border border-yellow-300 px-1.5 py-0.5 rounded">{g.items.length}x</span>
                  <span className="text-xs font-semibold text-navy-700">{g.key}</span>
                </div>
                <span className="text-xs font-bold text-red-600">{fmt(g.subtotal)}</span>
              </div>
              <div className="divide-y divide-yellow-100">
                {g.items.map(tx => (
                  <div key={tx.label} className="flex items-center justify-between px-3 py-1 bg-yellow-50/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold font-mono text-yellow-700 bg-yellow-200 border border-yellow-300 px-1 py-0.5 rounded shrink-0">{tx.label}</span>
                      <span className="text-[11px] text-navy-600 truncate">{tx.description}</span>
                      <span className="text-[10px] text-navy-400 shrink-0 whitespace-nowrap">{tx.date}</span>
                    </div>
                    <span className="text-xs font-medium text-red-600 shrink-0 ml-2">{fmt(tx.debit)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-navy-800 text-white rounded-lg px-3 py-2 mt-1">
            <span className="text-xs font-bold uppercase tracking-wide">Total Débitos</span>
            <span className="text-sm font-bold">{fmt(totalDebits)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Results Panel ────────────────────────────────────────────────────────────

function ResultsPanel({ result, onClear }: { result: AnalysisResult; onClear: () => void }) {
  const net = result.summary.totalCredits - result.summary.totalDebits

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cream-200 bg-white shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-navy-600" />
              <span className="font-bold text-navy-800 text-sm">{result.bank}</span>
              <span className="text-xs text-navy-400 bg-cream-100 px-2 py-0.5 rounded-full">{result.period}</span>
            </div>
            <p className="text-xs text-navy-400 mt-1 flex items-center gap-1">
              {getFileIcon(result.fileName)}
              {result.fileName}
              <span className="text-navy-300">• {fmtSize(result.fileSize)}</span>
            </p>
            {result.createdAt && (
              <p className="text-[10px] text-navy-400 mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />{fmtDate(result.createdAt)}
                {result.criadoPorNome && <><User className="w-3 h-3 ml-1" />{result.criadoPorNome}</>}
              </p>
            )}
          </div>
          <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-300 hover:text-navy-600 transition-colors" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-red-50 border border-red-100 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1"><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-[10px] text-red-600 font-medium uppercase">Débitos</span></div>
            <p className="text-sm font-bold text-red-700">{fmt(result.summary.totalDebits)}</p>
            <p className="text-[10px] text-red-400">{result.summary.debitCount} lançamentos</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3 text-green-600" /><span className="text-[10px] text-green-700 font-medium uppercase">Créditos</span></div>
            <p className="text-sm font-bold text-green-700">{fmt(result.summary.totalCredits)}</p>
            <p className="text-[10px] text-green-500">{result.summary.creditCount} lançamentos</p>
          </div>
          <div className={`border rounded-lg p-2 ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className={`w-3 h-3 ${net >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
              <span className={`text-[10px] font-medium uppercase ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Saldo</span>
            </div>
            <p className={`text-sm font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(net)}</p>
            <p className={`text-[10px] ${net >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{net >= 0 ? 'Superávit' : 'Déficit'}</p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="px-4 py-2 bg-cream-50 border-b border-cream-200 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-200/80 border border-yellow-300 inline-block" /><span className="text-[10px] text-navy-500">Débito real (letras)</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" /><span className="text-[10px] text-navy-500">Crédito real (números)</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-cream-200 inline-block" /><span className="text-[10px] text-navy-500">Neutro</span></div>
      </div>

      {/* Transactions table */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 bg-navy-800 text-cream-50 text-[10px] uppercase z-10">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">Data</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Débito</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Crédito</th>
              <th className="px-3 py-2 text-right whitespace-nowrap">Saldo</th>
              <th className="px-3 py-2 text-center w-8"></th>
            </tr>
          </thead>
          <tbody>
            {result.transactions.map((tx, i) => <TransactionRow key={i} tx={tx} index={i} />)}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {result.notes && (
        <div className="p-3 border-t border-cream-200 bg-amber-50 shrink-0">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed">{result.notes}</p>
          </div>
        </div>
      )}

      {/* Debit groups */}
      <DebitGroupsSection transactions={result.transactions} totalDebits={result.summary.totalDebits} />

      {/* Credit groups */}
      <CreditGroupsSection transactions={result.transactions} totalCredits={result.summary.totalCredits} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsolidacaoBancariaPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null)
  const [records, setRecords] = useState<ListRecord[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ListRecord | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load list on mount
  useEffect(() => {
    fetchList()
  }, [])

  async function fetchList() {
    setLoadingList(true)
    try {
      const res = await fetch('/api/tesouraria/consolidacao-bancaria')
      const data = await res.json() as { records?: ListRecord[]; error?: string }
      if (data.records) setRecords(data.records)
    } catch { /* ignore */ } finally {
      setLoadingList(false)
    }
  }

  const handleAnalyze = async (file: File) => {
    setAnalyzing(true); setError(null); setResult(null); setAnalyzingFile(file.name)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/tesouraria/consolidacao-bancaria', { method: 'POST', body: fd })
      const data = await res.json() as AnalysisResult & { error?: string }
      if (!res.ok || data.error) { setError(data.error ?? 'Erro desconhecido.') }
      else { setResult(data); fetchList() }
    } catch { setError('Erro de conexão. Verifique sua internet e tente novamente.') }
    finally { setAnalyzing(false); setAnalyzingFile(null) }
  }

  const handleView = async (rec: ListRecord) => {
    setLoadingId(rec.id); setError(null)
    try {
      const res = await fetch(`/api/tesouraria/consolidacao-bancaria/${rec.id}`)
      const data = await res.json() as AnalysisResult & { error?: string }
      if (data.error) setError(data.error)
      else setResult(data)
    } catch { setError('Erro ao carregar consolidação.') }
    finally { setLoadingId(null) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    try {
      await fetch(`/api/tesouraria/consolidacao-bancaria/${deleteTarget.id}`, { method: 'DELETE' })
      if (result?.id === deleteTarget.id) setResult(null)
      await fetchList()
    } catch { /* ignore */ }
    finally { setDeletingId(null); setDeleteTarget(null) }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className={`flex flex-col shrink-0 transition-all duration-300 ${result ? 'w-80' : 'flex-1'} border-r border-cream-200 bg-white`}>
        {/* Header */}
        <div className="p-5 border-b border-cream-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-navy-100 rounded-lg"><Landmark className="w-5 h-5 text-navy-700" /></div>
            <div>
              <h1 className="text-xl font-bold text-navy-800">Consolidação Bancária</h1>
              <p className="text-xs text-navy-400">Análise inteligente de extratos</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-4 border-b border-cream-200">
          <button onClick={() => setModalOpen(true)} disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-navy-700 text-white rounded-xl hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm">
            {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" />Analisando...</> : <><Upload className="w-4 h-4" />Analisar Novo Extrato</>}
          </button>
          {analyzing && analyzingFile && (
            <div className="mt-3 p-3 bg-navy-50 border border-navy-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1"><Loader2 className="w-3.5 h-3.5 text-navy-600 animate-spin" /><span className="text-xs font-medium text-navy-700">Processando extrato</span></div>
              <p className="text-[10px] text-navy-400 truncate">{analyzingFile}</p>
              <div className="mt-1.5 h-1 bg-navy-100 rounded-full overflow-hidden"><div className="h-full bg-navy-600 rounded-full animate-pulse w-3/4" /></div>
            </div>
          )}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div><p className="text-xs font-medium text-red-700">Erro</p><p className="text-[11px] text-red-600 mt-0.5">{error}</p></div>
            </div>
          )}
        </div>

        {/* History list */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-navy-400" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-navy-300" />
              </div>
              <p className="text-sm font-medium text-navy-600">Nenhuma consolidação</p>
              <p className="text-xs text-navy-400 mt-1">Faça upload de um extrato para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-cream-100">
              {records.map(rec => {
                const isActive = result?.id === rec.id
                const isLoading = loadingId === rec.id
                const isDeleting = deletingId === rec.id
                return (
                  <div key={rec.id} className={`p-3 transition-colors ${isActive ? 'bg-navy-50 border-l-2 border-navy-600' : 'hover:bg-cream-50'}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Landmark className="w-3 h-3 text-navy-500 shrink-0" />
                          <span className="text-xs font-semibold text-navy-800 truncate">{rec.bank}</span>
                          <span className="text-[10px] bg-cream-100 text-navy-500 px-1.5 py-0.5 rounded-full shrink-0">{rec.period}</span>
                        </div>
                        <p className="text-[10px] text-navy-400 truncate flex items-center gap-1">
                          {getFileIcon(rec.fileName)}{rec.fileName}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-red-500 font-medium">{fmt(rec.summary.totalDebits)}</span>
                          <span className="text-[10px] text-green-600 font-medium">{fmt(rec.summary.totalCredits)}</span>
                        </div>
                        <p className="text-[10px] text-navy-300 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />{fmtDate(rec.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => handleView(rec)} disabled={isLoading || isDeleting}
                          className="p-1.5 rounded-lg hover:bg-navy-100 text-navy-500 hover:text-navy-800 transition-colors disabled:opacity-40"
                          title="Ver análise">
                          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setDeleteTarget(rec)} disabled={isLoading || isDeleting}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-navy-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Excluir">
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {result && (
        <div className="flex-1 overflow-hidden">
          <ResultsPanel result={result} onClear={() => setResult(null)} />
        </div>
      )}

      {/* Modals */}
      <UploadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onAnalyze={handleAnalyze} />
      {deleteTarget && (
        <DeleteModal record={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}
