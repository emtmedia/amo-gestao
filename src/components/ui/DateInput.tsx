'use client'
/**
 * DateInput — Máscara dd/mm/yyyy + ícone de calendário nativo
 * - Exibe sempre dd/mm/yyyy independente do SO/browser
 * - Botão de calendário abre o date picker nativo do browser
 * - Valor externo/interno sempre ISO: yyyy-mm-dd
 */
import { useState, useEffect, useRef } from 'react'

interface DateInputProps {
  value: string               // ISO: 'yyyy-mm-dd' ou ''
  onChange: (iso: string) => void
  label?: string
  required?: boolean
  className?: string
  minDate?: string
  maxDate?: string
}

function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function displayToIso(display: string): string {
  const clean = display.replace(/\D/g, '')
  if (clean.length < 8) return ''
  const d = clean.slice(0, 2)
  const m = clean.slice(2, 4)
  const y = clean.slice(4, 8)
  if (parseInt(d) < 1 || parseInt(d) > 31) return ''
  if (parseInt(m) < 1 || parseInt(m) > 12) return ''
  const date = new Date(`${y}-${m}-${d}`)
  if (isNaN(date.getTime())) return ''
  return `${y}-${m}-${d}`
}

function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export default function DateInput({
  value,
  onChange,
  label,
  required = false,
  className = '',
  minDate,
  maxDate,
}: DateInputProps) {
  const [display, setDisplay] = useState(() => isoToDisplay(value))
  const [error, setError] = useState('')
  const skipSync = useRef(false)
  const hiddenRef = useRef<HTMLInputElement>(null)

  // Sincroniza quando value muda externamente (openEdit / reset)
  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return }
    setDisplay(isoToDisplay(value))
    setError('')
  }, [value])

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = applyMask(e.target.value)
    setDisplay(masked)
    setError('')
    const iso = displayToIso(masked)
    if (masked.length === 10) {
      if (!iso) { setError('Data inválida'); skipSync.current = true; onChange(''); return }
      if (minDate && iso < minDate) setError(`Mínimo: ${isoToDisplay(minDate)}`)
      else if (maxDate && iso > maxDate) setError(`Máximo: ${isoToDisplay(maxDate)}`)
      skipSync.current = true
      onChange(iso)
    } else {
      skipSync.current = true
      onChange('')
    }
  }

  // Quando o picker nativo escolhe uma data
  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value  // yyyy-mm-dd
    skipSync.current = true
    setDisplay(isoToDisplay(iso))
    setError('')
    onChange(iso)
  }

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          placeholder="dd/mm/aaaa"
          value={display}
          onChange={handleTextChange}
          className={`form-input pr-9 ${error ? 'border-red-400' : ''}`}
          maxLength={10}
        />
        {/* Botão calendário — abre o date picker nativo oculto */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => hiddenRef.current?.showPicker?.()}
          className="absolute right-2 text-navy-400 hover:text-navy-700 transition-colors"
          title="Abrir calendário"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>
        {/* Input date nativo oculto — apenas para abrir o picker */}
        <input
          ref={hiddenRef}
          type="date"
          value={value || ''}
          min={minDate}
          max={maxDate}
          onChange={handlePickerChange}
          className="absolute inset-0 w-full opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
          style={{ colorScheme: 'light' }}
        />
      </div>
      {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
    </div>
  )
}
