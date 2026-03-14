'use client'
import { ShieldAlert } from 'lucide-react'

interface Props {
  error: string | null
  onClose: () => void
}

export default function BlockErrorModal({ error, onClose }: Props) {
  if (!error) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-800">Exclusão Bloqueada</h3>
            <p className="text-sm text-navy-500 mt-0.5">Este registro está vinculado a outros dados do sistema.</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <pre className="text-sm text-amber-900 whitespace-pre-wrap font-sans leading-relaxed">{error}</pre>
        </div>
        <p className="text-xs text-navy-400 mb-5">
          Remova os vínculos indicados acima antes de tentar excluir novamente.
        </p>
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary">Entendido</button>
        </div>
      </div>
    </div>
  )
}
