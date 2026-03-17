'use client'
import { useState, useEffect } from 'react'
import { FileText, Printer, RotateCcw } from 'lucide-react'

interface Voluntario {
  id: string; nome: string; cpf: string
  dataNascimento: string; enderecoCompleto: string; genero: string
}
interface Projeto { id: string; nome: string }
interface Evento  { id: string; nome: string; projetoVinculadoId?: string | null }

const fmtDate = (d: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '___/___/______'

const hoje = () => {
  const d = new Date()
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const generoLabel = (g: string) => {
  if (!g) return ''
  const l = g.toLowerCase()
  if (l === 'masculino' || l === 'male' || l === 'm') return 'o'
  return 'a'
}

const pronome = (g: string) => (generoLabel(g) === 'o' ? 'o' : 'a')

export default function TermoVoluntariadoPage() {
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([])
  const [projetos, setProjetos]   = useState<Projeto[]>([])
  const [eventos, setEventos]     = useState<Evento[]>([])

  const [volId,  setVolId]  = useState('')
  const [projId, setProjId] = useState('')
  const [evId,   setEvId]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/voluntarios-amo').then(r => r.json()),
      fetch('/api/projetos').then(r => r.json()),
      fetch('/api/eventos').then(r => r.json()),
    ]).then(([jv, jp, je]) => {
      if (jv.success) setVoluntarios(jv.data)
      if (jp.success) setProjetos(jp.data)
      if (je.success) setEventos(je.data)
    }).finally(() => setLoading(false))
  }, [])

  // When evento changes, auto-fill or clear projeto
  const handleEventoChange = (id: string) => {
    setEvId(id)
    if (!id) return
    const ev = eventos.find(e => e.id === id)
    if (ev?.projetoVinculadoId) setProjId(ev.projetoVinculadoId)
    else setProjId('')
  }

  const selectedVol  = voluntarios.find(v => v.id === volId)
  const selectedProj = projetos.find(p => p.id === projId)
  const selectedEv   = eventos.find(e => e.id === evId)

  // Projeto is disabled when evento is selected (projeto comes from event)
  const projetoDisabled = !!evId

  const reset = () => { setVolId(''); setProjId(''); setEvId('') }

  const printTermo = () => {
    if (!selectedVol) { alert('Selecione um voluntário.'); return }
    const html = buildHtml(selectedVol, selectedProj ?? null, selectedEv ?? null)
    const win = window.open('', '_blank', 'width=960,height=1000')
    if (win) { win.document.write(html); win.document.close(); win.focus() }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Termo de Voluntariado</h1>
            <p className="text-sm text-navy-400">Selecione o voluntário e imprima o termo de adesão</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Limpar
          </button>
          <button
            onClick={printTermo}
            disabled={!volId}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Gerar Termo
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-navy-400">Carregando...</div>
      ) : (
        <div className="flex gap-6 items-start">

          {/* FORM */}
          <div className="w-80 shrink-0">
            <div className="card space-y-4">
              <h2 className="text-sm font-semibold text-navy-700 uppercase tracking-wide">Dados do Termo</h2>

              <div className="form-group">
                <label>Voluntário <span className="required-star">*</span></label>
                <select value={volId} onChange={e => setVolId(e.target.value)} className="form-input">
                  <option value="">Selecione o voluntário...</option>
                  {voluntarios.map(v => (
                    <option key={v.id} value={v.id}>{v.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Evento Relacionado</label>
                <select value={evId} onChange={e => handleEventoChange(e.target.value)} className="form-input">
                  <option value="">Nenhum (somente projeto)</option>
                  {eventos.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nome}{!e.projetoVinculadoId ? ' — Avulso' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Projeto Relacionado</label>
                <select
                  value={projId}
                  onChange={e => setProjId(e.target.value)}
                  className="form-input"
                  disabled={projetoDisabled}
                >
                  <option value="">Nenhum</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                {projetoDisabled && evId && (
                  <p className="text-xs text-navy-400 mt-1">
                    {selectedEv?.projetoVinculadoId
                      ? 'Preenchido automaticamente pelo evento.'
                      : 'Evento avulso — sem projeto vinculado.'}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Data do Documento</label>
                <input
                  type="text"
                  value={hoje()}
                  readOnly
                  className="form-input bg-navy-50 text-navy-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Preview resumo */}
            {selectedVol && (
              <div className="card mt-4 space-y-2 text-sm">
                <h2 className="text-xs font-semibold text-navy-700 uppercase tracking-wide">Dados do Voluntário</h2>
                <div><span className="text-navy-400">Nome:</span> <span className="font-medium text-navy-800">{selectedVol.nome}</span></div>
                <div><span className="text-navy-400">CPF:</span> <span className="font-mono text-navy-700">{selectedVol.cpf}</span></div>
                <div><span className="text-navy-400">Nascimento:</span> {fmtDate(String(selectedVol.dataNascimento).slice(0,10))}</div>
                <div><span className="text-navy-400">Endereço:</span> {selectedVol.enderecoCompleto}</div>
              </div>
            )}
          </div>

          {/* A4 PREVIEW */}
          <div className="flex-1 flex justify-center overflow-auto">
            <div
              style={{
                background: 'white',
                width: '210mm',
                minHeight: '297mm',
                padding: '20mm',
                boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '13px',
                lineHeight: '1.85',
                color: '#222',
              }}
            >
              <TermoContent vol={selectedVol ?? null} proj={selectedProj ?? null} ev={selectedEv ?? null} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   Preview component (in-page)
────────────────────────────────────────────────────────── */
function TermoContent({
  vol, proj, ev
}: { vol: Voluntario | null; proj: Projeto | null; ev: Evento | null }) {
  const ph = (v: string | undefined, fallback: string) =>
    v ? <strong style={{ borderBottom: '1px dotted #888' }}>{v}</strong>
       : <span style={{ color: '#bbb', borderBottom: '1px dotted #ccc' }}>{fallback}</span>

  const nome    = vol?.nome
  const cpf     = vol?.cpf
  const nasc    = vol?.dataNascimento ? fmtDate(String(vol.dataNascimento).slice(0,10)) : undefined
  const end     = vol?.enderecoCompleto
  const g       = vol?.genero ?? ''
  const art     = pronome(g)

  const vinculo = ev
    ? (proj ? `no Evento "${ev.nome}", integrante do Projeto "${proj.nome}"` : `no Evento "${ev.nome}" (evento avulso)`)
    : proj
      ? `no Projeto "${proj.nome}"`
      : undefined

  const s = { marginBottom: '14px', textAlign: 'justify' as const }
  const h3 = { fontSize: '13px', fontWeight: 700 as const, marginTop: '20px', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a2e', paddingBottom: '14px', marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '2px', color: '#1a1a2e' }}>🕊️ AMO</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#444', marginTop: '2px', letterSpacing: '1px' }}>
          ASSOCIAÇÃO MISSÃO ÔMEGA
        </div>
        <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', marginTop: '10px', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Termo de Adesão ao Serviço Voluntário
        </div>
        <div style={{ fontSize: '11px', color: '#777', marginTop: '6px' }}>
          Lei Federal nº 9.608/1998 — Serviço Voluntário
        </div>
      </div>

      {/* Preâmbulo */}
      <p style={s}>
        Pel{art} presente instrumento, {ph(nome, '__________________________________')}, portador{art === 'a' ? 'a' : ''} do
        CPF nº {ph(cpf, '___.___.___-__')}, nascid{art} em {ph(nasc, '___/___/______')},
        residente e domiciliad{art} em {ph(end, '________________________________________________')},
        doravante denominad{art} <strong>VOLUNTÁRI{art === 'a' ? 'A' : 'O'}</strong>, adere, de forma livre, espontânea
        e sem qualquer coação, ao Serviço Voluntário da <strong>Associação Missão Ômega</strong>,
        doravante denominada <strong>ORGANIZAÇÃO</strong>.
      </p>

      {vinculo && (
        <p style={s}>
          A prestação do serviço voluntário será realizada{' '}
          <strong style={{ borderBottom: '1px dotted #888' }}>{vinculo}</strong>.
        </p>
      )}

      {/* Cláusulas */}
      <p style={h3}>Cláusula 1ª — Do Objeto</p>
      <p style={s}>
        {art === 'a' ? 'A' : 'O'} VOLUNTÁRI{art === 'a' ? 'A' : 'O'} prestará serviços voluntários junto à ORGANIZAÇÃO,
        colaborando com atividades de natureza cívica, cultural, assistencial, filantrópica e missionária,
        conforme orientações e necessidades da ORGANIZAÇÃO, sem subordinação hierárquica de caráter trabalhista.
      </p>

      <p style={h3}>Cláusula 2ª — Da Natureza Gratuita do Serviço</p>
      <p style={s}>
        O serviço ora acordado é prestado de forma <strong>inteiramente gratuita e não remunerada</strong>,
        em consonância com o art. 1º da Lei nº 9.608/1998. A presente adesão <strong>não gera, em hipótese alguma</strong>,
        direito ao recebimento de qualquer valor financeiro, salário, remuneração, honorários, gratificação
        ou benefício de natureza econômica. Fica expressamente vedada qualquer interpretação que implique
        vínculo empregatício, previdenciário ou obrigação de natureza trabalhista entre
        {art === 'a' ? ' a' : ' o'} VOLUNTÁRI{art === 'a' ? 'A' : 'O'} e a ORGANIZAÇÃO.
      </p>

      <p style={h3}>Cláusula 3ª — Dos Compromissos d{art === 'a' ? 'a' : 'o'} Voluntári{art === 'a' ? 'a' : 'o'}</p>
      <p style={{ ...s, marginBottom: '4px' }}>
        {art === 'a' ? 'A' : 'O'} VOLUNTÁRI{art === 'a' ? 'A' : 'O'} compromete-se a:
      </p>
      <ol style={{ paddingLeft: '20px', marginBottom: '14px' }}>
        <li style={{ marginBottom: '4px' }}>Exercer suas atividades com dedicação, ética e responsabilidade;</li>
        <li style={{ marginBottom: '4px' }}>Guardar sigilo das informações confidenciais a que tiver acesso;</li>
        <li style={{ marginBottom: '4px' }}>Zelar pelos bens e equipamentos da ORGANIZAÇÃO sob sua responsabilidade;</li>
        <li style={{ marginBottom: '4px' }}>Cumprir as normas internas e orientações da ORGANIZAÇÃO;</li>
        <li style={{ marginBottom: '4px' }}>Comunicar, com antecedência, qualquer impossibilidade de comparecimento.</li>
      </ol>

      <p style={h3}>Cláusula 4ª — Das Responsabilidades da Organização</p>
      <p style={{ ...s, marginBottom: '4px' }}>A ORGANIZAÇÃO compromete-se a:</p>
      <ol style={{ paddingLeft: '20px', marginBottom: '14px' }}>
        <li style={{ marginBottom: '4px' }}>Orientar {art === 'a' ? 'a' : 'o'} VOLUNTÁRI{art === 'a' ? 'A' : 'O'} quanto às atividades a serem desenvolvidas;</li>
        <li style={{ marginBottom: '4px' }}>Proporcionar as condições necessárias para o bom desempenho das atividades voluntárias;</li>
        <li style={{ marginBottom: '4px' }}>Reconhecer e valorizar a contribuição voluntária prestada.</li>
      </ol>

      <p style={h3}>Cláusula 5ª — Da Vigência e Rescisão</p>
      <p style={s}>
        O presente Termo vigorará a partir da data de sua assinatura por prazo indeterminado,
        podendo ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação
        prévia com antecedência mínima de 07 (sete) dias.
      </p>

      {/* Data e assinatura */}
      <p style={{ ...s, marginTop: '32px', textAlign: 'center' }}>
        {hoje()}.
      </p>

      <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'space-around', gap: '40px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderBottom: '1px solid #444', marginBottom: '8px', height: '40px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>{nome || '________________________________'}</div>
          <div style={{ fontSize: '12px', color: '#555', marginTop: '3px' }}>CPF: {cpf || '___.___.___-__'}</div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>
            Voluntári{art === 'a' ? 'a' : 'o'}
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderBottom: '1px solid #444', marginBottom: '8px', height: '40px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Associação Missão Ômega</div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>Representante Legal</div>
        </div>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '12px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '10px', color: '#aaa' }}>
        Documento gerado pelo Sistema de Gestão AMO · Associação Missão Ômega
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────
   HTML para nova janela de impressão
────────────────────────────────────────────────────────── */
function buildHtml(vol: Voluntario, proj: Projeto | null, ev: Evento | null): string {
  const art = pronome(vol.genero)
  const A   = art === 'a' ? 'A' : 'O'
  const V   = art === 'a' ? 'VOLUNTÁRIA' : 'VOLUNTÁRIO'
  const nasc = fmtDate(String(vol.dataNascimento).slice(0, 10))

  const vinculo = ev
    ? (proj ? `no Evento <strong>"${ev.nome}"</strong>, integrante do Projeto <strong>"${proj.nome}"</strong>` : `no Evento <strong>"${ev.nome}"</strong> (evento avulso)`)
    : proj
      ? `no Projeto <strong>"${proj.nome}"</strong>`
      : ''

  const vinculoP = vinculo
    ? `<p style="margin-bottom:14px;text-align:justify">A prestação do serviço voluntário será realizada ${vinculo}.</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Termo de Voluntariado — ${vol.nome}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #e5e7eb; font-family: Georgia, "Times New Roman", serif; color: #222; font-size: 13px; line-height: 1.85; }
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1a1a2e; color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px; gap: 12px;
      font-family: system-ui, sans-serif; font-size: 14px;
    }
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
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .page-wrapper { padding: 0; }
      .a4 { box-shadow: none; width: 100%; min-height: unset; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">📋 Termo de Voluntariado — ${vol.nome}</span>
    <div class="toolbar-btns">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>
  <div class="page-wrapper">
    <div class="a4">
      <div class="cabecalho">
        <div class="org">🕊️ AMO</div>
        <div class="sub">ASSOCIAÇÃO MISSÃO ÔMEGA</div>
        <div class="titulo">Termo de Adesão ao Serviço Voluntário</div>
        <div class="subtitulo">Lei Federal nº 9.608/1998 — Serviço Voluntário</div>
      </div>

      <p>
        Pel${art} presente instrumento, <span class="dest">${vol.nome}</span>, portador${art === 'a' ? 'a' : ''} do
        CPF nº <span class="dest">${vol.cpf}</span>, nascid${art} em <span class="dest">${nasc}</span>,
        residente e domiciliad${art} em <span class="dest">${vol.enderecoCompleto}</span>,
        doravante denominad${art} <strong>${V}</strong>, adere, de forma livre, espontânea
        e sem qualquer coação, ao Serviço Voluntário da <strong>Associação Missão Ômega</strong>,
        doravante denominada <strong>ORGANIZAÇÃO</strong>.
      </p>

      ${vinculoP}

      <h3>Cláusula 1ª — Do Objeto</h3>
      <p>
        ${A} ${V} prestará serviços voluntários junto à ORGANIZAÇÃO, colaborando com atividades
        de natureza cívica, cultural, assistencial, filantrópica e missionária, conforme
        orientações e necessidades da ORGANIZAÇÃO, sem subordinação hierárquica de caráter trabalhista.
      </p>

      <h3>Cláusula 2ª — Da Natureza Gratuita do Serviço</h3>
      <p>
        O serviço ora acordado é prestado de forma <strong>inteiramente gratuita e não remunerada</strong>,
        em consonância com o art. 1º da Lei nº 9.608/1998. A presente adesão <strong>não gera, em hipótese alguma</strong>,
        direito ao recebimento de qualquer valor financeiro, salário, remuneração, honorários,
        gratificação ou benefício de natureza econômica. Fica expressamente vedada qualquer
        interpretação que implique vínculo empregatício, previdenciário ou obrigação de natureza
        trabalhista entre ${art === 'a' ? 'a' : 'o'} ${V} e a ORGANIZAÇÃO.
      </p>

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
      <p>
        O presente Termo vigorará a partir da data de sua assinatura por prazo indeterminado,
        podendo ser rescindido por qualquer das partes, a qualquer tempo, mediante comunicação
        prévia com antecedência mínima de 07 (sete) dias.
      </p>

      <p class="data-centro">${hoje()}.</p>

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

      <div class="rodape">Documento gerado pelo Sistema de Gestão AMO · Associação Missão Ômega</div>
    </div>
  </div>
</body>
</html>`
}
