'use client'
/**
 * FileUpload — upload de arquivos de referência via Supabase Storage
 *
 * • Faz upload direto para o Supabase Storage via /api/upload
 * • Armazena no banco apenas URLs + metadados (sem base64)
 * • Compatível com dados base64 legados (leitura funciona, sem re-upload)
 * • Limite: 10 MB por arquivo, máx. 10 arquivos
 * • Suporte a drag & drop
 */

import { useRef, useState, useEffect, lazy, Suspense } from 'react'
import { Paperclip, X, FileText, Image, File, AlertCircle, Upload, Loader2, ExternalLink, ScanLine, Inbox } from 'lucide-react'

const ScannerCapture = lazy(() => import('./ScannerCapture'))
const InboxPickerModal = lazy(() => import('./InboxPickerModal'))

export interface UploadedFile {
  name: string
  type: string
  size: number
  url?:  string  // Supabase Storage URL
  path?: string  // Caminho no bucket
  data?: string  // Legado: base64
}

interface FileUploadProps {
  value: string
  onChange: (json: string) => void
  label?: string
  maxFileMB?: number
  maxFiles?: number
  className?: string
  folder?: string
}

export function serializeFiles(files: UploadedFile[]): string {
  return files.length ? JSON.stringify(files) : ''
}

export function deserializeFiles(json: string): UploadedFile[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function fmtSize(bytes: number): string {
  if (bytes < 1024)    return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image    size={16} className="text-blue-500" />
  if (type.includes('pdf'))       return <FileText  size={16} className="text-red-500"  />
  return <File size={16} className="text-gray-500" />
}

function openFile(file: UploadedFile) {
  if (file.url) { window.open(file.url, '_blank', 'noopener,noreferrer'); return }
  if (file.data) {
    const binary = atob(file.data)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: file.type })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = file.name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
}

