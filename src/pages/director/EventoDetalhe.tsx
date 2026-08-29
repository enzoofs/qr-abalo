import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QRDisplay } from '../../components/QRDisplay'
import { downloadXlsx, slugify } from '../../lib/csv'
import { Button, LinkButton, PageHeader } from '../../components/ui'

type Event = {
  id: string
  name: string
  starts_at: string
  ends_at: string
  latitude: number
  longitude: number
  radius_meters: number
  qr_token: string
}

type Member = {
  id: string
  full_name: string
  email: string
  instrument: string | null
}

type Attendance = {
  id: string
  event_id: string
  member_id: string
  checked_in_at: string
  distance_meters: number | null
  source: 'self' | 'manual'
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

export default function EventoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'present' | 'absent'>('present')
  const [members, setMembers] = useState<Member[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error)
        setEvent(data as Event | null)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const [membersRes, attendancesRes] = await Promise.all([
        supabase.from('members').select('id, full_name, email, instrument').order('full_name'),
        supabase
          .from('attendances')
          .select('id, event_id, member_id, checked_in_at, distance_meters, source')
          .eq('event_id', id!)
          .order('checked_in_at', { ascending: true }),
      ])
      if (cancelled) return
      setMembers(membersRes.data ?? [])
      setAttendances((attendancesRes.data ?? []) as Attendance[])
    }

    load()

    const channel = supabase
      .channel(`attendances:event:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendances',
          filter: `event_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAttendances((prev) => {
              if (prev.some((a) => a.id === (payload.new as Attendance).id)) return prev
              return [...prev, payload.new as Attendance].sort((a, b) =>
                a.checked_in_at.localeCompare(b.checked_in_at),
              )
            })
          } else if (payload.eventType === 'DELETE') {
            setAttendances((prev) => prev.filter((a) => a.id !== (payload.old as Attendance).id))
          } else if (payload.eventType === 'UPDATE') {
            setAttendances((prev) =>
              prev.map((a) =>
                a.id === (payload.new as Attendance).id ? (payload.new as Attendance) : a,
              ),
            )
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [id])

  const { present, absent } = useMemo(() => {
    const presentIds = new Set(attendances.map((a) => a.member_id))
    const memberById = new Map(members.map((m) => [m.id, m]))
    const present = attendances
      .map((a) => ({ ...a, member: memberById.get(a.member_id) }))
      .filter((x): x is Attendance & { member: Member } => !!x.member)
    const absent = members
      .filter((m) => !presentIds.has(m.id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
    return { present, absent }
  }, [members, attendances])

  async function handleMarkManual(memberId: string) {
    if (!event) return
    setMarkingIds((prev) => new Set(prev).add(memberId))
    const { error } = await supabase.from('attendances').insert({
      event_id: event.id,
      member_id: memberId,
      source: 'manual',
    })
    setMarkingIds((prev) => {
      const next = new Set(prev)
      next.delete(memberId)
      return next
    })
    if (error) {
      alert('Erro ao marcar: ' + error.message)
    }
  }

  async function handleExportXlsx() {
    if (!event) return
    const rows: (string | number)[][] = [
      ['Nome', 'E-mail', 'Instrumento', 'Status', 'Horário', 'Origem', 'Distância (m)'],
    ]
    const sorted = [...members].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
    for (const m of sorted) {
      const att = attendances.find((a) => a.member_id === m.id)
      if (att) {
        rows.push([
          m.full_name,
          m.email,
          m.instrument ?? '',
          'Presente',
          new Date(att.checked_in_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          att.source === 'self' ? 'App' : 'Manual',
          att.distance_meters ?? '',
        ])
      } else {
        rows.push([m.full_name, m.email, m.instrument ?? '', 'Falta', '', '', ''])
      }
    }
    const date = event.starts_at.slice(0, 10)
    await downloadXlsx(`presencas-${slugify(event.name)}-${date}.xlsx`, [
      {
        name: 'Presenças',
        rows,
        columnWidths: [28, 32, 16, 12, 18, 10, 14],
      },
    ])
  }

  if (loading) return <div className="p-8 text-center text-abalo-muted">Carregando…</div>
  if (!event) return <div className="p-8 text-center text-abalo-muted">Ensaio não encontrado.</div>

  const checkinUrl = `${window.location.origin}/checkin/${event.qr_token}`

  async function handleCopy() {
    await navigator.clipboard.writeText(checkinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <div className="print:hidden">
        <PageHeader
          backTo="/director"
          title={event.name}
          subtitle={
            <>
              {formatDateTime(event.starts_at)} → {formatDateTime(event.ends_at)}
              <br />
              Raio: {event.radius_meters}m · {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
            </>
          }
          action={
            <LinkButton to={`/director/eventos/${event.id}/editar`} variant="secondary" className="text-[11px] shrink-0">
              EDITAR
            </LinkButton>
          }
        />
      </div>

      <div className="bg-white border-2 border-abalo-ink rounded-[10px] p-6 flex flex-col items-center print:border-0 print:p-0">
        <h2 className="hidden print:block text-2xl font-bold mb-4 text-center">{event.name}</h2>
        <QRDisplay value={checkinUrl} size={320} />
        <p className="text-xs text-abalo-muted mt-4 break-all text-center max-w-[280px] print:hidden">
          {checkinUrl}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 print:hidden">
        <Button variant="secondary" onClick={handleCopy} className="text-[11px]">
          {copied ? 'COPIADO!' : 'COPIAR LINK'}
        </Button>
        <Button variant="primary" onClick={() => window.print()} className="text-[11px]">
          IMPRIMIR QR
        </Button>
      </div>

      <section className="mt-8 print:hidden">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-xs tracking-wide text-abalo-ink">
            PRESENÇAS{' '}
            <span className="text-abalo-muted font-sans font-normal normal-case">
              · {present.length} de {members.length}
            </span>
          </h2>
          <button
            onClick={handleExportXlsx}
            className="text-[11px] font-bold px-3 py-1.5 rounded-md border-2 border-abalo-ink bg-white hover:bg-abalo-paper"
          >
            EXPORTAR
          </button>
        </div>

        <div className="flex gap-1 mb-3 bg-white border-2 border-abalo-ink p-1 rounded-md">
          <button
            onClick={() => setTab('present')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-sm ${
              tab === 'present' ? 'bg-abalo-ink text-abalo-amber' : 'text-abalo-muted'
            }`}
          >
            PRESENTES ({present.length})
          </button>
          <button
            onClick={() => setTab('absent')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-sm ${
              tab === 'absent' ? 'bg-abalo-ink text-abalo-amber' : 'text-abalo-muted'
            }`}
          >
            FALTANTES ({absent.length})
          </button>
        </div>

        {tab === 'present' &&
          (present.length === 0 ? (
            <p className="text-sm text-abalo-muted text-center py-6">
              Ninguém marcou presença ainda.
            </p>
          ) : (
            <ul className="space-y-1">
              {present.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center px-3 py-2 rounded-md bg-white border-2 border-abalo-ink"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{p.member.full_name}</p>
                    {p.member.instrument && (
                      <p className="text-xs text-abalo-muted">{p.member.instrument}</p>
                    )}
                    {p.source === 'manual' && (
                      <p className="text-xs text-abalo-amber font-semibold">marcado manualmente</p>
                    )}
                  </div>
                  <p className="text-xs text-abalo-muted whitespace-nowrap ml-2">
                    {formatTime(p.checked_in_at)}
                  </p>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'absent' &&
          (absent.length === 0 ? (
            <p className="text-sm text-abalo-muted text-center py-6">Todos presentes!</p>
          ) : (
            <ul className="space-y-1">
              {absent.map((m) => {
                const marking = markingIds.has(m.id)
                return (
                  <li
                    key={m.id}
                    className="flex justify-between items-center gap-2 px-3 py-2 rounded-md bg-white/60 border-2 border-abalo-ink/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-abalo-ink truncate">{m.full_name}</p>
                      {m.instrument && <p className="text-xs text-abalo-muted">{m.instrument}</p>}
                    </div>
                    <button
                      onClick={() => handleMarkManual(m.id)}
                      disabled={marking}
                      className="text-[11px] font-bold px-2 py-1 rounded border-2 border-abalo-ink text-abalo-ink hover:bg-abalo-paper shrink-0 disabled:opacity-50"
                    >
                      {marking ? '…' : 'MARCAR'}
                    </button>
                  </li>
                )
              })}
            </ul>
          ))}
      </section>
    </div>
  )
}
