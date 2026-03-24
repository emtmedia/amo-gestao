import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { deleteFile } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; anexoId: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; pathArquivo: string | null }>>`
      SELECT id, "pathArquivo" FROM "ChequeReciboAnexo"
      WHERE id = ${params.anexoId} AND "chequeReciboId" = ${params.id}
    `
    if (!rows.length) return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })

    const anexo = rows[0]
    if (anexo.pathArquivo) {
      try { await deleteFile(anexo.pathArquivo) } catch { /* ignore storage errors */ }
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM "ChequeReciboAnexo" WHERE id = $1`, params.anexoId
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
