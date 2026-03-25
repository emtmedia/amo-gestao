import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/session'
import { uploadFile, deleteFile, ensureBucketExists } from '@/lib/supabase-storage'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'Arquivo não enviado.' }, { status: 400 })
    if (file.type !== 'application/pdf')
      return NextResponse.json({ success: false, error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })

    // Busca o recibo para confirmar que existe e pegar path anterior
    const rows = await prisma.$queryRaw<{ id: string; numero: string; docAssinadoPath: string | null }[]>`
      SELECT id, numero, "docAssinadoPath" FROM "Recibo" WHERE id = ${params.id}
    `
    if (!rows.length) return NextResponse.json({ success: false, error: 'Recibo não encontrado.' }, { status: 404 })
    const recibo = rows[0]

    // Remove arquivo anterior se existir
    if (recibo.docAssinadoPath) {
      await deleteFile(recibo.docAssinadoPath).catch(() => {})
    }

    await ensureBucketExists()
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, path } = await uploadFile(buffer, file.name, 'application/pdf', 'docs-assinados/recibos')

    await prisma.$executeRaw`
      UPDATE "Recibo" SET
        "docAssinadoUrl"  = ${url},
        "docAssinadoPath" = ${path},
        "docAssinadoNome" = ${file.name}
      WHERE id = ${params.id}
    `

    await logAudit('EDITAR', 'Recibo', recibo.numero, `Documento assinado anexado por ${session.nome}`)
    return NextResponse.json({ success: true, url, nome: file.name })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'superadmin'].includes(session.role.toLowerCase()))
      return NextResponse.json({ success: false, error: 'Somente Admin pode remover documentos assinados.' }, { status: 403 })

    const rows = await prisma.$queryRaw<{ numero: string; docAssinadoPath: string | null }[]>`
      SELECT numero, "docAssinadoPath" FROM "Recibo" WHERE id = ${params.id}
    `
    if (!rows.length) return NextResponse.json({ success: false, error: 'Não encontrado.' }, { status: 404 })

    if (rows[0].docAssinadoPath) await deleteFile(rows[0].docAssinadoPath).catch(() => {})

    await prisma.$executeRaw`
      UPDATE "Recibo" SET "docAssinadoUrl" = NULL, "docAssinadoPath" = NULL, "docAssinadoNome" = NULL
      WHERE id = ${params.id}
    `
    await logAudit('EDITAR', 'Recibo', rows[0].numero, `Documento assinado removido por ${session.nome}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
