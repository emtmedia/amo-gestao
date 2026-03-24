import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Verifica se as credenciais fornecidas pertencem a um usuário ativo com role admin/superadmin.
// Usado para autorizar ações protegidas por usuários comuns.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false }, { status: 401 })

    const { email, senha } = await req.json()
    if (!email || !senha) return NextResponse.json({ success: false, error: 'Credenciais obrigatórias.' }, { status: 400 })

    const user = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (!user || !user.ativo) return NextResponse.json({ success: false })

    const roleNorm = user.role.toLowerCase()
    if (roleNorm !== 'admin' && roleNorm !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Usuário não possui permissão de administrador.' })
    }

    const ok = await bcrypt.compare(senha, user.senhaHash)
    return NextResponse.json({ success: ok, error: ok ? undefined : 'Credenciais inválidas.' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
