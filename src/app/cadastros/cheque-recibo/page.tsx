'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Printer, Pencil, Trash2, Banknote, CalendarClock, Paperclip, ChevronDown, ChevronUp, ExternalLink, X, FileText, Image, File, FileSpreadsheet, FolderOpen, FileDown, Archive } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import CurrencyInput, { parseBRL } from '@/components/ui/CurrencyInput'
import DateInput from '@/components/ui/DateInput'

interface ChequeReciboAnexo {
  id: string
  descricao: string
  nomeArquivo: string
  tipoArquivo: string
  tamanhoArquivo: number
  urlArquivo: string
  pathArquivo?: string | null
  origemCaptura: string
  valorDocumento: number
  enviadoPorNome: string
  createdAt: string
}

interface ChequeRecibo {
  id: string
  numero: string
  sequencia: number
  nomeOperador: string
  dataTransferencia: string
  valorConcedido: number
  metodoTransferencia: string
  nomeRecebedor: string
  cpfRecebedor: string
  dataAcertoNotas: string
  observacoes?: string | null
  projetoId?: string | null
  eventoId?: string | null
  projetoNome?: string | null
  eventoNome?: string | null
  arquivado: boolean
  arquivadoEm?: string | null
  createdAt: string
  anexos: ChequeReciboAnexo[]
  totalDocumentos: number
}

interface ProjetoItem { id: string; nome: string }
interface EventoItem { id: string; nome: string; projetoVinculadoId: string | null }

