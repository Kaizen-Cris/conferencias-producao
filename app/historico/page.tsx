import { Suspense } from 'react'
import HistoricoClient from './historicoclient'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="card">Carregando...</div>
      </div>
    }>
      <HistoricoClient />
    </Suspense>
  )
}
