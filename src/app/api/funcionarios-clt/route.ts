import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.funcionarioCLT.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar registros' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateFields = ['dataNascimento', 'dataContratacao']
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === 'string') body[f] = new Date(body[f]).toISOString()
    }
    const numFields = ['orcamentoEstimado', 'valorLocacao', 'salarioMensal', 'medicaoMensal', 'orcamentoAnual']
    for (const f of numFields) {
      if (body[f] !== undefined && body[f] !== '') body[f] = parseFloat(body[f])
    }
    const optionals = ['email', 'observacoes', 'arquivosReferencia', 'linkSite', 'comentarios', 'outrosBeneficios', 'nomefantasia']
    for (const f of optionals) {
      if (body[f] === '') body[f] = null
    }
    const item = await prisma.funcionarioCLT.create({ data: body })
    await logAudit("CRIAR", "Colaborador CLT", item.id, `Criado: ${JSON.stringify(body).substring(0,200)}`)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST funcionarioCLT error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
