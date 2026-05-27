import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'

type Props = {
  children: ReactNode
  requireDirector?: boolean
}

export function ProtectedRoute({ children, requireDirector = false }: Props) {
  const { session, member, loading, whitelistError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-full grid place-items-center text-stone-500">Carregando…</div>
  }
  if (!session) {
    const next = location.pathname + location.search
    const url = next === '/' ? '/login' : `/login?next=${encodeURIComponent(next)}`
    return <Navigate to={url} replace />
  }
  if (whitelistError) return <Navigate to="/nao-cadastrado" replace />
  if (!member) {
    return <div className="min-h-full grid place-items-center text-stone-500">Carregando perfil…</div>
  }
  if (requireDirector && member.role !== 'director') return <Navigate to="/" replace />

  return <>{children}</>
}
