import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Event = {
  id: string
  name: string
  starts_at: string
  ends_at: string
  radius_meters: number
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusOf(starts_at: string, ends_at: string): { label: string; color: string } {
  const now = new Date()
  const start = new Date(starts_at)
  const end = new Date(ends_at)
  if (now < start) return { label: 'futuro', color: 'bg-stone-100 text-stone-600' }
  if (now > end) return { label: 'encerrado', color: 'bg-stone-50 text-stone-400' }
  return { label: 'em andamento', color: 'bg-green-100 text-green-700' }
}

export default function DirectorEventos() {
  const { member, signOut } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('events')
      .select('id, name, starts_at, ends_at, radius_meters')
      .order('starts_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error)
        setEvents(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs text-stone-500">Painel da Direção</p>
          <h1 className="text-xl font-bold">{member?.full_name}</h1>
        </div>
        <button onClick={signOut} className="text-sm text-stone-500 hover:text-stone-700">
          Sair
        </button>
      </header>

      <Link
        to="/director/novo"
        className="block w-full py-3 rounded-lg bg-abalo-600 text-white font-medium text-center hover:bg-abalo-700 mb-3"
      >
        + Novo ensaio
      </Link>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <Link
          to="/director/membros"
          className="py-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-medium text-center hover:bg-stone-50 text-sm"
        >
          Membros
        </Link>
        <Link
          to="/director/relatorio"
          className="py-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-medium text-center hover:bg-stone-50 text-sm"
        >
          Relatório
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-stone-700 mb-3">Ensaios</h2>

      {loading ? (
        <p className="text-stone-500 text-sm">Carregando…</p>
      ) : events.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Nenhum ensaio ainda. Cria o primeiro acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => {
            const status = statusOf(ev.starts_at, ev.ends_at)
            return (
              <li key={ev.id}>
                <Link
                  to={`/director/eventos/${ev.id}`}
                  className="block p-4 rounded-lg border border-stone-200 bg-white hover:bg-stone-50"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{ev.name}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {formatDateTime(ev.starts_at)} → {formatDateTime(ev.ends_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
