import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateOTP } from '@/lib/auth'
import { sendEmail, otpEmailTemplate } from '@/lib/email'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senhaHash)
    if (!senhaOk) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const codigo = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Invalidate old OTPs
    await prisma.codigoOTP.updateMany({
      where: { usuarioId: usuario.id, usado: false },
      data: { usado: true }
    })

    // Create new OTP
    await prisma.codigoOTP.create({
      data: {
        id: crypto.randomUUID(),
        usuarioId: usuario.id,
        codigo,
        expiresAt
      }
    })

    await sendEmail({
      to: usuario.email,
      subject: 'Código de Verificação — AMO Gestão',
      html: otpEmailTemplate(usuario.nome, codigo)
    })

    return NextResponse.json({
      success: true,
      usuarioId: usuario.id,
      message: `Código enviado para ${usuario.email}`
    })
  } catch (error) {
    console.error('[login] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
