import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    await prisma.$executeRawUnsafe(
      `UPDATE "Aquisicao" SET "descricao"=$2,"projetoId"=$3,"eventoId"=$4,"tipoItemId"=$5,"dataAquisicao"=$6,"contaBancariaId"=$7,"valorAquisicao"=$8,"metodoTransferenciaId"=$9,"modalidadePgto"=$10,"parcelas"=$11,"observacoes"=$12,"arquivosReferencia"=$13,"updatedAt"=NOW() WHERE "id"=$1`,
      params.id,
      body.descricao,
      body.projetoId || null,
      body.eventoId || null,
      body.tipoItemId,
      new Date(body.dataAquisicao),
      body.contaBancariaId,
      parseFloat(body.valorAquisicao),
      body.metodoTransferenciaId,
      body.modalidadePgto || 'À vista',
      body.parcelas ? parseInt(body.parcelas) : null,
      body.observacoes || null,
      body.arquivosReferencia || null,
    )
    await logAudit('EDITAR', 'Aquisição', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "Aquisicao" WHERE "id"=$1`, params.id)
    await logAudit('EXCLUIR', 'Aquisição', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
