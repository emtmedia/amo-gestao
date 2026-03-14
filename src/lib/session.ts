// This file uses next/headers and must ONLY be imported in server components or API routes
// Do NOT import this in middleware (Edge Runtime)
import { cookies } from 'next/headers'
import { verifySession, SessionPayload, COOKIE_NAME } from './auth'

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}
