import { NextRequest, NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Acesso negado. Apenas SuperAdmin pode acessar Prebenda.' }, { status: 403 })
  }
  try {
    const items = await prisma.$queryRawUnsafe<any[]>(`
      SELECT p.*,
             r.numero       AS "reciboNumero",
             r."docAssinadoUrl" AS "reciboAssinado",
             cb.banco       AS "bancaNome",
             cb.tipo        AS "contaTipo",
             cb."numeroConta" AS "contaNumero",
             mt.nome        AS "metodoNome"
      FROM "DespesaPrebenda" p
      LEFT JOIN "Recibo"              r  ON r.id  = p."reciboId"
      LEFT JOIN "ContaBancaria"       cb ON cb.id = p."contaBancariaId"
      LEFT JOIN "MetodoTransferencia" mt ON mt.id = p."metodoTransferenciaId"
      ORDER BY p."createdAt" DESC
    `)
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Acesso negado. Apenas SuperAdmin pode registrar Prebenda.' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const id = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DespesaPrebenda"
         ("id","nomePrebendado","cpfPrebendado","dataPagamento","valorPagamento",
          "contaBancariaId","metodoTransferenciaId","mesReferencia","anoReferencia",
          "reciboId","observacoes","arquivosReferencia","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      id,
      body.nomePrebendado,
      body.cpfPrebendado,
      new Date(body.dataPagamento),
      parseFloat(body.valorPagamento),
      body.contaBancariaId,
      body.metodoTransferenciaId,
      parseInt(body.mesReferencia),
      parseInt(body.anoReferencia),
      body.reciboId || null,
      body.observacoes || null,
      body.arquivosReferencia || null,
    )
    await logAudit('CRIAR', 'DespesaPrebenda', id, `Prebendado: ${body.nomePrebendado}`)
    return NextResponse.json({ success: true, id })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
