import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Find duplicates: same nome + ufId but different ids
    const dupes = await prisma.$queryRaw<{ nome: string; ufId: string; cnt: number; keep_id: string }[]>`
      SELECT nome, "ufId", COUNT(*)::int as cnt, MIN(id) as keep_id
      FROM "Cidade"
      GROUP BY nome, "ufId"
      HAVING COUNT(*) > 1
    `

    let totalRemoved = 0
    for (const dupe of dupes) {
      // Delete all except the oldest (keep_id)
      const result = await prisma.cidade.deleteMany({
        where: {
          nome: dupe.nome,
          ufId: dupe.ufId,
          id: { not: dupe.keep_id }
        }
      })
      totalRemoved += result.count
    }

    return NextResponse.json({
      success: true,
      message: `Removidas ${totalRemoved} cidades duplicadas de ${dupes.length} grupos.`,
      duplicateGroups: dupes.length,
      totalRemoved
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
