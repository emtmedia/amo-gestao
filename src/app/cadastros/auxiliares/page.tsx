'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, Settings2, Check, X, AlertTriangle, ShieldAlert } from 'lucide-react'

interface Item { id: string; nome: string }

const TABS = [
  { key: 'cargos',              label: 'Cargos',                    api: '/api/auxiliares/cargos' },
  { key: 'funcoes',             label: 'Funções',                   api: '/api/auxiliares/funcoes' },
  { key: 'funcoes-cargo',       label: 'Funções de Voluntários',    api: '/api/auxiliares/funcoes-cargo' },
  { key: 'cursos',              label: 'Cursos/Treinamentos',       api: '/api/auxiliares/cursos' },
  { key: 'produtos',            label: 'Produtos',                  api: '/api/auxiliares/produtos' },
  { key: 'servicos',            label: 'Serviços',                  api: '/api/auxiliares/servicos' },
  { key: 'condicoes-receita',   label: 'Condições de Receita',      api: '/api/auxiliares/condicoes-receita' },
  { key: 'tipos-imovel',        label: 'Tipos de Imóvel',           api: '/api/auxiliares/tipos-imovel' },
  { key: 'locado-para',         label: 'Locado Para',               api: '/api/auxiliares/locado-para' },
  { key: 'propositos-locacao',  label: 'Propósitos de Locação',     api: '/api/auxiliares/propositos-locacao' },
  { key: 'condicoes-benfeitoria', label: 'Condições de Benfeitoria', api: '/api/auxiliares/condicoes-benfeitoria' },
  { key: 'tipos-servico-consumo',   label: 'Tipos de Consumo',      api: '/api/auxiliares/tipos-servico-consumo' },
  { key: 'tipos-servico-digital',   label: 'Serviços Digitais',     api: '/api/auxiliares/tipos-servico-digital' },
  { key: 'tipos-servico-manutencao', label: 'Tipos de Manutenção',  api: '/api/auxiliares/tipos-servico-manutencao' },
  { key: 'itens-alugados',      label: 'Itens Alugados',            api: '/api/auxiliares/itens-alugados' },
  { key: 'servicos-prestados',  label: 'Serviços Externos',         api: '/api/auxiliares/servicos-prestados' },
  { key: 'itens-copa',          label: 'Itens Copa/Cozinha',        api: '/api/auxiliares/itens-copa' },
  { key: 'tipos-item-aquisicao', label: 'Tipos de Aquisição',      api: '/api/auxiliares/tipos-item-aquisicao' },
  { key: 'categorias-documentos', label: 'Categorias de Documentos', api: '/api/documentos-amo/categorias' },
]

function AuxiliaresPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const validTab = TABS.find(t => t.key === initialTab)?.key || TABS[0].key
  const [activeTab, setActiveTab] = useState(validTab)
  const [items, setItems] = useState<Record<string, Item[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [newNome, setNewNome] = useState('')
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; nome: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const currentTab = TABS.find(t => t.key === activeTab)!

  const fetchTab = useCallback(async (key: string) => {
    const tab = TABS.find(t => t.key === key)
    if (!tab) return
    setLoading(p => ({ ...p, [key]: true }))
    try {
      const r = await fetch(tab.api)
      const j = await r.json()
      if (j.success) setItems(p => ({ ...p, [key]: j.data }))
    } finally {
      setLoading(p => ({ ...p, [key]: false }))
    }
  }, [])

  useEffect(() => {
    if (!items[activeTab]) fetchTab(activeTab)
  }, [activeTab, items, fetchTab])

  const handleAdd = async () => {
    if (!newNome.trim()) { showToast('Digite um nome', 'error'); return }
    setSaving(true)
    try {
      const r = await fetch(currentTab.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: newNome.trim() }) })
      const j = await r.json()
      if (j.success) { showToast('Item adicionado!'); setNewNome(''); setAdding(false); fetchTab(activeTab) }
      else showToast(j.error || 'Erro ao adicionar', 'error')
    } finally { setSaving(false) }
  }

  const handleEdit = async (id: string) => {
    if (!editingNome.trim()) { showToast('Nome não pode ser vazio', 'error'); return }
    setSaving(true)
    try {
      const r = await fetch(`${currentTab.api}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: editingNome.trim() }) })
      const j = await r.json()
      if (j.success) { showToast('Atualizado!'); setEditingId(null); fetchTab(activeTab) }
      else showToast(j.error || 'Erro ao atualizar', 'error')
    } finally { setSaving(false) }
  }


  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`${currentTab.api}/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Removido!'); setDeleteConfirm(null); fetchTab(activeTab) }
      else { setDeleteConfirm(null); setBlockError(j.error || 'Erro ao remover') }
    } catch { setDeleteConfirm(null); setBlockError('Erro ao remover') }
  }

  const currentItems = items[activeTab] || []
  const isLoading = loading[activeTab]

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <Settings2 className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Tabelas Auxiliares</h1>
            <p className="text-sm text-navy-400">Gerencie as listas de opções do sistema</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-1 mb-6 pb-4 border-b border-cream-200">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setAdding(false); setEditingId(null); setNewNome('') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-navy-700 text-white shadow-sm'
                  : 'bg-cream-100 text-navy-600 hover:bg-cream-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-navy-700">{currentTab.label}</h2>
            <p className="text-xs text-navy-400">{currentItems.length} itens</p>
          </div>
          {!adding && (
            <button
              onClick={() => { setAdding(true); setEditingId(null); setNewNome('') }}
              className="btn-primary text-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          )}
        </div>

        {adding && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-cream-50 rounded-xl border border-cream-200">
            <input
              type="text"
              placeholder={`Nome para ${currentTab.label}...`}
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewNome('') } }}
              className="form-input flex-1 py-2 text-sm"
              autoFocus
            />
            <button onClick={handleAdd} disabled={saving} className="btn-primary text-sm px-3 py-2">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setAdding(false); setNewNome('') }} className="btn-secondary text-sm px-3 py-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-navy-400">Carregando...</div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-8 text-navy-400">
            <p className="text-sm">Nenhum item cadastrado.</p>
            <p className="text-xs mt-1">Clique em &quot;Novo&quot; para adicionar o primeiro.</p>
          </div>
        ) : (
          <div className="divide-y divide-cream-100">
            {currentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2.5 px-1 hover:bg-cream-50 rounded-lg transition-colors group">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingNome}
                      onChange={e => setEditingNome(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                      className="form-input flex-1 py-1.5 text-sm"
                      autoFocus
                    />
                    <button onClick={() => handleEdit(item.id)} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-navy-700">{item.nome}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(item.id); setEditingNome(item.nome); setAdding(false) }}
                        className="p-1.5 rounded-lg hover:bg-cream-200 text-navy-500 hover:text-navy-700 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: item.id, nome: item.nome })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-navy-400 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-cream-50 rounded-xl border border-cream-200">
        <p className="text-xs text-navy-500">
          💡 <strong>Dica:</strong> Estas tabelas alimentam os menus suspensos de todo o sistema.
          Alterações são refletidas imediatamente em todos os formulários.
          Pressione <kbd className="px-1 py-0.5 bg-white border border-cream-300 rounded text-xs">Enter</kbd> para salvar ou <kbd className="px-1 py-0.5 bg-white border border-cream-300 rounded text-xs">Esc</kbd> para cancelar.
        </p>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800">Confirmar Exclusão</h3>
                <p className="text-sm text-navy-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-navy-600 bg-cream-50 rounded-xl px-4 py-3 mb-5">
              Excluir o item <strong>"{deleteConfirm.nome}"</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Block error modal — shown when item is in use */}
      {blockError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800">Exclusão Bloqueada</h3>
                <p className="text-sm text-navy-500 mt-0.5">Este item está vinculado a registros existentes.</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <pre className="text-sm text-amber-900 whitespace-pre-wrap font-sans leading-relaxed">{blockError}</pre>
            </div>
            <p className="text-xs text-navy-400 mb-5">
              Para excluir este item, primeiro edite ou remova os registros listados acima, depois tente novamente.
            </p>
            <div className="flex justify-end">
              <button onClick={() => setBlockError(null)} className="btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AuxiliaresPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-navy-400">Carregando...</div>}>
      <AuxiliaresPageInner />
    </Suspense>
  )
}
