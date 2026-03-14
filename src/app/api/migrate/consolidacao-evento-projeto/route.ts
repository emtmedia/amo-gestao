import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ConsolidacaoEvento"
      ADD COLUMN IF NOT EXISTS "projetoVinculado" TEXT;
    `)
    return NextResponse.json({ success: true, message: 'Coluna adicionada com sucesso.' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
