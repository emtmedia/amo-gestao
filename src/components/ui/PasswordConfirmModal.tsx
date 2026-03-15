'use client'
import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

interface PasswordConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  onConfirmed: () => void
  onCancel: () => void
}

export default function PasswordConfirmModal({ isOpen, title, description, onConfirmed, onCancel }: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!password) { setError('Digite sua senha.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (data.success) {
        setPassword('')
        onConfirmed()
      } else {
        setError('Senha incorreta. Tente novamente.')
      }
    } catch {
      setError('Erro ao verificar senha.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setPassword('')
    setError('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-navy-800 text-base">{title}</h3>
            <p className="text-xs text-navy-500">{description}</p>
          </div>
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder="Digite sua senha"
            className="form-input pr-10 w-full"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={handleCancel} className="flex-1 btn-secondary">Cancelar</button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 btn-primary">
            {loading ? 'Verificando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
