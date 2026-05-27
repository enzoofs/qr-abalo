import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QRDisplay } from '../../components/QRDisplay'
import { downloadXlsx, slugify } from '../../lib/csv'

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
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function EventoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
        supabase.from('members').select('id, full_name, email').order('full_name'),
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
      ['Nome', 'E-mail', 'Status', 'Horário', 'Origem', 'Distância (m)'],
    ]
    const sorted = [...members].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'))
    for (const m of sorted) {
      const att = attendances.find((a) => a.member_id === m.id)
      if (att) {
        rows.push([
          m.full_name,
          m.email,
          'Presente',
          new Date(att.checked_in_at).toLocaleString('pt-BR'),
          att.source === 'self' ? 'App' : 'Manual',
          att.distance_meters ?? '',
        ])
      } else {
        rows.push([m.full_name, m.email, 'Falta', '', '', ''])
      }
    }
    const date = event.starts_at.slice(0, 10)
    await downloadXlsx(`presencas-${slugify(event.name)}-${date}.xlsx`, [
      {
        name: 'Presenças',
        rows,
        columnWidths: [28, 32, 12, 18, 10, 14],
      },
    ])
  }

  if (loading) return <div className="p-8 text-center text-stone-500">Carregando…</div>
  if (!event) return <div className="p-8 text-center text-stone-500">Ensaio não encontrado.</div>

  const checkinUrl = `${window.location.origin}/checkin/${event.qr_token}`

  async function handleCopy() {
    await navigator.clipboard.writeText(checkinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="mb-6 print:hidden">
        <button onClick={() => navigate('/director')} className="text-sm text-stone-500 mb-2">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-stone-500 mt-1">
          {formatDateTime(event.starts_at)} → {formatDateTime(event.ends_at)}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Raio: {event.radius_meters}m · {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
        </p>
      </header>

      <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col items-center print:border-0 print:p-0">
        <h2 className="hidden print:block text-2xl font-bold mb-4 text-center">{event.name}</h2>
        <QRDisplay value={checkinUrl} size={320} />
        <p className="text-xs text-stone-400 mt-4 break-all text-center max-w-[280px] print:hidden">
          {checkinUrl}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 print:hidden">
        <button
          onClick={handleCopy}
          className="py-2 rounded-md border border-stone-300 bg-white text-sm font-medium hover:bg-stone-50"
        >
          {copied ? 'Copiado!' : 'Copiar link'}
        </button>
        <button
          onClick={() => window.print()}
          className="py-2 rounded-md bg-abalo-600 text-white text-sm font-medium hover:bg-abalo-700"
        >
          Imprimir QR
        </button>
      </div>

      <section className="mt-8 print:hidden">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-stone-700">
            Presenças <span className="text-stone-400 font-normal">· {present.length} de {members.length}</span>
          </h2>
          <button
            onClick={handleExportXlsx}
            className="text-xs px-3 py-1.5 rounded-md border border-stone-300 bg-white hover:bg-stone-50 font-medium"
          >
            Exportar planilha
          </button>
        </div>

        <div className="flex gap-1 mb-3 bg-stone-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('present')}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium ${
              tab === 'present' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
            }`}
          >
            Presentes ({present.length})
          </button>
          <button
            onClick={() => setTab('absent')}
            className={`flex-1 py-1.5 text-sm rounded-md font-medium ${
              tab === 'absent' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
            }`}
          >
            Faltantes ({absent.length})
          </button>
        </div>

        {tab === 'present' && (
          present.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">
              Ninguém marcou presença ainda.
            </p>
          ) : (
            <ul className="space-y-1">
              {present.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center px-3 py-2 rounded-md bg-white border border-stone-200"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.member.full_name}</p>
                    {p.source === 'manual' && (
                      <p className="text-xs text-amber-600">marcado manualmente</p>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 whitespace-nowrap ml-2">
                    {formatTime(p.checked_in_at)}
                  </p>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'absent' && (
          absent.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">
              Todos presentes! 🎉
            </p>
          ) : (
            <ul className="space-y-1">
              {absent.map((m) => {
                const marking = markingIds.has(m.id)
                return (
                  <li
                    key={m.id}
                    className="flex justify-between items-center gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-200"
                  >
                    <p className="text-sm text-stone-700 truncate">{m.full_name}</p>
                    <button
                      onClick={() => handleMarkManual(m.id)}
                      disabled={marking}
                      className="text-xs px-2 py-1 rounded border border-abalo-300 text-abalo-700 hover:bg-abalo-50 shrink-0 disabled:opacity-50"
                    >
                      {marking ? '…' : 'Marcar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )
        )}
      </section>
    </div>
  )
}
