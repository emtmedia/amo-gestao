import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── GET: carrega uma consolidação completa ───────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const record = await prisma.consolidacaoBancaria.findUnique({ where: { id: params.id } })
    if (!record) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 })

    return NextResponse.json({
      ok: true,
      id: record.id,
      fileName: record.fileName,
      fileSize: record.fileSize,
      bank: record.bank,
      period: record.period,
      transactions: JSON.parse(record.transactions),
      summary: JSON.parse(record.summary),
      notes: record.notes,
      criadoPorNome: record.criadoPorNome,
      createdAt: record.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('[consolidacao-bancaria GET id]', error)
    return NextResponse.json({ error: 'Erro ao carregar consolidação.' }, { status: 500 })
  }
}

// ─── DELETE: exclui uma consolidação ─────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 })
    }

    const record = await prisma.consolidacaoBancaria.findUnique({ where: { id: params.id } })
    if (!record) return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 })

    await prisma.consolidacaoBancaria.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[consolidacao-bancaria DELETE]', error)
    return NextResponse.json({ error: 'Erro ao excluir consolidação.' }, { status: 500 })
  }
}
