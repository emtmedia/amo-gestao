import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateResetToken } from '@/lib/auth'
import { sendEmail, resetPasswordEmailTemplate } from '@/lib/email'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ success: true }) // don't reveal if email exists
    }

    await prisma.tokenResetSenha.updateMany({
      where: { usuarioId: usuario.id, usado: false },
      data: { usado: true }
    })

    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.tokenResetSenha.create({
      data: {
        id: crypto.randomUUID(),
        usuarioId: usuario.id,
        token,
        expiresAt
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://amo-gestao-sigma.vercel.app'
    const link = `${baseUrl}/reset-senha?token=${token}`

    await sendEmail({
      to: usuario.email,
      subject: 'Redefinir Senha — AMO Gestão',
      html: resetPasswordEmailTemplate(usuario.nome, link)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[forgot-password] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
