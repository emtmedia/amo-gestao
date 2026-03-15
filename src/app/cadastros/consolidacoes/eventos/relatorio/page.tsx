'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface ConsolData {
  id: string; eventoId: string; projetoId: string; dataConclusaoReal: string
  consideracoes: string; pendencias: string; acoesPositivas: string; licoesAprendidas: string
  saldoOrcamento: number | null; nomeOperador: string; cpfOperador: string
  metodoAjuste: string; valorAjuste: number; contaReceptoraId: string; dataLimiteAjuste: string
  arquivosReferencia: string; createdAt: string
}
interface Evento {
  id: string; nome: string; responsavel: string; emailResponsavel: string; telefoneResponsavel: string
  dataInicio: string; dataEncerramento: string; orcamentoEstimado: number
  estadoRealizacao: string; cidadeRealizacao: string; paisRealizacao: string
  numeroVoluntarios: number; projetoVinculadoId: string; arquivosReferencia: string | null
}
interface FileEntry { name: string; url: string; size?: number; type?: string }
function parseFiles(json: string | null | undefined): FileEntry[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}
function FileList({ files, emptyMsg }: { files: FileEntry[]; emptyMsg?: string }) {
  if (!files.length) return emptyMsg ? <p className="text-xs text-gray-400 italic">{emptyMsg}</p> : null
  return (
    <ul className="space-y-1.5">
      {files.map((f, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <span>📎</span>
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{f.name}</a>
          {f.size ? <span className="text-xs text-gray-400 flex-shrink-0">({(f.size / 1024).toFixed(0)} KB)</span> : null}
        </li>
      ))}
    </ul>
  )
}
interface Projeto { id: string; nome: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Financeiro {
  receitas: { total: number; breakdown: Record<string, number> }
  despesas: { total: number; breakdown: Record<string, number> }
  saldo: number
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

function BreakdownTable({ title, data, total, color }: {
  title: string; data: Record<string, number>; total: number; color: 'green' | 'red'
}) {
  const rows = Object.entries(data).filter(([, v]) => v > 0)
  if (rows.length === 0) return (
    <div className={`rounded-xl p-4 border ${color === 'green' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>{title}</p>
      <p className="text-xs text-gray-400 italic">Nenhum registro encontrado</p>
      <p className={`mt-2 font-bold text-sm ${color === 'green' ? 'text-green-800' : 'text-red-800'}`}>Total: {fmt(0)}</p>
    </div>
  )
  return (
    <div className={`rounded-xl p-4 border ${color === 'green' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>{title}</p>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="py-0.5 text-gray-600 pr-2">{label}</td>
              <td className={`py-0.5 text-right font-medium tabular-nums ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>{fmt(value)}</td>
            </tr>
          ))}
          <tr className={`border-t mt-1 ${color === 'green' ? 'border-green-300' : 'border-red-300'}`}>
            <td className={`pt-1.5 font-bold ${color === 'green' ? 'text-green-800' : 'text-red-800'}`}>Total</td>
            <td className={`pt-1.5 text-right font-bold tabular-nums ${color === 'green' ? 'text-green-800' : 'text-red-800'}`}>{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RelatorioContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [consol, setConsol] = useState<ConsolData | null>(null)
  const [evento, setEvento] = useState<Evento | null>(null)
  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [financeiro, setFinanceiro] = useState<Financeiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) { setError('ID não informado'); setLoading(false); return }
    Promise.all([
      fetch(`/api/consolidacoes-evento/${id}`).then(r => r.json()),
      fetch('/api/contas-bancarias').then(r => r.json()),
      fetch('/api/auxiliares?tipo=metodos').then(r => r.json()),
    ]).then(([jc, jcb, jm]) => {
      if (jc.success) {
        setConsol(jc.data)
        if (jc.data.eventoId) {
          const eventoId = jc.data.eventoId
          Promise.all([
            fetch(`/api/eventos/${eventoId}`).then(r => r.json()),
            fetch(`/api/relatorio/financeiro-evento?eventoId=${eventoId}`).then(r => r.json()).catch(() => null),
          ]).then(([je, jf]) => {
            if (je.success) {
              setEvento(je.data)
              if (je.data.projetoVinculadoId) {
                fetch(`/api/projetos/${je.data.projetoVinculadoId}`).then(r => r.json()).then(jp => {
                  if (jp.success) setProjeto(jp.data)
                })
              }
            }
            if (jf?.success) setFinanceiro(jf)
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
  const saldoPositivo = consol.saldoOrcamento === null || consol.saldoOrcamento === undefined ? true : consol.saldoOrcamento >= 0
  const ajuste = consol.valorAjuste || 0
  const saldoFinal = financeiro ? financeiro.saldo + ajuste : null

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto print:p-4">
      {/* Print button */}
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

      {/* HEADER */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl">🕊️</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Associação Missionária Ômega</h1>
            <p className="text-sm text-gray-500">Sistema de Gestão AMO</p>
          </div>
        </div>
        <div className="mt-4 bg-gray-100 rounded-lg px-6 py-3 inline-block">
          <h2 className="text-xl font-bold text-gray-700 uppercase tracking-wide">Relatório Final de Evento</h2>
          <p className="text-xs text-gray-400 mt-1">Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      {/* SEÇÃO I */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">I</span>
          Informações do Evento
        </h3>
        <div className="bg-gray-50 rounded-xl p-5 grid grid-cols-2 gap-4">
          {projeto && (
            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <p className="text-xs text-blue-500 uppercase tracking-wide">Projeto Vinculado</p>
              <p className="font-semibold text-blue-800">{projeto.nome}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nome do Evento</p>
            <p className="text-lg font-bold text-gray-800">{evento?.nome || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Responsável</p>
            <p className="font-medium text-gray-700">{evento?.responsavel || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Contato</p>
            <p className="font-medium text-gray-700">{evento?.telefoneResponsavel || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Data de Início</p>
            <p className="font-medium text-gray-700">{evento ? fmtDate(String(evento.dataInicio)) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Data de Encerramento Prevista</p>
            <p className="font-medium text-gray-700">{evento ? fmtDate(String(evento.dataEncerramento)) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Data de Conclusão Real</p>
            <p className="font-bold text-gray-800">{fmtDate(consol.dataConclusaoReal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Local de Realização</p>
            <p className="font-medium text-gray-700">{[evento?.cidadeRealizacao, evento?.estadoRealizacao, evento?.paisRealizacao].filter(Boolean).join(' — ') || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Nº Estimado de Voluntários</p>
            <p className="font-medium text-gray-700">{evento?.numeroVoluntarios ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Orçamento Estimado</p>
            <p className="font-bold text-gray-800">{fmt(evento?.orcamentoEstimado ?? 0)}</p>
          </div>
        </div>
      </section>

      {/* SEÇÃO II */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">II</span>
          Preenchida pelo Responsável pelo Evento
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Considerações sobre o Evento', value: consol.consideracoes },
            { label: 'Pendências Estratégicas, Táticas e Operacionais', value: consol.pendencias },
            { label: 'Ações Positivas além do Escopo', value: consol.acoesPositivas },
            { label: 'Lições Aprendidas com o Evento', value: consol.licoesAprendidas },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</p>
              <p className="text-gray-700 whitespace-pre-wrap min-h-[40px]">{value || <span className="text-gray-300 italic">Não preenchido</span>}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO III — FINANCEIRO */}
      <section className="mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">III</span>
          Financeiro do Evento
        </h3>

        {/* Breakdown receitas x despesas */}
        {financeiro && (
          <div className="mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BreakdownTable title="Receitas" data={financeiro.receitas.breakdown} total={financeiro.receitas.total} color="green" />
              <BreakdownTable title="Despesas" data={financeiro.despesas.breakdown} total={financeiro.despesas.total} color="red" />
            </div>

            {/* Saldo operacional */}
            <div className={`flex items-center justify-between px-5 py-3 rounded-xl border-2 ${financeiro.saldo >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
              <span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Saldo Operacional (Receitas − Despesas)</span>
              <span className={`font-bold text-xl tabular-nums ${financeiro.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(financeiro.saldo)}</span>
            </div>

            {/* Ajuste e saldo final */}
            {ajuste > 0 && (
              <>
                <div className="flex items-center justify-between px-5 py-3 rounded-xl border border-amber-300 bg-amber-50">
                  <span className="font-medium text-gray-700 text-sm">Ajuste de Consolidação</span>
                  <span className="font-bold text-amber-700 tabular-nums">+ {fmt(ajuste)}</span>
                </div>
                {saldoFinal !== null && (
                  <div className={`flex items-center justify-between px-5 py-3 rounded-xl border-2 font-bold ${saldoFinal >= 0 ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'}`}>
                    <span className="text-sm uppercase tracking-wide">Saldo Final</span>
                    <span className="text-xl tabular-nums">{fmt(saldoFinal)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Resultado consolidação */}
        <div className={`rounded-xl p-5 border-2 ${saldoPositivo ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-2xl font-bold ${saldoPositivo ? 'text-green-700' : 'text-red-700'}`}>
              {saldoPositivo ? '✅ Saldo Positivo' : '⚠️ Saldo Negativo — Ajuste Necessário'}
            </span>
          </div>
          {!saldoPositivo && (
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

      {/* SEÇÃO IV — ARQUIVOS ANEXOS */}
      {(() => {
        const consolFiles = parseFiles(consol.arquivosReferencia)
        const eventoFiles = parseFiles(evento?.arquivosReferencia ?? null)
        const total = consolFiles.length + eventoFiles.length
        if (total === 0) return null
        return (
          <section className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold">IV</span>
              Arquivos Anexos
            </h3>
            <div className="border border-gray-200 rounded-xl p-5 space-y-4">
              {eventoFiles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Arquivos do Evento</p>
                  <FileList files={eventoFiles} />
                </div>
              )}
              {consolFiles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Arquivos da Consolidação</p>
                  <FileList files={consolFiles} />
                </div>
              )}
            </div>
          </section>
        )
      })()}

      {/* FOOTER */}
      <div className="mt-10 pt-6 border-t-2 border-gray-200">
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <div className="border-t border-gray-400 mt-12 pt-2">
              <p className="text-sm text-gray-600">{evento?.responsavel || 'Responsável pelo Evento'}</p>
              <p className="text-xs text-gray-400">Responsável pelo Evento</p>
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

export default function RelatorioEventoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>}>
      <RelatorioContent />
    </Suspense>
  )
}
