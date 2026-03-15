import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false }, { status: 401 })
    const { password } = await req.json()
    const user = await prisma.usuario.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ success: false }, { status: 404 })
    const ok = await bcrypt.compare(password, user.senhaHash)
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 401 })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
