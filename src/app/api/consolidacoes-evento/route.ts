import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.consolidacaoEvento.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projetoVinculado, dataConclusaoReal, dataLimiteAjuste, valorAjuste, saldoPositivo: _sp, ...rest } = body
    const item = await prisma.consolidacaoEvento.create({
      data: {
        ...rest,
        projetoVinculado: projetoVinculado || null,
        valorAjuste: valorAjuste ? parseFloat(String(valorAjuste)) : null,
        dataConclusaoReal: dataConclusaoReal ? new Date(dataConclusaoReal) : new Date(),
        dataLimiteAjuste: dataLimiteAjuste ? new Date(dataLimiteAjuste) : null,
      }
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
