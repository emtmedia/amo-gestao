import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { nome } = await request.json()
    await prisma.$executeRawUnsafe(`UPDATE "TipoItemAquisicao" SET "nome"=$2,"updatedAt"=NOW() WHERE "id"=$1`, params.id, nome)
    await logAudit('EDITAR', 'Tipo Item Aquisição', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inUse = await prisma.$queryRawUnsafe<[{count: bigint}]>(`SELECT COUNT(*) as count FROM "Aquisicao" WHERE "tipoItemId"=$1`, params.id)
    if (Number(inUse[0]?.count) > 0) return NextResponse.json({ success: false, error: 'Tipo em uso em aquisições.' }, { status: 400 })
    await prisma.$executeRawUnsafe(`DELETE FROM "TipoItemAquisicao" WHERE "id"=$1`, params.id)
    await logAudit('EXCLUIR', 'Tipo Item Aquisição', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
