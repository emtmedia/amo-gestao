import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<{
      id: string; numero: string; sequencia: number; data: string; hora: string
      nomeRecebedor: string; cpfRecebedor: string; valor: number; descricao: string; createdAt: Date
    }[]>`SELECT * FROM "Recibo" WHERE id = ${params.id}`
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: rows[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    await prisma.$executeRaw`
      UPDATE "Recibo" SET
        "data"          = ${body.data},
        "hora"          = ${body.hora},
        "nomeRecebedor" = ${body.nomeRecebedor},
        "cpfRecebedor"  = ${body.cpfRecebedor},
        "valor"         = ${parseFloat(body.valor)},
        "descricao"     = ${body.descricao}
      WHERE id = ${params.id}
    `
    await logAudit('EDITAR', 'Recibo', params.id, `Editado recibo de ${body.nomeRecebedor}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Acesso negado. Somente Admin ou SuperAdmin pode excluir recibos.' }, { status: 403 })
    }
    await prisma.recibo.delete({ where: { id: params.id } })
    await logAudit('EXCLUIR', 'Recibo', params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
