'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ClipboardList, Pencil, Trash2, Printer, RotateCcw, Plus, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateInput from '@/components/ui/DateInput'

interface Termo {
  id: string
  numero: string
  sequencia: number
  voluntarioId: string
  voluntarioNome: string
  voluntarioCpf: string
  projetoNome: string | null
  eventoNome: string | null
  emitidoEm: string
  createdAt: string
}

interface Voluntario {
  id: string; nome: string; cpf: string
  dataNascimento: string; enderecoCompleto: string; genero: string
}

// Always derive date parts from local timezone to avoid UTC-offset mismatches
const localDateParts = (d: string) => {
  if (!d) return null
  const dt = new Date(d)
  return {
    y: dt.getFullYear(),
    m: String(dt.getMonth() + 1).padStart(2, '0'),
    day: String(dt.getDate()).padStart(2, '0'),
  }
}

const fmtDate = (d: string) => {
  const p = localDateParts(d)
  return p ? `${p.day}/${p.m}/${p.y}` : '—'
}

const fmtDateISO = (d: string) => {
  const p = localDateParts(d)
  return p ? `${p.y}-${p.m}-${p.day}` : ''
}

const fmtDataExtenso = (iso: string) => {
  // Force noon local time when only date string to avoid day-off from UTC shift
  const d = iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso) : new Date()
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const fmtDateBR = (d: string) => {
  if (!d) return '___/___/______'
  const str = String(d).slice(0, 10)
  const dt = new Date(str + 'T12:00:00')
  return dt.toLocaleDateString('pt-BR')
}

const pronome = (g: string) => {
  const l = (g ?? '').toLowerCase()
  return (l === 'masculino' || l === 'male' || l === 'm') ? 'o' : 'a'
}

