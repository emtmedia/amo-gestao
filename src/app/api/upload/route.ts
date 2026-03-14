/**
 * POST /api/upload
 * 
 * Recebe um arquivo via FormData, faz upload para o Supabase Storage
 * e retorna a URL pública + path para futuro delete.
 * 
 * Body (multipart/form-data):
 *   file: File  — o arquivo
 *   folder?: string — subpasta (default: 'uploads')
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, ensureBucketExists } from '@/lib/supabase-storage'

// Limite de tamanho: 10 MB por arquivo
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    const folder    = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo: 10 MB. Tamanho enviado: ${(file.size / 1024 / 1024).toFixed(1)} MB` },
        { status: 400 }
      )
    }

    // Garante que o bucket existe (cria na primeira vez)
    await ensureBucketExists()

    // Converte o File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    // Faz upload
    const { url, path } = await uploadFile(buffer, file.name, file.type, folder)

    return NextResponse.json({
      ok:   true,
      url,
      path,
      name: file.name,
      type: file.type,
      size: file.size,
    })
  } catch (error: unknown) {
    console.error('[/api/upload] Erro:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
