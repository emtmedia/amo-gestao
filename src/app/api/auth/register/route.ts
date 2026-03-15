import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'

const prisma = new PrismaClient()

const ROLE_LIMITS: Record<string, number> = { superadmin: 1, admin: 3, user: 12 }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, senha, role: requestedRole } = body

    let userCount = 0
    try {
      userCount = await prisma.usuario.count()
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      return NextResponse.json({ error: 'Erro ao conectar ao banco de dados.', detail: msg }, { status: 500 })
    }

    // First user ever becomes superadmin
    const targetRole = userCount === 0 ? 'superadmin' : (requestedRole || 'user')

    if (userCount > 0) {
      const session = await getSession()
      if (!session) {
        return NextResponse.json({ error: 'Apenas administradores podem cadastrar novos usuários.' }, { status: 403 })
      }
      const callerRole = session.role
      // Hierarchy enforcement
      if (callerRole === 'user') {
        return NextResponse.json({ error: 'Usuários não podem criar outros usuários.' }, { status: 403 })
      }
      if (callerRole === 'admin' && targetRole !== 'user') {
        return NextResponse.json({ error: 'Administradores só podem criar perfis de Usuário.' }, { status: 403 })
      }
      if (callerRole !== 'superadmin' && targetRole === 'superadmin') {
        return NextResponse.json({ error: 'Apenas o SUPERADMIN pode criar outro SUPERADMIN.' }, { status: 403 })
      }
    }

    // Enforce limits
    if (targetRole in ROLE_LIMITS) {
      const count = await prisma.usuario.count({ where: { role: targetRole } })
      if (count >= ROLE_LIMITS[targetRole]) {
        return NextResponse.json({
          error: `Limite de ${ROLE_LIMITS[targetRole]} perfil(s) "${targetRole}" atingido.`
        }, { status: 400 })
      }
    }

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 })
    }
    if (senha.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, { status: 400 })
    }

    const existente = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existente) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })
    }

    const senhaHash = await bcrypt.hash(senha, 12)
    const usuario = await prisma.usuario.create({
      data: {
        id: crypto.randomUUID(),
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senhaHash,
        role: targetRole,
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }
    }, { status: 201 })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Erro interno do servidor.', detail: msg }, { status: 500 })
  }
}
