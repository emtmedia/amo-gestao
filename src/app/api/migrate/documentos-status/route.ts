import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "DocumentoAMO" ADD COLUMN IF NOT EXISTS "statusDocumento" TEXT DEFAULT 'ativo'`)
    return NextResponse.json({ success: true, message: 'Column statusDocumento added' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
