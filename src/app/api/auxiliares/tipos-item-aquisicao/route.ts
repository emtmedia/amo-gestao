import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "TipoItemAquisicao" ORDER BY "nome" ASC`)
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nome } = await request.json()
    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(`INSERT INTO "TipoItemAquisicao" ("id","nome","updatedAt") VALUES ($1,$2,NOW())`, id, nome)
    await logAudit('CRIAR', 'Tipo Item Aquisição', id, nome)
    return NextResponse.json({ success: true, data: { id, nome } })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