function buildHtml(vol: Voluntario, termo: Termo): string {
  const art = pronome(vol.genero)
  const A   = art === 'a' ? 'A' : 'O'
  const V   = art === 'a' ? 'VOLUNTÁRIA' : 'VOLUNTÁRIO'
  const nasc = fmtDateBR(String(vol.dataNascimento).slice(0, 10))
  const numero = termo.numero
  const dataDocumento = fmtDateISO(termo.emitidoEm)

  const vinculoP = (() => {
    if (termo.eventoNome && termo.projetoNome)
      return `<p style="margin-bottom:14px;text-align:justify">A prestação do serviço voluntário será realizada no Evento <strong>"${termo.eventoNome}"</strong>, integrante do Projeto <strong>"${termo.projetoNome}"</strong>.</p>`
    if (termo.eventoNome)
      return `<p style="margin-bottom:14px;text-align:justify">A prestação do serviço voluntário será realizada no Evento <strong>"${termo.eventoNome}"</strong> (evento avulso).</p>`
    if (termo.projetoNome)
      return `<p style="margin-bottom:14px;text-align:justify">A prestação do serviço voluntário será realizada no Projeto <strong>"${termo.projetoNome}"</strong>.</p>`
    return ''
  })()

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Termo de Voluntariado — ${vol.nome}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #e5e7eb; font-family: Georgia, "Times New Roman", serif; color: #222; font-size: 13px; line-height: 1.85; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: #1a1a2e; color: white; display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; gap: 12px; font-family: system-ui, sans-serif; font-size: 14px; }
    .toolbar-title { font-weight: 600; letter-spacing: 0.5px; }
    .toolbar-btns { display: flex; gap: 10px; }
    .btn-print { background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-print:hover { background: #4338ca; }
    .btn-close { background: transparent; color: #9ca3af; border: 1px solid #374151; border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
    .btn-close:hover { color: white; border-color: #6b7280; }
    .page-wrapper { padding: 72px 24px 24px; display: flex; justify-content: center; }
    .a4 { background: white; width: 210mm; min-height: 297mm; padding: 20mm; box-shadow: 0 4px 32px rgba(0,0,0,0.18); }
    .cabecalho { text-align: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 14px; margin-bottom: 24px; }
    .org { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #1a1a2e; }
    .sub { font-size: 12px; font-weight: 600; color: #444; margin-top: 2px; letter-spacing: 1px; }
    .titulo { font-size: 17px; font-weight: 700; color: #1a1a2e; margin-top: 10px; letter-spacing: 2px; text-transform: uppercase; }
    .subtitulo { font-size: 11px; color: #777; margin-top: 6px; }
    p { margin-bottom: 14px; text-align: justify; }
    h3 { font-size: 13px; font-weight: 700; margin-top: 20px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    ol { padding-left: 20px; margin-bottom: 14px; }
    ol li { margin-bottom: 4px; }
    .dest { border-bottom: 1px dotted #888; font-weight: bold; }
    .data-centro { text-align: center; margin-top: 32px; }
    .assinaturas { margin-top: 48px; display: flex; justify-content: space-around; gap: 40px; }
    .assinatura-bloco { text-align: center; flex: 1; }
    .linha-ass { border-bottom: 1px solid #444; margin-bottom: 8px; height: 40px; }
    .nome-ass { font-size: 13px; font-weight: 600; }
    .cpf-ass { font-size: 12px; color: #555; margin-top: 3px; }
    .tipo-ass { font-size: 11px; color: #777; margin-top: 2px; }
    .rodape { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #aaa; }
    @media print { body { background: white; } .toolbar { display: none; } .page-wrapper { padding: 0; } .a4 { box-shadow: none; width: 100%; min-height: unset; padding: 0; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">📋 Termo de Voluntariado ${numero} — ${vol.nome}</span>
    <div class="toolbar-btns">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>
  <div class="page-wrapper"><div class="a4">
    <div class="cabecalho">
      <div class="org">🕊️ AMO</div>
      <div class="sub">ASSOCIAÇÃO MISSÃO ÔMEGA</div>
      <div class="titulo">Termo de Adesão ao Serviço Voluntário</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <span class="subtitulo">Lei Federal nº 9.608/1998 — Serviço Voluntário</span>
        <span style="font-family:monospace;font-weight:600;font-size:12px;background:#f0f0f0;padding:2px 8px;border-radius:4px;color:#333">${numero}</span>
      </div>
    </div>
    <p>Pel${art} presente instrumento, <span class="dest">${vol.nome}</span>, portador${art === 'a' ? 'a' : ''} do CPF nº <span class="dest">${vol.cpf}</span>, nascid${art} em <span class="dest">${nasc}</span>, residente e domiciliad${art} em <span class="dest">${vol.enderecoCompleto}</span>, doravante denominad${art} <strong>${V}</strong>, adere, de forma livre, espontânea e sem qualquer coação, ao Serviço Voluntário da <strong>Associação Missão Ômega</strong>, doravante denominada <strong>ORGANIZAÇÃO</strong>.</p>
    ${vinculoP}
    <h3>Cláusula 1ª — Do Objeto</h3>
    <p>${A} ${V} prestará serviços voluntários junto à ORGANIZAÇÃO, colaborando com atividades de natureza cívica, cultural, assistencial, filantrópica e missionária, conforme orientações e necessidades da ORGANIZAÇÃO, sem subordinação hierárquica de caráter trabalhista.</p>
    <h3>Cláusula 2ª — Da Natureza Gratuita do Serviço</h3>
    <p>O serviço ora acordado é prestado de forma <strong>inteiramente gratuita e não remunerada</strong>, em consonância com o art. 1º da Lei nº 9.608/1998. A presente adesão <strong>não gera, em hipótese alguma</strong>, direito ao recebimento de qualquer valor financeiro, salário, remuneração, honorários, gratificação ou benefício de natureza econômica. Fica expressamente vedada qualquer interpretação que implique vínculo empregatício, previdenciário ou obrigação de natureza trabalhista entre ${art === 'a' ? 'a' : 'o'} ${V} e a ORGANIZAÇÃO.</p>
    <h3>Cláusula 3ª — Dos Compromissos d${art === 'a' ? 'a' : 'o'} Voluntári${art === 'a' ? 'a' : 'o'}</h3>
    <p style="margin-bottom:4px">${A} ${V} compromete-se a:</p>
    <ol>
      <li>Exercer suas atividades com dedicação, ética e responsabilidade;</li>
      <li>Guardar sigilo das informações confidenciais a que tiver acesso;</li>
      <li>Zelar pelos bens e equipamentos da ORGANIZAÇÃO sob sua responsabilidade;</li>
      <li>Cumprir as normas internas e orientações da ORGANIZAÇÃO;</li>
      <li>Comunicar, com antecedência, qualquer impossibilidade de comparecimento.</li>
    </ol>
    <h3>Cláusula 4ª — Das Responsabilidades da Organização</h3>
    <p style="margin-bottom:4px">A ORGANIZAÇÃO compromete-se a:</p>
    <ol>
      <li>Orientar ${art === 'a' ? 'a' : 'o'} ${V} quanto às atividades a serem desenvolvidas;</li>
      <li>Proporcionar as condições necessárias para o bom desempenho das atividades voluntárias;</li>
      <li>Reconhecer e valorizar a contribuição voluntária prestada.</li>
    </ol>
    <h3>Cláusula 5ª — Da Vigência e Rescisão</h3>
    <p>O presente Termo vigorará a partir da data de sua assinatura por prazo indeterminado, podendo ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação prévia com antecedência mínima de 07 (sete) dias.</p>
    <p class="data-centro">${fmtDataExtenso(dataDocumento)}.</p>
    <div class="assinaturas">
      <div class="assinatura-bloco">
        <div class="linha-ass"></div>
        <div class="nome-ass">${vol.nome}</div>
        <div class="cpf-ass">CPF: ${vol.cpf}</div>
        <div class="tipo-ass">Voluntári${art === 'a' ? 'a' : 'o'}</div>
      </div>
      <div class="assinatura-bloco">
        <div class="linha-ass"></div>
        <div class="nome-ass">Associação Missão Ômega</div>
        <div class="tipo-ass">Representante Legal</div>
      </div>
    </div>
    <div class="rodape">Documento emitido pelo Sistema de Gestão AMO · ${numero} · Associação Missão Ômega</div>
  </div></div>
</body>
</html>`
}

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const emptyForm = {
  voluntarioNome: '', voluntarioCpf: '',
  projetoNome: '', eventoNome: '', emitidoEm: '',
}

export default function TermosVoluntariadoPage() {
  const [data, setData] = useState<Termo[]>([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Filters
  const [filtroInicio, setFiltroInicio] = useState('')
  const [filtroFim, setFiltroFim] = useState('')
  const [filtroVoluntario, setFiltroVoluntario] = useState('')

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState<Termo | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<Termo | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = ['admin', 'superadmin'].includes(currentRole.toLowerCase())

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/termo-voluntariado')
      const j = await r.json()
      if (j.success) setData(j.data ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(j => { if (j.usuario?.role) setCurrentRole(j.usuario.role) }).catch(() => {})
    fetch('/api/migrate/termo-voluntariado', { method: 'POST' }).catch(() => {}).then(() => fetchData())
  }, [fetchData])

  // Sorted unique voluntario names for dropdown
  const voluntarios = useMemo(() =>
    [...new Set(data.map(t => t.voluntarioNome))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [data]
  )

  // Filtered data — filter by emitidoEm date (ISO date part)
  const filtered = useMemo(() => {
    return data.filter(t => {
      const dateISO = fmtDateISO(t.emitidoEm)
      if (filtroInicio && dateISO < filtroInicio) return false
      if (filtroFim && dateISO > filtroFim) return false
      if (filtroVoluntario && t.voluntarioNome !== filtroVoluntario) return false
      return true
    })
  }, [data, filtroInicio, filtroFim, filtroVoluntario])

  const hasFilter = filtroInicio || filtroFim || filtroVoluntario
  const clearFilter = () => { setFiltroInicio(''); setFiltroFim(''); setFiltroVoluntario('') }

  const handlePrint = async (termo: Termo) => {
    setPrinting(termo.id)
    try {
      // Fetch volunteer details for full print (gender, birth date, address)
      let vol: Voluntario = {
        id: termo.voluntarioId,
        nome: termo.voluntarioNome,
        cpf: termo.voluntarioCpf,
        dataNascimento: '',
        enderecoCompleto: '',
        genero: '',
      }
      try {
        const res = await fetch('/api/voluntarios-amo')
        const j = await res.json()
        if (j.success && Array.isArray(j.data)) {
          const found = j.data.find((v: Voluntario) => v.id === termo.voluntarioId)
          if (found) vol = found
        }
      } catch { /* use fallback vol */ }
      const html = buildHtml(vol, termo)
      const win = window.open('', '_blank', 'width=960,height=1000')
      if (win) { win.document.write(html); win.document.close(); win.focus() }
    } finally { setPrinting(null) }
  }

  const openEdit = (t: Termo) => {
    if (!isAdmin) { showToast('Somente Admin ou SuperAdmin pode editar termos.', 'error'); return }
    setEditing(t)
    setForm({
      voluntarioNome: t.voluntarioNome,
      voluntarioCpf: t.voluntarioCpf,
      projetoNome: t.projetoNome ?? '',
      eventoNome: t.eventoNome ?? '',
      emitidoEm: fmtDateISO(t.emitidoEm),
    })
    setModalAlert(null)
    setEditModal(true)
  }

  const handleSave = async () => {
    if (!form.voluntarioNome || !form.voluntarioCpf || !form.emitidoEm) {
      setModalAlert({ type: 'error', message: 'Preencha os campos obrigatórios.' }); return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/termo-voluntariado/${editing!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voluntarioNome: form.voluntarioNome,
          voluntarioCpf: form.voluntarioCpf,
          projetoNome: form.projetoNome || null,
          eventoNome: form.eventoNome || null,
          emitidoEm: form.emitidoEm,
        }),
      })
      const j = await res.json()
      if (j.success) {
        showToast('Termo atualizado com sucesso!')
        setEditModal(false)
        fetchData()
      } else {
        setModalAlert({ type: 'error', message: j.error || 'Erro ao salvar.' })
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/termo-voluntariado/${deleteConfirm.id}`, { method: 'DELETE' })
      const j = await res.json()
      if (j.success) {
        showToast(`Termo ${deleteConfirm.numero} excluído.`)
        setDeleteConfirm(null)
        fetchData()
      } else {
        showToast(j.error || 'Erro ao excluir.', 'error')
      }
    } finally { setDeleting(false) }
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Registro de Voluntariado</h1>
            <p className="text-sm text-navy-400">
              {hasFilter ? `${filtered.length} de ${data.length}` : data.length} registro{data.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <a href="/termo-voluntariado" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Emitir Novo Termo
        </a>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <DateInput
            label="Data início"
            value={filtroInicio}
            onChange={setFiltroInicio}
          />
          <DateInput
            label="Data final"
            value={filtroFim}
            onChange={setFiltroFim}
          />
          <div className="form-group min-w-[220px] flex-1">
            <label>Voluntário</label>
            <select
              value={filtroVoluntario}
              onChange={e => setFiltroVoluntario(e.target.value)}
              className="form-input"
            >
              <option value="">— Todos —</option>
              {voluntarios.map(nome => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          </div>
          {hasFilter && (
            <button
              onClick={clearFilter}
              title="Limpar filtros"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-navy-500 hover:text-red-600 hover:bg-red-50 border border-cream-300 transition-colors mb-0.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtro
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="text-center py-12 text-navy-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-navy-200 mx-auto mb-3" />
            <p className="text-navy-400 font-medium">
              {hasFilter ? 'Nenhum termo encontrado para os filtros aplicados.' : 'Nenhum termo emitido ainda.'}
            </p>
            {!hasFilter && (
              <a href="/termo-voluntariado" className="inline-flex items-center gap-2 mt-4 text-sm text-navy-600 hover:text-navy-800 font-medium">
                <Plus className="w-4 h-4" /> Emitir primeiro termo
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-700 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Número</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Voluntário</th>
                  <th className="px-4 py-3 text-left">CPF</th>
                  <th className="px-4 py-3 text-left">Projeto</th>
                  <th className="px-4 py-3 text-left">Evento</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 bg-indigo-50">
                        {t.numero}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy-600 whitespace-nowrap">{fmtDate(t.emitidoEm)}</td>
                    <td className="px-4 py-3 font-medium text-navy-800">{t.voluntarioNome}</td>
                    <td className="px-4 py-3 font-mono text-navy-500 text-xs">{t.voluntarioCpf}</td>
                    <td className="px-4 py-3 text-navy-600">{t.projetoNome || <span className="text-navy-300">—</span>}</td>
                    <td className="px-4 py-3 text-navy-600">{t.eventoNome || <span className="text-navy-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Visualizar / Imprimir */}
                        <button
                          onClick={() => handlePrint(t)}
                          disabled={printing === t.id}
                          title="Visualizar e Imprimir"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors disabled:opacity-50"
                        >
                          {printing === t.id
                            ? <span className="animate-spin inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />
                            : <Printer className="w-4 h-4" />}
                        </button>
                        {/* Editar — somente Admin/SuperAdmin */}
                        <button
                          onClick={() => openEdit(t)}
                          title={isAdmin ? 'Editar' : 'Sem permissão para editar'}
                          className={`p-1.5 rounded-lg transition-colors ${isAdmin ? 'bg-navy-50 hover:bg-navy-100 text-navy-600' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Excluir — somente Admin/SuperAdmin */}
                        <button
                          onClick={() => isAdmin ? setDeleteConfirm(t) : showToast('Somente Admin ou SuperAdmin pode excluir termos.', 'error')}
                          title={isAdmin ? 'Excluir' : 'Sem permissão para excluir'}
                          className={`p-1.5 rounded-lg transition-colors ${isAdmin ? 'bg-red-50 hover:bg-red-100 text-red-500' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title={editing ? `Editar ${editing.numero}` : ''}
        size="lg"
        alert={modalAlert}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Nome do Voluntário <span className="required-star">*</span></label>
              <input
                type="text"
                value={form.voluntarioNome}
                onChange={e => setForm(p => ({ ...p, voluntarioNome: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>CPF do Voluntário <span className="required-star">*</span></label>
              <input
                type="text"
                value={form.voluntarioCpf}
                onChange={e => setForm(p => ({ ...p, voluntarioCpf: maskCPF(e.target.value) }))}
                className="form-input font-mono"
                placeholder="000.000.000-00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label>Projeto</label>
              <input
                type="text"
                value={form.projetoNome}
                onChange={e => setForm(p => ({ ...p, projetoNome: e.target.value }))}
                className="form-input"
                placeholder="Opcional"
              />
            </div>
            <div className="form-group">
              <label>Evento</label>
              <input
                type="text"
                value={form.eventoNome}
                onChange={e => setForm(p => ({ ...p, eventoNome: e.target.value }))}
                className="form-input"
                placeholder="Opcional"
              />
            </div>
          </div>
          <DateInput
            label="Data de Emissão"
            required
            value={form.emitidoEm}
            onChange={v => setForm(p => ({ ...p, emitidoEm: v }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <RotateCcw className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-navy-600">
            Tem certeza que deseja excluir o termo <strong className="font-mono">{deleteConfirm?.numero}</strong> de{' '}
            <strong>{deleteConfirm?.voluntarioNome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary" disabled={deleting}>Cancelar</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
