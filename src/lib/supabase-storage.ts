/**
 * supabase-storage.ts
 * 
 * Helper para operações no Supabase Storage via HTTP REST API direta.
 * Não usa SDK — apenas fetch nativo do Node.js.
 * 
 * Bucket: arquivos-referencia (public)
 */

const SUPABASE_URL  = 'https://qwhiymkxudgckefwzcpk.supabase.co'
const BUCKET_NAME   = 'arquivos-referencia'

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada nas variáveis de ambiente.')
  return key
}

/** Cria o bucket se não existir. Retorna true se OK. */
export async function ensureBucketExists(): Promise<boolean> {
  const key = getServiceRoleKey()

  // Primeiro, verifica se já existe
  const checkRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  })

  if (checkRes.ok) return true // Já existe

  // Cria o bucket como público
  const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: BUCKET_NAME,
      name: BUCKET_NAME,
      public: true,              // URLs públicas sem autenticação
      file_size_limit: 10485760, // 10 MB
      allowed_mime_types: null,  // Todos os tipos
    }),
  })

  return createRes.ok
}

/** Faz upload de um arquivo e retorna a URL pública. */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder = 'uploads'
): Promise<{ url: string; path: string }> {
  const key = getServiceRoleKey()

  // Gera um nome único para evitar colisões
  const timestamp  = Date.now()
  const safeNome   = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${folder}/${timestamp}_${safeNome}`

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        'Content-Type': contentType,
        'x-upsert': 'true', // Sobrescreve se existir
      },
      body: fileBuffer as unknown as BodyInit,
    }
  )

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`Falha no upload: ${err}`)
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`

  return { url: publicUrl, path: storagePath }
}

/** Remove um arquivo do Storage pelo path. */
export async function deleteFile(storagePath: string): Promise<void> {
  const key = getServiceRoleKey()

  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: [storagePath] }),
  })
}
