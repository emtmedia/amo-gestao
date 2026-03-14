'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Landmark } from 'lucide-react'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import FileUpload from '@/components/ui/FileUpload'
import DateInput from '@/components/ui/DateInput'
import PhoneInput from '@/components/ui/PhoneInput'
import { filterEventosByProjeto } from '@/lib/evento-filter'

interface Rec { id: string; nomeOrgao: string; tipoReceita: string; valorRecurso: number; dataEntrada: string }
interface Conta { id: string; tipo: string; banco: string; agencia: string; numeroConta: string }
interface Metodo { id: string; nome: string }
interface Condicao { id: string; nome: string }
interface Projeto { id: string; nome: string }
interface Evento { id: string; nome: string; projetoVinculadoId?: string | null }
interface UF { id: string; codigo: string; nome: string }
interface Cidade { id: string; nome: string; ufId: string }

const TIPOS_RECEITA = ['Receita Municipal', 'Receita Estadual', 'Receita Federal', 'Outros Órgãos Públicos']

const emptyForm = {
  tipoReceita: '', ufId: '', cidadeId: '',
  nomeOrgao: '', nomeSetor: '', nomeContato: '', telefoneContato: '', telefoneFixo: '', emailContato: '',
  condicaoReceitaId: '', valorRecurso: '', dataEntrada: '',
  contaBancariaId: '', metodoTransferenciaId: '',
  projetoDirecionado: '', eventoDirecionado: '', observacoes: '', arquivosReferencia: ''
}

