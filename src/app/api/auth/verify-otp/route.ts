import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { PrismaClient } from '@prisma/client'
import { createSession, COOKIE_NAME_EXPORT } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { usuarioId, codigo } = await req.json()

    if (!usuarioId || !codigo) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    // Find valid OTP
    const otp = await prisma.codigoOTP.findFirst({
      where: {
        usuarioId,
        codigo,
        usado: false,
        expiresAt: { gt: new Date() }
      },
      include: { usuario: true }
    })

    if (!otp) {
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 401 })
    }

    // Mark OTP as used
    await prisma.codigoOTP.update({
      where: { id: otp.id },
      data: { usado: true }
    })

    // Create JWT session
    const token = await createSession({
      userId: otp.usuario.id,
      email: otp.usuario.email,
      nome: otp.usuario.nome,
      role: otp.usuario.role
    })

    const response = NextResponse.json({ success: true })
    await logAudit('LOGIN', 'Sessão', otp.usuario.id, `Login: ${otp.usuario.email}`)
    response.cookies.set(COOKIE_NAME_EXPORT, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
