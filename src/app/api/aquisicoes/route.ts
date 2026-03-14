import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "Aquisicao" ORDER BY "createdAt" DESC`)
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Aquisicao" ("id","descricao","projetoId","eventoId","tipoItemId","dataAquisicao","contaBancariaId","valorAquisicao","metodoTransferenciaId","modalidadePgto","parcelas","observacoes","arquivosReferencia","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`,
      id,
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
    await logAudit('CRIAR', 'Aquisição', id, `Criado: ${body.descricao}`)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
