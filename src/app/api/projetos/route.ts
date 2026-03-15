import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.projetoFilantropia.findMany({
      orderBy: { createdAt: 'desc' },
      include: { consolidacao: { select: { id: true, saldoOrcamento: true } } }
    })
    const withStatus = items.map(p => ({
      ...p,
      status: !p.consolidacao
        ? 'em_curso'
        : (p.consolidacao.saldoOrcamento ?? 0) >= 0
        ? 'encerrado_consolidado'
        : 'encerrado_pendente',
    }))
    return NextResponse.json({ success: true, data: withStatus })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateFields = ['dataInicio', 'dataEncerramento']
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === 'string') body[f] = new Date(body[f]).toISOString()
    }
    const numFields = ['orcamentoEstimado', 'valorLocacao', 'salarioMensal', 'medicaoMensal', 'orcamentoAnual']
    for (const f of numFields) {
      if (body[f] !== undefined && body[f] !== '') body[f] = parseFloat(body[f])
    }
    const optionals = ['email', 'observacoes', 'arquivosReferencia', 'linkSite', 'comentarios', 'outrosBeneficios']
    for (const f of optionals) {
      if (body[f] === '') body[f] = null
    }
    // Remove helper fields not in the schema
    delete body.ufId; delete body.cidadeId
    const item = await prisma.projetoFilantropia.create({ data: body })
    await logAudit("CRIAR", "Projeto", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST projeto error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
