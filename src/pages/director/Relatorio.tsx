import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { downloadXlsx } from '../../lib/csv'
import { Button, PageHeader, StatTile } from '../../components/ui'

type Member = {
  id: string
  full_name: string
  email: string
  instrument: string | null
}

type Event = {
  id: string
  name: string
  starts_at: string
  ends_at: string
}

type Attendance = {
  member_id: string
  event_id: string
  source: 'self' | 'manual'
}

type Cell = 'present' | 'absent' | 'live' | 'future'

function cellStatus(event: Event, hasAttendance: boolean): Cell {
  if (hasAttendance) return 'present'
  const now = new Date()
  if (now < new Date(event.starts_at)) return 'future'
  if (now <= new Date(event.ends_at)) return 'live'
  return 'absent'
}

const CELL_LABEL: Record<Cell, string> = {
  present: 'Presente',
  absent: 'Falta',
  live: 'Em andamento',
  future: 'Futuro',
}

export default function Relatorio() {
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'name' | 'percent_desc' | 'percent_asc'>('percent_desc')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase.from('members').select('id, full_name, email, instrument').order('full_name'),
      supabase.from('events').select('id, name, starts_at, ends_at').order('starts_at'),
      supabase.from('attendances').select('member_id, event_id, source'),
    ]).then(([mRes, eRes, aRes]) => {
      if (cancelled) return
      setMembers((mRes.data ?? []) as Member[])
      setEvents((eRes.data ?? []) as Event[])
      setAttendances((aRes.data ?? []) as Attendance[])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(() => {
    const now = new Date()
    // "closed" = ensaios que já começaram, pra contar presença assim que é marcada
    // (sem esperar o ensaio encerrar — igual ao histórico do membro)
    const closed = events.filter((e) => new Date(e.starts_at) <= now)
    const attendanceSet = new Set(attendances.map((a) => `${a.member_id}:${a.event_id}`))

    const memberStats = members.map((m) => {
      const present = attendances.filter((a) => a.member_id === m.id).length
      const total = closed.length
      const percent = total === 0 ? null : Math.round((present / total) * 100)
      return { member: m, present, total, percent }
    })

    const avg =
      closed.length === 0 || members.length === 0
        ? null
        : Math.round(memberStats.reduce((sum, s) => sum + (s.percent ?? 0), 0) / members.length)

    const sorted = [...memberStats].sort((a, b) => {
      if (sort === 'name') return a.member.full_name.localeCompare(b.member.full_name, 'pt-BR')
      const aP = a.percent ?? -1
      const bP = b.percent ?? -1
      return sort === 'percent_desc' ? bP - aP : aP - bP
    })

    return { memberStats: sorted, closedCount: closed.length, avg, attendanceSet }
  }, [members, events, attendances, sort])

  async function handleExportXlsx() {
    const header = [
      'Nome',
      'E-mail',
      'Instrumento',
      '% Presença',
      'Presenças',
      'Total (encerrados)',
      ...events.map((e) => {
        const d = new Date(e.starts_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
        return `${e.name} (${d})`
      }),
    ]
    const rows: (string | number)[][] = [header]

    for (const stat of summary.memberStats) {
      const row: (string | number)[] = [
        stat.member.full_name,
        stat.member.email,
        stat.member.instrument ?? '',
        stat.percent === null ? '' : `${stat.percent}%`,
        stat.present,
        stat.total,
        ...events.map((e) => {
          const has = summary.attendanceSet.has(`${stat.member.id}:${e.id}`)
          return CELL_LABEL[cellStatus(e, has)]
        }),
      ]
      rows.push(row)
    }

    const date = new Date().toISOString().slice(0, 10)
    await downloadXlsx(`relatorio-presencas-${date}.xlsx`, [
      {
        name: 'Resumo',
        rows,
        columnWidths: [28, 32, 16, 12, 12, 18, ...events.map(() => 22)],
      },
    ])
  }

  return (
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <PageHeader backTo="/director" title="Relatório consolidado" />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatTile label="Membros" value={members.length} />
        <StatTile label="Ensaios" value={summary.closedCount} />
        <StatTile label="Presença média" value={summary.avg === null ? '—' : `${summary.avg}%`} />
      </div>

      <Button
        onClick={handleExportXlsx}
        disabled={loading || members.length === 0}
        className="w-full py-3 mb-6"
      >
        EXPORTAR PLANILHA (EXCEL)
      </Button>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-xs tracking-wide text-abalo-ink">POR MEMBRO</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-xs font-bold px-2 py-1.5 rounded-md border-2 border-abalo-ink bg-white"
        >
          <option value="percent_desc">% maior primeiro</option>
          <option value="percent_asc">% menor primeiro</option>
          <option value="name">Por nome</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-abalo-muted">Carregando…</p>
      ) : summary.memberStats.length === 0 ? (
        <p className="text-sm text-abalo-muted text-center py-6">Nenhum membro cadastrado.</p>
      ) : (
        <ul className="space-y-1">
          {summary.memberStats.map((s) => (
            <li
              key={s.member.id}
              className="flex justify-between items-center gap-2 p-3 rounded-md bg-white border-2 border-abalo-ink"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-abalo-ink truncate">{s.member.full_name}</p>
                {s.member.instrument && (
                  <p className="text-xs text-abalo-muted truncate">{s.member.instrument}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-2 bg-abalo-paper rounded-full overflow-hidden border border-abalo-ink/20">
                    <div className="h-full bg-abalo-coral" style={{ width: `${s.percent ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-abalo-muted whitespace-nowrap">
                    {s.present}/{s.total}
                  </p>
                </div>
              </div>
              <p className="font-display text-sm text-abalo-ink w-12 text-right">
                {s.percent === null ? '—' : `${s.percent}%`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
