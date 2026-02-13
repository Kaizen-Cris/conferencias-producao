import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Conferência Produção',
  description: 'Sistema de conferência intermediária',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="pt-br">
      <body>
        {children}
      </body>
    </html>
  )
}
