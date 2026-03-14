import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.metodoTransferencia.findUnique({ where: { id: params.id } })
    if (!item) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const item = await prisma.metodoTransferencia.update({ where: { id: params.id }, data: { ...body, updatedAt: new Date() } })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const c0 = await prisma.receitaPublica.count({ where: { metodoTransferenciaId: params.id } })
    const c1 = await prisma.receitaPessoaFisica.count({ where: { metodoTransferenciaId: params.id } })
    const c2 = await prisma.receitaPessoaJuridica.count({ where: { metodoTransferenciaId: params.id } })
    const c3 = await prisma.receitaCurso.count({ where: { metodoTransferenciaId: params.id } })
    const c4 = await prisma.receitaProduto.count({ where: { metodoTransferenciaId: params.id } })
    const c5 = await prisma.receitaServico.count({ where: { metodoTransferenciaId: params.id } })
    const c6 = await prisma.receitaEvento.count({ where: { metodoTransferenciaId: params.id } })
    const c7 = await prisma.despesaConsumo.count({ where: { metodoTransferenciaId: params.id } })
    const c8 = await prisma.despesaDigital.count({ where: { metodoTransferenciaId: params.id } })
    const c9 = await prisma.despesaConservacao.count({ where: { metodoTransferenciaId: params.id } })
    const c10 = await prisma.despesaLocacao.count({ where: { metodoTransferenciaId: params.id } })
    const c11 = await prisma.despesaServicoExterno.count({ where: { metodoTransferenciaId: params.id } })
    const c12 = await prisma.despesaCopaCozinha.count({ where: { metodoTransferenciaId: params.id } })
    const total = c0 + c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + c9 + c10 + c11 + c12
    if (total > 0) {
      const detail = (c0 > 0 ? `\n• Receitas Públicas: ${c0}` : '') + (c1 > 0 ? `\n• Receitas Pessoa Física: ${c1}` : '') + (c2 > 0 ? `\n• Receitas Pessoa Jurídica: ${c2}` : '') + (c3 > 0 ? `\n• Receitas de Cursos: ${c3}` : '') + (c4 > 0 ? `\n• Receitas de Produtos: ${c4}` : '') + (c5 > 0 ? `\n• Receitas de Serviços: ${c5}` : '') + (c6 > 0 ? `\n• Receitas de Eventos: ${c6}` : '') + (c7 > 0 ? `\n• Despesas de Consumo: ${c7}` : '') + (c8 > 0 ? `\n• Despesas Digitais: ${c8}` : '') + (c9 > 0 ? `\n• Despesas de Conservação: ${c9}` : '') + (c10 > 0 ? `\n• Despesas de Locação: ${c10}` : '') + (c11 > 0 ? `\n• Despesas de Serviços Externos: ${c11}` : '') + (c12 > 0 ? `\n• Despesas Copa/Cozinha: ${c12}` : '')
      return NextResponse.json({
        success: false,
        error: `Este item está em uso em ${total} registro(s) e não pode ser excluído.${detail}\n\nEdite ou remova esses registros antes de excluir este item.`
      }, { status: 400 })
    }
    await prisma.metodoTransferencia.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
