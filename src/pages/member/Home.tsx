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

const MIN_PRESENCAS = 5

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
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
  const [totalPresencas, setTotalPresencas] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!member) return
    const now = new Date().toISOString()

    supabase
      .from('attendances')
      .select('event_id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .then(({ count }) => setTotalPresencas(count ?? 0))

    supabase
      .from('events')
      .select('id, name, starts_at, ends_at')
      .gt('ends_at', now)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) console.error(error)
        if (data) {
          setEvent(data)
          const start = new Date(data.starts_at)
          setStatus(new Date() >= start ? 'live' : 'upcoming')

          const { data: att } = await supabase
            .from('attendances')
            .select('id')
            .eq('event_id', data.id)
            .eq('member_id', member.id)
            .maybeSingle()
          setAlreadyCheckedIn(!!att)
        }
        setLoading(false)
      })
  }, [member])

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

          {alreadyCheckedIn ? (
            <div className="w-full py-3 mt-4 rounded-lg bg-green-50 border border-green-200 text-green-700 font-medium text-center">
              Você já marcou presença ✓
            </div>
          ) : status === 'live' ? (
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

      <div className="rounded-lg border border-stone-200 bg-white p-4 mt-6">
        <div className="flex justify-between items-baseline mb-1">
          <p className="text-sm font-medium text-stone-700">Presenças</p>
          <p className="text-sm text-stone-500">
            {totalPresencas}/{MIN_PRESENCAS} mínimo
          </p>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${totalPresencas >= MIN_PRESENCAS ? 'bg-green-500' : 'bg-abalo-500'}`}
            style={{ width: `${Math.min(100, (totalPresencas / MIN_PRESENCAS) * 100)}%` }}
          />
        </div>
      </div>

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
