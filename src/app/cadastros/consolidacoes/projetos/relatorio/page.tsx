'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface ConsolData {
  id: string; projetoId: string; dataConclusaoReal: string
  consideracoes: string; pendencias: string; acoesPositivas: string; licoesAprendidas: string
  saldoPositivo: boolean; nomeOperador: string; cpfOperador: string
  metodoAjuste: string; valorAjuste: number; contaReceptoraId: string; dataLimiteAjuste: string
  arquivosReferencia: string; createdAt: string
}
interface Projeto {
  id: string; nome: string; responsavel: string; emailResponsavel: string; telefoneResponsavel: string
  dataInicio: string; dataEncerramento: string; orcamentoEstimado: number
  estadoRealizacao: string; cidadeRealizacao: string; paisRealizacao: string
  numeroVoluntarios: number; comentarios: string
}
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function RelatorioContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [consol, setConsol] = useState<ConsolData | null>(null)
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [orcamentoRealizado, setOrcamentoRealizado] = useState<number>(0)

  useEffect(() => {
    if (!id) { setError('ID não informado'); setLoading(false); return }
    Promise.all([
      fetch(`/api/consolidacoes-projeto/${id}`).then(r => r.json()),
      fetch('/api/contas-bancarias').then(r => r.json()),
      fetch('/api/auxiliares?tipo=metodos').then(r => r.json()),
    ]).then(([jc, jcb, jm]) => {
      if (jc.success) {
        setConsol(jc.data)
        if (jc.data.projetoId) {
          Promise.all([
            fetch(`/api/projetos/${jc.data.projetoId}`).then(r => r.json()),
            fetch(`/api/relatorio/orcamento-projeto?projetoId=${jc.data.projetoId}`).then(r => r.json()).catch(() => ({ success: false })),
          ]).then(([jp, jor]) => {
            if (jp.success) setProjeto(jp.data)
            if (jor.success) setOrcamentoRealizado(jor.total || 0)
          })
        }
      } else setError('Consolidação não encontrada')
      if (jcb.success) setContas(jcb.data)
      if (jm.success) setMetodos(jm.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Carregando relatório...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-500">{error}</div>
  if (!consol) return null

  const conta = contas.find(c => c.id === consol.contaReceptoraId)
  const metodo = metodos.find(m => m.id === consol.metodoAjuste)

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto print:p-4">
      {/* Print button - hidden in print */}
      <div className="print:hidden flex gap-3 mb-6">
        <button onClick={() => window.print()}
          className="px-6 py-2.5 bg-navy-700 text-white rounded-xl text-sm font-medium hover:bg-navy-800 transition-colors flex items-center gap-2">
          🖨️ Imprimir / Salvar PDF
        </button>
        <button onClick={() => window.history.back()}
          className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          ← Voltar
        </button>
      </div>

      {/* REPORT HEADER */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl">🕊️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Associação Missionária Ômega</h1>
            <p className="text-sm text-gray-500">Sistema de Gestão AMO</p>
          </div>
        </div>
        <div className="mt-4 bg-gray-100 rounded-lg px-6 py-3 inline-block">
          <h2 className="text-xl font-bold text-gray-700 uppercase tracking-wide">Relatório Final de Projeto</h2>
          <p className="text-xs text-gray-400 mt-1">Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      {/* SEÇÃO I - INFORMAÇÕES DO PROJETO */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">I</span>
          Informações do Projeto
        </h3>
        <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nome do Projeto</p>
            <p className="text-lg font-bold text-gray-800">{projeto?.nome || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Responsável</p>
            <p className="font-medium text-gray-700">{projeto?.responsavel || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Contato</p>
            <p className="font-medium text-gray-700">{projeto?.telefoneResponsavel || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Data de Início</p>
            <p className="font-medium text-gray-700">{projeto ? fmtDate(String(projeto.dataInicio)) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Data de Encerramento Prevista</p>
            <p className="font-medium text-gray-700">{projeto ? fmtDate(String(projeto.dataEncerramento)) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Data de Conclusão Real</p>
            <p className="font-bold text-gray-800">{fmtDate(consol.dataConclusaoReal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Local de Realização</p>
            <p className="font-medium text-gray-700">{[projeto?.cidadeRealizacao, projeto?.estadoRealizacao, projeto?.paisRealizacao].filter(Boolean).join(' — ') || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nº Estimado de Voluntários</p>
            <p className="font-medium text-gray-700">{projeto?.numeroVoluntarios ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Orçamento Estimado</p>
            <p className="font-bold text-gray-800">{fmt(projeto?.orcamentoEstimado ?? 0)}</p>
          </div>
          {orcamentoRealizado > 0 && (
            <>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Orçamento Realizado (Receitas)</p>
                <p className="font-bold text-emerald-700">{fmt(orcamentoRealizado)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo do Orçamento</p>
                <p className={`font-bold text-lg ${(projeto?.orcamentoEstimado ?? 0) - orcamentoRealizado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmt((projeto?.orcamentoEstimado ?? 0) - orcamentoRealizado)}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* SEÇÃO II - NARRATIVA */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">II</span>
          Preenchida pelo Responsável pelo Projeto
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Considerações sobre o Projeto', value: consol.consideracoes },
            { label: 'Pendências Estratégicas, Táticas e Operacionais', value: consol.pendencias },
            { label: 'Ações Positivas além do Escopo', value: consol.acoesPositivas },
            { label: 'Lições Aprendidas com o Projeto', value: consol.licoesAprendidas },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
              <p className="text-gray-700 whitespace-pre-wrap min-h-[40px]">{value || <span className="text-gray-300 italic">Não preenchido</span>}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO III - FINANCEIRO */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">III</span>
          Financeiro do Projeto
        </h3>
        <div className={`rounded-xl p-5 border-2 ${consol.saldoPositivo ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-2xl font-bold ${consol.saldoPositivo ? 'text-green-700' : 'text-red-700'}`}>
              {consol.saldoPositivo ? '✅ Saldo Positivo' : '⚠️ Saldo Negativo — Ajuste Necessário'}
            </span>
          </div>
          {!consol.saldoPositivo && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Operador/Tesoureiro do Ajuste</p>
                <p className="font-semibold text-gray-800">{consol.nomeOperador || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">CPF do Operador</p>
                <p className="font-semibold text-gray-800">{consol.cpfOperador || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Método de Pagamento</p>
                <p className="font-semibold text-gray-800">{metodo?.nome || consol.metodoAjuste || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Valor do Ajuste</p>
                <p className="font-bold text-red-700 text-lg">{consol.valorAjuste ? fmt(consol.valorAjuste) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Conta Receptora</p>
                <p className="font-semibold text-gray-800">{conta ? `${conta.tipo} | Ag ${conta.agencia} | Cta ${conta.numeroConta}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Data Limite do Ajuste</p>
                <p className="font-semibold text-gray-800">{fmtDate(consol.dataLimiteAjuste)}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <div className="mt-10 pt-6 border-t-2 border-gray-200">
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <div className="border-t border-gray-400 mt-12 pt-2">
              <p className="text-sm text-gray-600">{projeto?.responsavel || 'Responsável pelo Projeto'}</p>
              <p className="text-xs text-gray-400">Responsável pelo Projeto</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 mt-12 pt-2">
              <p className="text-sm text-gray-600">{consol.nomeOperador || 'Tesoureiro / Operador Financeiro'}</p>
              <p className="text-xs text-gray-400">Tesoureiro / Operador Financeiro</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          AMO Gestão — Associação Missionária Ômega · Relatório gerado automaticamente em {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}

export default function RelatorioProjetoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>}>
      <RelatorioContent />
    </Suspense>
  )
}
