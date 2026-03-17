'use client'
import { useState, useEffect } from 'react'
import { Receipt, Printer, RotateCcw, CheckCircle } from 'lucide-react'

const hoje = () => new Date().toISOString().slice(0, 10)
const agora = () => new Date().toTimeString().slice(0, 5)

const fmtDate = (d: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '___/___/______'

const fmtValor = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  if (isNaN(n) || !v) return 'R$ ___________'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const emptyForm = {
  data: '', hora: '',
  nomeRecebedor: '', cpfRecebedor: '',
  valor: '', descricao: '',
}

export default function ReciboPage() {
  const [form, setForm] = useState({ ...emptyForm, data: hoje(), hora: agora() })
  const [proximoNumero, setProximoNumero] = useState<string>('RB-......')
  const [numeroEmitido, setNumeroEmitido] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [migrated, setMigrated] = useState(false)

  // Run migration + fetch next number on mount
  useEffect(() => {
    fetch('/api/migrate/recibo', { method: 'POST' })
      .then(() => setMigrated(true))
      .then(() => fetch('/api/recibo'))
      .then(r => r.json())
      .then(j => { if (j.success) setProximoNumero(j.proximo) })
      .catch(() => setMigrated(true))
  }, [])

  const set = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const reset = () => {
    setForm({ ...emptyForm, data: hoje(), hora: agora() })
    setNumeroEmitido(null)
    fetch('/api/recibo').then(r => r.json()).then(j => { if (j.success) setProximoNumero(j.proximo) })
  }

  const handleEmitir = async () => {
    if (!form.nomeRecebedor || !form.cpfRecebedor || !form.valor || !form.descricao) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/recibo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, valor: parseFloat(form.valor.replace(',', '.')) }),
      })
      const j = await res.json()
      if (j.success) {
        setNumeroEmitido(j.numero)
        setTimeout(() => window.print(), 300)
      } else {
        alert('Erro ao emitir recibo: ' + j.error)
      }
    } finally { setSaving(false) }
  }

  const numero = numeroEmitido ?? proximoNumero

  return (
    <>
      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body > * { display: none !important; }
          #recibo-print-root { display: block !important; }
          #recibo-print-root .a4-page {
            width: 210mm; min-height: 297mm;
            margin: 0; padding: 20mm 20mm 20mm 20mm;
            box-shadow: none; border: none;
          }
        }
        #recibo-print-root { display: contents; }
      `}</style>

      <div id="recibo-print-root">
        <div className="print:hidden">
          {/* ── HEADER ── */}
          <div className="page-header">
            <div className="flex items-center gap-3">
              <Receipt className="w-7 h-7 text-navy-700" />
              <div>
                <h1 className="page-title">Emissão de Recibo</h1>
                <p className="text-sm text-navy-400">Preencha os dados e clique em Emitir para salvar e imprimir</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={reset} className="btn-secondary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Novo Recibo
              </button>
              <button
                onClick={handleEmitir}
                disabled={saving || !migrated}
                className="btn-primary flex items-center gap-2"
              >
                {saving
                  ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  : <Printer className="w-4 h-4" />}
                {saving ? 'Emitindo...' : 'Emitir Recibo'}
              </button>
            </div>
          </div>

          {numeroEmitido && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Recibo <strong>{numeroEmitido}</strong> emitido e salvo com sucesso.
            </div>
          )}

          {/* ── LAYOUT: FORM + A4 PREVIEW ── */}
          <div className="flex gap-6 items-start">

            {/* FORMULÁRIO */}
            <div className="w-80 shrink-0">
              <div className="card space-y-4">
                <h2 className="text-sm font-semibold text-navy-700 uppercase tracking-wide">Dados do Recibo</h2>

                <div className="form-group">
                  <label>Nº do Recibo</label>
                  <input
                    type="text"
                    value={numero}
                    readOnly
                    className="form-input bg-navy-50 text-navy-500 font-mono font-semibold cursor-not-allowed"
                  />
                  <p className="text-xs text-navy-400 mt-1">Gerado automaticamente ao emitir</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label>Data <span className="required-star">*</span></label>
                    <input type="date" value={form.data} onChange={set('data')} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label>Hora <span className="required-star">*</span></label>
                    <input type="time" value={form.hora} onChange={set('hora')} className="form-input" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Nome do Recebedor <span className="required-star">*</span></label>
                  <input type="text" placeholder="Nome completo" value={form.nomeRecebedor} onChange={set('nomeRecebedor')} className="form-input" />
                </div>

                <div className="form-group">
                  <label>CPF do Recebedor <span className="required-star">*</span></label>
                  <input type="text" placeholder="000.000.000-00" value={form.cpfRecebedor} onChange={set('cpfRecebedor')} className="form-input" />
                </div>

                <div className="form-group">
                  <label>Valor (R$) <span className="required-star">*</span></label>
                  <input type="text" placeholder="0,00" value={form.valor} onChange={set('valor')} className="form-input" />
                </div>

                <div className="form-group">
                  <label>Descrição do Serviço <span className="required-star">*</span></label>
                  <textarea
                    rows={4}
                    placeholder="Descreva a prestação de serviço..."
                    value={form.descricao}
                    onChange={set('descricao')}
                    className="form-input resize-none"
                  />
                </div>
              </div>
            </div>

            {/* A4 PREVIEW */}
            <div className="flex-1 flex justify-center">
              <div
                className="a4-page bg-white shadow-2xl"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '20mm 20mm 20mm 20mm',
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                <ReciboContent
                  numero={numero}
                  data={form.data}
                  hora={form.hora}
                  nomeRecebedor={form.nomeRecebedor}
                  cpfRecebedor={form.cpfRecebedor}
                  valor={form.valor}
                  descricao={form.descricao}
                  emitido={!!numeroEmitido}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── VERSÃO IMPRESSÃO (só aparece no print) ── */}
        <div className="hidden print:block">
          <div
            className="a4-page bg-white"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm 20mm 20mm 20mm',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            <ReciboContent
              numero={numero}
              data={form.data}
              hora={form.hora}
              nomeRecebedor={form.nomeRecebedor}
              cpfRecebedor={form.cpfRecebedor}
              valor={form.valor}
              descricao={form.descricao}
              emitido={!!numeroEmitido}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function ReciboContent({
  numero, data, hora, nomeRecebedor, cpfRecebedor, valor, descricao, emitido
}: {
  numero: string; data: string; hora: string
  nomeRecebedor: string; cpfRecebedor: string
  valor: string; descricao: string; emitido: boolean
}) {
  const ph = (v: string, placeholder: string) =>
    v ? <strong style={{ borderBottom: '1px dotted #555' }}>{v}</strong>
       : <strong style={{ color: '#aaa' }}>{placeholder}</strong>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a2e', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '2px', color: '#1a1a2e' }}>
          🕊️ AMO
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginTop: '2px', letterSpacing: '1px' }}>
          ASSOCIAÇÃO MISSÃO ÔMEGA
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginTop: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Recibo de Pagamento
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#555' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>
            {numero}
          </span>
          <span>{fmtDate(data)}{hora ? ` — ${hora}` : ''}</span>
        </div>
      </div>

      {/* Corpo */}
      <div style={{ fontSize: '15px', lineHeight: '1.9', color: '#222', flex: 1 }}>
        <p style={{ marginBottom: '24px', textAlign: 'justify' }}>
          Eu, {ph(nomeRecebedor, '_______________________________')}, recebi da{' '}
          <strong>Associação Missão Ômega</strong> o valor de{' '}
          {ph(fmtValor(valor) === 'R$ ___________' ? '' : fmtValor(valor), 'R$ ___________')}{' '}
          pela seguinte prestação de serviço:{' '}
          {ph(descricao, '_______________________________')}.
        </p>
      </div>

      {/* Assinatura */}
      <div style={{ marginTop: '60px', textAlign: 'center' }}>
        <div style={{ width: '260px', margin: '0 auto', borderBottom: '1px solid #444', marginBottom: '8px' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#222' }}>
          {nomeRecebedor || '________________________________'}
        </div>
        <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
          CPF: {cpfRecebedor || '___.___.___-__'}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
        {emitido
          ? `Documento emitido pelo Sistema de Gestão AMO · ${numero}`
          : 'Documento gerado pelo Sistema de Gestão AMO'}
      </div>
    </div>
  )
}
