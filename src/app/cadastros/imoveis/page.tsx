'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Home } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'

interface Contrato { [key: string]: unknown; id: string; nomeLocador: string; rua: string; bairro: string; valorLocacao: number; dataInicio: string }
interface UF      { id: string; codigo: string; nome: string }
interface Cidade  { id: string; nome: string; ufId: string }
interface Opcao   { id: string; nome: string }

const DURACOES = [1, 2, 3, 6, 12, 24, 36, 48, 72]

const emptyForm = {
  tipoImovel: '', locadoPara: '', cep: '', rua: '', numero: '',
  complemento: '', bairro: '', ufId: '', cidadeId: '',
  nomeLocador: '', dataInicio: '', valorLocacao: '', duracaoMeses: '12',
  proposito: '', condicoesBenfeitoria: '', observacoes: '', arquivosReferencia: ''
}

export default function ImoveisPage() {
  const [data,              setData]              = useState<Contrato[]>([])
  const [ufs,               setUfs]               = useState<UF[]>([])
  const [cidades,           setCidades]           = useState<Cidade[]>([])
  const [cidadesLoading,    setCidadesLoading]    = useState(false)
  const [tiposImovel,       setTiposImovel]       = useState<Opcao[]>([])
  const [locadoParaOpts,    setLocadoParaOpts]    = useState<Opcao[]>([])
  const [propositoOpts,     setPropositoOpts]     = useState<Opcao[]>([])
  const [benfeitoriaOpts,   setBenfeitoriaOpts]   = useState<Opcao[]>([])
  const [loading,           setLoading]           = useState(true)
  const [modalOpen,         setModalOpen]         = useState(false)
  const [editing,           setEditing]           = useState<Contrato | null>(null)
  const [form,              setForm]              = useState(emptyForm)
  const [saving,            setSaving]            = useState(false)
  const [deleteConfirm,     setDeleteConfirm]     = useState<string | null>(null)
  const [toast,             setToast]             = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert,        setModalAlert]        = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, ru, rt, rl, rp, rb] = await Promise.all([
        fetch('/api/contratos-locacao'),
        fetch('/api/uf'),
        fetch('/api/auxiliares/tipos-imovel'),
        fetch('/api/auxiliares/locado-para'),
        fetch('/api/auxiliares/propositos-locacao'),
        fetch('/api/auxiliares/condicoes-benfeitoria'),
      ])
      const [jd, ju, jt, jl, jp, jb] = await Promise.all([rd.json(), ru.json(), rt.json(), rl.json(), rp.json(), rb.json()])
      if (jd.success) setData(jd.data)
      if (ju.success) setUfs(ju.data)
      if (jt.success) setTiposImovel(jt.data)
      if (jl.success) setLocadoParaOpts(jl.data)
      if (jp.success) setPropositoOpts(jp.data)
      if (jb.success) setBenfeitoriaOpts(jb.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Cascata UF → Cidade ───────────────────────────────────────────────────
  const fetchCidades = useCallback(async (ufId: string) => {
    if (!ufId) { setCidades([]); return }
    setCidadesLoading(true)
    try {
      const r = await fetch(`/api/cidades?ufId=${ufId}`)
      const j = await r.json()
      if (j.success) setCidades(j.data)
      else setCidades([])
    } finally { setCidadesLoading(false) }
  }, [])

  const onUfChange = (ufId: string) => {
    setForm(p => ({ ...p, ufId, cidadeId: '' }))
    fetchCidades(ufId)
  }

  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtDate  = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setCidades([]); setModalAlert(null); setModalOpen(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Contrato)
    const ufId = String(row.ufId || '')
    setForm({
      tipoImovel:          String(row.tipoImovelId         || ''),
      locadoPara:          String(row.locadoParaId         || ''),
      cep:                 String(row.cep                  || ''),
      rua:                 String(row.rua                  || ''),
      numero:              String(row.numero               || ''),
      complemento:         String(row.complemento          || ''),
      bairro:              String(row.bairro               || ''),
      ufId,
      cidadeId:            String(row.cidadeId             || ''),
      nomeLocador:         String(row.nomeLocador          || ''),
      dataInicio:          row.dataInicio ? String(row.dataInicio).slice(0, 10) : '',
      valorLocacao:        String(row.valorLocacao         || ''),
      duracaoMeses:        String(row.duracaoContrataMeses || '12'),
      proposito:           String(row.propositoLocacaoId   || ''),
      condicoesBenfeitoria:String(row.condicoesBenfeitoriaId || ''),
      observacoes:         String(row.observacoes          || ''), arquivosReferencia: String(row.arquivosReferencia || ''),
    })
    if (ufId) fetchCidades(ufId)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const required = ['tipoImovel','locadoPara','rua','numero','bairro','ufId','cidadeId','nomeLocador','dataInicio','valorLocacao','proposito','condicoesBenfeitoria']
    if (required.some(k => !form[k as keyof typeof emptyForm])) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        tipoImovelId:          form.tipoImovel,
        locadoParaId:          form.locadoPara,
        cep:                   form.cep || null,
        rua:                   form.rua,
        numero:                form.numero,
        complemento:           form.complemento || null,
        bairro:                form.bairro,
        ufId:                  form.ufId,
        cidadeId:              form.cidadeId,
        nomeLocador:           form.nomeLocador,
        dataInicio:            new Date(form.dataInicio).toISOString(),
        valorLocacao:          parseBRL(form.valorLocacao),
        duracaoContrataMeses:  parseInt(form.duracaoMeses),
        propositoLocacaoId:    form.proposito,
        condicoesBenfeitoriaId:form.condicoesBenfeitoria,
        observacoes:           form.observacoes || null,
        arquivosReferencia: form.arquivosReferencia||null
      }
      const url = editing ? `/api/contratos-locacao/${editing.id}` : '/api/contratos-locacao'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Contrato atualizado!' : 'Contrato criado!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/contratos-locacao/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Contrato removido!'); setDeleteConfirm(null); fetchData() }
    } catch { showToast('Erro', 'error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type={type} placeholder={placeholder || label} value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )

  const sel = (key: keyof typeof emptyForm, label: string, options: Opcao[], required = false) => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </div>
  )

  const ufSelecionada = ufs.find(u => u.id === form.ufId)

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <Home className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Contratos de Locação Imobiliária</h1><p className="text-sm text-navy-400">{data.length} contrato(s)</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Contrato</button>
      </div>

      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable
            data={data}
            columns={[
              { key: 'nomeLocador',   label: 'Locador' },
              { key: 'tipoImovelId',  label: 'Tipo',         render: v => tiposImovel.find(t => t.id === String(v))?.nome || '—' },
              { key: 'rua',           label: 'Rua' },
              { key: 'numero',        label: 'Nº' },
              { key: 'bairro',        label: 'Bairro' },
              { key: 'ufId',          label: 'UF',           render: v => ufs.find(u => u.id === String(v))?.codigo || '—' },
              { key: 'valorLocacao',  label: 'Valor/Mês',    render: v => fmtMoney(Number(v)) },
              { key: 'dataInicio',    label: 'Início',       render: v => fmtDate(String(v)) },
              { key: 'duracaoContrataMeses', label: 'Duração (m)' },
            ]}
            onEdit={openEdit}
            onDelete={row => setDeleteConfirm(String(row.id))}
            searchKeys={['nomeLocador', 'rua', 'bairro']}
          />
        )}
      </div>

      {/* ── MODAL PRINCIPAL ─────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Contrato' : 'Novo Contrato de Locação'} size="xl" alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {sel('tipoImovel',          'Tipo de Imóvel',         tiposImovel,     true)}
          {sel('locadoPara',          'Locado Para',            locadoParaOpts,  true)}

          {/* ── ENDEREÇO ──────────────────────────────────────── */}
          <div className="md:col-span-2 border-t pt-3 mt-1">
            <p className="text-sm font-medium text-navy-600 mb-2">📍 Endereço do Imóvel</p>
          </div>

          {inp('cep',         'CEP',         false, 'text', '00000-000')}
          {inp('numero',      'Número',      true)}
          <div className="md:col-span-2">{inp('rua', 'Rua/Avenida', true)}</div>
          {inp('complemento', 'Complemento')}
          {inp('bairro',      'Bairro',      true)}

          {/* ── UF (cascata) ──────────────────────────────────── */}
          <div className="form-group">
            <label>Estado (UF)<span className="required-star">*</span></label>
            <select
              value={form.ufId}
              onChange={e => onUfChange(e.target.value)}
              className="form-input"
            >
              <option value="">Selecione a UF...</option>
              {ufs.sort((a, b) => a.codigo.localeCompare(b.codigo)).map(u => (
                <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>
              ))}
            </select>
          </div>

          {/* ── CIDADE (cascata) ──────────────────────────────── */}
          <div className="form-group">
            <label>Cidade<span className="required-star">*</span></label>
            <select
              value={form.cidadeId}
              onChange={e => setForm(p => ({ ...p, cidadeId: e.target.value }))}
              disabled={!form.ufId || cidadesLoading}
              className={`form-input ${(!form.ufId || cidadesLoading) ? 'opacity-50 cursor-not-allowed bg-cream-100' : ''}`}
            >
              <option value="">
                {cidadesLoading
                  ? 'Carregando cidades...'
                  : !form.ufId
                    ? 'Selecione a UF primeiro...'
                    : `Selecione a cidade${ufSelecionada ? ` de ${ufSelecionada.codigo}` : ''}...`}
              </option>
              {cidades.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            {form.ufId && !cidadesLoading && cidades.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Nenhuma cidade encontrada para esta UF.{' '}
                <a href="/cadastros/uf-cidades" target="_blank" className="underline font-medium hover:text-amber-800">
                  Importar cidades →
                </a>
              </p>
            )}
          </div>

          {/* ── DADOS DO CONTRATO ──────────────────────────────── */}
          <div className="md:col-span-2 border-t pt-3 mt-1">
            <p className="text-sm font-medium text-navy-600 mb-2">📄 Dados do Contrato</p>
          </div>

          {inp('nomeLocador',  'Nome do Locador',        true)}
          <DateInput label="Data de Início da Locação" required value={form.dataInicio} onChange={v=>setForm(p=>({...p,dataInicio:v}))}/>
          {<CurrencyInput label="Valor da Locação (R$)" required value={form.valorLocacao} onChange={v=>setForm(p=>({...p,valorLocacao:v}))}/>}

          <div className="form-group">
            <label>Duração do Contrato<span className="required-star">*</span></label>
            <select value={form.duracaoMeses} onChange={e => setForm(p => ({ ...p, duracaoMeses: e.target.value }))} className="form-input">
              {DURACOES.map(d => <option key={d} value={d}>{d} {d === 1 ? 'mês' : 'meses'}</option>)}
            </select>
          </div>

          {sel('proposito',           'Propósito de Locação',      propositoOpts,   true)}
          {sel('condicoesBenfeitoria','Condições de Benfeitoria',   benfeitoriaOpts, true)}

          <div className="md:col-span-2">
            <div className="form-group">
              <label>Observações</label>
              <textarea rows={2} value={form.observacoes}
                onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                className="form-input resize-none" />
            </div>
          </div>
          <div className="md:col-span-2">
            <FileUpload
              label="Arquivos de Referência"
              value={form.arquivosReferencia}
              onChange={v => setForm(p => ({ ...p, arquivosReferencia: v }))}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-cream-200">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Contrato'}
          </button>
        </div>
      </Modal>

      {/* ── MODAL EXCLUSÃO ─────────────────────────────────────── */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir este contrato de locação?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
