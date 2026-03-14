import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import { PreferencesProvider } from '@/lib/preferences'

export const metadata: Metadata = {
  title: 'AMO Gestão - Associação Missionária Ômega',
  description: 'Sistema de Gestão para Associação Missionária Ômega',
}

// Force dynamic rendering for all pages to avoid build-time DB connections
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <body>
        <PreferencesProvider>
          <AppShell>{children}</AppShell>
        </PreferencesProvider>
      </body>
    </html>
  )
}
