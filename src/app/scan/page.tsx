// src/app/scan/page.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { parseCurrencyBR } from '@/components/ui/CurrencyInput'
import {
  Camera, Upload, X, RotateCcw, Check, Send, Loader2, AlertCircle,
  FileText, Image, FileSpreadsheet, File, ChevronLeft, LogOut,
  ScanLine, Paperclip, CheckCircle2, Calendar, AlignLeft, Inbox, Banknote, DollarSign
} from 'lucide-react'

type Step = 'home' | 'camera' | 'preview' | 'form' | 'uploading' | 'success'
type Destino = 'inbox' | 'cheque-recibo'

interface UserSession {
  nome: string
  email: string
}

interface ChequeReciboItem {
  id: string
  numero: string
  nomeRecebedor: string
  valorConcedido: number
  totalDocumentos: number
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileIcon({ type, size = 24 }: { type: string; size?: number }) {
  if (type.startsWith('image/')) return <Image size={size} className="text-blue-500" />
  if (type.includes('pdf')) return <FileText size={size} className="text-red-500" />
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('.sheet'))
    return <FileSpreadsheet size={size} className="text-green-600" />
  if (type.includes('word') || type.includes('.document'))
    return <FileText size={size} className="text-blue-600" />
  return <File size={size} className="text-gray-500" />
}

