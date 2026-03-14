'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, SendHorizonal } from 'lucide-react'

export default function EsqueciSenhaPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao enviar e-mail.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-navy mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">AMO</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">Redefinir Senha</h1>
          <p className="text-gray-500 text-sm mt-1">Informe seu e-mail para receber o link</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={32} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">E-mail enviado!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá as instruções em breve.
              </p>
              <button onClick={() => router.push('/login')} className="btn-primary w-full">
                Voltar ao Login
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="input-field pl-9"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><SendHorizonal size={18} /> Enviar Link</>}
                </button>
              </form>
              <button onClick={() => router.push('/login')} className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 text-sm text-gray-500 hover:text-navy transition-colors">
                <ArrowLeft size={16} /> Voltar ao Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
