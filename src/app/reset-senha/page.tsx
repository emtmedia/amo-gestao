'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react'

function ResetSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = searchParams.get('token')
    if (!t) {
      router.push('/login')
      return
    }
    setToken(t)
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha !== confirmSenha) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir senha.')
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
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
            <Lock size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-navy">Nova Senha</h1>
          <p className="text-gray-500 text-sm mt-1">Defina sua nova senha de acesso</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {success ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Senha redefinida!</h3>
              <p className="text-sm text-gray-500">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={show1 ? 'text' : 'password'} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" className="input-field pl-9 pr-10" />
                    <button type="button" onClick={() => setShow1(!show1)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show1 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={show2 ? 'text' : 'password'} value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required placeholder="Repita a nova senha" className="input-field pl-9 pr-10" />
                    <button type="button" onClick={() => setShow2(!show2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show2 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Redefinir Senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen auth-bg flex items-center justify-center"><span className="text-navy">Carregando...</span></div>}>
      <ResetSenhaForm />
    </Suspense>
  )
}
