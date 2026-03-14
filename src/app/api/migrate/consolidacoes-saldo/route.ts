import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ConsolidacaoProjeto" ADD COLUMN IF NOT EXISTS "saldoPositivo" BOOLEAN DEFAULT false`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ConsolidacaoEvento" ADD COLUMN IF NOT EXISTS "saldoPositivo" BOOLEAN DEFAULT false`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
