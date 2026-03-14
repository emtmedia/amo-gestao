import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entity = searchParams.get('entity')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    
    const where: string[] = []
    const params: unknown[] = []
    
    if (entity) {
      where.push(`"entity" = $${params.length + 1}`)
      params.push(entity)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    
    const logs = await prisma.$queryRawUnsafe<{
      id: string; userId: string | null; userName: string; action: string
      entity: string; entityId: string | null; details: string | null; createdAt: Date
    }[]>(
      `SELECT * FROM "AuditLog" ${whereClause} ORDER BY "createdAt" DESC LIMIT ${limit}`,
      ...params
    )
    
    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