// Detect iOS (iPhone/iPad) — getUserMedia canvas capture is unreliable on iOS Safari PWA
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function ScanPage() {
  const [user, setUser]           = useState<UserSession | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [step, setStep]           = useState<Step>('home')
  const [file, setFile]           = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [origemCaptura, setOrigemCaptura] = useState<'camera' | 'upload'>('upload')
  const [descricao, setDescricao] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [error, setError]         = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [isIOS, setIsIOS]         = useState(false)
  // Destino
  const [destino, setDestino]           = useState<Destino>('inbox')
  const [chequeRecibos, setChequeRecibos] = useState<ChequeReciboItem[]>([])
  const [loadingCRs, setLoadingCRs]     = useState(false)
  const [selectedCR, setSelectedCR]     = useState('')
  const [valorDocumento, setValorDocumento] = useState('')
  const [isDocAssinado, setIsDocAssinado]   = useState(false)
  const [successInfo, setSuccessInfo]   = useState<{ destino: Destino; crNumero?: string; assinado?: boolean } | null>(null)

  const videoRef        = useRef<HTMLVideoElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const cameraInputRef  = useRef<HTMLInputElement>(null)
  const valorInputRef   = useRef<HTMLInputElement>(null)

  function centsToDisplay(cents: number): string {
    if (cents === 0) return ''
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  function digitsOnly(str: string): number {
    const d = str.replace(/\D/g, '')
    return d ? parseInt(d.slice(-15), 10) : 0
  }
  function handleValorInput(e: React.FormEvent<HTMLInputElement>) {
    const cents = digitsOnly(e.currentTarget.value)
    const formatted = centsToDisplay(cents)
    e.currentTarget.value = formatted
    setValorDocumento(formatted)
    requestAnimationFrame(() => {
      if (valorInputRef.current) {
        const len = valorInputRef.current.value.length
        valorInputRef.current.setSelectionRange(len, len)
      }
    })
  }

  useEffect(() => { setIsIOS(isIOSDevice()) }, [])

  // ─── Auth check ───
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.usuario) setUser(data.usuario)
        else window.location.href = '/login?redirect=/scan'
      })
      .catch(() => { window.location.href = '/login?redirect=/scan' })
      .finally(() => {
        setAuthLoading(false)
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw-scan.js').catch(() => {})
        }
      })
  }, [])

  // ─── Cleanup ───
  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [])

  // ─── Camera functions ───
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  // ─── iOS: native camera via <input capture> ───
  function openNativeCamera() {
    setError('')
    setOrigemCaptura('camera')
    cameraInputRef.current?.click()
  }

  function handleNativeCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setOrigemCaptura('camera')
    setError('')
    const url = URL.createObjectURL(selected)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setStep('preview')
    e.target.value = ''
  }

  // ─── Non-iOS: getUserMedia live preview ───
  async function startCamera() {
    setError('')
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
    } catch (err) {
      console.error('Camera error:', err)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Verifique as configurações do navegador.')
      } else {
        setError('Não foi possível acessar a câmera.')
      }
      setStep('home')
    }
  }

  function capturePhoto() {
    try {
      const video = videoRef.current
      if (!video) { setError('Câmera não disponível. Tente novamente.'); return }

      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) {
        setError('Câmera ainda carregando. Aguarde um instante e tente novamente.')
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { setError('Erro ao inicializar captura.'); return }

      ctx.drawImage(video, 0, 0, w, h)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.90)
      if (!dataUrl || dataUrl === 'data:,') { setError('Falha ao capturar imagem. Tente novamente.'); return }

      const byteStr = atob(dataUrl.split(',')[1])
      const buf = new Uint8Array(byteStr.length)
      for (let i = 0; i < byteStr.length; i++) buf[i] = byteStr.charCodeAt(i)
      const blob = new Blob([buf], { type: 'image/jpeg' })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const f = new File([blob], `scan_${timestamp}.jpg`, { type: 'image/jpeg' })
      setFile(f)
      setOrigemCaptura('camera')
      const url = URL.createObjectURL(blob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
      stopCamera()
      setStep('preview')
    } catch (e) {
      setError(`Erro ao capturar: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ─── File picker ───
  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (selected.size > 10 * 1024 * 1024) {
      setError('Arquivo excede o limite de 10 MB.')
      return
    }

    setFile(selected)
    setOrigemCaptura('upload')
    setError('')

    if (selected.type.startsWith('image/')) {
      const url = URL.createObjectURL(selected)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(url)
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }

    setStep('preview')
    e.target.value = '' // Reset para permitir selecionar o mesmo arquivo
  }

  // ─── Cheque-Recibo list ───
  async function loadChequeRecibos() {
    setLoadingCRs(true)
    try {
      const res = await fetch('/api/cheque-recibo')
      const data = await res.json()
      if (data.success) setChequeRecibos(data.data)
    } catch { /* ignore */ }
    finally { setLoadingCRs(false) }
  }

  function handleDestinoChange(d: Destino) {
    setDestino(d)
    setSelectedCR('')
    setIsDocAssinado(false)
    if (d === 'cheque-recibo' && chequeRecibos.length === 0) {
      loadChequeRecibos()
    }
  }

  // ─── Navigation ───
  function goHome() {
    stopCamera()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setDescricao('')
    setDataVencimento('')
    setDestino('inbox')
    setSelectedCR('')
    setValorDocumento('')
    setIsDocAssinado(false)
    setSuccessInfo(null)
    setError('')
    setStep('home')
  }

  function goToForm() {
    setStep('form')
  }

  function retakeOrReselect() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setFile(null)
    if (origemCaptura === 'camera') {
      startCamera()
    } else {
      setStep('home')
    }
  }

  // ─── Submit ───
  async function handleSubmit() {
    if (!file) return

    // Documento assinado de CR: só precisa do CR selecionado e ser PDF
    if (destino === 'cheque-recibo' && isDocAssinado) {
      if (!selectedCR) { setError('Selecione um Cheque-Recibo.'); return }
      if (file.type !== 'application/pdf') { setError('O documento assinado deve ser um arquivo PDF.'); return }
    } else {
      if (!descricao.trim()) { setError('Descrição é obrigatória.'); return }
      if (!dataVencimento)   { setError('Data de vencimento é obrigatória.'); return }
      if (destino === 'cheque-recibo') {
        if (!selectedCR)         { setError('Selecione um Cheque-Recibo.'); return }
        if (!valorDocumento)     { setError('Informe o valor do documento.'); return }
        const v = parseCurrencyBR(valorDocumento)
        if (isNaN(v) || v < 0)  { setError('Valor inválido.'); return }
      }
    }

    setError('')
    setStep('uploading')

    try {
      const fd = new FormData()
      fd.append('file', file)

      if (destino === 'cheque-recibo' && isDocAssinado) {
        // Rota para documento assinado do CR
        setUploadProgress('Enviando documento assinado...')
        const res = await fetch(`/api/cheque-recibo/${selectedCR}/doc-assinado`, { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          setSuccessInfo({ destino: 'cheque-recibo', crNumero: data.numero, assinado: true })
          setStep('success')
        } else {
          setError(data.error || 'Erro ao enviar documento assinado.')
          setStep('form')
        }
        return
      }

      fd.append('descricao', descricao.trim())
      fd.append('dataVencimento', dataVencimento)
      fd.append('origemCaptura', origemCaptura)

      if (destino === 'inbox') {
        setUploadProgress('Salvando no Inbox...')
        const res = await fetch('/api/inbox', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.ok) {
          setSuccessInfo({ destino: 'inbox' })
          setStep('success')
        } else {
          setError(data.error || 'Erro ao enviar documento.')
          setStep('form')
        }
      } else {
        setUploadProgress('Vinculando ao Cheque-Recibo...')
        fd.append('valorDocumento', String(parseCurrencyBR(valorDocumento)))
        const res = await fetch(`/api/cheque-recibo/${selectedCR}/anexos`, { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          setSuccessInfo({ destino: 'cheque-recibo', crNumero: data.numero })
          setStep('success')
        } else {
          setError(data.error || 'Erro ao vincular documento.')
          setStep('form')
        }
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
      setStep('form')
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login?redirect=/scan'
  }

  // ─── Auth loading ───
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-2.5">
          {step !== 'home' && step !== 'success' && (
            <button onClick={goHome} className="p-1 -ml-1 rounded-lg hover:bg-white/10">
              <ChevronLeft size={22} />
            </button>
          )}
          <ScanLine size={20} className="text-blue-400" />
          <span className="font-semibold text-sm">AMO Scan</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{user.nome}</span>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-white/10" title="Sair">
            <LogOut size={16} className="text-slate-400" />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">

        {/* Erro global */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto shrink-0"><X size={14} /></button>
          </div>
        )}

        {/* ═══ STEP: HOME ═══ */}
        {step === 'home' && (
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="text-center mb-6">
              <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-4">
                <ScanLine size={40} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Enviar Documento</h2>
              <p className="text-sm text-slate-500 mt-1">Escaneie ou anexe um documento para o Inbox</p>
            </div>

            {/* iOS: native camera input; non-iOS: getUserMedia live preview */}
            <button onClick={isIOS ? openNativeCamera : startCamera}
              className="flex items-center gap-4 w-full p-5 bg-white border-2 border-blue-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-[0.98]">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Camera size={24} className="text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800">Escanear Documento</p>
                <p className="text-xs text-slate-500 mt-0.5">Abrir câmera para fotografar</p>
              </div>
            </button>
            {/* Hidden input for iOS native camera capture */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleNativeCameraCapture} />

            <button onClick={openFilePicker}
              className="flex items-center gap-4 w-full p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-[0.98]">
              <div className="p-3 bg-slate-100 rounded-xl">
                <Paperclip size={24} className="text-slate-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800">Anexar Arquivo</p>
                <p className="text-xs text-slate-500 mt-0.5">.png .jpg .pdf .docx .xlsx e outros</p>
              </div>
            </button>

            <input ref={fileInputRef} type="file" className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileSelected} />
          </div>
        )}

        {/* ═══ STEP: CAMERA ═══ */}
        {step === 'camera' && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="relative flex-1 bg-black rounded-2xl overflow-hidden min-h-[300px]">
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover" />
              <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl pointer-events-none" />
              <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Câmera ativa
              </div>
            </div>
            <button onClick={capturePhoto}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Camera size={20} /> Capturar
            </button>
          </div>
        )}

        {/* ═══ STEP: PREVIEW ═══ */}
        {step === 'preview' && file && (
          <div className="flex-1 flex flex-col gap-4">
            <h3 className="font-semibold text-slate-800 text-sm">Preview do documento</h3>

            {/* Preview area */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {previewUrl && file.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Preview" className="w-full max-h-[45vh] object-contain bg-slate-100" />
              ) : (
                <div className="flex items-center gap-4 p-6">
                  <div className="p-4 bg-slate-100 rounded-xl">
                    <FileIcon type={file.type} size={32} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm break-all">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{fmtSize(file.size)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-3">
              <button onClick={retakeOrReselect}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <RotateCcw size={16} />
                {origemCaptura === 'camera' ? 'Capturar Nova' : 'Trocar Arquivo'}
              </button>
              <button onClick={goToForm}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Check size={16} /> Utilizar {origemCaptura === 'camera' ? 'Imagem' : 'Arquivo'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP: FORM ═══ */}
        {step === 'form' && file && (
          <div className="flex-1 flex flex-col gap-4">
            {/* File summary */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {previewUrl && file.type.startsWith('image/') ? (
                  <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileIcon type={file.type} size={20} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{fmtSize(file.size)}</p>
              </div>
              <button onClick={() => setStep('preview')} className="ml-auto text-xs text-blue-600 hover:underline shrink-0">
                Trocar
              </button>
            </div>

            {/* Formulário */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <AlignLeft size={14} className="text-slate-400" />
                  Descrição do documento <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Conta de luz — Março 2026"
                  rows={3}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  Data de vencimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={e => setDataVencimento(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Destino */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                  Destino do documento <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDestinoChange('inbox')}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      destino === 'inbox'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Inbox size={16} />
                    Inbox
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDestinoChange('cheque-recibo')}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      destino === 'cheque-recibo'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Banknote size={16} />
                    Cheque-Recibo
                  </button>
                </div>
              </div>

              {/* Campos específicos de Cheque-Recibo */}
              {destino === 'cheque-recibo' && (
                <>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                      <Banknote size={14} className="text-slate-400" />
                      Cheque-Recibo <span className="text-red-500">*</span>
                    </label>
                    {loadingCRs ? (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400">
                        <Loader2 size={14} className="animate-spin" /> Carregando...
                      </div>
                    ) : chequeRecibos.length === 0 ? (
                      <div className="px-3.5 py-2.5 border border-amber-200 bg-amber-50 rounded-xl text-sm text-amber-700">
                        Nenhum Cheque-Recibo encontrado
                      </div>
                    ) : (
                      <select
                        value={selectedCR}
                        onChange={e => setSelectedCR(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                      >
                        <option value="">Selecione um Cheque-Recibo...</option>
                        {chequeRecibos.map(cr => {
                          const saldo = cr.valorConcedido - (cr.totalDocumentos ?? 0)
                          const saldoFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(saldo))
                          return (
                            <option key={cr.id} value={cr.id}>
                              {cr.numero} — {cr.nomeRecebedor} (saldo: -{saldoFmt})
                            </option>
                          )
                        })}
                      </select>
                    )}
                  </div>

                  {/* Checkbox: versão assinada */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none
                    border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                    <input
                      type="checkbox"
                      checked={isDocAssinado}
                      onChange={e => setIsDocAssinado(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Este é o documento assinado do CR</p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Marque esta opção se este PDF já foi assinado (digitalmente ou rubricado e reescaneado)
                        e deve ser vinculado como versão assinada do Cheque-Recibo selecionado.
                      </p>
                    </div>
                  </label>

                  {/* Campos de anexo regular — ocultos quando é doc assinado */}
                  {!isDocAssinado && <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1.5">
                      <DollarSign size={14} className="text-slate-400" />
                      Valor do documento (R$) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none select-none">R$</span>
                      <input
                        ref={valorInputRef}
                        type="text"
                        inputMode="numeric"
                        defaultValue={valorDocumento}
                        onInput={handleValorInput}
                        onKeyDown={e => {
                          const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']
                          if (allowed.includes(e.key)) return
                          if ((e.ctrlKey || e.metaKey) && ['a','c','v','x','z'].includes(e.key.toLowerCase())) return
                          if (!/[\d,.]/.test(e.key)) e.preventDefault()
                        }}
                        onPaste={e => {
                          e.preventDefault()
                          const pasted = e.clipboardData.getData('text')
                          const cents = digitsOnly(pasted) || Math.round(parseCurrencyBR(pasted) * 100)
                          const formatted = centsToDisplay(cents)
                          if (valorInputRef.current) valorInputRef.current.value = formatted
                          setValorDocumento(formatted)
                        }}
                        placeholder="0,00"
                        className="w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
                      />
                    </div>
                  </div>}
                </>
              )}
            </div>

            {/* Submit */}
            <button onClick={handleSubmit}
              disabled={
                (destino === 'cheque-recibo' && isDocAssinado)
                  ? !selectedCR
                  : (!descricao.trim() || !dataVencimento ||
                    (destino === 'cheque-recibo' && (!selectedCR || !valorDocumento)))
              }
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2
                disabled:bg-slate-300 disabled:cursor-not-allowed disabled:active:scale-100 mt-auto">
              <Send size={18} />
              {destino === 'cheque-recibo' && isDocAssinado
                ? 'Enviar Documento Assinado'
                : destino === 'cheque-recibo'
                  ? 'Vincular ao Cheque-Recibo'
                  : 'Enviar para Inbox'}
            </button>
          </div>
        )}

        {/* ═══ STEP: UPLOADING ═══ */}
        {step === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm text-slate-600 font-medium">{uploadProgress}</p>
            <p className="text-xs text-slate-400">Não feche esta tela.</p>
          </div>
        )}

        {/* ═══ STEP: SUCCESS ═══ */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className={`p-4 rounded-full ${successInfo?.destino === 'cheque-recibo' ? 'bg-pink-100' : 'bg-green-100'}`}>
              <CheckCircle2 size={40} className={successInfo?.destino === 'cheque-recibo' ? 'text-pink-600' : 'text-green-600'} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Documento Enviado!</h3>
            <p className="text-sm text-slate-500 text-center">
              {successInfo?.destino === 'cheque-recibo' && successInfo.assinado
                ? `Documento assinado vinculado ao Cheque-Recibo ${successInfo.crNumero} com sucesso.`
                : successInfo?.destino === 'cheque-recibo'
                  ? `Documento vinculado ao Cheque-Recibo ${successInfo.crNumero} com sucesso.`
                  : 'O documento foi enviado para o Inbox do AMO Application com sucesso.'}
            </p>
            <button onClick={goHome}
              className="w-full max-w-xs py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">
              <ScanLine size={18} /> Enviar outro documento
            </button>
          </div>
        )}
      </main>

    </div>
  )
}
