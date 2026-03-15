import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// One-time route: promotes the first (and only) admin to superadmin
// Safe to call multiple times — only acts if there is exactly 1 user with role 'admin' and no superadmin exists
export async function GET() {
  try {
    const superadminCount = await prisma.usuario.count({ where: { role: 'superadmin' } })
    if (superadminCount > 0) {
      return NextResponse.json({ success: false, message: 'Já existe um superadmin. Nenhuma alteração feita.' })
    }

    const admins = await prisma.usuario.findMany({ where: { role: 'admin' } })
    if (admins.length !== 1) {
      return NextResponse.json({ success: false, message: `Esperado 1 admin, encontrado ${admins.length}. Operação cancelada.` })
    }

    await prisma.usuario.update({
      where: { id: admins[0].id },
      data: { role: 'superadmin' }
    })

    return NextResponse.json({ success: true, message: `Usuário "${admins[0].nome}" promovido para superadmin.` })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
