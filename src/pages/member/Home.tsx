import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

type Event = {
  id: string
  name: string
  starts_at: string
  ends_at: string
}

type Status = 'live' | 'upcoming' | 'none'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MemberHome() {
  const { member, signOut } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [status, setStatus] = useState<Status>('none')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date().toISOString()
    supabase
      .from('events')
      .select('id, name, starts_at, ends_at')
      .gt('ends_at', now)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error)
        if (data) {
          setEvent(data)
          const start = new Date(data.starts_at)
          setStatus(new Date() >= start ? 'live' : 'upcoming')
        }
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="flex justify-between items-start mb-8">
        <div>
          <p className="text-xs text-stone-500">Abalô-Caxi</p>
          <h1 className="text-xl font-bold">Olá, {member?.full_name.split(' ')[0]}</h1>
        </div>
        <button onClick={signOut} className="text-sm text-stone-500 hover:text-stone-700">
          Sair
        </button>
      </header>

      {loading ? (
        <p className="text-stone-500 text-sm">Carregando…</p>
      ) : !event ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 text-center">
          <p className="text-stone-500">Nenhum ensaio agendado.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-xs text-stone-500 mb-1">
            {status === 'live' ? 'Acontecendo agora' : 'Próximo ensaio'}
          </p>
          <h2 className="text-lg font-semibold text-stone-900">{event.name}</h2>
          <p className="text-sm text-stone-500 mt-1">
            {formatDateTime(event.starts_at)} → {formatDateTime(event.ends_at)}
          </p>

          {status === 'live' ? (
            <Link
              to="/member/scanner"
              className="block w-full py-3 mt-4 rounded-lg bg-abalo-600 text-white font-medium text-center hover:bg-abalo-700"
            >
              Marcar presença
            </Link>
          ) : (
            <p className="text-xs text-stone-400 mt-4 text-center">
              O botão aparece quando o ensaio começar.
            </p>
          )}
        </div>
      )}

      <Link
        to="/member/historico"
        className="block text-center text-sm text-abalo-700 mt-6 hover:underline"
      >
        Ver meu histórico
      </Link>

      <p className="text-xs text-stone-400 text-center mt-6">
        Você também pode escanear o QR direto pela câmera do celular.
      </p>
    </div>
  )
}
