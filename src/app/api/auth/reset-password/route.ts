import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { token, novaSenha } = await req.json()

    if (!token || !novaSenha) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    if (novaSenha.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, { status: 400 })
    }

    const resetToken = await prisma.tokenResetSenha.findUnique({
      where: { token },
      include: { usuario: true }
    })

    if (!resetToken || resetToken.usado || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 400 })
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12)

    await prisma.usuario.update({
      where: { id: resetToken.usuarioId },
      data: { senhaHash }
    })

    await prisma.tokenResetSenha.update({
      where: { id: resetToken.id },
      data: { usado: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
