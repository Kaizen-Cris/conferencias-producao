import './globals.css'
import { ReactNode } from 'react'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata = {
  title: 'Conferência Produção',
  description: 'Sistema de conferência intermediária',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body>
      <ServiceWorkerRegistration />
      {children}
    </body>
    </html>
  )
}
