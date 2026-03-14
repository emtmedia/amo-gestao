import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { cidades } = await request.json()
    // createMany com skipDuplicates ignora nomes já existentes na mesma UF
    const result = await prisma.cidade.createMany({
      data: cidades, // [{ nome, ufId }, ...]
      skipDuplicates: true,
    })
    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
