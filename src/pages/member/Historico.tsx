import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { PageHeader, StatTile, Chip, type ChipTone } from '../../components/ui'

type Event = {
  id: string
  name: string
  starts_at: string
  ends_at: string
}

type AttendanceLite = {
  event_id: string
  checked_in_at: string
}

type Row =
  | { event: Event; status: 'present'; checked_in_at: string }
  | { event: Event; status: 'absent' }
  | { event: Event; status: 'live' }
  | { event: Event; status: 'future' }

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const STATUS_META: Record<Row['status'], { label: string; tone: ChipTone }> = {
  present: { label: 'Presente', tone: 'ok' },
  absent: { label: 'Falta', tone: 'danger' },
  live: { label: 'Em andamento', tone: 'warn' },
  future: { label: 'Futuro', tone: 'muted' },
}

export default function MemberHistorico() {
  const { member } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [attendances, setAttendances] = useState<AttendanceLite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!member) return
    let cancelled = false

    Promise.all([
      supabase
        .from('events')
        .select('id, name, starts_at, ends_at')
        .order('starts_at', { ascending: false }),
      supabase
        .from('attendances')
        .select('event_id, checked_in_at')
        .eq('member_id', member.id),
    ]).then(([eventsRes, attRes]) => {
      if (cancelled) return
      setEvents(eventsRes.data ?? [])
      setAttendances((attRes.data ?? []) as AttendanceLite[])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [member])

  const { rows, stats } = useMemo(() => {
    const attMap = new Map(attendances.map((a) => [a.event_id, a]))
    const now = new Date()
    const rows: Row[] = events.map((event) => {
      const att = attMap.get(event.id)
      if (att) return { event, status: 'present', checked_in_at: att.checked_in_at }
      const start = new Date(event.starts_at)
      const end = new Date(event.ends_at)
      if (now < start) return { event, status: 'future' }
      if (now <= end) return { event, status: 'live' }
      return { event, status: 'absent' }
    })

    const closed = rows.filter((r) => r.status === 'present' || r.status === 'absent')
    const presentCount = closed.filter((r) => r.status === 'present').length
    const total = closed.length
    const percent = total === 0 ? null : Math.round((presentCount / total) * 100)

    return {
      rows,
      stats: { total, presentCount, percent },
    }
  }, [events, attendances])

  return (
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <PageHeader backTo="/member" title="Meu histórico" />

      <div className="grid grid-cols-3 gap-2 mb-6">
        <StatTile label="Presenças" value={stats.presentCount} />
        <StatTile label="Ensaios" value={stats.total} />
        <StatTile label="% presença" value={stats.percent === null ? '—' : `${stats.percent}%`} />
      </div>

      {loading ? (
        <p className="text-sm text-abalo-muted">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-abalo-muted text-center py-6">Nenhum ensaio ainda.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const meta = STATUS_META[row.status]
            return (
              <li
                key={row.event.id}
                className="flex justify-between items-start gap-2 p-3 rounded-md bg-white border-2 border-abalo-ink"
              >
                <div className="min-w-0">
                  <p className="font-bold text-abalo-ink truncate">{row.event.name}</p>
                  <p className="text-xs text-abalo-muted mt-0.5">
                    {formatDateTime(row.event.starts_at)}
                    {row.status === 'present' && ' · marcou às ' + formatTime(row.checked_in_at)}
                  </p>
                </div>
                <Chip tone={meta.tone}>{meta.label}</Chip>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