export default function ReceitaPublicaPage() {
  const [data, setData] = useState<Rec[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [condicoes, setCondicoes] = useState<Condicao[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [ufs, setUfs] = useState<UF[]>([])
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Rec | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, rc, rm, rcd, rp, re, ruf] = await Promise.all([
        fetch('/api/receitas/publica'),
        fetch('/api/contas-bancarias'),
        fetch('/api/auxiliares?tipo=metodos'),
        fetch('/api/auxiliares?tipo=condicoes'),
        fetch('/api/projetos'),
        fetch('/api/eventos'),
        fetch('/api/uf'),
      ])
      const [jd, jc, jm, jcd, jp, je, juf] = await Promise.all([
        rd.json(), rc.json(), rm.json(), rcd.json(), rp.json(), re.json(), ruf.json()
      ])
      if (jd.success) setData(jd.data)
      if (jc.success) setContas(jc.data)
      if (jm.success) setMetodos(jm.data)
      if (jcd.success) setCondicoes(jcd.data)
      if (jp.success) setProjetos(jp.data)
      if (je.success) setEventos(je.data)
      if (juf.success) setUfs(juf.data.sort((a: UF, b: UF) => a.codigo.localeCompare(b.codigo)))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Carrega cidades dinamicamente quando a UF muda
  useEffect(() => {
    if (!form.ufId) { setCidades([]); return }
    setLoadingCidades(true)
    fetch(`/api/cidades?ufId=${form.ufId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setCidades(d.data) })
      .finally(() => setLoadingCidades(false))
  }, [form.ufId])

  const handleUFChange = (ufId: string) => {
    // Ao mudar UF, limpa a cidade selecionada
    setForm(p => ({ ...p, ufId, cidadeId: '' }))
  }

  const needsUF = form.tipoReceita === 'Receita Estadual' || form.tipoReceita === 'Receita Municipal'
  const needsCidade = form.tipoReceita === 'Receita Municipal'

  const fmtMoney = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-'
  const contaLabel = (c: Conta) => `${c.tipo} | Ag ${c.agencia} | Cta ${c.numeroConta} - ${c.banco}`

  const openCreate = () => { setEditing(null); setForm(emptyForm); setCidades([]); setModalAlert(null); setModalOpen(true) }
  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row as unknown as Rec)
    setForm({
      tipoReceita: String(row.tipoReceita || ''),
      ufId: String(row.ufId || ''),
      cidadeId: String(row.cidadeId || ''),
      nomeOrgao: String(row.nomeOrgao || ''),
      nomeSetor: String(row.nomeSetor || ''),
      nomeContato: String(row.nomeContato || ''),
      telefoneContato: String(row.telefoneContato || ''),
      telefoneFixo: String(row.telefoneFixo || ''),
      emailContato: String(row.emailContato || ''),
      condicaoReceitaId: String(row.condicaoReceitaId || ''),
      valorRecurso: String(row.valorRecurso || ''),
      dataEntrada: row.dataEntrada ? String(row.dataEntrada).slice(0, 10) : '',
      contaBancariaId: String(row.contaBancariaId || ''),
      metodoTransferenciaId: String(row.metodoTransferenciaId || ''),
      projetoDirecionado: String(row.projetoDirecionado || ''),
      eventoDirecionado: String(row.eventoDirecionado || ''),
      observacoes: String(row.observacoes || ''),
      arquivosReferencia: String(row.arquivosReferencia || '')
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.tipoReceita || !form.nomeOrgao || !form.nomeSetor || !form.condicaoReceitaId ||
      !form.valorRecurso || !form.dataEntrada || !form.contaBancariaId ||
      !form.metodoTransferenciaId || !form.projetoDirecionado || !form.eventoDirecionado) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    if (needsUF && !form.ufId) { showToast('Selecione o Estado (UF)', 'error'); return }
    if (needsCidade && !form.cidadeId) { showToast('Selecione a Cidade', 'error'); return }

    setSaving(true)
    try {
      const payload = {
        ...form,
        valorRecurso: parseBRL(form.valorRecurso),
        ufId: form.ufId || null,
        cidadeId: form.cidadeId || null,
        nomeContato: form.nomeContato || null,
        telefoneContato: form.telefoneContato || null,
        emailContato: form.emailContato || null,
        observacoes: form.observacoes || null,
        arquivosReferencia: form.arquivosReferencia || null,
      }
      const url = editing ? `/api/receitas/publica/${(editing as Rec).id}` : '/api/receitas/publica'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) { showToast(editing ? 'Receita atualizada!' : 'Receita registrada!'); setModalOpen(false); fetchData() }
      else showToast(j.error || 'Erro ao salvar', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/receitas/publica/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Removida!'); setDeleteConfirm(null); fetchData() }
    } catch { showToast('Erro', 'error') }
  }

  const inp = (key: keyof typeof emptyForm, label: string, required = false, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label>{label}{required && <span className="required-star">*</span>}</label>
      <input type={type} placeholder={placeholder || label} value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="form-input" />
    </div>
  )


  const filteredEventos = filterEventosByProjeto(eventos as any, form.projetoDirecionado)
  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <Landmark className="w-7 h-7 text-navy-700" />
          <div><h1 className="page-title">Receita Pública</h1><p className="text-sm text-navy-400">{data.length} registros</p></div>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nova Receita</button>
      </div>

      <div className="card">
        {loading ? <div className="text-center py-8 text-navy-400">Carregando...</div> : (
          <DataTable
            data={data}
            columns={[
              { key: 'tipoReceita', label: 'Tipo' },
              { key: 'nomeOrgao', label: 'Órgão/Agente' },
              { key: 'nomeSetor', label: 'Setor' },
              { key: 'nomeContato', label: 'Contato', render: v => v ? String(v) : <span className="text-navy-300">—</span> },
              { key: 'telefoneContato', label: 'Telefone', render: v => v ? String(v) : <span className="text-navy-300">—</span> },
              { key: 'valorRecurso', label: 'Valor', render: (v) => fmtMoney(Number(v)) },
              { key: 'dataEntrada', label: 'Data Entrada', render: (v) => fmtDate(String(v)) },
              { key: 'projetoDirecionado', label: 'Projeto', render: v => v ? String(v).substring(0,20) : <span className="text-navy-300">—</span> }
            ]}
            onEdit={openEdit}
            onDelete={(row) => setDeleteConfirm(String(row.id))}
            searchKeys={['nomeOrgao', 'nomeSetor', 'tipoReceita']}
          />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Receita Pública' : 'Nova Receita Pública'} size="xl"
        alert={modalAlert}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Tipo de Receita */}
          <div className="form-group md:col-span-2">
            <label>Fonte da Receita Pública<span className="required-star">*</span></label>
            <select value={form.tipoReceita}
              onChange={e => setForm(p => ({ ...p, tipoReceita: e.target.value, ufId: '', cidadeId: '' }))}
              className="form-input">
              <option value="">Selecione...</option>
              {TIPOS_RECEITA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* UF — aparece para Estadual e Municipal */}
          {needsUF && (
            <div className="form-group">
              <label>Estado (UF)<span className="required-star">*</span></label>
              <select value={form.ufId} onChange={e => handleUFChange(e.target.value)} className="form-input">
                <option value="">Selecione o estado...</option>
                {ufs.map(u => <option key={u.id} value={u.id}>{u.codigo} — {u.nome}</option>)}
              </select>
            </div>
          )}

          {/* Cidade — aparece SOMENTE para Municipal, carrega dinamicamente pelo ufId */}
          {needsCidade && (
            <div className="form-group">
              <label>Cidade<span className="required-star">*</span></label>
              <select value={form.cidadeId}
                onChange={e => setForm(p => ({ ...p, cidadeId: e.target.value }))}
                className="form-input"
                disabled={!form.ufId || loadingCidades}>
                <option value="">
                  {!form.ufId ? '← Selecione a UF primeiro' : loadingCidades ? 'Carregando cidades...' : cidades.length === 0 ? 'Nenhuma cidade cadastrada para esta UF' : 'Selecione a cidade...'}
                </option>
                {cidades.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {form.ufId && cidades.length === 0 && !loadingCidades && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Nenhuma cidade cadastrada para esta UF. Acesse <strong>UF &amp; Cidades</strong> e importe as cidades.
                </p>
              )}
            </div>
          )}

          {inp('nomeOrgao', 'Nome do Órgão ou Agente Público', true)}
          {inp('nomeSetor', 'Nome do Setor Público', true)}
          {inp('nomeContato', 'Nome do Contato')}
          <PhoneInput label="Telefone Celular do Contato" value={form.telefoneContato} onChange={v=>setForm(p=>({...p,telefoneContato:v}))}/>
          <PhoneInput label="Telefone Fixo do Contato" value={form.telefoneFixo} onChange={v=>setForm(p=>({...p,telefoneFixo:v}))}/>
          {inp('emailContato', 'E-mail do Contato', false, 'email')}

          <div className="form-group">
            <label>Condições da Receita<span className="required-star">*</span></label>
            <select value={form.condicaoReceitaId} onChange={e => setForm(p => ({ ...p, condicaoReceitaId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {condicoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {<CurrencyInput label="Valor do Recurso (R$)" required value={form.valorRecurso} onChange={v=>setForm(p=>({...p,valorRecurso:v}))}/>}
          <DateInput label="Data de Entrada do Recurso" required value={form.dataEntrada} onChange={v=>setForm(p=>({...p,dataEntrada:v}))}/>

          <div className="form-group">
            <label>Conta Bancária<span className="required-star">*</span></label>
            <select value={form.contaBancariaId} onChange={e => setForm(p => ({ ...p, contaBancariaId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {contas.map(c => <option key={c.id} value={c.id}>{contaLabel(c)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Método de Transferência<span className="required-star">*</span></label>
            <select value={form.metodoTransferenciaId} onChange={e => setForm(p => ({ ...p, metodoTransferenciaId: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              {metodos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Projeto Relacionado<span className="required-star">*</span></label>
            <select value={form.projetoDirecionado} onChange={e => setForm(p => ({ ...p, projetoDirecionado: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              <option value="Receita Geral">Receita Geral</option>
              {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Evento Relacionado<span className="required-star">*</span></label>
            <select value={form.eventoDirecionado} onChange={e => setForm(p => ({ ...p, eventoDirecionado: e.target.value }))} className="form-input">
              <option value="">Selecione...</option>
              <option value="Receita Geral">Receita Geral</option>
              {filteredEventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </div>

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
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Registrar Receita'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm">
        <p className="text-navy-600">Excluir este registro de receita pública?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
          <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="btn-danger">Excluir</button>
        </div>
      </Modal>
    </div>
  )
}
