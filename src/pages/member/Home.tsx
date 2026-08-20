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

const FLAG_COLORS = ['#e63946', '#ffb703', '#06a77d', '#118ab2', '#7b2cbf']

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
    <div className="min-h-full bg-abalo-paper relative overflow-hidden">
      {/* halftone accent corner */}
      <div className="absolute -top-8 -right-8 w-52 h-52 rounded-full bg-halftone opacity-50 [background-size:14px_14px]" />

      <div className="relative max-w-md mx-auto p-6">
        <header className="flex justify-between items-start mb-6">
          <div>
            <div className="inline-block -rotate-2 bg-abalo-ink px-3 py-1.5">
              <span className="font-display text-[10px] tracking-wider text-abalo-amber">
                ABALÔ-CAXI
              </span>
            </div>
            <h1 className="text-2xl font-extrabold mt-2.5">
              Oi, {member?.full_name.split(' ')[0]}
            </h1>
          </div>
          <button
            onClick={signOut}
            className="w-10 h-10 rounded-full border-[2.5px] border-abalo-ink bg-white flex items-center justify-center"
            aria-label="Sair"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </header>

        {loading ? (
          <p className="text-abalo-muted text-sm">Carregando…</p>
        ) : !event ? (
          <div className="rounded-lg border-2 border-abalo-ink bg-white p-6 text-center">
            <p className="text-abalo-muted">Nenhum ensaio agendado.</p>
          </div>
        ) : (
          <div className="bg-abalo-ink rounded-[10px] shadow-hard-teal p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-abalo-coral animate-pulse" />
              <span className="font-display text-[11px] tracking-wider text-orange-300">
                {status === 'live' ? 'ACONTECENDO AGORA' : 'PRÓXIMO ENSAIO'}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-abalo-paper">{event.name}</h2>
            <p className="text-[13px] text-stone-400 mt-1 mb-5">
              {formatDateTime(event.starts_at)} → {formatDateTime(event.ends_at)}
            </p>

            {alreadyCheckedIn ? (
              <div className="w-full py-3.5 rounded-md bg-abalo-green/90 text-center">
                <span className="font-display text-sm text-abalo-ink">
                  PRESENÇA CONFIRMADA ✓
                </span>
              </div>
            ) : status === 'live' ? (
              <Link
                to="/member/scanner"
                className="w-full py-3.5 rounded-md bg-abalo-amber shadow-hard-sm flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#161616" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
                </svg>
                <span className="font-display text-sm text-abalo-ink">MARCAR PRESENÇA</span>
              </Link>
            ) : (
              <p className="text-xs text-stone-400 text-center">
                O botão aparece quando o ensaio começar.
              </p>
            )}
          </div>
        )}

        <div className="bg-white border-2 border-abalo-ink rounded-[10px] p-5 mt-4 flex items-center gap-4">
          <div className="font-display text-3xl text-abalo-ink leading-none">{totalPresencas}</div>
          <div className="flex-1">
            <p className="text-[13.5px] font-extrabold mb-2">Presenças na bateria</p>
            <div className="flex gap-1.5">
              {Array.from({ length: totalPresencas }).map((_, i) => (
                <span
                  key={i}
                  className="w-[22px] h-[14px] rounded border-2 border-abalo-ink"
                  style={{ backgroundColor: FLAG_COLORS[i % FLAG_COLORS.length] }}
                />
              ))}
            </div>
          </div>
        </div>

        <Link
          to="/member/historico"
          className="flex items-center justify-center gap-1.5 mt-6 font-display text-xs tracking-wide text-abalo-blue"
        >
          VER MEU HISTÓRICO
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#118ab2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>

        <p className="text-xs font-medium text-abalo-muted text-center mt-5 px-10 leading-relaxed">
          Você também pode escanear o QR direto pela câmera do celular.
        </p>
      </div>
    </div>
  )
}