function FileIconSmall({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image size={14} className="text-blue-500" />
  if (type.includes('pdf')) return <FileText size={14} className="text-red-500" />
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('.sheet'))
    return <FileSpreadsheet size={14} className="text-green-600" />
  return <File size={14} className="text-gray-500" />
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

interface Metodo { id: string; nome: string }

const emptyForm = {
  nomeOperador: '',
  dataTransferencia: '',
  valorConcedido: '',
  metodoTransferencia: 'Espécie',
  nomeRecebedor: '',
  cpfRecebedor: '',
  dataAcertoNotas: '',
  observacoes: '',
  projetoId: '',
  eventoId: '',
}

const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const fmtDate = (d: string) =>
  d ? new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR') : '—'

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtMoneyInput = (v: string) => {
  if (!v) return ''
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  if (isNaN(n)) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function printRelatorio(
  cr: ChequeRecibo,
  projetoNome: string | null,
  eventoNome: string | null
) {
  const saldo = cr.valorConcedido - (cr.totalDocumentos ?? 0)
  const saldoZero = Math.abs(saldo) < 0.005
  const agora = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const linhasAnexos = (cr.anexos ?? []).map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${a.descricao}</td>
      <td><a href="${a.urlArquivo}" target="_blank" rel="noopener noreferrer" style="color:#1e3a8a;text-decoration:underline;font-weight:600">${a.nomeArquivo}</a></td>
      <td style="text-align:right">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(a.valorDocumento))}</td>
      <td>${new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
      <td>${a.enviadoPorNome}</td>
    </tr>
  `).join('')

  const projetoDisplay = projetoNome ?? 'Administração Geral'
  const secaoVinculacao = `
    <div class="section">
      <div class="section-title">◆ Vinculação — Projeto &amp; Evento</div>
      <div class="field-grid">
        <div class="field"><div class="field-label">Projeto</div><div class="field-value">${projetoDisplay}</div></div>
        ${eventoNome ? `<div class="field"><div class="field-label">Evento</div><div class="field-value">${eventoNome}</div></div>` : ''}
      </div>
    </div>`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Relatório CR ${cr.numero}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1a1a2e; background: #e8e8e8; }

    /* ── Toolbar ── */
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1a1a2e; color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 22px; font-size: 13px;
    }
    .toolbar-title { font-weight: 600; }
    .btn-print { background: #c8a84b; color: #1a1a2e; border: none; border-radius: 6px; padding: 7px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-print:hover { background: #b8983b; }
    .btn-close { background: transparent; color: #9ca3af; border: 1px solid #374151; border-radius: 6px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
    .btn-close:hover { color: white; border-color: #6b7280; }

    .page-wrapper { padding: 68px 24px 24px; display: flex; justify-content: center; }

    /* ── A4 Sheet ── */
    .a4 { background: white; width: 210mm; min-height: 297mm; box-shadow: 0 4px 32px rgba(0,0,0,.2); }

    /* ── Header ── */
    .header-stripe-top { background: linear-gradient(90deg, #c8a84b 0%, #e8d080 50%, #c8a84b 100%); height: 5px; }
    .header-main {
      background: #1a1a2e; color: white;
      padding: 20px 28px 18px; text-align: center;
      border-bottom: 3px solid #c8a84b;
    }
    .header-divider { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 6px 0; }
    .header-divider-line { flex: 1; height: 1px; background: rgba(200,168,75,.4); }
    .header-diamond { color: #c8a84b; font-size: 10px; }
    .org-name { font-size: 21px; font-weight: 900; letter-spacing: 5px; color: white; }
    .org-sub { font-size: 11px; letter-spacing: 4px; color: #c8a84b; margin-top: 3px; font-weight: 600; }
    .report-label { font-size: 11px; letter-spacing: 3px; color: rgba(255,255,255,.6); margin-top: 14px; }
    .report-title { font-size: 15px; font-weight: 800; letter-spacing: 2px; color: white; margin-top: 4px; }
    .cr-badge {
      display: inline-block; border: 2px solid #c8a84b; color: #c8a84b;
      font-size: 18px; font-weight: 900; padding: 4px 18px; margin-top: 10px;
      font-family: 'Courier New', monospace; letter-spacing: 2px;
    }
    .header-stripe-bottom { background: linear-gradient(90deg, #c8a84b 0%, #e8d080 50%, #c8a84b 100%); height: 3px; }
    .gen-date { background: #f8f6ef; text-align: right; padding: 5px 20px; font-size: 10px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }

    /* ── Sections ── */
    .section { padding: 14px 22px; border-bottom: 1px solid #f0ece0; }
    .section:last-of-type { border-bottom: none; }
    .section-title {
      font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
      color: #1a1a2e; padding-left: 9px; margin-bottom: 10px;
      border-left: 3px solid #c8a84b;
    }
    .field-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; }
    .field-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 20px; }
    .field-label { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
    .field-value { font-size: 12px; font-weight: 600; color: #1e3a8a; margin-top: 2px; }
    .field-value-big { font-size: 16px; font-weight: 800; color: #1a1a2e; margin-top: 2px; }

    /* ── Attachments table ── */
    .table-wrap { padding: 14px 22px; border-bottom: 1px solid #f0ece0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #1a1a2e; color: white; }
    thead th { padding: 8px 10px; text-align: left; font-size: 9px; letter-spacing: 1px; font-weight: 700; }
    tbody tr { border-bottom: 1px solid #f5f5f5; }
    tbody tr:nth-child(even) { background: #faf9f6; }
    tbody td { padding: 7px 10px; color: #374151; }
    tfoot tr { background: #f0ece0; font-weight: 700; }
    tfoot td { padding: 8px 10px; }
    .no-docs { padding: 14px 22px; color: #9ca3af; font-size: 11px; font-style: italic; }

    /* ── Saldo box ── */
    .saldo-section { padding: 14px 22px; background: #f8f6ef; border-top: 2px solid #c8a84b; }
    .saldo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .saldo-item { text-align: center; }
    .saldo-label { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
    .saldo-value { font-size: 15px; font-weight: 800; margin-top: 3px; }
    .saldo-ok { color: #16a34a; }
    .saldo-pending { color: #d97706; }
    .saldo-bar { height: 4px; border-radius: 2px; margin-top: 6px; background: #e5e7eb; overflow: hidden; }
    .saldo-bar-fill { height: 100%; background: linear-gradient(90deg, #c8a84b, #e8d080); border-radius: 2px; }

    /* ── Signatures ── */
    .sign-section { padding: 18px 22px 14px; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 14px; }
    .sign-box { text-align: center; }
    .sign-line { border-bottom: 1px solid #374151; height: 40px; margin-bottom: 6px; }
    .sign-name { font-size: 12px; font-weight: 700; color: #1a1a2e; }
    .sign-role { font-size: 10px; color: #6b7280; margin-top: 2px; }

    /* ── Footer ── */
    .footer-stripe { background: linear-gradient(90deg, #c8a84b 0%, #e8d080 50%, #c8a84b 100%); height: 3px; }
    .legal { padding: 10px 22px; font-size: 8.5px; color: #9ca3af; line-height: 1.6; text-align: justify; }

    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .page-wrapper { padding: 0; }
      .a4 { box-shadow: none; width: 100%; min-height: unset; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">Relatório — Cheque-Recibo ${cr.numero} · ${cr.nomeRecebedor}</span>
    <div style="display:flex;gap:10px">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="page-wrapper">
    <div class="a4">

      <!-- Header -->
      <div class="header-stripe-top"></div>
      <div class="header-main">
        <div class="header-divider">
          <div class="header-divider-line"></div>
          <div class="header-diamond">◆◆◆</div>
          <div class="header-divider-line"></div>
        </div>
        <div class="org-name">ASSOCIAÇÃO MISSÃO ÔMEGA</div>
        <div class="org-sub">TESOURARIA &nbsp;·&nbsp; FINANCEIRO</div>
        <div class="header-divider" style="margin-top:12px">
          <div class="header-divider-line"></div>
          <div class="header-diamond">◆</div>
          <div class="header-divider-line"></div>
        </div>
        <div class="report-label">RELATÓRIO DE CHEQUE-RECIBO</div>
        <div class="report-title">Comprovante de Saída e Prestação de Contas</div>
        <div class="cr-badge">${cr.numero}</div>
      </div>
      <div class="header-stripe-bottom"></div>
      <div class="gen-date">Gerado em: ${agora} &nbsp;·&nbsp; Emitido em: ${new Date(cr.createdAt).toLocaleDateString('pt-BR')}</div>

      <!-- Identificação -->
      <div class="section">
        <div class="section-title">Identificação do Cheque-Recibo</div>
        <div class="field-grid">
          <div>
            <div class="field-label">Número</div>
            <div class="field-value" style="font-family:monospace;font-size:14px;color:#be185d;font-weight:800">${cr.numero}</div>
          </div>
          <div>
            <div class="field-label">Data de Emissão</div>
            <div class="field-value">${new Date(cr.createdAt).toLocaleDateString('pt-BR')}</div>
          </div>
          <div>
            <div class="field-label">Acerto de Notas Fiscais</div>
            <div class="field-value" style="color:#b45309">${new Date(cr.dataAcertoNotas + (String(cr.dataAcertoNotas).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
      </div>

      <!-- Transferência -->
      <div class="section">
        <div class="section-title">Dados da Transferência</div>
        <div class="field-grid">
          <div>
            <div class="field-label">Operador / Tesoureiro</div>
            <div class="field-value">${cr.nomeOperador}</div>
          </div>
          <div>
            <div class="field-label">Data de Transferência</div>
            <div class="field-value">${new Date(cr.dataTransferencia + (String(cr.dataTransferencia).length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')}</div>
          </div>
          <div>
            <div class="field-label">Método</div>
            <div class="field-value">${cr.metodoTransferencia}</div>
          </div>
        </div>
        <div style="margin-top:12px;padding:10px 16px;background:#faf9f6;border-left:3px solid #c8a84b;border-radius:0 4px 4px 0;display:inline-block;min-width:220px">
          <div class="field-label">Valor Concedido</div>
          <div class="field-value-big">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cr.valorConcedido)}</div>
        </div>
      </div>

      <!-- Recebedor -->
      <div class="section">
        <div class="section-title">Dados do Recebedor</div>
        <div class="field-grid-2">
          <div>
            <div class="field-label">Nome Completo</div>
            <div class="field-value">${cr.nomeRecebedor}</div>
          </div>
          <div>
            <div class="field-label">CPF</div>
            <div class="field-value" style="font-family:monospace">${cr.cpfRecebedor}</div>
          </div>
        </div>
        ${cr.observacoes ? `
        <div style="margin-top:10px">
          <div class="field-label">Observações</div>
          <div class="field-value" style="color:#4b5563;font-weight:400">${cr.observacoes}</div>
        </div>` : ''}
      </div>

      <!-- Vinculação Projeto/Evento -->
      ${secaoVinculacao}

      <!-- Documentos Vinculados -->
      ${(cr.anexos ?? []).length > 0 ? `
      <div class="table-wrap">
        <div class="section-title" style="margin-bottom:10px">◆ Documentos / Notas Fiscais Vinculadas</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Descrição</th>
              <th>Arquivo</th>
              <th style="text-align:right">Valor</th>
              <th>Data</th>
              <th>Enviado por</th>
            </tr>
          </thead>
          <tbody>${linhasAnexos}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;font-size:10px;letter-spacing:1px">TOTAL DOCUMENTADO</td>
              <td style="text-align:right;color:#1a1a2e">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cr.totalDocumentos ?? 0)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>` : `<div class="no-docs">◆ Nenhum documento / nota fiscal vinculada até o momento.</div>`}

      <!-- Resumo Financeiro -->
      <div class="saldo-section">
        <div class="section-title" style="margin-bottom:12px">◆ Resumo Financeiro</div>
        <div class="saldo-grid">
          <div class="saldo-item">
            <div class="saldo-label">Valor Concedido</div>
            <div class="saldo-value" style="color:#1e3a8a">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cr.valorConcedido)}</div>
          </div>
          <div class="saldo-item">
            <div class="saldo-label">Total Documentado</div>
            <div class="saldo-value" style="color:#374151">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cr.totalDocumentos ?? 0)}</div>
          </div>
          <div class="saldo-item">
            <div class="saldo-label">Saldo Pendente</div>
            <div class="saldo-value ${saldoZero ? 'saldo-ok' : 'saldo-pending'}">${saldoZero ? '✓ R$ 0,00' : '-' + new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(saldo)}</div>
          </div>
        </div>
        ${!saldoZero && cr.valorConcedido > 0 ? `
        <div class="saldo-bar" style="margin-top:14px">
          <div class="saldo-bar-fill" style="width:${Math.min(100, Math.round(((cr.totalDocumentos ?? 0) / cr.valorConcedido) * 100))}%"></div>
        </div>
        <div style="text-align:right;font-size:9px;color:#9ca3af;margin-top:3px">${Math.min(100, Math.round(((cr.totalDocumentos ?? 0) / cr.valorConcedido) * 100))}% documentado</div>` : ''}
      </div>

      <!-- Assinaturas -->
      <div class="sign-section">
        <div class="section-title">◆ Autenticação &amp; Assinaturas</div>
        <div class="sign-grid">
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-name">${cr.nomeRecebedor}</div>
            <div class="sign-role">Recebedor — CPF: ${cr.cpfRecebedor}</div>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <div class="sign-name">${cr.nomeOperador}</div>
            <div class="sign-role">Operador / Tesoureiro AMO</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer-stripe"></div>
      <div class="legal">
        O valor recebido pelo recebedor deverá ser gasto exclusivamente em produtos e serviços em utilidade e prestação de serviço à Associação Missão Ômega em projetos, eventos ou atividades e despesas da organização. As notas de natureza fiscal deverão ser apresentadas e correlacionadas a este documento através do seu número de série. As notas fiscais e o valor restante deverão ser devolvidos à tesouraria e a soma das notas fiscais mais o valor restante deste cheque-recibo deverá ser igual ao valor concedido declarado neste documento. O cheque-recibo é emitido somente em situações quando a concessão de dinheiro em espécie é extremamente necessária em casos que pagamentos via meios digitais se torna complexo e inviável. No caso do recebedor não apresentar as notas fiscais mais o valor restante (se houver) até a data de "Acerto de Notas Fiscais" estabelecida neste documento, será considerado inadimplente e deverá restituir o valor concedido o mais breve possível à tesouraria da AMO.
        <br/><br/>
        <strong>Documento gerado pelo sistema AMO Application · Tesouraria AMO · ${agora}</strong>
      </div>

    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1000,height=1200')
  if (win) { win.document.write(html); win.document.close(); win.focus() }
}

function printChequeRecibo(cr: ChequeRecibo) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Cheque-Recibo ${cr.numero}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #e5e7eb; font-family: 'Courier New', Courier, monospace; color: #1a1a2e; font-size: 13px; }

    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #1a1a2e; color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px;
      font-family: system-ui, sans-serif; font-size: 14px;
    }
    .toolbar-title { font-weight: 600; }
    .toolbar-btns { display: flex; gap: 10px; }
    .btn-print {
      background: #be185d; color: white; border: none; border-radius: 6px;
      padding: 8px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-print:hover { background: #9d174d; }
    .btn-close {
      background: transparent; color: #9ca3af; border: 1px solid #374151;
      border-radius: 6px; padding: 8px 16px; font-size: 14px; cursor: pointer;
    }
    .btn-close:hover { color: white; border-color: #6b7280; }

    .page-wrapper { padding: 72px 24px 24px; display: flex; justify-content: center; }
    .a4 {
      background: white; width: 210mm; min-height: 297mm;
      padding: 12mm; box-shadow: 0 4px 32px rgba(0,0,0,0.18);
    }

    /* Header */
    .header {
      background: #c8d0dc;
      padding: 18px 24px 14px;
      text-align: center;
      border-bottom: 2px solid #1a1a2e;
    }
    .titulo {
      font-size: 28px; font-weight: 900; letter-spacing: 10px;
      color: #1a1a2e; font-family: Arial, sans-serif;
    }
    .subtitulo {
      font-size: 12px; font-weight: 700; letter-spacing: 5px;
      color: #1a1a2e; margin-top: 4px; font-family: Arial, sans-serif;
    }
    .numero-linha {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; margin-top: 12px; font-family: Arial, sans-serif;
      font-size: 13px; font-weight: 600; color: #1a1a2e;
    }
    .numero-badge {
      border: 2px solid #be185d; border-radius: 4px;
      padding: 3px 12px; color: #be185d;
      font-weight: 800; font-size: 14px; font-family: 'Courier New', monospace;
      letter-spacing: 1px;
    }

    /* Body */
    .body { padding: 16px 24px; border-bottom: 2px solid #1a1a2e; }
    .section-title {
      text-align: center; font-size: 13px; font-weight: 700;
      letter-spacing: 2px; margin-bottom: 16px;
      font-family: Arial, sans-serif;
    }
    .field-row {
      display: flex; align-items: center; margin-bottom: 10px;
      font-family: Arial, sans-serif;
    }
    .field-label {
      min-width: 200px; font-size: 12px; font-weight: 700;
      color: #1a1a2e; text-align: right; padding-right: 12px;
    }
    .field-value {
      flex: 1; font-size: 13px; color: #1e3a8a; font-weight: 600;
    }

    /* Auth */
    .auth { padding: 14px 24px; }
    .auth-title {
      text-align: center; font-size: 12px; font-weight: 700;
      letter-spacing: 2px; margin-bottom: 8px;
      font-family: Arial, sans-serif;
    }
    .auth-box {
      border: 1.5px solid #9ca3af; border-radius: 4px;
      min-height: 60px; margin-bottom: 14px;
    }
    .auth-sign-title {
      text-align: center; font-size: 12px; font-weight: 700;
      letter-spacing: 2px; margin-bottom: 18px;
      font-family: Arial, sans-serif;
    }
    .assinatura { text-align: center; margin-top: 8px; }
    .linha-assinatura {
      width: 280px; margin: 0 auto 8px;
      border-bottom: 1px solid #333;
    }
    .nome-assinatura { font-size: 14px; font-weight: 700; font-family: Arial, sans-serif; }
    .cpf-assinatura { font-size: 12px; color: #555; margin-top: 3px; font-family: Arial, sans-serif; }

    /* Legal */
    .legal {
      padding: 14px 24px 0;
      font-size: 9px; line-height: 1.6; color: #444;
      font-family: Arial, sans-serif; text-align: justify;
    }

    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .page-wrapper { padding: 0; }
      .a4 { box-shadow: none; width: 100%; min-height: unset; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">Cheque-Recibo ${cr.numero} — ${cr.nomeRecebedor}</span>
    <div class="toolbar-btns">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">Fechar</button>
    </div>
  </div>

  <div class="page-wrapper">
    <div class="a4">
      <!-- Header -->
      <div class="header">
        <div class="titulo">C H E Q U E - R E C I B O</div>
        <div class="subtitulo">T E S O U R A R I A &nbsp; A M O</div>
        <div class="numero-linha">
          <span>N° do Cheque-Recibo</span>
          <span class="numero-badge">${cr.numero}</span>
        </div>
      </div>

      <!-- Dados -->
      <div class="body">
        <div class="section-title">Comprovante de Recebimento de Valor (R$)</div>

        <div class="field-row">
          <div class="field-label">Nome do Operador/Tesoureiro:</div>
          <div class="field-value">${cr.nomeOperador}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Data de Transferência de crédito:</div>
          <div class="field-value">${new Date(cr.dataTransferencia + (cr.dataTransferencia.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Valor Concedido:</div>
          <div class="field-value">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cr.valorConcedido)}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Método de transferência:</div>
          <div class="field-value">${cr.metodoTransferencia}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Nome do Recebedor:</div>
          <div class="field-value">${cr.nomeRecebedor}</div>
        </div>
        <div class="field-row">
          <div class="field-label">CPF do Recebedor:</div>
          <div class="field-value">${cr.cpfRecebedor}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Data de Acerto de Notas Fiscais:</div>
          <div class="field-value">${new Date(cr.dataAcertoNotas + (cr.dataAcertoNotas.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR')}</div>
        </div>
        ${cr.observacoes ? `
        <div class="field-row">
          <div class="field-label">Observações:</div>
          <div class="field-value">${cr.observacoes}</div>
        </div>` : ''}
      </div>

      <!-- Autenticação Digital -->
      <div class="auth">
        <div class="auth-title">Autenticação Digital - GOV</div>
        <div class="auth-box"></div>

        <div class="auth-sign-title">Autenticação/Assinatura Física</div>
        <div class="assinatura">
          <div class="linha-assinatura"></div>
          <div class="nome-assinatura">${cr.nomeRecebedor}</div>
          <div class="cpf-assinatura">CPF: ${cr.cpfRecebedor}</div>
        </div>
      </div>

      <!-- Texto Legal -->
      <div class="legal">
        O valor recebido pelo recebedor deverá ser gasto exclusivamente em produtos e serviços em utilidade e prestação de serviço à Associação Missão Ômega em projetos, eventos ou atividades e despesas da organização. As notas de natureza fiscal deverão ser apresentadas e correlacionadas a este documento através do seu número de série. As notas fiscais e o valor restante deverão ser devolvidos à tesouraria e a soma das notas fiscais mais o valor restante deste cheque-recibo deverá ser igual ao valor concedido declarado neste documento. O cheque-recibo é emitido somente em situações quando a concessão de dinheiro em espécie é extremamente necessária em casos que pagamentos via meios digitais se torna complexo e inviável. No caso do recebedor não apresentar as notas fiscais mais o valor restante (se houver) até a data de &lsquo;Acerto de Notas Fiscais&rsquo; estabelecida neste documento, será considerado inadimplente e deverá restituir o valor concedido o mais breve possível à tesouraria da AMO. Em última instância, o conselho fiscal deliberará sobre tal fato se ocorrer.
      </div>
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=960,height=1100')
  if (win) { win.document.write(html); win.document.close(); win.focus() }
}

export default function ChequeReciboPage() {
  const [data, setData] = useState<ChequeRecibo[]>([])
  const [metodos, setMetodos] = useState<Metodo[]>([])
  const [loading, setLoading] = useState(true)
  const [proximoNumero, setProximoNumero] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChequeRecibo | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modalAlert, setModalAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [migrated, setMigrated] = useState(false)
  const [expandedAnexos, setExpandedAnexos] = useState<Record<string, boolean>>({})
  const [deletingAnexo, setDeletingAnexo] = useState<string | null>(null)
  const [projetos, setProjetos] = useState<ProjetoItem[]>([])
  const [eventos, setEventos] = useState<EventoItem[]>([])
  const [eventoAvulso, setEventoAvulso] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<'pendentes' | 'arquivados' | 'todos'>('pendentes')
  const [arquivando, setArquivando] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
    setModalAlert({ type, message: msg }); setTimeout(() => setModalAlert(null), 4000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rd, rm, rp, re] = await Promise.all([
        fetch('/api/cheque-recibo'),
        fetch('/api/auxiliares?tipo=metodos'),
        fetch('/api/projetos'),
        fetch('/api/eventos'),
      ])
      const [jd, jm, jp, je] = await Promise.all([rd.json(), rm.json(), rp.json(), re.json()])
      if (jd.success) { setData(jd.data); setProximoNumero(jd.proximo) }
      if (jm.success) setMetodos(jm.data)
      if (jp.success) setProjetos(jp.data.map((p: { id: string; nome: string }) => ({ id: p.id, nome: p.nome })))
      if (je.success) setEventos(je.data.map((e: { id: string; nome: string; projetoVinculadoId: string | null }) => ({ id: e.id, nome: e.nome, projetoVinculadoId: e.projetoVinculadoId ?? null })))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/migrate/cheque-recibo', { method: 'POST' }),
      fetch('/api/migrate/cheque-recibo-anexos', { method: 'POST' }),
    ])
      .then(() => setMigrated(true))
      .then(() => fetchData())
      .catch(() => { setMigrated(true); fetchData() })
  }, [fetchData])

  const eventosFiltrados = useMemo(() => {
    if (eventoAvulso) return eventos.filter(e => !e.projetoVinculadoId)
    if (form.projetoId) return eventos.filter(e => e.projetoVinculadoId === form.projetoId)
    return eventos
  }, [eventos, form.projetoId, eventoAvulso])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setEventoAvulso(false)
    setModalAlert(null)
    setModalOpen(true)
  }

  const openEdit = (cr: ChequeRecibo) => {
    setEditing(cr)
    setForm({
      nomeOperador: cr.nomeOperador,
      dataTransferencia: String(cr.dataTransferencia).slice(0, 10),
      valorConcedido: cr.valorConcedido.toFixed(2).replace('.', ','),
      metodoTransferencia: cr.metodoTransferencia,
      nomeRecebedor: cr.nomeRecebedor,
      cpfRecebedor: cr.cpfRecebedor,
      dataAcertoNotas: String(cr.dataAcertoNotas).slice(0, 10),
      observacoes: cr.observacoes || '',
      projetoId: cr.projetoId || '',
      eventoId: cr.eventoId || '',
    })
    setEventoAvulso(false)
    setModalAlert(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.nomeOperador || !form.dataTransferencia || !form.valorConcedido || !form.nomeRecebedor || !form.cpfRecebedor || !form.dataAcertoNotas) {
      showToast('Preencha todos os campos obrigatórios', 'error'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        valorConcedido: parseBRL(form.valorConcedido),
        observacoes: form.observacoes || null,
        projetoId: form.projetoId || null,
        eventoId: form.eventoId || null,
      }
      const url = editing ? `/api/cheque-recibo/${editing.id}` : '/api/cheque-recibo'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (j.success) {
        showToast(editing ? 'Atualizado com sucesso!' : `Cheque-Recibo ${j.numero} emitido!`)
        setModalOpen(false)
        fetchData()
      } else {
        showToast(j.error || 'Erro ao salvar', 'error')
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const r = await fetch(`/api/cheque-recibo/${id}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Removido com sucesso!'); setDeleteConfirm(null); fetchData() }
      else showToast(j.error || 'Erro ao remover', 'error')
    } catch { showToast('Erro ao remover', 'error') }
  }

  const handleDeleteAnexo = async (crId: string, anexoId: string) => {
    setDeletingAnexo(anexoId)
    try {
      const r = await fetch(`/api/cheque-recibo/${crId}/anexos/${anexoId}`, { method: 'DELETE' })
      const j = await r.json()
      if (j.success) { showToast('Anexo removido!'); fetchData() }
      else showToast(j.error || 'Erro ao remover anexo', 'error')
    } catch { showToast('Erro ao remover anexo', 'error') }
    finally { setDeletingAnexo(null) }
  }

  const handleArquivar = async (id: string) => {
    setArquivando(id)
    try {
      const r = await fetch(`/api/cheque-recibo/${id}`, { method: 'PATCH' })
      const j = await r.json()
      if (j.success) { showToast('Cheque-Recibo arquivado!'); fetchData() }
      else showToast(j.error || 'Erro ao arquivar', 'error')
    } catch { showToast('Erro ao arquivar', 'error') }
    finally { setArquivando(null) }
  }

  const toggleAnexos = (id: string) =>
    setExpandedAnexos(p => ({ ...p, [id]: !p[id] }))

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
          <Banknote className="w-7 h-7 text-navy-700" />
          <div>
            <h1 className="page-title">Cheque-Recibo</h1>
            <p className="text-sm text-navy-400">{data.length} registro{data.length !== 1 ? 's' : ''} · Próximo: <span className="font-mono font-semibold text-pink-700">{proximoNumero}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as 'pendentes' | 'arquivados' | 'todos')}
            className="form-input text-sm py-2 px-3 w-36"
          >
            <option value="pendentes">Pendentes</option>
            <option value="arquivados">Arquivados</option>
            <option value="todos">Todos</option>
          </select>
          <button onClick={openCreate} disabled={!migrated} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Cheque-Recibo
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-navy-400">Carregando...</div>
        ) : (() => {
          const filtrado = data.filter(cr =>
            filtroStatus === 'todos' ? true :
            filtroStatus === 'arquivados' ? cr.arquivado :
            !cr.arquivado
          )
          if (filtrado.length === 0) return (
            <div className="card text-center py-12">
              <Banknote className="w-12 h-12 text-navy-200 mx-auto mb-3" />
              <p className="text-navy-400 font-medium">
                {filtroStatus === 'arquivados' ? 'Nenhum Cheque-Recibo arquivado' :
                 filtroStatus === 'pendentes' ? 'Nenhum Cheque-Recibo pendente' :
                 'Nenhum Cheque-Recibo emitido ainda'}
              </p>
            </div>
          )
          return filtrado.map(cr => {
            const saldo = cr.valorConcedido - (cr.totalDocumentos ?? 0)
            const saldoZero = Math.abs(saldo) < 0.005
            const saldoNegativo = saldo < -0.005
            const anexosExpanded = expandedAnexos[cr.id]

            return (
            <div key={cr.id} className={`card hover:shadow-md transition-shadow ${cr.arquivado ? 'bg-emerald-50 border-emerald-200' : 'bg-[hsl(50,27%,96%)] border-[hsl(50,20%,84%)]'}`}>
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-block font-mono font-bold text-sm px-3 py-1 rounded border-2 border-pink-600 text-pink-700 bg-pink-50">
                      {cr.numero}
                    </span>
                    <span className="text-xs text-navy-400">emitido em {fmtDate(cr.createdAt)}</span>
                    {cr.arquivado && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5">
                        <Archive className="w-3 h-3" /> Arquivado
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">Operador/Tesoureiro</span>
                      <span className="text-navy-800 font-medium">{cr.nomeOperador}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">Recebedor</span>
                      <span className="text-navy-800 font-medium">{cr.nomeRecebedor}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">CPF do Recebedor</span>
                      <span className="text-navy-800 font-mono">{cr.cpfRecebedor}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">Valor Concedido</span>
                      <span className="text-navy-800 font-bold text-base">{fmtMoney(cr.valorConcedido)}</span>
                      {/* Saldo de documentos */}
                      <span className={`text-xs font-semibold mt-0.5 block ${saldoZero ? 'text-green-600' : saldoNegativo ? 'text-orange-600' : 'text-amber-600'}`}>
                        Saldo docs: {saldoZero ? 'R$ 0,00 ✓' : saldoNegativo ? `+${fmtMoney(Math.abs(saldo))}` : `-${fmtMoney(saldo)}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">Data de Transferência</span>
                      <span className="text-navy-800">{fmtDate(String(cr.dataTransferencia).slice(0, 10))}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 text-xs font-medium block flex items-center gap-1"><CalendarClock className="w-3 h-3 inline" /> Acerto de NF</span>
                      <span className="text-navy-800 font-medium">{fmtDate(String(cr.dataAcertoNotas).slice(0, 10))}</span>
                    </div>
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">Método</span>
                      <span className="text-navy-800">{cr.metodoTransferencia}</span>
                    </div>
                    {cr.observacoes && (
                      <div className="col-span-2">
                        <span className="text-navy-400 text-xs font-medium block">Observações</span>
                        <span className="text-navy-600 text-xs">{cr.observacoes}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-navy-400 text-xs font-medium block">Projeto</span>
                      <span className="text-navy-800 text-xs font-medium">{cr.projetoNome ?? 'Administração Geral'}</span>
                    </div>
                    {cr.eventoNome && (
                      <div>
                        <span className="text-navy-400 text-xs font-medium block">Evento</span>
                        <span className="text-navy-800 text-xs font-medium">{cr.eventoNome}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => printRelatorio(cr, cr.projetoNome ?? null, cr.eventoNome ?? null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-medium transition-colors"
                    title="Gerar Relatório do CR"
                  >
                    <FileDown className="w-4 h-4" /> Relatório
                  </button>
                  <button
                    onClick={() => printChequeRecibo(cr)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-sm font-medium transition-colors"
                    title="Visualizar / Imprimir"
                  >
                    <Printer className="w-4 h-4" /> Imprimir
                  </button>
                  <button
                    onClick={() => openEdit(cr)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-700 text-sm font-medium transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" /> Editar
                  </button>
                  {saldoZero && !cr.arquivado && (
                    <button
                      onClick={() => handleArquivar(cr.id)}
                      disabled={arquivando === cr.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors disabled:opacity-50"
                      title="Arquivar"
                    >
                      <Archive className="w-4 h-4" /> {arquivando === cr.id ? 'Arquivando...' : 'Arquivar'}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(cr.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </div>
              </div>

              {/* Anexos section */}
              <div className="mt-3 border-t border-cream-200 pt-3">
                <button
                  onClick={() => toggleAnexos(cr.id)}
                  className="flex items-center gap-2 text-xs font-medium text-navy-500 hover:text-navy-700 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {cr.anexos?.length ? (
                    <span>{cr.anexos.length} documento{cr.anexos.length !== 1 ? 's' : ''} vinculado{cr.anexos.length !== 1 ? 's' : ''} · Total: {fmtMoney(cr.totalDocumentos ?? 0)}</span>
                  ) : (
                    <span className="text-navy-400">Nenhum documento vinculado</span>
                  )}
                  {cr.anexos?.length > 0 && (
                    anexosExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 ml-1" />
                      : <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  )}
                </button>

                {anexosExpanded && cr.anexos?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {cr.anexos.map(anexo => (
                      <div key={anexo.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                        <FileIconSmall type={anexo.tipoArquivo} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-navy-800 truncate">{anexo.descricao}</p>
                          <p className="text-navy-400">{fmtSize(anexo.tamanhoArquivo)} · {fmtMoney(Number(anexo.valorDocumento))} · {new Date(anexo.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <a href={anexo.urlArquivo} target="_blank" rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-slate-200 text-navy-500 hover:text-navy-700 transition-colors shrink-0"
                          title="Abrir arquivo">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteAnexo(cr.id, anexo.id)}
                          disabled={deletingAnexo === anexo.id}
                          className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors shrink-0 disabled:opacity-50"
                          title="Remover anexo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )
          })
        })()}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar ${editing.numero}` : `Novo Cheque-Recibo · ${proximoNumero}`}
        size="lg"
        alert={modalAlert}
      >
        <div className="space-y-4">
          {/* Número (read-only quando criando) */}
          {!editing && (
            <div className="form-group">
              <label>Nº do Cheque-Recibo</label>
              <input
                type="text"
                value={proximoNumero}
                readOnly
                className="form-input bg-pink-50 text-pink-700 font-mono font-bold cursor-not-allowed"
              />
              <p className="text-xs text-navy-400 mt-1">Número gerado automaticamente ao emitir</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group col-span-2">
              <label>Nome do Operador/Tesoureiro <span className="required-star">*</span></label>
              <input
                type="text"
                placeholder="Nome completo do tesoureiro"
                value={form.nomeOperador}
                onChange={e => setForm(p => ({ ...p, nomeOperador: e.target.value }))}
                className="form-input"
              />
            </div>

            <DateInput
              label="Data de Transferência de Crédito"
              required
              value={form.dataTransferencia}
              onChange={v => setForm(p => ({ ...p, dataTransferencia: v }))}
            />

            <CurrencyInput
              label="Valor Concedido (R$)"
              required
              value={form.valorConcedido}
              onChange={v => setForm(p => ({ ...p, valorConcedido: v }))}
            />
          </div>

          <div className="form-group">
            <label>Método de Transferência <span className="required-star">*</span></label>
            {metodos.length > 0 ? (
              <select
                value={form.metodoTransferencia}
                onChange={e => setForm(p => ({ ...p, metodoTransferencia: e.target.value }))}
                className="form-input"
              >
                <option value="Espécie">Espécie</option>
                {metodos.map(m => (
                  <option key={m.id} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.metodoTransferencia}
                onChange={e => setForm(p => ({ ...p, metodoTransferencia: e.target.value }))}
                className="form-input"
              />
            )}
          </div>

          <div className="border-t border-cream-200 pt-4">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3">Dados do Recebedor</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2 md:col-span-1">
                <label>Nome do Recebedor <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.nomeRecebedor}
                  onChange={e => setForm(p => ({ ...p, nomeRecebedor: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="form-group col-span-2 md:col-span-1">
                <label>CPF do Recebedor <span className="required-star">*</span></label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={form.cpfRecebedor}
                  onChange={e => setForm(p => ({ ...p, cpfRecebedor: maskCPF(e.target.value) }))}
                  className="form-input font-mono"
                  maxLength={14}
                />
              </div>
            </div>
          </div>

          <DateInput
            label="Data Limite de Acerto de Notas Fiscais"
            required
            value={form.dataAcertoNotas}
            onChange={v => setForm(p => ({ ...p, dataAcertoNotas: v }))}
          />

          <div className="form-group">
            <label>Observações</label>
            <textarea
              rows={2}
              placeholder="Observações opcionais..."
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              className="form-input resize-none"
            />
          </div>

          {/* Projeto & Evento */}
          <div className="border-t border-cream-200 pt-4">
            <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5" /> Vinculação — Projeto &amp; Evento
            </p>
            <div className="form-group mb-3">
              <label>Projeto</label>
              <select
                value={form.projetoId}
                onChange={e => {
                  const newProjetoId = e.target.value
                  const filtrados = newProjetoId
                    ? eventos.filter(ev => ev.projetoVinculadoId === newProjetoId)
                    : []
                  const autoEvento = filtrados.length === 1 ? filtrados[0].id : ''
                  setForm(p => ({ ...p, projetoId: newProjetoId, eventoId: autoEvento }))
                  setEventoAvulso(false)
                }}
                className="form-input"
              >
                <option value="">Administração Geral</option>
                {projetos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              {/* Checkbox Evento Avulso */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="eventoAvulso"
                  checked={eventoAvulso}
                  onChange={e => {
                    const checked = e.target.checked
                    setEventoAvulso(checked)
                    if (checked) {
                      const avulsos = eventos.filter(ev => !ev.projetoVinculadoId)
                      const autoEvento = avulsos.length === 1 ? avulsos[0].id : ''
                      setForm(p => ({ ...p, projetoId: '', eventoId: autoEvento }))
                    } else {
                      setForm(p => ({ ...p, eventoId: '' }))
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-navy-600 cursor-pointer"
                />
                <label htmlFor="eventoAvulso" className="text-sm font-medium text-navy-600 cursor-pointer select-none">
                  Evento Avulso <span className="text-xs text-navy-400 font-normal">(sem vínculo com projeto)</span>
                </label>
              </div>
              <label>Evento</label>
              <select
                value={form.eventoId}
                onChange={e => setForm(p => ({ ...p, eventoId: e.target.value }))}
                className="form-input"
                disabled={!eventoAvulso && !form.projetoId && eventos.length > 0}
              >
                {/*
                  "Sem evento" aparece APENAS quando:
                  - Administração Geral (sem projeto) e sem checkbox avulso, OU
                  - Lista filtrada está vazia (fallback para qualquer caso sem eventos)
                */}
                {((!form.projetoId && !eventoAvulso) || eventosFiltrados.length === 0) && (
                  <option value="">Sem evento</option>
                )}
                {(form.projetoId || eventoAvulso) && eventosFiltrados.length > 1 && (
                  <option value="" disabled>— Selecione o evento —</option>
                )}
                {eventosFiltrados.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
              {!eventoAvulso && !form.projetoId && (
                <p className="text-xs text-navy-400 mt-1">Selecione um projeto ou marque "Evento Avulso" para filtrar eventos</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving
                ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : <Printer className="w-4 h-4" />}
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Emitir Cheque-Recibo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-navy-600">Tem certeza que deseja excluir este Cheque-Recibo? Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