export default function FileUpload({
  value,
  onChange,
  label     = 'Arquivos de Referência',
  maxFileMB = 10,
  maxFiles  = 10,
  className = '',
  folder    = 'uploads',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files,         setFiles]         = useState<UploadedFile[]>(() => deserializeFiles(value))
  const [error,         setError]         = useState<string>('')
  const [dragging,      setDragging]      = useState(false)
  const [uploading,     setUploading]     = useState(false)
  const [uploadingNames,setUploadingNames]= useState<string[]>([])
  const [scannerOpen,   setScannerOpen]   = useState(false)
  const [inboxOpen,     setInboxOpen]     = useState(false)

  useEffect(() => { setFiles(deserializeFiles(value)) }, [value])

  async function handleScanCapture(file: File) {
    setScannerOpen(false)
    await processFiles([file])
  }

  function handleInboxSelect(doc: { name: string; type: string; size: number; url: string; path?: string }) {
    const uploadedFile: UploadedFile = { name: doc.name, type: doc.type, size: doc.size, url: doc.url, path: doc.path }
    const next = [...files, uploadedFile]
    setFiles(next)
    onChange(serializeFiles(next))
  }

  async function uploadToStorage(file: File): Promise<UploadedFile> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    const res  = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error(data.error || 'Falha no upload')
    return { name: data.name, type: data.type, size: data.size, url: data.url, path: data.path }
  }

  async function processFiles(fileList: FileList | File[]) {
    setError('')
    const maxBytes = maxFileMB * 1024 * 1024
    const incoming = Array.from(fileList)
    if (files.length + incoming.length > maxFiles) { setError(`Máximo de ${maxFiles} arquivos.`); return }
    const tooBig = incoming.filter(f => f.size > maxBytes)
    if (tooBig.length) { setError(`Excede ${maxFileMB} MB: ${tooBig.map(f=>f.name).join(', ')}`); return }
    setUploading(true); setUploadingNames(incoming.map(f=>f.name))
    const uploaded: UploadedFile[] = []; const errors: string[] = []
    for (const file of incoming) {
      try { uploaded.push(await uploadToStorage(file)) }
      catch(e: unknown) { errors.push(`${file.name}: ${e instanceof Error ? e.message : 'Erro'}`) }
    }
    setUploading(false); setUploadingNames([])
    if (errors.length) setError(errors.join('\n'))
    if (uploaded.length) { const next=[...files,...uploaded]; setFiles(next); onChange(serializeFiles(next)) }
  }

  async function removeFile(index: number) {
    const file = files[index]
    if (file.path) {
      try { await fetch('/api/upload/delete',{ method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:file.path}) }) }
      catch { /* ignora */ }
    }
    const next = files.filter((_,i)=>i!==index)
    setFiles(next); onChange(serializeFiles(next))
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-navy-700 mb-1">
          <Paperclip size={14} className="inline mr-1 opacity-60" />
          {label}
        </label>
      )}

      <div className="flex gap-2">
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files.length)processFiles(e.dataTransfer.files)}}
          className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${dragging?'border-blue-400 bg-blue-50':'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
            ${uploading?'opacity-60 pointer-events-none':''}`}
          onClick={()=>inputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span className="text-xs">Enviando {uploadingNames.join(', ')}…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-500">
              <Upload size={18} />
              <span className="text-xs">Arraste aqui ou <span className="text-blue-600 underline">clique para selecionar</span></span>
              <span className="text-xs text-gray-400">Máx. {maxFileMB} MB · até {maxFiles} arquivos</span>
            </div>
          )}
          <input ref={inputRef} type="file" multiple className="hidden"
            onChange={e=>e.target.files&&processFiles(e.target.files)} />
        </div>

        <button
          type="button"
          onClick={() => setInboxOpen(true)}
          disabled={uploading || files.length >= maxFiles}
          className="flex flex-col items-center justify-center gap-1.5 px-4 border-2 border-dashed border-green-300 rounded-lg
            bg-green-50 hover:bg-green-100 hover:border-green-400 transition-colors text-green-600
            disabled:opacity-40 disabled:cursor-not-allowed min-w-[100px]"
          title="Selecionar documento do Inbox"
        >
          <Inbox size={20} />
          <span className="text-xs font-medium leading-tight text-center">Obter do<br/>Inbox</span>
        </button>

        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          disabled={uploading || files.length >= maxFiles}
          className="flex flex-col items-center justify-center gap-1.5 px-4 border-2 border-dashed border-blue-300 rounded-lg
            bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors text-blue-600
            disabled:opacity-40 disabled:cursor-not-allowed min-w-[100px]"
          title="Capturar documento via câmera ou scanner"
        >
          <ScanLine size={20} />
          <span className="text-xs font-medium leading-tight text-center">Obter do<br/>Scanner</span>
        </button>
      </div>

      {scannerOpen && (
        <Suspense fallback={null}>
          <ScannerCapture open={scannerOpen} onClose={() => setScannerOpen(false)} onCapture={handleScanCapture} />
        </Suspense>
      )}

      {inboxOpen && (
        <Suspense fallback={null}>
          <InboxPickerModal open={inboxOpen} onClose={() => setInboxOpen(false)} onSelect={handleInboxSelect} />
        </Suspense>
      )}

      {error && (
        <div className="flex items-start gap-1 text-red-600 text-xs bg-red-50 rounded p-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded px-3 py-2 text-xs">
              <button type="button" onClick={()=>openFile(file)}
                className="flex items-center gap-2 flex-1 min-w-0 hover:text-blue-600 transition-colors text-left"
                title={file.url?'Abrir no navegador':'Baixar'}>
                <FileIcon type={file.type} />
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-gray-400 shrink-0">{fmtSize(file.size)}</span>
                {file.url && <ExternalLink size={11} className="text-blue-400 shrink-0" />}
                {file.data && !file.url && <span className="text-amber-500 text-[10px] shrink-0">(legado)</span>}
              </button>
              <button type="button" onClick={()=>removeFile(idx)}
                className="shrink-0 p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                title="Remover">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
