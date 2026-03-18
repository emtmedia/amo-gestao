import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = 'https://qwhiymkxudgckefwzcpk.supabase.co'
const BUCKET_NAME  = 'arquivos-referencia'

function getKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  return key
}

// Extract storage path from full public URL, or use pathArquivo directly
function extractPath(doc: { pathArquivo?: string | null; urlArquivo: string }): string | null {
  if (doc.pathArquivo) return doc.pathArquivo

  // Try to extract from URL: .../object/public/<bucket>/<path>
  const marker = `/object/public/${BUCKET_NAME}/`
  const idx = doc.urlArquivo.indexOf(marker)
  if (idx !== -1) return doc.urlArquivo.slice(idx + marker.length)

  return null
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await prisma.documentoAMO.findUnique({ where: { id: params.id } })
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

    const storagePath = extractPath(doc)

    // If no storage path (e.g. placeholder URL), redirect directly — will likely fail but is the best we can do
    if (!storagePath || !doc.urlArquivo.startsWith('http')) {
      return NextResponse.json({ error: 'Arquivo não disponível no storage.' }, { status: 400 })
    }

    const key = getKey()

    // Create a signed URL valid for 1 hour
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    )

    if (!res.ok) {
      // Fallback: redirect to public URL directly
      return NextResponse.redirect(doc.urlArquivo)
    }

    const json = await res.json()
    const signedUrl = `${SUPABASE_URL}/storage/v1${json.signedURL}`

    return NextResponse.redirect(signedUrl)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
