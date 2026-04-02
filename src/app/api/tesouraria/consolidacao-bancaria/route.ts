import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Gera etiquetas sequenciais: A, B...Z, A1, B1...Z1, A2...
function debitLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const cycle = Math.floor(index / 26)
  const letter = letters[index % 26]
  return cycle === 0 ? letter : `${letter}${cycle}`
}

// Gera etiquetas numéricas para créditos: 1, 2, 3...
function creditLabel(index: number): string {
  return String(index + 1)
}

// Converte arquivo OFX para texto legível
function parseOFX(text: string): string {
  // Remove headers SGML, extrai transações
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const transactions: string[] = []
  let current: Record<string, string> = {}

  for (const line of lines) {
    if (line === '<STMTTRN>') {
      current = {}
    } else if (line === '</STMTTRN>') {
      if (current.DTPOSTED && current.TRNAMT) {
        const date = current.DTPOSTED.slice(0, 8)
        const formattedDate = `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`
        const amount = parseFloat(current.TRNAMT)
        const memo = current.MEMO || current.NAME || 'Sem descrição'
        transactions.push(`${formattedDate} | ${amount > 0 ? 'Crédito' : 'Débito'}: ${Math.abs(amount).toFixed(2)} | ${memo}`)
      }
      current = {}
    } else {
      const match = line.match(/^<([^>]+)>(.+)$/)
      if (match) current[match[1]] = match[2]
    }
  }

  if (transactions.length === 0) {
    return text.slice(0, 8000) // fallback: envia texto bruto truncado
  }

  return `Extrato OFX - ${transactions.length} transações:\n` + transactions.join('\n')
}

const SYSTEM_PROMPT = `Você é especialista em análise de extratos bancários brasileiros.
Analise o extrato fornecido e classifique CADA lançamento.

REGRAS DE CLASSIFICAÇÃO:
1. DÉBITO REAL: encargos bancários, IOF, taxas, pagamento de faturas de cartão, saques, TED/PIX para terceiros, tarifas
2. CRÉDITO REAL: PIX/TED recebido de terceiros, salário, reembolsos, cashback/pontos recebidos
3. NEUTRO: saldo inicial/final, registros informativos (COD. LANC. 0, etc.)
4. EXCLUIR como débito: transferências PARA conta de investimento própria (poupança, CDB, LCI, LCA, tesouro direto)
5. EXCLUIR como crédito: resgates DE conta de investimento própria para conta corrente

Retorne SOMENTE JSON válido, sem markdown, sem texto extra, no seguinte formato:
{
  "bank": "nome do banco",
  "period": "período (ex: 03/2026)",
  "transactions": [
    {
      "date": "DD/MM/AAAA",
      "description": "descrição completa do lançamento",
      "debit": número ou null,
      "credit": número ou null,
      "balance": número ou null,
      "type": "debit" | "credit" | "neutral",
      "reason": "breve justificativa da classificação"
    }
  ],
  "summary": {
    "totalDebits": número,
    "totalCredits": número,
    "debitCount": número,
    "creditCount": número
  },
  "notes": "observações importantes sobre a conta (cheque especial, padrões, etc.)"
}`

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === '[SUA_ANTHROPIC_API_KEY]') {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    const MAX_MB = 20
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Arquivo muito grande. Máximo ${MAX_MB}MB.` }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let userContent: unknown[]

    if (ext === 'pdf') {
      // PDF nativo via Claude document API
      const base64 = buffer.toString('base64')
      userContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        {
          type: 'text',
          text: 'Analise este extrato bancário e retorne o JSON conforme instruído.',
        },
      ]
    } else if (ext === 'ofx') {
      // OFX: parse para texto
      const text = buffer.toString('utf-8')
      const parsed = parseOFX(text)
      userContent = [
        {
          type: 'text',
          text: `Arquivo OFX do extrato bancário:\n\n${parsed}\n\nAnalise e retorne o JSON conforme instruído.`,
        },
      ]
    } else if (['xlsx', 'xls'].includes(ext)) {
      // Excel: parse com xlsx
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      const truncated = csv.slice(0, 12000)
      userContent = [
        {
          type: 'text',
          text: `Planilha Excel do extrato bancário (convertida para CSV):\n\n${truncated}\n\nAnalise e retorne o JSON conforme instruído.`,
        },
      ]
    } else {
      return NextResponse.json({ error: 'Formato não suportado. Use PDF, OFX, XLS ou XLSX.' }, { status: 400 })
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json({ error: err.error?.message || 'Erro na API do Claude.' }, { status: 500 })
    }

    const claudeData = await claudeRes.json() as { content: Array<{ type: string; text?: string }> }
    const rawText = claudeData.content?.find(c => c.type === 'text')?.text ?? ''

    // Extrai JSON da resposta (Claude pode incluir texto extra ocasionalmente)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Não foi possível extrair dados estruturados do extrato.' }, { status: 500 })
    }

    const analysis = JSON.parse(jsonMatch[0]) as {
      bank: string
      period: string
      transactions: Array<{
        date: string
        description: string
        debit: number | null
        credit: number | null
        balance: number | null
        type: 'debit' | 'credit' | 'neutral'
        reason: string
      }>
      summary: {
        totalDebits: number
        totalCredits: number
        debitCount: number
        creditCount: number
      }
      notes: string
    }

    // Adiciona labels sequenciais
    let debitIndex = 0
    let creditIndex = 0
    const transactions = analysis.transactions.map(t => {
      if (t.type === 'debit') {
        return { ...t, label: debitLabel(debitIndex++) }
      } else if (t.type === 'credit') {
        return { ...t, label: creditLabel(creditIndex++) }
      }
      return { ...t, label: null }
    })

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      fileSize: file.size,
      bank: analysis.bank,
      period: analysis.period,
      transactions,
      summary: analysis.summary,
      notes: analysis.notes,
    })
  } catch (error) {
    console.error('[consolidacao-bancaria] Erro:', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
