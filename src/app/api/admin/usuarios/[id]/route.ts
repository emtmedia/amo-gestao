import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/session'

const prisma = new PrismaClient()

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  const { ativo } = await req.json()
  const usuario = await prisma.usuario.update({
    where: { id: params.id },
    data: { ativo }
  })
  return NextResponse.json(usuario)
}
