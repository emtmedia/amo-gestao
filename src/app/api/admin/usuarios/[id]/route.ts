import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'

const prisma = new PrismaClient()

const ROLE_HIERARCHY: Record<string, number> = { superadmin: 3, admin: 2, user: 1 }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  const target = await prisma.usuario.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const callerLevel = ROLE_HIERARCHY[session.role] ?? 0
  const targetLevel = ROLE_HIERARCHY[target.role] ?? 0
  if (targetLevel >= callerLevel) {
    return NextResponse.json({ error: 'Sem permissão para alterar este usuário.' }, { status: 403 })
  }
  const body = await req.json()
  const data: { ativo?: boolean; role?: string } = {}

  if ('ativo' in body) data.ativo = body.ativo

  if ('role' in body) {
    if (session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Somente SuperAdmin pode alterar o perfil de usuários.' }, { status: 403 })
    }
    const novoRole = String(body.role)
    if (!['admin', 'user'].includes(novoRole)) {
      return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 })
    }
    data.role = novoRole
  }

  const usuario = await prisma.usuario.update({ where: { id: params.id }, data })
  return NextResponse.json(usuario)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  const target = await prisma.usuario.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
  const callerLevel = ROLE_HIERARCHY[session.role] ?? 0
  const targetLevel = ROLE_HIERARCHY[target.role] ?? 0
  if (targetLevel >= callerLevel) {
    return NextResponse.json({ error: 'Sem permissão para excluir este usuário.' }, { status: 403 })
  }
  await prisma.usuario.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
