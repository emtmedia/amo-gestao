import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRaw<{
      id: string; numero: string; sequencia: number
      voluntarioId: string; voluntarioNome: string; voluntarioCpf: string
      projetoNome: string | null; eventoNome: string | null
      emitidoEm: Date; createdAt: Date
    }[]>`SELECT * FROM "TermoVoluntariado" WHERE id = ${params.id}`
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, data: rows[0] })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Acesso negado. Somente Admin ou SuperAdmin pode editar termos.' }, { status: 403 })
    }
    const body = await request.json()
    await prisma.$executeRaw`
      UPDATE "TermoVoluntariado" SET
        "voluntarioNome" = ${body.voluntarioNome},
        "voluntarioCpf"  = ${body.voluntarioCpf},
        "projetoNome"    = ${body.projetoNome ?? null},
        "eventoNome"     = ${body.eventoNome ?? null},
        "emitidoEm"      = ${new Date(body.emitidoEm)}
      WHERE id = ${params.id}
    `
    await logAudit('EDITAR', 'Termo de Voluntariado', params.id, `Editado termo de ${body.voluntarioNome}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role.toLowerCase())) {
      return NextResponse.json({ success: false, error: 'Acesso negado. Somente Admin ou SuperAdmin pode excluir termos.' }, { status: 403 })
    }
    const rows = await prisma.$queryRaw<{ numero: string; voluntarioNome: string }[]>`
      SELECT numero, "voluntarioNome" FROM "TermoVoluntariado" WHERE id = ${params.id}
    `
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado' }, { status: 404 })
    await prisma.$executeRaw`DELETE FROM "TermoVoluntariado" WHERE id = ${params.id}`
    await logAudit('EXCLUIR', 'Termo de Voluntariado', rows[0].numero, `Excluído termo de ${rows[0].voluntarioNome}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
