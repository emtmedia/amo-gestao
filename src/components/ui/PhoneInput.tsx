'use client'
/**
 * PhoneInput — campo de telefone com máscara brasileira automática
 *
 * Detecta automaticamente o tipo pelo número de dígitos:
 *   Celular:  +55 31 90000-0000  (13 dígitos no total com DDI+DDD)
 *   Fixo:     +55 31 0000-0000   (12 dígitos no total com DDI+DDD)
 *
 * O valor armazenado é a string mascarada completa.
 */

import { useRef, useState, useEffect } from 'react'

interface PhoneInputProps {
  value: string
  onChange: (masked: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  className?: string
}

/** Remove tudo que não for dígito */
function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

/**
 * Aplica máscara brasileira com DDI +55:
 * Enquanto digita, formata progressivamente.
 *
 * Formatos:
 *   +55 (31) 9 0000-0000  → celular (11 dígitos nacionais)
 *   +55 (31) 0000-0000    → fixo    (10 dígitos nacionais)
 */
function applyMask(raw: string): string {
  // Remove tudo exceto dígitos, limita a 13 (DDI 2 + DDD 2 + número 9)
  let digits = onlyDigits(raw)

  // Se o usuário já digitou "55" no início, mantém; se não, não força
  // Trabalhamos com os dígitos nacionais (sem DDI)
  // Para simplificar, tratamos os dígitos fornecidos como número nacional (sem +55)
  // já que o usuário digita apenas a partir do DDD

  // Limita a 11 dígitos nacionais (DDD 2 + número 9)
  digits = digits.slice(0, 11)

  const len = digits.length

  if (len === 0) return ''
  if (len <= 2)  return `+55 (${digits}`
  if (len <= 6)  return `+55 (${digits.slice(0,2)}) ${digits.slice(2)}`
  if (len <= 10) {
    // Pode ser fixo ainda em construção ou celular sem o 9
    const body = digits.slice(2)
    if (body.length <= 4) return `+55 (${digits.slice(0,2)}) ${body}`
    return `+55 (${digits.slice(0,2)}) ${body.slice(0,4)}-${body.slice(4)}`
  }
  // 11 dígitos: celular com 9 dígitos no número
  const ddd    = digits.slice(0, 2)
  const parte1 = digits.slice(2, 7)  // 5 dígitos
  const parte2 = digits.slice(7)     // 4 dígitos
  return `+55 (${ddd}) ${parte1}-${parte2}`
}

/** Extrai apenas os dígitos nacionais do valor mascarado para comparação */
function extractDigits(masked: string): string {
  return onlyDigits(masked.replace('+55', ''))
}

export default function PhoneInput({
  value,
  onChange,
  label,
  required  = false,
  placeholder,
  className = '',
}: PhoneInputProps) {
  const [display, setDisplay] = useState(() => value || '')
  const skipSync = useRef(false)

  // Sincroniza quando value muda externamente (ex: openEdit, reset)
  useEffect(() => {
    if (skipSync.current) { skipSync.current = false; return }
    // Se value já está mascarado, usa direto; se é só dígitos, aplica máscara
    if (value && !value.includes('+')) {
      setDisplay(applyMask(value))
    } else {
      setDisplay(value || '')
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw      = e.target.value
    const digits   = extractDigits(raw)
    const masked   = applyMask(digits)
    setDisplay(masked)
    skipSync.current = true
    onChange(masked)
  }

  const ph = placeholder || '+55 (31) 90000-0000'

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label>
          {label}
          {required && <span className="required-star">*</span>}
        </label>
      )}
      <input
        type="tel"
        inputMode="numeric"
        placeholder={ph}
        value={display}
        onChange={handleChange}
        className="form-input"
        maxLength={19} /* +55 (31) 90000-0000 = 19 chars */
      />
    </div>
  )
}
