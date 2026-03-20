// src/app/scan/layout.tsx
// Layout dedicado para o AMO Scan (PWA mobile)
// Não inclui Sidebar nem AppShell — é uma experiência standalone

import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'AMO Scan',
  description: 'Escanear e enviar documentos para o Inbox AMO',
  manifest: '/manifest-scan.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AMO Scan',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
