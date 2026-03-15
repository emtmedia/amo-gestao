import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ConsolidacaoProjeto" ADD COLUMN IF NOT EXISTS "valorAjuste" DOUBLE PRECISION`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ConsolidacaoEvento" ADD COLUMN IF NOT EXISTS "valorAjuste" DOUBLE PRECISION`)
    return NextResponse.json({ success: true, message: 'Colunas valorAjuste adicionadas.' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
