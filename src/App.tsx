import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import NotWhitelisted from './pages/NotWhitelisted'
import Checkin from './pages/Checkin'
import MemberHome from './pages/member/Home'
import MemberScanner from './pages/member/Scanner'
import MemberHistorico from './pages/member/Historico'
import DirectorEventos from './pages/director/Eventos'
import NovoEvento from './pages/director/NovoEvento'
import EventoDetalhe from './pages/director/EventoDetalhe'
import Membros from './pages/director/Membros'
import Relatorio from './pages/director/Relatorio'

function RoleRedirect() {
  const { member } = useAuth()
  if (!member) return null
  return <Navigate to={member.role === 'director' ? '/director' : '/member'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/nao-cadastrado" element={<NotWhitelisted />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleRedirect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkin/:token"
            element={
              <ProtectedRoute>
                <Checkin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/member"
            element={
              <ProtectedRoute>
                <MemberHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/scanner"
            element={
              <ProtectedRoute>
                <MemberScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/historico"
            element={
              <ProtectedRoute>
                <MemberHistorico />
              </ProtectedRoute>
            }
          />

          <Route
            path="/director"
            element={
              <ProtectedRoute requireDirector>
                <DirectorEventos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/director/novo"
            element={
              <ProtectedRoute requireDirector>
                <NovoEvento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/director/eventos/:id"
            element={
              <ProtectedRoute requireDirector>
                <EventoDetalhe />
              </ProtectedRoute>
            }
          />
          <Route
            path="/director/eventos/:id/editar"
            element={
              <ProtectedRoute requireDirector>
                <NovoEvento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/director/membros"
            element={
              <ProtectedRoute requireDirector>
                <Membros />
              </ProtectedRoute>
            }
          />
          <Route
            path="/director/relatorio"
            element={
              <ProtectedRoute requireDirector>
                <Relatorio />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
