import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.receitaPublica.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    // Converte datas string → DateTime ISO
    const dateFields = ['dataEntrada']
    for (const f of dateFields) {
      if (body[f] && typeof body[f] === 'string') body[f] = new Date(body[f]).toISOString()
    }
    // Remove campos que não devem ser atualizados
    delete body.id; delete body.createdAt; delete body.updatedAt
    // Opcionais: string vazia → null
    const optionals = ['email','emailContato','emailResponsavel','observacoes','nomeContato','telefoneContato','arquivosReferencia','projetoDirecionado','eventoDirecionado','linkSite','comentarios','outrosBeneficios','nomefantasia','ufId','cidadeId']
    for (const f of optionals) {
      if (body[f] === '') body[f] = null
    }
    // Numéricos
    const numFields = ['valorRecurso','valorReceita','valorContribuicao','valorTitulo','valorLocacao','valorPagamento','orcamentoEstimado','salarioMensal','medicaoMensal','orcamentoAnual']
    for (const f of numFields) {
      if (body[f] !== undefined && body[f] !== '' && body[f] !== null) body[f] = parseFloat(body[f])
    }
    const item = await prisma.receitaPublica.update({ where: { id: params.id }, data: body })
    await logAudit("EDITAR", "Receita Pública", params.id)
    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('PUT receitaPublica error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.receitaPublica.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Receita Pública", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao deletar' }, { status: 500 })
  }
}
