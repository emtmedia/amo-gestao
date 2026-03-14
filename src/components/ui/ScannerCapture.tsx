'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, RotateCcw, Check, ScanLine, Monitor, Loader2, AlertCircle } from 'lucide-react'
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
): void {
  const ctx = canvas.getContext('2d')!
  
  // Scale based on resolution setting (relative to 72 DPI base)
  const scale = settings.resolution / 72
  canvas.width = video.videoWidth * Math.min(scale, 3)
  canvas.height = video.videoHeight * Math.min(scale, 3)
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  if (settings.colorMode === 'color') return

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
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

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: deviceId ? undefined : 'environment',
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 2592 },
          height: { ideal: 1944 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to actually have dimensions before showing ready
        await new Promise<void>((resolve) => {
          const v = videoRef.current!
          v.onloadedmetadata = () => { v.play().then(resolve).catch(resolve) }
          // Fallback if metadata already loaded
          if (v.readyState >= 1) { v.play().then(resolve).catch(resolve) }
        })
      }

      // List available devices
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
      setDevices(videoDevices)
      if (!deviceId && videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId)
      }

      setStatus('ready')
    } catch (err) {
      console.error('Camera error:', err)
      setStatus('error')
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setErrorMsg('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.')
        } else if (err.name === 'NotFoundError') {
          setErrorMsg('Nenhuma câmera ou dispositivo de captura encontrado. Conecte um scanner ou câmera e tente novamente.')
        } else {
          setErrorMsg(`Erro ao acessar dispositivo: ${err.message}`)
        }
      } else {
        setErrorMsg('Erro ao acessar dispositivo de captura.')
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
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMsg('O vídeo ainda não carregou. Aguarde um momento e tente novamente.')
      return
    }

    try {
      applyImageProcessing(canvas, video, prefs.scanner)

      const mimeType = prefs.scanner.format === 'png' ? 'image/png' : 'image/jpeg'
      const quality = prefs.scanner.format === 'jpeg' ? prefs.scanner.quality : undefined

      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedBlob(blob)
          const url = URL.createObjectURL(blob)
          setPreviewUrl(url)
          setStatus('preview')
          stopStream()
        } else {
          setErrorMsg('Falha ao processar a imagem capturada. Tente novamente.')
        }
      }, mimeType, quality)
    } catch (err) {
      console.error('Capture error:', err)
      setErrorMsg('Erro ao capturar imagem. Tente novamente.')
    }
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl('')
    startCamera(selectedDevice)
  }

  function confirm() {
    if (!capturedBlob) return
    const ext = prefs.scanner.format === 'png' ? 'png' : 'jpg'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `scan_${timestamp}.${ext}`
    const file = new File([capturedBlob], fileName, { type: capturedBlob.type })
    onCapture(file)
    cleanup()
  }

  function cleanup() {
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl('')
    setStatus('loading')
    onClose()
  }

  function switchDevice(deviceId: string) {
    setSelectedDevice(deviceId)
    startCamera(deviceId)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-navy-800 dark:text-gray-100">Captura de Documento</h3>
          </div>
          <button onClick={cleanup} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center h-80 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Inicializando dispositivo de captura...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-80 gap-4 px-8">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
              <div className="flex gap-2">
                <button onClick={() => startCamera()} className="btn-primary text-sm">
                  <RotateCcw className="w-4 h-4" /> Tentar novamente
                </button>
              </div>
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
                />
                {/* Scan guide overlay */}
                <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-lg pointer-events-none" />
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {prefs.scanner.colorMode === 'color' ? 'Colorido' : prefs.scanner.colorMode === 'grayscale' ? 'Escala de Cinza' : 'P&B'} · {prefs.scanner.resolution} DPI
                </div>
              </div>

              {/* Device selector */}
              {devices.length > 1 && (
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedDevice}
                    onChange={e => switchDevice(e.target.value)}
                    className="form-select text-xs flex-1"
                  >
                    {devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Dispositivo ${devices.indexOf(d) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {status === 'preview' && previewUrl && (
            <div className="space-y-3">
              <div className="bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
                <img src={previewUrl} alt="Documento capturado" className="w-full h-auto max-h-[60vh] object-contain" />
              </div>
              <p className="text-xs text-gray-500 text-center">Verifique a qualidade da captura antes de confirmar.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-400">
            Ajuste as configurações do scanner em Configurações.
          </p>
          <div className="flex gap-2">
            {status === 'ready' && (
              <button onClick={captureImage} className="btn-primary text-sm">
                <Camera className="w-4 h-4" /> Capturar
              </button>
            )}
            {status === 'preview' && (
              <>
                <button onClick={retake} className="btn-secondary text-sm">
                  <RotateCcw className="w-4 h-4" /> Recapturar
                </button>
                <button onClick={confirm} className="btn-primary text-sm">
                  <Check className="w-4 h-4" /> Usar imagem
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
