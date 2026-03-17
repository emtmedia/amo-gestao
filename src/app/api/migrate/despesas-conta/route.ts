import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const tables = [
      'DespesaConsumo', 'DespesaDigital', 'DespesaConservacao',
      'DespesaLocacao', 'DespesaServicoExterno', 'DespesaCopaCozinha'
    ]
    for (const table of tables) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "contaBancariaId" TEXT`
      )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
