'use client'
import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'

interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }

interface Props {
  contas: Conta[]
  selectedId: string
  onChange: (id: string) => void
}

const STORAGE_KEY = 'amo_conta_default'

export function getDefaultContaId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setDefaultContaId(id: string) {
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(STORAGE_KEY, id)
  else localStorage.removeItem(STORAGE_KEY)
}

export default function ContaBancariaSelect({ contas, selectedId, onChange }: Props) {
  const [defaultId, setDefaultId] = useState('')

  useEffect(() => {
    const stored = getDefaultContaId()
    setDefaultId(stored)
    // Auto-select default if nothing selected yet
    if (!selectedId && stored && contas.find(c => c.id === stored)) {
      onChange(stored)
    }
  }, [contas]) // eslint-disable-line

  const handleSetDefault = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (selectedId) {
      setDefaultContaId(selectedId)
      setDefaultId(selectedId)
    }
  }

  const handleClearDefault = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDefaultContaId('')
    setDefaultId('')
  }

  const isCurrentDefault = selectedId && selectedId === defaultId

  return (
    <div className="form-group">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-navy-700">
          Conta Bancária (Débito)<span className="required-star">*</span>
        </label>
        <div className="flex items-center gap-2">
          {defaultId && contas.find(c => c.id === defaultId) && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              Padrão: {contas.find(c => c.id === defaultId)?.banco}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={e => onChange(e.target.value)}
          className="form-input flex-1"
        >
          <option value="">Selecione a conta...</option>
          {contas.map(c => (
            <option key={c.id} value={c.id}>
              {c.id === defaultId ? '★ ' : ''}{c.tipo} | Ag {c.agencia} | Cta {c.numeroConta} — {c.banco}
            </option>
          ))}
        </select>
        <button
          type="button"
          title={isCurrentDefault ? 'Remover como conta padrão' : 'Definir como conta padrão para despesas'}
          onClick={isCurrentDefault ? handleClearDefault : handleSetDefault}
          disabled={!selectedId}
          className={`px-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1
            ${isCurrentDefault
              ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              : 'bg-white border-cream-300 text-navy-400 hover:bg-cream-100 hover:text-navy-600 disabled:opacity-40'
            }`}
        >
          <Star className={`w-3.5 h-3.5 ${isCurrentDefault ? 'fill-amber-400 text-amber-400' : ''}`} />
          {isCurrentDefault ? 'Padrão' : 'Definir padrão'}
        </button>
      </div>
      {isCurrentDefault && (
        <p className="text-xs text-amber-600 mt-1">
          ★ Esta conta será pré-selecionada automaticamente em todas as despesas
        </p>
      )}
    </div>
  )
}
