import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, senha, role } = body

    console.log('[register] Attempting for:', email)

    let userCount = 0
    try {
      userCount = await prisma.usuario.count()
      console.log('[register] User count:', userCount)
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      console.error('[register] DB error:', msg)
      return NextResponse.json({
        error: 'Erro ao conectar ao banco de dados.',
        detail: msg
      }, { status: 500 })
    }

    if (userCount > 0) {
      const session = await getSession()
      if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas administradores podem cadastrar novos usuários.' }, { status: 403 })
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
        role: userCount === 0 ? 'admin' : (role || 'user'),
        updatedAt: new Date(),
      }
    })

    console.log('[register] Created:', usuario.id)
    return NextResponse.json({
      success: true,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }
    }, { status: 201 })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[register] Error:', msg)
    return NextResponse.json({ error: 'Erro interno do servidor.', detail: msg }, { status: 500 })
  }
}
