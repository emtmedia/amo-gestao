import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export type AuditAction = 'CRIAR' | 'EDITAR' | 'EXCLUIR' | 'ARQUIVAR' | 'CONFIGURAÇÃO' | 'LOGIN' | 'LOGOUT'

export async function logAudit(
  action: AuditAction,
  entity: string,
  entityId?: string | null,
  details?: string | null
) {
  try {
    const session = await getSession().catch(() => null)
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" ("id","userId","userName","action","entity","entityId","details","createdAt") VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,NOW())`,
      session?.userId || null,
      session?.nome || 'Sistema',
      action,
      entity,
      entityId || null,
      details || null
    )
  } catch (e) {
    console.error('AuditLog error:', e)
    // Never fail the main operation because of audit logging
  }
}
