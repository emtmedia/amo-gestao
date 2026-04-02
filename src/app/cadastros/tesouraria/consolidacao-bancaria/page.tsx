'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Landmark, Upload, FileText, AlertCircle, Loader2,
  TrendingDown, TrendingUp, Info, X, ChevronDown, ChevronUp,
  BarChart3, FileSpreadsheet, File
} from 'lucide-react'

interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
  type: 'debit' | 'credit' | 'neutral'
  label: string | null
  reason: string
}

interface AnalysisResult {
  fileName: string
  fileSize: number
  bank: string
  period: string
  transactions: Transaction[]
  summary: {
    totalDebits: number
    totalCredits: number
    debitCount: number
    creditCount: number
  }
  notes: string
}

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return <File className="w-4 h-4 text-red-500" />
  if (['xlsx', 'xls'].includes(ext ?? '')) return <FileSpreadsheet className="w-4 h-4 text-green-600" />
  return <FileText className="w-4 h-4 text-blue-500" />
}

function UploadModal({
  isOpen,
  onClose,
  onAnalyze,
}: {
  isOpen: boolean
  onClose: () => void
  onAnalyze: (file: File) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setSelectedFile(f)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setSelectedFile(f)
  }

  const handleSubmit = () => {
    if (selectedFile) {
      onAnalyze(selectedFile)
      setSelectedFile(null)
      onClose()
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    onClose()
  }

  if (!isOpen) return null

  const ext = selectedFile?.name.split('.').pop()?.toLowerCase() ?? ''
  const validExt = ['pdf', 'ofx', 'xlsx', 'xls'].includes(ext)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cream-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-100 rounded-lg">
              <Landmark className="w-5 h-5 text-navy-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy-800">Analisar Extrato Bancário</h2>
              <p className="text-xs text-navy-400">Suporta PDF, OFX, XLS e XLSX</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-navy-500 bg-navy-50'
                : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-cream-300 hover:border-navy-400 hover:bg-cream-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.ofx,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  {getFileIcon(selectedFile.name)}
                  <span className="font-medium text-navy-800 text-sm">{selectedFile.name}</span>
                </div>
                <p className="text-xs text-navy-400">{fmtSize(selectedFile.size)}</p>
                {!validExt && (
                  <p className="text-xs text-red-600 font-medium">Formato não suportado. Use PDF, OFX, XLS ou XLSX.</p>
                )}
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

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              A análise usa Inteligência Artificial para classificar automaticamente débitos reais, créditos reais e
              excluir transferências entre contas próprias (poupança, CDB, etc.).
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-cream-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-navy-600 hover:bg-cream-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || !validExt}
            className="px-5 py-2 text-sm font-medium bg-navy-700 text-white rounded-lg hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Landmark className="w-4 h-4" />
            Analisar Extrato
          </button>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({ tx, index }: { tx: Transaction; index: number }) {
  const [showReason, setShowReason] = useState(false)

  const bgClass =
    tx.type === 'debit'
      ? 'bg-yellow-100/40'
      : tx.type === 'credit'
      ? 'bg-green-50/60'
      : ''

  const labelClass =
    tx.type === 'debit'
      ? 'bg-yellow-200 text-yellow-800 border border-yellow-300'
      : tx.type === 'credit'
      ? 'bg-green-200 text-green-800 border border-green-300'
      : 'bg-gray-100 text-gray-500'

  return (
    <>
      <tr className={`text-sm border-b border-cream-100 ${bgClass} ${index % 2 === 0 && tx.type === 'neutral' ? 'bg-cream-50/40' : ''}`}>
        <td className="px-3 py-2 text-navy-500 text-xs whitespace-nowrap">{tx.date}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            {tx.label ? (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${labelClass}`}>
                {tx.label}
              </span>
            ) : (
              <span className="w-[28px]" />
            )}
            <span className="text-navy-700 text-xs leading-tight">{tx.description}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium">
          {tx.debit ? (
            <span className="text-red-600">{fmt(tx.debit)}</span>
          ) : '—'}
        </td>
        <td className="px-3 py-2 text-right text-xs font-medium">
          {tx.credit ? (
            <span className="text-green-700">{fmt(tx.credit)}</span>
          ) : '—'}
        </td>
        <td className="px-3 py-2 text-right text-xs text-navy-500">
          {fmt(tx.balance)}
        </td>
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => setShowReason(p => !p)}
            className="text-navy-300 hover:text-navy-600 transition-colors"
            title={tx.reason}
          >
            {showReason ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
      </tr>
      {showReason && (
        <tr className={`${bgClass}`}>
          <td colSpan={6} className="px-3 pb-2 pt-0">
            <div className="text-[11px] text-navy-500 italic pl-12 border-l-2 border-cream-200 ml-3">
              {tx.reason}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ResultsPanel({ result, onClear }: { result: AnalysisResult; onClear: () => void }) {
  const net = result.summary.totalCredits - result.summary.totalDebits

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
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
          </div>
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-300 hover:text-navy-600 transition-colors"
            title="Fechar análise"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-red-50 border border-red-100 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-[10px] text-red-600 font-medium uppercase">Débitos</span>
            </div>
            <p className="text-sm font-bold text-red-700">{fmt(result.summary.totalDebits)}</p>
            <p className="text-[10px] text-red-400">{result.summary.debitCount} lançamentos</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-[10px] text-green-700 font-medium uppercase">Créditos</span>
            </div>
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
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-200/80 border border-yellow-300 inline-block" />
          <span className="text-[10px] text-navy-500">Débito real (letras)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 inline-block" />
          <span className="text-[10px] text-navy-500">Crédito real (números)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white border border-cream-200 inline-block" />
          <span className="text-[10px] text-navy-500">Neutro</span>
        </div>
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
              <th className="px-3 py-2 text-center w-8" title="Expandir motivo"></th>
            </tr>
          </thead>
          <tbody>
            {result.transactions.map((tx, i) => (
              <TransactionRow key={i} tx={tx} index={i} />
            ))}
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
    </div>
  )
}

export default function ConsolidacaoBancariaPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null)

  const handleAnalyze = async (file: File) => {
    setAnalyzing(true)
    setError(null)
    setResult(null)
    setAnalyzingFile(file.name)

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/tesouraria/consolidacao-bancaria', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json() as AnalysisResult & { error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro desconhecido ao analisar o extrato.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setAnalyzing(false)
      setAnalyzingFile(null)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className={`flex flex-col shrink-0 transition-all duration-300 ${result ? 'w-72' : 'flex-1'} border-r border-cream-200 bg-white`}>
        {/* Header */}
        <div className="p-5 border-b border-cream-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-navy-100 rounded-lg">
              <Landmark className="w-5 h-5 text-navy-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-800">Consolidação Bancária</h1>
              <p className="text-xs text-navy-400">Análise inteligente de extratos</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* CTA Button */}
          <button
            onClick={() => setModalOpen(true)}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-navy-700 text-white rounded-xl hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Analisar Novo Extrato
              </>
            )}
          </button>

          {/* Analyzing progress */}
          {analyzing && analyzingFile && (
            <div className="mt-4 p-3 bg-navy-50 border border-navy-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-navy-600 animate-spin" />
                <span className="text-xs font-medium text-navy-700">Processando extrato</span>
              </div>
              <p className="text-[11px] text-navy-400 truncate">{analyzingFile}</p>
              <div className="mt-2 h-1 bg-navy-100 rounded-full overflow-hidden">
                <div className="h-full bg-navy-600 rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-[10px] text-navy-400 mt-1">A IA está classificando os lançamentos...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-700">Erro na análise</p>
                <p className="text-[11px] text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!analyzing && !error && !result && (
            <div className="mt-8 text-center space-y-3">
              <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-navy-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy-600">Nenhum extrato analisado</p>
                <p className="text-xs text-navy-400 mt-1">
                  Faça upload de um arquivo PDF, OFX ou Excel para começar a análise automática.
                </p>
              </div>
              <div className="text-left mt-4 p-3 bg-cream-50 rounded-lg border border-cream-200">
                <p className="text-[11px] text-navy-600 font-medium mb-2">O que a IA identifica:</p>
                <ul className="space-y-1.5 text-[10px] text-navy-500">
                  <li className="flex items-start gap-1.5">
                    <span className="text-yellow-600 font-bold mt-0.5">A–Z</span>
                    <span>Débitos reais: taxas, tarifas, faturas, IOF, encargos</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-green-600 font-bold mt-0.5">1–N</span>
                    <span>Créditos reais: recebimentos PIX/TED, salários, reembolsos</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 font-bold mt-0.5">—</span>
                    <span>Ignora transferências entre contas próprias (poupança, CDB, etc.)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Result summary in left panel (when panel is narrow) */}
          {result && !analyzing && (
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-cream-50 rounded-lg border border-cream-200">
                <p className="text-xs font-medium text-navy-700 mb-1 flex items-center gap-1">
                  <Landmark className="w-3 h-3" />
                  {result.bank}
                </p>
                <p className="text-[10px] text-navy-400">{result.period}</p>
                <p className="text-[10px] text-navy-400 mt-0.5 truncate">{result.fileName}</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full text-xs text-navy-500 hover:text-navy-800 py-1.5 border border-dashed border-cream-300 rounded-lg hover:border-navy-300 transition-colors"
              >
                + Analisar outro extrato
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel - Results */}
      {result && (
        <div className="flex-1 overflow-hidden">
          <ResultsPanel result={result} onClear={() => setResult(null)} />
        </div>
      )}

      {/* Upload modal */}
      <UploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAnalyze={handleAnalyze}
      />
    </div>
  )
}
