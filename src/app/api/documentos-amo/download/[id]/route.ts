import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = 'https://qwhiymkxudgckefwzcpk.supabase.co'
const BUCKET_NAME  = 'arquivos-referencia'

function getKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

// Extract storage path from pathArquivo or from URL
function extractPath(doc: { pathArquivo?: string | null; urlArquivo: string }): string | null {
  if (doc.pathArquivo) return doc.pathArquivo

  // Try: .../object/public/<bucket>/<path>
  const markers = [
    `/object/public/${BUCKET_NAME}/`,
    `/object/sign/${BUCKET_NAME}/`,
    `/${BUCKET_NAME}/`,
  ]
  for (const m of markers) {
    const idx = doc.urlArquivo.indexOf(m)
    if (idx !== -1) return doc.urlArquivo.slice(idx + m.length).split('?')[0]
  }
  return null
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await prisma.documentoAMO.findUnique({ where: { id: params.id } })
    if (!doc) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

    // If placeholder or no real URL, fail clearly
    if (!doc.urlArquivo || !doc.urlArquivo.startsWith('http')) {
      return NextResponse.json({ error: 'Este documento não possui arquivo armazenado.' }, { status: 400 })
    }

    const key = getKey()
    const storagePath = extractPath(doc)

    // Try signed URL first (works even if bucket is private)
    if (storagePath && key) {
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

      if (res.ok) {
        const json = await res.json()
        // signedURL may be "/object/sign/..." or a full URL
        const signedUrl = json.signedURL?.startsWith('http')
          ? json.signedURL
          : `${SUPABASE_URL}/storage/v1${json.signedURL}`
        return NextResponse.redirect(signedUrl)
      }
    }

    // Fallback: redirect directly to stored URL
    return NextResponse.redirect(doc.urlArquivo)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
