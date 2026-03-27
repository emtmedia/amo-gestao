import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    type Row = { nomeRecebedor: string }
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT DISTINCT "nomeRecebedor" FROM "ChequeRecibo"
      ORDER BY "nomeRecebedor" ASC
    `
    return NextResponse.json({ success: true, data: rows.map(r => r.nomeRecebedor) })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}
