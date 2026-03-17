'use client'
import { useState, useEffect } from 'react'
import { Receipt, Printer, RotateCcw, CheckCircle } from 'lucide-react'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'

const hoje = () => new Date().toISOString().slice(0, 10)
const agora = () => new Date().toTimeString().slice(0, 5)

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

const fmtDate = (d: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '___/___/______'

const fmtValor = (v: string) => {
  if (!v) return 'R$ ___________'
  // CurrencyInput stores as "1.234,56" — parse BR format
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return 'R$ ___________'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const emptyForm = {
  data: '', hora: '',
  nomeRecebedor: '', cpfRecebedor: '',
  valor: '', descricao: '',
}

export default function ReciboPage() {
  const [form, setForm] = useState({ ...emptyForm, data: hoje(), hora: agora() })
  const ano = new Date().getFullYear()
  const [proximoNumero, setProximoNumero] = useState<string>(`N° ..../${ano}`)
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
        body: JSON.stringify({ ...form, valor: parseBRL(form.valor) }),
      })
      const j = await res.json()
      if (j.success) {
        setNumeroEmitido(j.numero)
        printRecibo({ ...form, numero: j.numero })
      } else {
        alert('Erro ao emitir recibo: ' + j.error)
      }
    } finally { setSaving(false) }
  }

  const printRecibo = (data: typeof form & { numero: string }) => {
    const valorFmt = fmtValor(data.valor)
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Recibo ${data.numero}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, "Times New Roman", serif; color: #222; font-size: 15px; line-height: 1.9; }
    .cabecalho { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 24px; }
    .org { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #1a1a2e; }
    .sub { font-size: 13px; font-weight: 600; color: #333; margin-top: 2px; letter-spacing: 1px; }
    .titulo { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-top: 10px; letter-spacing: 3px; text-transform: uppercase; }
    .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #555; }
    .numero { font-family: monospace; font-weight: 600; background: #f0f0f0; padding: 2px 8px; border-radius: 4px; }
    .corpo { margin-bottom: 24px; text-align: justify; }
    .destaque { border-bottom: 1px dotted #555; font-weight: bold; }
    .assinatura { margin-top: 80px; text-align: center; }
    .linha-assinatura { width: 260px; margin: 0 auto 8px; border-bottom: 1px solid #444; }
    .nome-assinatura { font-size: 14px; font-weight: 600; }
    .cpf-assinatura { font-size: 13px; color: #555; margin-top: 4px; }
    .rodape { margin-top: 60px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #aaa; }
  </style>
</head>
<body>
  <div class="cabecalho">
    <div class="org">🕊️ AMO</div>
    <div class="sub">ASSOCIAÇÃO MISSÃO ÔMEGA</div>
    <div class="titulo">Recibo de Pagamento</div>
    <div class="meta">
      <span class="numero">${data.numero}</span>
      <span>${fmtDate(data.data)}${data.hora ? ` — ${data.hora}` : ''}</span>
    </div>
  </div>
  <p class="corpo">
    Eu, <span class="destaque">${data.nomeRecebedor}</span>, recebi da
    <strong>Associação Missão Ômega</strong> o valor de
    <span class="destaque">${valorFmt}</span>
    pela seguinte prestação de serviço:
    <span class="destaque">${data.descricao}</span>.
  </p>
  <div class="assinatura">
    <div class="linha-assinatura"></div>
    <div class="nome-assinatura">${data.nomeRecebedor}</div>
    <div class="cpf-assinatura">CPF: ${data.cpfRecebedor}</div>
  </div>
  <div class="rodape">Documento emitido pelo Sistema de Gestão AMO · ${data.numero}</div>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=1100')
    if (win) { win.document.write(html); win.document.close() }
  }

  const numero = numeroEmitido ?? proximoNumero

  return (
    <>
      <div>
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
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={form.cpfRecebedor}
                    onChange={e => setForm(p => ({ ...p, cpfRecebedor: maskCPF(e.target.value) }))}
                    className="form-input"
                    maxLength={14}
                  />
                </div>

                <CurrencyInput
                  label="Valor (R$)"
                  required
                  value={form.valor}
                  onChange={v => setForm(p => ({ ...p, valor: v }))}
                />

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

            {/* A4 PREVIEW — também é o que aparece na impressão via .recibo-print-area */}
            <div className="flex-1 flex justify-center">
              <div
                className="recibo-print-area bg-white shadow-2xl"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '20mm',
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
