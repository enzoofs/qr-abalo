import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { LocationPicker } from '../../components/LocationPicker'
import { Button, Input, PageHeader } from '../../components/ui'

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

function defaultStart(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

function defaultEnd(): string {
  const d = new Date()
  d.setHours(d.getHours() + 3)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

export default function NovoEvento() {
  const { member } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const [name, setName] = useState('')
  const [startsAt, setStartsAt] = useState(defaultStart())
  const [endsAt, setEndsAt] = useState(defaultEnd())
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radius, setRadius] = useState(150)

  const [loading, setLoading] = useState(isEditing)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase
      .from('events')
      .select('name, starts_at, ends_at, latitude, longitude, radius_meters')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setFormError(error.message)
        } else if (data) {
          setName(data.name)
          setStartsAt(toLocalInput(data.starts_at))
          setEndsAt(toLocalInput(data.ends_at))
          setLatitude(data.latitude)
          setLongitude(data.longitude)
          setRadius(data.radius_meters)
        }
        setLoading(false)
      })
  }, [id])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (latitude === null || longitude === null) {
      setFormError('Captura a localização do local antes de salvar.')
      return
    }
    setBusy(true)

    const payload = {
      name,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      latitude,
      longitude,
      radius_meters: radius,
    }

    if (isEditing) {
      const { error } = await supabase.from('events').update(payload).eq('id', id)
      setBusy(false)
      if (error) {
        setFormError(error.message)
        return
      }
      navigate(`/director/eventos/${id}`)
      return
    }

    const { data, error } = await supabase
      .from('events')
      .insert({ ...payload, created_by: member?.id })
      .select()
      .single()
    setBusy(false)
    if (error) {
      setFormError(error.message)
      return
    }
    navigate(`/director/eventos/${data.id}`)
  }

  return (
    <div className="min-h-full bg-abalo-paper p-6 max-w-md mx-auto">
      <PageHeader
        backTo={isEditing ? `/director/eventos/${id}` : '/director'}
        title={isEditing ? 'Editar ensaio' : 'Novo ensaio'}
      />

      {loading ? (
        <p className="text-abalo-muted text-sm">Carregando…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
              NOME
            </label>
            <Input
              type="text"
              placeholder="Ex: Ensaio 4 — Praça da Liberdade"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
                INÍCIO
              </label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
                FIM
              </label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
              LOCALIZAÇÃO
            </label>
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              radius={radius}
              onChange={({ latitude: lat, longitude: lng }) => {
                setLatitude(lat)
                setLongitude(lng)
              }}
            />
          </div>

          <div>
            <label className="block font-display text-[11px] tracking-wide text-abalo-ink mb-1.5">
              RAIO (METROS)
            </label>
            <Input
              type="number"
              min={20}
              max={1000}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              required
            />
            <p className="text-xs text-abalo-muted mt-1">
              Distância máxima do local pra contar presença. 150m cobre uma quadra/praça.
            </p>
          </div>

          {formError && <p className="text-sm font-semibold text-abalo-red">{formError}</p>}

          <Button type="submit" disabled={busy} className="w-full py-3">
            {busy ? 'SALVANDO…' : isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR ENSAIO'}
          </Button>
        </form>
      )}
    </div>
  )
}
