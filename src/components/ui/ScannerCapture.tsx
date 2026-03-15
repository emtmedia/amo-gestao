'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, RotateCcw, Check, ScanLine, Monitor, Loader2, AlertCircle, FlipHorizontal } from 'lucide-react'
import { usePreferences, ScannerSettings } from '@/lib/preferences'

interface ScannerCaptureProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

function applyImageProcessing(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  settings: ScannerSettings
): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const vw = video.videoWidth
  const vh = video.videoHeight
  if (vw === 0 || vh === 0) return false

  // Scale based on DPI but cap to avoid memory issues on mobile
  const scale = Math.min(settings.resolution / 150, 2)
  const maxDim = 4096
  const w = Math.min(Math.round(vw * scale), maxDim)
  const h = Math.min(Math.round(vh * scale), maxDim)
  
  canvas.width = w
  canvas.height = h
  ctx.drawImage(video, 0, 0, w, h)

  if (settings.colorMode === 'color') return true

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    if (settings.colorMode === 'bw') {
      const bw = gray > 128 ? 255 : 0
      data[i] = data[i + 1] = data[i + 2] = bw
    } else {
      data[i] = data[i + 1] = data[i + 2] = gray
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return true
}

export default function ScannerCapture({ open, onClose, onCapture }: ScannerCaptureProps) {
  const { prefs } = usePreferences()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'preview' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [capturing, setCapturing] = useState(false)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async (deviceId?: string) => {
    stopStream()
    setStatus('loading')
    setErrorMsg('')
    setCapturing(false)

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const video = videoRef.current
      if (!video) return

      video.srcObject = stream

      // Wait for video to be fully ready with frames
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Timeout: if we already have frames, resolve anyway
          if (video.videoWidth > 0 || video.readyState >= 2) {
            resolve()
          } else {
            reject(new Error('Timeout ao inicializar câmera'))
          }
        }, 10000)

        const done = () => {
          clearTimeout(timeout)
          video.removeEventListener('playing', done)
          video.removeEventListener('canplay', done)
          video.removeEventListener('loadeddata', done)
          setTimeout(resolve, 200)
        }

        // Listen to multiple events — whichever fires first wins
        video.addEventListener('playing', done)
        video.addEventListener('canplay', done)
        video.addEventListener('loadeddata', done)

        // If already playing (autoPlay fired before listener), resolve immediately
        if (!video.paused && video.readyState >= 2) {
          done()
          return
        }

        video.play().catch(err => {
          // autoPlay may have already started — check before rejecting
          if (!video.paused || video.readyState >= 2) {
            done()
          } else {
            clearTimeout(timeout)
            reject(err)
          }
        })
      })

      // List available devices
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
      setDevices(videoDevices)
      
      if (!deviceId && videoDevices.length > 0) {
        const currentTrack = stream.getVideoTracks()[0]
        const currentDeviceId = currentTrack?.getSettings()?.deviceId
        setSelectedDevice(currentDeviceId || videoDevices[0].deviceId)
      } else if (deviceId) {
        setSelectedDevice(deviceId)
      }

      setStatus('ready')
    } catch (err) {
      console.error('Camera error:', err)
      setStatus('error')
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador e recarregue a página.')
        } else if (err.name === 'NotFoundError' || err.name === 'NotReadableError') {
          setErrorMsg('Nenhuma câmera encontrada ou dispositivo em uso por outro aplicativo.')
        } else if (err.name === 'OverconstrainedError') {
          // Retry without specific device constraint
          if (deviceId) {
            try {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
              streamRef.current = fallbackStream
              if (videoRef.current) {
                videoRef.current.srcObject = fallbackStream
                await videoRef.current.play()
                setTimeout(() => setStatus('ready'), 300)
                return
              }
            } catch { /* fall through to error */ }
          }
          setErrorMsg('Câmera não suporta a configuração solicitada.')
        } else {
          setErrorMsg(`Erro ao acessar câmera: ${err.message}`)
        }
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao acessar dispositivo de captura.')
      }
    }
  }, [stopStream])

  useEffect(() => {
    if (open) {
      startCamera()
    }
    return () => { stopStream() }
  }, [open, startCamera, stopStream])

  function captureImage() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || capturing) return

    setCapturing(true)
    setErrorMsg('')

    try {
      const ok = applyImageProcessing(canvas, video, prefs.scanner)
      if (!ok) {
        setErrorMsg('Câmera ainda não está pronta. Aguarde e tente novamente.')
        setCapturing(false)
        return
      }

      const mimeType = prefs.scanner.format === 'png' ? 'image/png' : 'image/jpeg'
      const quality = prefs.scanner.format === 'jpeg' ? prefs.scanner.quality : undefined

      canvas.toBlob((blob) => {
        setCapturing(false)
        if (blob && blob.size > 0) {
          setCapturedBlob(blob)
          const url = URL.createObjectURL(blob)
          setPreviewUrl(url)
          setStatus('preview')
          stopStream()
        } else {
          setErrorMsg('Falha ao gerar imagem. Tente reduzir a resolução em Configurações.')
        }
      }, mimeType, quality)
    } catch (err) {
      console.error('Capture error:', err)
      setErrorMsg('Erro ao capturar. Tente novamente.')
      setCapturing(false)
    }
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl('')
    startCamera(selectedDevice)
  }

  function confirmCapture() {
    if (!capturedBlob) return
    const ext = prefs.scanner.format === 'png' ? 'png' : 'jpg'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `scan_${timestamp}.${ext}`
    const file = new File([capturedBlob], fileName, { type: capturedBlob.type })
    onCapture(file)
    closeModal()
  }

  function closeModal() {
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl('')
    setCapturing(false)
    setStatus('loading')
    onClose()
  }

  function switchDevice(deviceId: string) {
    setSelectedDevice(deviceId)
    startCamera(deviceId)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-navy-800">Captura de Documento</h3>
          </div>
          <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center h-72 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Inicializando câmera...</p>
              <p className="text-xs text-gray-400">Permita o acesso à câmera quando solicitado.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-72 gap-4 px-8">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
              <button onClick={() => startCamera()} className="btn-primary text-sm">
                <RotateCcw className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          )}

          {status === 'ready' && (
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-[60vh] object-contain"
                  style={{ minHeight: '240px' }}
                />
                <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-lg pointer-events-none" />
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {prefs.scanner.colorMode === 'color' ? 'Colorido' : prefs.scanner.colorMode === 'grayscale' ? 'Cinza' : 'P&B'} · {prefs.scanner.resolution} DPI
                </div>
              </div>

              {devices.length > 1 && (
                <div className="flex items-center gap-2">
                  <FlipHorizontal className="w-4 h-4 text-gray-400" />
                  <select value={selectedDevice} onChange={e => switchDevice(e.target.value)} className="form-select text-xs flex-1">
                    {devices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Câmera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {status === 'preview' && previewUrl && (
            <div className="space-y-3">
              <div className="bg-gray-100 rounded-xl overflow-hidden">
                <img src={previewUrl} alt="Documento capturado" className="w-full h-auto max-h-[60vh] object-contain" />
              </div>
              <p className="text-xs text-gray-500 text-center">Verifique a qualidade da captura antes de confirmar.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400 hidden sm:block">
            Ajuste a qualidade em Configurações → Scanner
          </p>
          <div className="flex gap-2 ml-auto">
            <button onClick={closeModal} className="btn-secondary text-sm">
              Cancelar
            </button>
            {status === 'ready' && (
              <button onClick={captureImage} disabled={capturing} className="btn-primary text-sm">
                {capturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {capturing ? 'Capturando...' : 'Capturar'}
              </button>
            )}
            {status === 'preview' && (
              <>
                <button onClick={retake} className="btn-secondary text-sm">
                  <RotateCcw className="w-4 h-4" /> Recapturar
                </button>
                <button onClick={confirmCapture} className="btn-primary text-sm">
                  <Check className="w-4 h-4" /> Usar imagem
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Canvas for image processing - must be visible (not display:none) for toBlob to work */}
      <canvas ref={canvasRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden' }} />
    </div>
  )
}
