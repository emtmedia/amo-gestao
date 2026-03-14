'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Building2, Plus, Trash2, RefreshCw, Download, Search, ChevronDown } from 'lucide-react'

interface UF { id: string; codigo: string; nome: string; _count?: { cidades: number } }
interface Cidade { id: string; nome: string; ufId: string; uf?: { codigo: string; nome: string } }

export default function UFCidadesPage() {
  const [tab, setTab] = useState<'uf' | 'cidades'>('uf')
  const [ufs, setUfs] = useState<UF[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [searchUF, setSearchUF] = useState('')
  const [searchCidade, setSearchCidade] = useState('')
  const [filterUfId, setFilterUfId] = useState('')
  const [novaUF, setNovaUF] = useState({ codigo: '', nome: '' })
  const [novaCidade, setNovaCidade] = useState({ nome: '', ufId: '' })
  const [showFormUF, setShowFormUF] = useState(false)
  const [showFormCidade, setShowFormCidade] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const notify = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadUFs = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/uf')
      const d = await r.json()
      if (d.success) setUfs(d.data)
    } finally { setLoading(false) }
  }, [])

  const loadCidades = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterUfId ? `/api/cidades?ufId=${filterUfId}` : '/api/cidades'
      const r = await fetch(url)
      const d = await r.json()
      if (d.success) setCidades(d.data)
    } finally { setLoading(false) }
  }, [filterUfId])

  useEffect(() => { loadUFs() }, [loadUFs])
  useEffect(() => { if (tab === 'cidades') loadCidades() }, [tab, loadCidades])

  const seedUFs = async () => {
    setSeeding(true)
    try {
      const r = await fetch('/api/uf/seed', { method: 'POST' })
      const d = await r.json()
      if (d.success) {
        notify('ok', `✅ ${d.criadas} UFs criadas, ${d.existentes} já existiam.`)
        loadUFs()
      } else notify('err', d.error || 'Erro ao popular UFs')
    } finally { setSeeding(false) }
  }

  const importCidadesIBGE = async () => {
    if (!filterUfId) { notify('err', 'Selecione uma UF antes de importar cidades'); return }
    const uf = ufs.find(u => u.id === filterUfId)
    if (!uf) return
    setImporting(true)
    try {
      // 1. Busca todos os municípios do IBGE em uma só chamada
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.codigo}/municipios`)
      const municipios: { nome: string }[] = await r.json()

      // 2. Monta o array completo de cidades
      const payload = municipios.map(m => ({ nome: m.nome, ufId: filterUfId }))

      // 3. Envia tudo de uma vez para o endpoint bulk (um único INSERT no banco)
      const res = await fetch('/api/cidades/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidades: payload })
      })
      const d = await res.json()
      if (d.success) {
        notify('ok', `✅ ${d.count} cidades importadas do IBGE para ${uf.nome}!`)
        loadCidades()
      } else {
        notify('err', d.error || 'Erro ao importar cidades')
      }
    } catch {
      notify('err', 'Erro ao importar cidades do IBGE. Verifique sua conexão.')
    } finally { setImporting(false) }
  }

  const criarUF = async () => {
    if (!novaUF.codigo.trim() || !novaUF.nome.trim()) { notify('err', 'Preencha código e nome da UF'); return }
    try {
      const r = await fetch('/api/uf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: novaUF.codigo.toUpperCase().trim(), nome: novaUF.nome.trim() })
      })
      const d = await r.json()
      if (d.success) { notify('ok', 'UF criada com sucesso!'); setNovaUF({ codigo: '', nome: '' }); setShowFormUF(false); loadUFs() }
      else notify('err', d.error || 'Erro ao criar UF')
    } catch { notify('err', 'Erro de conexão') }
  }

  const criarCidade = async () => {
    if (!novaCidade.nome.trim() || !novaCidade.ufId) { notify('err', 'Preencha nome e selecione a UF'); return }
    try {
      const r = await fetch('/api/cidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaCidade.nome.trim(), ufId: novaCidade.ufId })
      })
      const d = await r.json()
      if (d.success) { notify('ok', 'Cidade criada com sucesso!'); setNovaCidade({ nome: '', ufId: '' }); setShowFormCidade(false); loadCidades() }
      else notify('err', d.error || 'Erro ao criar cidade')
    } catch { notify('err', 'Erro de conexão') }
  }

  const deletarUF = async (id: string) => {
    if (!confirm('Deletar esta UF? Todas as cidades vinculadas também serão removidas.')) return
    setDeletingId(id)
    try {
      const r = await fetch(`/api/uf/${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.success) { notify('ok', 'UF removida!'); loadUFs() }
      else notify('err', d.error || 'Erro ao deletar')
    } finally { setDeletingId(null) }
  }

  const deletarCidade = async (id: string) => {
    if (!confirm('Deletar esta cidade?')) return
    setDeletingId(id)
    try {
      const r = await fetch(`/api/cidades/${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (d.success) { notify('ok', 'Cidade removida!'); loadCidades() }
      else notify('err', d.error || 'Erro ao deletar')
    } finally { setDeletingId(null) }
  }

  const ufsFiltered = ufs.filter(u =>
    u.nome.toLowerCase().includes(searchUF.toLowerCase()) ||
    u.codigo.toLowerCase().includes(searchUF.toLowerCase())
  )

  const cidadesFiltered = cidades.filter(c =>
    c.nome.toLowerCase().includes(searchCidade.toLowerCase())
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-700 flex items-center gap-2">
          <MapPin className="w-6 h-6" /> UF &amp; Cidades
        </h1>
        <p className="text-navy-400 text-sm mt-1">Gerencie as Unidades da Federação e seus municípios</p>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${msg.type === 'ok' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-cream-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('uf')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'uf' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400 hover:text-navy-600'}`}>
          <Building2 className="w-4 h-4" /> Unidades da Federação
          <span className="bg-navy-100 text-navy-600 text-xs px-2 py-0.5 rounded-full">{ufs.length}</span>
        </button>
        <button onClick={() => setTab('cidades')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'cidades' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400 hover:text-navy-600'}`}>
          <MapPin className="w-4 h-4" /> Cidades
          <span className="bg-navy-100 text-navy-600 text-xs px-2 py-0.5 rounded-full">{cidades.length}</span>
        </button>
      </div>

      {/* ============ ABA UF ============ */}
      {tab === 'uf' && (
        <div>
          {/* Actions bar */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
              <input value={searchUF} onChange={e => setSearchUF(e.target.value)}
                placeholder="Buscar UF..." className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <button onClick={seedUFs} disabled={seeding}
              className="btn-secondary flex items-center gap-2 text-sm py-2">
              <RefreshCw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Populando...' : 'Popular 27 UFs do Brasil'}
            </button>
            <button onClick={() => setShowFormUF(!showFormUF)}
              className="btn-primary flex items-center gap-2 text-sm py-2">
              <Plus className="w-4 h-4" /> Nova UF
            </button>
          </div>

          {/* Form nova UF */}
          {showFormUF && (
            <div className="mb-4 p-4 bg-white border border-cream-200 rounded-xl shadow-sm">
              <h3 className="font-semibold text-navy-600 mb-3 text-sm">Nova Unidade da Federação</h3>
              <div className="flex gap-3">
                <input value={novaUF.codigo} onChange={e => setNovaUF(p => ({ ...p, codigo: e.target.value.slice(0,2).toUpperCase() }))}
                  placeholder="Sigla (ex: MG)" maxLength={2} className="input-field py-2 text-sm w-24 uppercase" />
                <input value={novaUF.nome} onChange={e => setNovaUF(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome completo (ex: Minas Gerais)" className="input-field py-2 text-sm flex-1" />
                <button onClick={criarUF} className="btn-primary text-sm py-2 px-4">Salvar</button>
                <button onClick={() => setShowFormUF(false)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              </div>
            </div>
          )}

          {/* UFs grid */}
          {loading ? (
            <div className="text-center py-12 text-navy-400">Carregando...</div>
          ) : ufsFiltered.length === 0 ? (
            <div className="text-center py-12 text-navy-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma UF cadastrada</p>
              <p className="text-sm mt-1">Clique em "Popular 27 UFs do Brasil" para importar todas automaticamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {ufsFiltered.map(uf => (
                <div key={uf.id} className="bg-white border border-cream-200 rounded-xl p-4 hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-2xl font-bold text-navy-700">{uf.codigo}</span>
                      <p className="text-xs text-navy-400 mt-1 leading-tight">{uf.nome}</p>
                    </div>
                    <button onClick={() => deletarUF(uf.id)} disabled={deletingId === uf.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ ABA CIDADES ============ */}
      {tab === 'cidades' && (
        <div>
          {/* Actions */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative w-52">
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300 pointer-events-none" />
              <select value={filterUfId} onChange={e => setFilterUfId(e.target.value)}
                className="input-field py-2 text-sm w-full appearance-none pr-8">
                <option value="">Todas as UFs</option>
                {ufs.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>)}
              </select>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
              <input value={searchCidade} onChange={e => setSearchCidade(e.target.value)}
                placeholder="Buscar cidade..." className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <button onClick={importCidadesIBGE} disabled={importing || !filterUfId}
              title={!filterUfId ? 'Selecione uma UF primeiro' : 'Importar municípios do IBGE'}
              className="btn-secondary flex items-center gap-2 text-sm py-2 disabled:opacity-50">
              <Download className={`w-4 h-4 ${importing ? 'animate-bounce' : ''}`} />
              {importing ? 'Importando...' : 'Importar do IBGE'}
            </button>
            <button onClick={() => setShowFormCidade(!showFormCidade)}
              className="btn-primary flex items-center gap-2 text-sm py-2">
              <Plus className="w-4 h-4" /> Nova Cidade
            </button>
          </div>

          {/* Form nova cidade */}
          {showFormCidade && (
            <div className="mb-4 p-4 bg-white border border-cream-200 rounded-xl shadow-sm">
              <h3 className="font-semibold text-navy-600 mb-3 text-sm">Nova Cidade</h3>
              <div className="flex gap-3">
                <select value={novaCidade.ufId} onChange={e => setNovaCidade(p => ({ ...p, ufId: e.target.value }))}
                  className="input-field py-2 text-sm w-48">
                  <option value="">Selecione a UF</option>
                  {ufs.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>)}
                </select>
                <input value={novaCidade.nome} onChange={e => setNovaCidade(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome da cidade" className="input-field py-2 text-sm flex-1" />
                <button onClick={criarCidade} className="btn-primary text-sm py-2 px-4">Salvar</button>
                <button onClick={() => setShowFormCidade(false)} className="btn-secondary text-sm py-2 px-4">Cancelar</button>
              </div>
            </div>
          )}

          {/* Info box */}
          {ufs.length > 0 && !filterUfId && cidades.length === 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              💡 <strong>Dica:</strong> Selecione uma UF e clique em <strong>"Importar do IBGE"</strong> para importar automaticamente todos os municípios daquela UF diretamente da API do IBGE.
            </div>
          )}

          {/* Cidades list */}
          {loading ? (
            <div className="text-center py-12 text-navy-400">Carregando...</div>
          ) : cidadesFiltered.length === 0 ? (
            <div className="text-center py-12 text-navy-400">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma cidade encontrada</p>
              {filterUfId && <p className="text-sm mt-1">Clique em "Importar do IBGE" para importar os municípios desta UF.</p>}
            </div>
          ) : (
            <div>
              <p className="text-xs text-navy-400 mb-3">{cidadesFiltered.length} cidade(s) encontrada(s)</p>
              <div className="bg-white border border-cream-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50 border-b border-cream-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-navy-500 font-medium">Cidade</th>
                      <th className="text-left px-4 py-3 text-navy-500 font-medium w-32">UF</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-100">
                    {cidadesFiltered.slice(0, 200).map(c => (
                      <tr key={c.id} className="hover:bg-cream-50 group transition-colors">
                        <td className="px-4 py-2.5 text-navy-700">{c.nome}</td>
                        <td className="px-4 py-2.5">
                          <span className="bg-navy-100 text-navy-600 text-xs px-2 py-0.5 rounded-full font-medium">
                            {c.uf?.codigo || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => deletarCidade(c.id)} disabled={deletingId === c.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cidadesFiltered.length > 200 && (
                  <div className="px-4 py-2 text-xs text-navy-400 bg-cream-50 border-t border-cream-200">
                    Exibindo 200 de {cidadesFiltered.length} cidades. Use o filtro para refinar.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
