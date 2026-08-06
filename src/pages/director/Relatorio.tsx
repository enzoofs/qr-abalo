import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { downloadXlsx } from '../../lib/csv'

type Member = {
  id: string
  full_name: string
  email: string
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
      supabase.from('members').select('id, full_name, email').order('full_name'),
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
        : Math.round(
            (memberStats.reduce((sum, s) => sum + (s.percent ?? 0), 0) / members.length),
          )

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
        columnWidths: [28, 32, 12, 12, 18, ...events.map(() => 22)],
      },
    ])
  }

  return (
    <div className="min-h-full p-6 max-w-md mx-auto">
      <header className="mb-6">
        <Link to="/director" className="text-sm text-stone-500">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold mt-2">Relatório consolidado</h1>
      </header>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Membros" value={members.length} />
        <Stat label="Ensaios" value={summary.closedCount} />
        <Stat
          label="Presença média"
          value={summary.avg === null ? '—' : `${summary.avg}%`}
        />
      </div>

      <button
        onClick={handleExportXlsx}
        disabled={loading || members.length === 0}
        className="w-full py-3 rounded-lg bg-abalo-600 text-white font-medium hover:bg-abalo-700 disabled:opacity-50 mb-6"
      >
        Exportar planilha (Excel)
      </button>

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold text-stone-700">Por membro</h2>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-xs px-2 py-1 rounded border border-stone-300 bg-white"
        >
          <option value="percent_desc">% maior primeiro</option>
          <option value="percent_asc">% menor primeiro</option>
          <option value="name">Por nome</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Carregando…</p>
      ) : summary.memberStats.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-6">Nenhum membro cadastrado.</p>
      ) : (
        <ul className="space-y-1">
          {summary.memberStats.map((s) => (
            <li
              key={s.member.id}
              className="flex justify-between items-center gap-2 p-3 rounded-md bg-white border border-stone-200"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-900 truncate">{s.member.full_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-abalo-500"
                      style={{ width: `${s.percent ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-500 whitespace-nowrap">
                    {s.present}/{s.total}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-stone-700 w-12 text-right">
                {s.percent === null ? '—' : `${s.percent}%`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-center">
      <p className="text-xl font-bold text-stone-900">{value}</p>
      <p className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</p>
    </div>
  )
}
