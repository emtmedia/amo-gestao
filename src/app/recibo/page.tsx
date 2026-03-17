'use client'
import { useState, useRef } from 'react'
import { Receipt, Printer, RotateCcw } from 'lucide-react'

const hoje = () => new Date().toISOString().slice(0, 10)
const agora = () => new Date().toTimeString().slice(0, 5)

const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '___/___/______'
const fmtValor = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  if (isNaN(n)) return 'R$ ___________'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

const emptyForm = {
  data: hoje(),
  hora: agora(),
  nomeRecebedor: '',
  cpfRecebedor: '',
  valor: '',
  descricao: '',
  numeroRecibo: '',
}

export default function ReciboPage() {
  const [form, setForm] = useState(emptyForm)
  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const reset = () => setForm({ ...emptyForm, data: hoje(), hora: agora() })

  return (
    <div>
      {/* ── HEADER (oculto na impressão) ── */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <Receipt className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Emissão de Recibo</h1>
            <p className="text-sm text-navy-400">Preencha os campos e imprima ou salve como PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Limpar
          </button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 print:block">

        {/* ── FORMULÁRIO (oculto na impressão) ── */}
        <div className="lg:w-80 shrink-0 print:hidden">
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-navy-700 uppercase tracking-wide">Dados do Recibo</h2>

            <div className="form-group">
              <label>Nº do Recibo</label>
              <input type="text" placeholder="Ex: 001/2026" value={form.numeroRecibo} onChange={set('numeroRecibo')} className="form-input" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label>Data<span className="required-star">*</span></label>
                <input type="date" value={form.data} onChange={set('data')} className="form-input" />
              </div>
              <div className="form-group">
                <label>Hora<span className="required-star">*</span></label>
                <input type="time" value={form.hora} onChange={set('hora')} className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label>Nome do Recebedor<span className="required-star">*</span></label>
              <input type="text" placeholder="Nome completo" value={form.nomeRecebedor} onChange={set('nomeRecebedor')} className="form-input" />
            </div>

            <div className="form-group">
              <label>CPF do Recebedor<span className="required-star">*</span></label>
              <input type="text" placeholder="000.000.000-00" value={form.cpfRecebedor} onChange={set('cpfRecebedor')} className="form-input" />
            </div>

            <div className="form-group">
              <label>Valor (R$)<span className="required-star">*</span></label>
              <input type="text" placeholder="0,00" value={form.valor} onChange={set('valor')} className="form-input" />
            </div>

            <div className="form-group">
              <label>Descrição do Serviço<span className="required-star">*</span></label>
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

        {/* ── PREVIEW / RECIBO ── */}
        <div className="flex-1">
          {/* Moldura visível na tela */}
          <div className="card print:shadow-none print:border-none print:p-0">

            {/* Recibo — layout para impressão A4 */}
            <div className="print-receipt max-w-2xl mx-auto border-2 border-gray-800 rounded-lg p-8 print:border-black print:rounded-none print:p-10 print:max-w-none">

              {/* Cabeçalho */}
              <div className="text-center border-b-2 border-gray-700 pb-5 mb-6 print:border-black">
                <p className="text-2xl font-extrabold text-gray-800 tracking-wide">🕊️ AMO</p>
                <p className="text-base font-semibold text-gray-700 mt-0.5">ASSOCIAÇÃO MISSÃO ÔMEGA</p>
                <p className="text-xl font-bold text-gray-800 mt-3 uppercase tracking-widest">Recibo de Pagamento</p>
                {form.numeroRecibo && (
                  <p className="text-sm text-gray-500 mt-1">Nº {form.numeroRecibo}</p>
                )}
              </div>

              {/* Data e hora */}
              <p className="text-right text-sm text-gray-600 mb-6 font-medium">
                {fmtDate(form.data)}{form.hora ? ` — ${form.hora}` : ''}
              </p>

              {/* Corpo */}
              <p className="text-gray-800 text-base leading-relaxed mb-8">
                Eu,{' '}
                <strong className={form.nomeRecebedor ? 'underline decoration-dotted' : 'text-gray-400'}>
                  {form.nomeRecebedor || '_______________________________'}
                </strong>
                , recebi da{' '}
                <strong>Associação Missão Ômega</strong>
                {' '}o valor de{' '}
                <strong className={form.valor ? 'underline decoration-dotted' : 'text-gray-400'}>
                  {fmtValor(form.valor)}
                </strong>
                {' '}pela seguinte prestação de serviço:{' '}
                <strong className={form.descricao ? 'underline decoration-dotted' : 'text-gray-400'}>
                  {form.descricao || '_______________________________'}
                </strong>
                .
              </p>

              {/* Assinatura */}
              <div className="mt-12 pt-6 border-t border-gray-400">
                <div className="text-center">
                  <div className="border-b border-gray-600 w-72 mx-auto mb-2" />
                  <p className="font-semibold text-gray-800">
                    {form.nomeRecebedor || '________________________________'}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    CPF: {form.cpfRecebedor || '___.___.___-__'}
                  </p>
                </div>
              </div>

              {/* Rodapé */}
              <p className="text-xs text-gray-400 text-center mt-8">
                Documento gerado pelo Sistema de Gestão AMO
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT STYLES ── */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 700px;
          }
        }
      `}</style>
    </div>
  )
}
