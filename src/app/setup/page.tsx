'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.senha !== form.confirmar) { setError('As senhas não coincidem.'); return }
    setError(''); setDetail('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao criar usuário.')
        if (data.detail) setDetail(data.detail)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      setError('Erro de conexão com o servidor.')
      setDetail(String(err))
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
          <h1 className="text-2xl font-bold text-navy">Configuração Inicial</h1>
          <p className="text-gray-500 text-sm mt-1">Crie o primeiro usuário administrador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {success ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Administrador criado!</h3>
              <p className="text-sm text-gray-500">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                ℹ️ Primeiro acesso — crie a conta de administrador para começar.
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <p className="font-medium">{error}</p>
                  {detail && (
                    <p className="mt-2 text-xs text-red-500 font-mono break-all bg-red-100 p-2 rounded">
                      {detail}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required className="input-field" placeholder="Seu nome completo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className="input-field" placeholder="admin@amomissoes.org" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                  <div className="relative">
                    <input type={show1 ? 'text' : 'password'} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required minLength={8} className="input-field pr-10" placeholder="Mínimo 8 caracteres" />
                    <button type="button" onClick={() => setShow1(!show1)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show1 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha *</label>
                  <div className="relative">
                    <input type={show2 ? 'text' : 'password'} value={form.confirmar} onChange={e => setForm({ ...form, confirmar: e.target.value })} required className="input-field pr-10" placeholder="Repita a senha" />
                    <button type="button" onClick={() => setShow2(!show2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show2 ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center py-3 mt-2">
                  {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Criar Administrador'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
