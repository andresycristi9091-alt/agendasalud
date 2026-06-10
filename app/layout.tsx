import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgendaSalud — Agenda médica inteligente',
  description: 'Plataforma de agendamiento médico para centros de salud primaria en Chile',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  )
}
