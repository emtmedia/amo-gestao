'use client'

import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  alert?: { type: 'success' | 'error'; message: string } | null
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', alert }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cream-200 shrink-0">
          <h2 className="text-xl font-bold text-navy-800">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-cream-100 text-navy-400 hover:text-navy-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Alert — aparece dentro do modal acima do conteúdo */}
        {alert && (
          <div className={`mx-6 mt-4 shrink-0 flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
            alert.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {alert.type === 'success'
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />}
            <span>{alert.message}</span>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
