import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'

const prisma = new PrismaClient()

export async function GET() {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(usuarios)
}
