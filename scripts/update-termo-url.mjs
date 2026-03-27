/**
 * Updates the DocumentoAMO record with the real uploaded file URL.
 * Run: node scripts/update-termo-url.mjs
 */
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let val = trimmed.slice(eqIdx + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
  process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qwhiymkxudgckefwzcpk.supabase.co'
const BUCKET       = 'arquivos-referencia'
const STORAGE_PATH = 'documentos-amo/Template_Termo_Voluntariado.docx'
const PUBLIC_URL   = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${STORAGE_PATH}`

const prisma = new PrismaClient()

try {
  // Find the document
  const doc = await prisma.documentoAMO.findFirst({
    where: { id: '767cdb77-09bd-47cf-88ba-425c591d651a' }
  })

  if (!doc) {
    console.log('Documento não encontrado. Listando todos os títulos:')
    const all = await prisma.documentoAMO.findMany({ select: { id: true, titulo: true, urlArquivo: true } })
    all.forEach(d => console.log(' -', d.id, '|', d.titulo, '|', d.urlArquivo?.slice(0, 60)))
    process.exit(1)
  }

  console.log('Documento encontrado:', doc.id, '|', doc.titulo)
  console.log('URL atual:', doc.urlArquivo)

  const updated = await prisma.documentoAMO.update({
    where: { id: doc.id },
    data: {
      urlArquivo:    PUBLIC_URL,
      pathArquivo:   STORAGE_PATH,
      nomeArquivo:   'Template_Termo_Voluntariado.docx',
      tipoArquivo:   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamanhoArquivo: 10510,
    }
  })

  console.log('✅ Registro atualizado com sucesso!')
  console.log('Nova URL:', updated.urlArquivo)
} finally {
  await prisma.$disconnect()
}
