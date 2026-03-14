import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const tipo = request.nextUrl.searchParams.get('tipo')
  try {
    let data
    switch (tipo) {
      case 'cargos': data = await prisma.cargo.findMany({ orderBy: { nome: 'asc' } }); break
      case 'funcoes': data = await prisma.funcaoEmprego.findMany({ orderBy: { nome: 'asc' } }); break
      case 'metodos': data = await prisma.metodoTransferencia.findMany({ orderBy: { nome: 'asc' } }); break
      case 'condicoes': data = await prisma.condicaoReceita.findMany({ orderBy: { nome: 'asc' } }); break
      case 'cursos': data = await prisma.cursoTreinamento.findMany({ orderBy: { nome: 'asc' } }); break
      case 'produtos': data = await prisma.produto.findMany({ orderBy: { nome: 'asc' } }); break
      case 'servicos': data = await prisma.servico.findMany({ orderBy: { nome: 'asc' } }); break
      case 'tiposConsumo': data = await prisma.tipoServicoConsumo.findMany({ orderBy: { nome: 'asc' } }); break
      case 'tiposDigital': data = await prisma.tipoServicoDigital.findMany({ orderBy: { nome: 'asc' } }); break
      case 'tiposManutencao': data = await prisma.tipoServicoManutencao.findMany({ orderBy: { nome: 'asc' } }); break
      case 'itensAlugados': data = await prisma.itemAlugado.findMany({ orderBy: { nome: 'asc' } }); break
      case 'servicosPrestados': data = await prisma.servicoPrestado.findMany({ orderBy: { nome: 'asc' } }); break
      case 'itensCopa': data = await prisma.itemCopaCozinha.findMany({ orderBy: { nome: 'asc' } }); break
      case 'tiposImovel': data = await prisma.tipoImovel.findMany({ orderBy: { nome: 'asc' } }); break
      case 'locadoPara': data = await prisma.locadoPara.findMany({ orderBy: { nome: 'asc' } }); break
      case 'propositos': data = await prisma.proposiloLocacao.findMany({ orderBy: { nome: 'asc' } }); break
      case 'benfeitorias': data = await prisma.condicaoBenfeitoria.findMany({ orderBy: { nome: 'asc' } }); break
      default: return NextResponse.json({ success: false, error: 'Tipo não encontrado' }, { status: 400 })
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
