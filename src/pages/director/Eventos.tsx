import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Button, Chip, LinkButton, type ChipTone } from '../../components/ui'

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
    hour12: false,
  })
}

function statusOf(starts_at: string, ends_at: string): { label: string; tone: ChipTone } {
  const now = new Date()
  const start = new Date(starts_at)
  const end = new Date(ends_at)
  if (now < start) return { label: 'futuro', tone: 'muted' }
  if (now > end) return { label: 'encerrado', tone: 'muted' }
  return { label: 'em andamento', tone: 'live' }
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
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <header className="flex justify-between items-start mb-6">
        <div>
          <div className="inline-block -rotate-2 bg-abalo-ink px-3 py-1 mb-2">
            <span className="font-display text-[10px] tracking-wider text-abalo-amber">
              PAINEL DA DIREÇÃO
            </span>
          </div>
          <h1 className="text-xl font-extrabold">{member?.full_name}</h1>
        </div>
        <button onClick={signOut} className="text-xs font-bold text-abalo-muted">
          SAIR
        </button>
      </header>

      <LinkButton to="/director/novo" variant="primary" className="w-full py-3 mb-3">
        + NOVO ENSAIO
      </LinkButton>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <LinkButton to="/director/membros" variant="secondary" className="py-2.5 text-[11px]">
          MEMBROS
        </LinkButton>
        <LinkButton to="/director/relatorio" variant="secondary" className="py-2.5 text-[11px]">
          RELATÓRIO
        </LinkButton>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-display text-xs tracking-wide text-abalo-ink">ENSAIOS</h2>
        {events.length > 0 && (
          <button onClick={toggleAll} className="text-xs font-bold text-abalo-blue">
            {selected.size === events.length ? 'LIMPAR' : 'SELECIONAR TODOS'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-abalo-muted text-sm">Carregando…</p>
      ) : events.length === 0 ? (
        <p className="text-abalo-muted text-sm">Nenhum ensaio ainda. Cria o primeiro acima.</p>
      ) : (
        <ul className="space-y-2 pb-20">
          {events.map((ev) => {
            const status = statusOf(ev.starts_at, ev.ends_at)
            const isSelected = selected.has(ev.id)
            return (
              <li key={ev.id} className="flex items-stretch gap-2">
                <label
                  className="flex items-center px-1 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(ev.id)}
                    className="w-5 h-5 accent-abalo-coral"
                  />
                </label>
                <Link
                  to={`/director/eventos/${ev.id}`}
                  className={`flex-1 block p-4 rounded-md border-2 bg-white ${
                    isSelected ? 'border-abalo-coral' : 'border-abalo-ink'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-bold text-abalo-ink">{ev.name}</p>
                      <p className="text-xs text-abalo-muted mt-1">
                        {formatDateTime(ev.starts_at)} → {formatDateTime(ev.ends_at)}
                      </p>
                    </div>
                    <Chip tone={status.tone}>{status.label}</Chip>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-abalo-paper border-t-2 border-abalo-ink">
          <div className="max-w-md mx-auto flex gap-2">
            <Button variant="secondary" onClick={() => setSelected(new Set())} className="flex-1">
              CANCELAR
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting} className="flex-1">
              {deleting ? 'EXCLUINDO…' : `EXCLUIR ${selected.size}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
