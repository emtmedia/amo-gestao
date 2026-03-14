'use client'
/**
 * CurrencyInput — campo monetário com máscara brasileira (R$ 1.234,56)
 *
 * Comportamento:
 * • Aceita QUALQUER combinação de dígitos, vírgula ou ponto
 * • Formata em tempo real, à medida que o usuário digita
 * • Exemplos: "100,50" → R$ 100,50 | "1500.00" → R$ 1.500,00 | "2500," → R$ 2.500,00
 * • parseBRL() converte de volta para float ao salvar
 */

'use client'
import { useRef, useEffect } from 'react'

interface CurrencyInputProps {
  value: string
  onChange: (raw: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Converte qualquer string monetária para float.
 * Suporta: "1.234,56" | "1234,56" | "1234.56" | "1.234.567,89"
 */
export function parseCurrencyBR(value: string): number {
  if (!value || value.trim() === '') return 0
  // Remove R$, espaços, e caracteres não numéricos exceto vírgula e ponto
  let v = value.replace(/R\$\s?/g, '').trim()
  // Heurística: se há vírgula, ela é decimal; pontos são milhar → remover pontos, trocar vírgula por ponto
  if (v.includes(',')) {
    v = v.replace(/\./g, '').replace(',', '.')
  }
  // Se só tem pontos (ex: "1.234.56") → provavelmente ponto como decimal → manter último ponto
  const n = parseFloat(v)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

/**
 * Formata centavos inteiros para exibição br:
 * 150050 → "1.500,50"
 */
function centsToDisplay(cents: number): string {
  if (cents === 0) return ''
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Extrai apenas os dígitos de uma string e retorna como número inteiro (centavos).
 */
function digitsOnly(str: string): number {
  const digits = str.replace(/\D/g, '')
  if (!digits) return 0
  // Limita a 15 dígitos para evitar overflow
  return parseInt(digits.slice(-15), 10)
}

export default function CurrencyInput({
  value,
  onChange,
  label,
  required = false,
  placeholder = '0,00',
  className = '',
  disabled = false,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Deriva o display a partir do value externo (string guardada no form)
  function valueToDisplay(v: string): string {
    if (!v || v.trim() === '') return ''
    const num = parseCurrencyBR(v)
    if (num === 0) return ''
    const cents = Math.round(num * 100)
    return centsToDisplay(cents)
  }

  // Sincroniza o campo visível quando o valor é definido externamente (ex: openEdit)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = valueToDisplay(value)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const raw = input.value
    const cents = digitsOnly(raw)
    const formatted = centsToDisplay(cents)

    // Atualiza o campo visualmente
    input.value = formatted

    // Propaga o valor formatado para o estado do formulário
    onChange(formatted)

    // Mantém o cursor sempre no final
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite: Backspace, Delete, Tab, Escape, Enter, setas, Ctrl+A/C/V/X
    const allowed = [
      'Backspace','Delete','Tab','Escape','Enter',
      'ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
    ]
    if (allowed.includes(e.key)) return
    if ((e.ctrlKey || e.metaKey) && ['a','c','v','x','z'].includes(e.key.toLowerCase())) return
    // Bloqueia qualquer tecla que não seja dígito, vírgula ou ponto
    if (!/[\d,.]/.test(e.key)) {
      e.preventDefault()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const cents = digitsOnly(pasted) || Math.round(parseCurrencyBR(pasted) * 100)
    const formatted = centsToDisplay(cents)
    if (inputRef.current) inputRef.current.value = formatted
    onChange(formatted)
  }

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400 text-sm font-medium pointer-events-none select-none">
          R$
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          defaultValue={valueToDisplay(value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className={`form-input pl-9 ${disabled ? 'opacity-50 cursor-not-allowed bg-cream-100' : ''}`}
        />
      </div>
    </div>
  )
}

/** Aliases para compatibilidade com imports existentes */
export const parseBRL = parseCurrencyBR
