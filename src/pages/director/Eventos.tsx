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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === events.length ? new Set() : new Set(events.map((e) => e.id)),
    )
  }

  async function handleDelete() {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const msg =
      ids.length === 1
        ? 'Excluir este ensaio? Todas as presenças dele também serão apagadas.'
        : `Excluir ${ids.length} ensaios? Todas as presenças deles também serão apagadas.`
    if (!confirm(msg)) return
    setDeleting(true)
    const { error } = await supabase.from('events').delete().in('id', ids)
    setDeleting(false)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
      return
    }
    setEvents((prev) => prev.filter((e) => !selected.has(e.id)))
    setSelected(new Set())
  }

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

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold text-stone-700">Ensaios</h2>
        {events.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-xs text-stone-500 hover:text-stone-700"
          >
            {selected.size === events.length ? 'Limpar' : 'Selecionar todos'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-stone-500 text-sm">Carregando…</p>
      ) : events.length === 0 ? (
        <p className="text-stone-500 text-sm">
          Nenhum ensaio ainda. Cria o primeiro acima.
        </p>
      ) : (
        <ul className="space-y-2 pb-20">
          {events.map((ev) => {
            const status = statusOf(ev.starts_at, ev.ends_at)
            const isSelected = selected.has(ev.id)
            return (
              <li key={ev.id} className="flex items-stretch gap-2">
                <label
                  className="flex items-center px-2 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(ev.id)}
                    className="w-5 h-5 accent-abalo-600"
                  />
                </label>
                <Link
                  to={`/director/eventos/${ev.id}`}
                  className={`flex-1 block p-4 rounded-lg border bg-white hover:bg-stone-50 ${
                    isSelected ? 'border-abalo-500 ring-1 ring-abalo-500' : 'border-stone-200'
                  }`}
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

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200 shadow-lg">
          <div className="max-w-md mx-auto flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="flex-1 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-700 font-medium hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Excluindo…' : `Excluir ${selected.size}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
