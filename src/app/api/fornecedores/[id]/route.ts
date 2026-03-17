import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const data = {
      nome:           body.nome,
      categoriaId:    body.categoriaId    || null,
      subcategoriaId: body.subcategoriaId || null,
      endereco:       body.endereco       || null,
      site:           body.site           || null,
      telefone:       body.telefone       || null,
      email:          body.email          || null,
      observacoes:    body.observacoes    || null,
      arquivosRef:    body.arquivosReferencia || body.arquivosRef || null,
    }
    const item = await prisma.fornecedor.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [c0, c1, c2, c3, c4] = await prisma.$transaction([
      prisma.despesaConsumo.count({ where: { fornecedorId: params.id } }),
      prisma.despesaDigital.count({ where: { fornecedorId: params.id } }),
      prisma.despesaLocacao.count({ where: { fornecedorId: params.id } }),
      prisma.despesaServicoExterno.count({ where: { fornecedorId: params.id } }),
      prisma.despesaCopaCozinha.count({ where: { fornecedorId: params.id } }),
    ])
    const total = c0 + c1 + c2 + c3 + c4
    if (total > 0) {
      const detail =
        (c0 > 0 ? `\n• Despesas de Consumo: ${c0}` : '') +
        (c1 > 0 ? `\n• Despesas Digitais: ${c1}` : '') +
        (c2 > 0 ? `\n• Despesas de Locação: ${c2}` : '') +
        (c2 > 0 ? `\n• Despesas de Serviços Externos: ${c2}` : '') +
        (c4 > 0 ? `\n• Despesas Copa/Cozinha: ${c4}` : '')
      return NextResponse.json({
        success: false,
        error: `Este fornecedor está em uso em ${total} registro(s) e não pode ser excluído.${detail}\n\nEdite ou remova esses registros antes de excluir este fornecedor.`
      }, { status: 400 })
    }
    await prisma.fornecedor.delete({ where: { id: params.id } })
    await logAudit("EXCLUIR", "Fornecedor", params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
