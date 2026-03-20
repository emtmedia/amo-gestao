'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, RefreshCw, ArrowLeft } from 'lucide-react'

export default function VerificarOTPPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [countdown, setCountdown] = useState(600) // 10 min
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const uid = sessionStorage.getItem('otp_usuarioId')
    const em = sessionStorage.getItem('otp_email')
    if (!uid || !em) {
      router.push('/login')
      return
    }
    setUsuarioId(uid)
    setEmail(em)
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCodigo = [...codigo]
    newCodigo[index] = value.slice(-1)
    setCodigo(newCodigo)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (newCodigo.every(d => d !== '')) {
      submitCode(newCodigo.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCodigo(pasted.split(''))
      submitCode(pasted)
    }
  }

  const submittingRef = useRef(false)
  const submitCode = async (code: string) => {
    if (submittingRef.current || loading) return
    submittingRef.current = true
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId, codigo: code })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Código inválido.')
        setCodigo(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        submittingRef.current = false
        return
      }
      const redirectTo = sessionStorage.getItem('otp_redirect') || '/'
      sessionStorage.removeItem('otp_usuarioId')
      sessionStorage.removeItem('otp_email')
      sessionStorage.removeItem('otp_redirect')
      setSuccess('Verificado com sucesso! Redirecionando...')
      setTimeout(() => { window.location.href = redirectTo }, 800)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      submittingRef.current = false
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      const em = sessionStorage.getItem('otp_email')
      const savedSenha = sessionStorage.getItem('otp_senha') // won't have this, show message
      setSuccess('Se as credenciais estiverem corretas, um novo código será enviado. Volte ao login e entre novamente.')
    } catch {
      setError('Erro ao reenviar.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-navy mb-4 shadow-lg">
            <ShieldCheck size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-navy">Verificação 2FA</h1>
          <p className="text-gray-500 text-sm mt-1">
            Código enviado para <strong>{email}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-base font-medium text-gray-700 mb-6 text-center">
            Digite o código de 6 dígitos
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
              {success}
            </div>
          )}

          <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
            {codigo.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                disabled={loading}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-navy focus:outline-none bg-gray-50 disabled:opacity-50 transition-colors"
              />
            ))}
          </div>

          <div className="text-center mb-6">
            <span className={`text-sm font-mono ${countdown < 60 ? 'text-red-500' : 'text-gray-500'}`}>
              ⏱️ Expira em {formatTime(countdown)}
            </span>
          </div>

          {loading && (
            <div className="flex justify-center mb-4">
              <span className="inline-block w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm transition-colors"
            >
              <ArrowLeft size={16} /> Voltar ao Login
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Associação Missionária Ômega
        </p>
      </div>
    </div>
  )
}
