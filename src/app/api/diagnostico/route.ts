import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const results: Record<string, string> = {}

  // Test 1: basic connection with existing table
  try {
    await prisma.departamento.count()
    results.departamento = '✅ OK'
  } catch (e: unknown) {
    results.departamento = '❌ ' + (e instanceof Error ? e.message : String(e))
  }

  // Test 2: Usuario table
  try {
    await prisma.usuario.count()
    results.usuario = '✅ OK'
  } catch (e: unknown) {
    results.usuario = '❌ ' + (e instanceof Error ? e.message : String(e))
  }

  // Test 3: CodigoOTP table
  try {
    await prisma.codigoOTP.count()
    results.codigoOTP = '✅ OK'
  } catch (e: unknown) {
    results.codigoOTP = '❌ ' + (e instanceof Error ? e.message : String(e))
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    database_url_host: process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@').split('@')[1]?.split('/')[0] || 'not set',
    tables: results
  })
}
