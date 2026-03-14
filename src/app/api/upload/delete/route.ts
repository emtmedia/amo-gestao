/**
 * DELETE /api/upload/delete
 * 
 * Remove um arquivo do Supabase Storage pelo path.
 * 
 * Body (JSON): { path: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteFile } from '@/lib/supabase-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { path } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path inválido.' }, { status: 400 })
    }

    await deleteFile(path)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[/api/upload/delete] Erro:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
